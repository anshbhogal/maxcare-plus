import re
import logging
from typing import List, Dict

try:
    from rapidfuzz import fuzz, process
except ImportError:
    fuzz    = None
    process = None

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# SYMPTOM VOCABULARY
# Expanded to cover real Indian English expressions
# Every entry here MUST have a matching key in symptom_checker.py SYMPTOM_ENGINE
# ─────────────────────────────────────────────
COMMON_SYMPTOMS = [
    # Cardiology
    "chest pain", "palpitations",
    # Pulmonology
    "shortness of breath", "chronic cough", "cough",
    # Neurology
    "severe headache", "dizziness",
    # Orthopaedics
    "joint pain", "back pain",
    # Gastroenterology
    "stomach ache", "nausea", "vomiting", "diarrhea", "loose motion",
    # General / Infectious
    "fever", "chills", "body pain", "body ache", "fatigue", "weakness",
    # Dermatology
    "skin rash",
    # Ophthalmology
    "blurred vision",
    # Other common
    "sweating", "loss of appetite", "headache",
]

# ─────────────────────────────────────────────
# SYNONYM MAP
# Covers colloquial, Indian English, and typo variants
# ─────────────────────────────────────────────
SYNONYM_MAP = {
    # Stomach / GI
    "stomach pain":         "stomach ache",
    "tummy ache":           "stomach ache",
    "tummy pain":           "stomach ache",
    "belly ache":           "stomach ache",
    "belly pain":           "stomach ache",
    "abdominal pain":       "stomach ache",
    "abdominal ache":       "stomach ache",
    "stomak pain":          "stomach ache",
    "my stomach hurts":     "stomach ache",
    "loose motions":        "diarrhea",
    "loose stool":          "diarrhea",
    "loose stools":         "diarrhea",
    "watery stool":         "diarrhea",
    "watery motions":       "diarrhea",
    "motions":              "diarrhea",
    "loose motion":         "diarrhea",
    "throw up":             "vomiting",
    "throwing up":          "vomiting",
    "puking":               "vomiting",
    "puke":                 "vomiting",
    "vomit":                "vomiting",
    "feel like vomiting":   "nausea",
    "feel like throwing up":"nausea",

    # Body / Musculoskeletal
    "body aches":           "body pain",
    "body is paining":      "body pain",
    "whole body pain":      "body pain",
    "muscle pain":          "body pain",
    "muscle ache":          "body pain",
    "muscular pain":        "body pain",
    "leg pain":             "joint pain",
    "knee pain":            "joint pain",
    "arm pain":             "joint pain",
    "leg is hurting":       "joint pain",
    "legs are hurting":     "joint pain",

    # Head
    "headache":             "severe headache",
    "head pain":            "severe headache",
    "head ache":            "severe headache",
    "head is paining":      "severe headache",
    "head hurts":           "severe headache",
    "migraine":             "severe headache",

    # Breathing
    "breathless":           "shortness of breath",
    "breathlessness":       "shortness of breath",
    "can't breathe":        "shortness of breath",
    "cannot breathe":       "shortness of breath",
    "difficulty breathing": "shortness of breath",
    "trouble breathing":    "shortness of breath",

    # Fatigue / Weakness
    "tired":                "fatigue",
    "tiredness":            "fatigue",
    "exhausted":            "fatigue",
    "no energy":            "fatigue",
    "weak":                 "weakness",
    "feeling weak":         "weakness",

    # Temperature / Chills
    "shivering":            "chills",
    "rigors":               "chills",
    "cold chills":          "chills",
    "feeling cold":         "chills",
    "high temperature":     "fever",
    "running temperature":  "fever",
    "running a fever":      "fever",
    "high fever":           "fever",
    "mild fever":           "fever",
    "slight fever":         "fever",

    # Loss of appetite
    "not eating":           "loss of appetite",
    "no appetite":          "loss of appetite",
    "don't feel like eating":"loss of appetite",
}

# ─────────────────────────────────────────────
# NEGATION WORDS
# ─────────────────────────────────────────────
NEGATION_WORDS = {
    "no", "not", "none", "without", "zero",
    "don't", "dont", "doesn't", "doesnt",
    "does not", "do not", "did not", "didnt",
    "not feeling", "never", "absent", "deny", "denies",
}

# ─────────────────────────────────────────────
# DETAIL EXTRACTION PATTERNS
# ─────────────────────────────────────────────
SEVERITY_HIGH   = ["severe", "extremely", "very bad", "unbearable", "terrible",
                   "excruciating", "10/10", "9/10", "8/10"]
SEVERITY_MEDIUM = ["moderate", "bad", "medium", "5/10", "6/10", "7/10",
                   "not great", "quite bad"]
SEVERITY_LOW    = ["mild", "a little", "slight", "minor", "light",
                   "1/10", "2/10", "3/10", "4/10", "a bit", "little"]

PAIN_SHARP    = ["sharp", "stabbing", "shooting", "piercing", "knife"]
PAIN_DULL     = ["dull", "achy", "constant", "throbbing"]
PAIN_PRESSURE = ["pressure", "tight", "squeezing", "crushing", "heavy"]


# ─────────────────────────────────────────────
# CORE HELPERS
# ─────────────────────────────────────────────
def is_negated(text: str, match_index: int) -> bool:
    """Check the 5 words before the match for negation words."""
    prefix_words = text[:match_index].split()[-5:]
    for word in prefix_words:
        clean = word.strip(".,!?;:").lower()
        if clean in NEGATION_WORDS:
            return True
    return False


def _check_and_classify(
    pattern_str:    str,
    canonical:      str,
    text:           str,
    found:          set,
    negated:        set,
    method:         str,
    methods_used:   set
):
    """Find pattern in text, classify as found or negated."""
    for match in re.finditer(r'\b' + re.escape(pattern_str) + r'\b', text):
        methods_used.add(method)
        if is_negated(text, match.start()):
            negated.add(canonical)
        else:
            found.add(canonical)


# ─────────────────────────────────────────────
# MAIN EXTRACTION — CURRENT MESSAGE ONLY
# History is handled by ConversationMemory, not here.
# ─────────────────────────────────────────────
def extract_symptoms_with_confidence(text: str, history: list = None) -> Dict:
    """
    Extract symptoms from the CURRENT MESSAGE ONLY.
    Returns:
      {
        "symptoms":   [canonical symptom strings],
        "negated":    [negated symptom strings],
        "confidence": float,
        "methods":    [str]
      }

    NOTE: `history` param kept for API compatibility but is intentionally ignored.
    Memory accumulation is done in chatbot.py via merge_memory().
    """
    found_symptoms   = set()
    negated_symptoms = set()
    methods_used     = set()

    text_lower = text.lower()

    # 1. Direct keyword match
    for sym in COMMON_SYMPTOMS:
        _check_and_classify(sym, sym, text_lower,
                            found_symptoms, negated_symptoms, "keyword", methods_used)

    # 2. Synonym map
    for syn, canonical in SYNONYM_MAP.items():
        _check_and_classify(syn, canonical, text_lower,
                            found_symptoms, negated_symptoms, "synonym", methods_used)

    # 3. Fuzzy match (rapidfuzz optional)
    if process and fuzz:
        words  = text_lower.split()
        chunks = []
        for i in range(len(words)):
            chunks.append((words[i], text_lower.find(words[i])))
            if i < len(words) - 1:
                c = f"{words[i]} {words[i+1]}"
                chunks.append((c, text_lower.find(c)))
            if i < len(words) - 2:
                c = f"{words[i]} {words[i+1]} {words[i+2]}"
                chunks.append((c, text_lower.find(c)))

        for chunk, idx in chunks:
            neg = is_negated(text_lower, idx)

            # Against canonical list
            res = process.extractOne(chunk, COMMON_SYMPTOMS, scorer=fuzz.ratio)
            if res and res[1] >= 85:
                if neg:
                    negated_symptoms.add(res[0])
                else:
                    found_symptoms.add(res[0])
                methods_used.add("fuzzy")

            # Against synonym keys
            res2 = process.extractOne(chunk, list(SYNONYM_MAP.keys()), scorer=fuzz.ratio)
            if res2 and res2[1] >= 85:
                canonical = SYNONYM_MAP[res2[0]]
                if neg:
                    negated_symptoms.add(canonical)
                else:
                    found_symptoms.add(canonical)
                methods_used.add("fuzzy")

    # A symptom cannot be both found and negated in the same message.
    # Negation wins (safer for medical context).
    found_symptoms -= negated_symptoms

    symptoms_list = list(found_symptoms)

    # Confidence score
    confidence = 0.0
    if symptoms_list:
        confidence = 0.5 + (0.1 * len(methods_used)) + (0.05 * min(len(symptoms_list), 4))
        confidence = min(confidence, 1.0)

    logger.info(
        f"Extraction | text='{text}' | found={symptoms_list} "
        f"| negated={list(negated_symptoms)} | conf={confidence:.2f}"
    )

    return {
        "symptoms":   symptoms_list,
        "negated":    list(negated_symptoms),
        "confidence": confidence,
        "methods":    list(methods_used),
    }


def extract_symptoms(text: str, history: list = None) -> List[str]:
    """Legacy wrapper — keeps existing import compatibility."""
    return extract_symptoms_with_confidence(text, history)["symptoms"]


# ─────────────────────────────────────────────
# DETAIL EXTRACTION
# ─────────────────────────────────────────────
def extract_symptom_details(text: str) -> Dict:
    """
    Extracts structured detail fields from free text.
    Returns only fields that are actually found (None otherwise).
    """
    details = {
        "duration":           None,
        "severity":           None,
        "temperature":        None,
        "vomiting_frequency": None,
        "chills":             None,
        "pain_type":          None,
    }
    t = text.lower()

    # ── Duration ─────────────────────────────────────────────────────────────
    # Numeric: "for 3 days", "since 2 hours"
    m = re.search(r'(for|since)\s+(\d+\s+(days?|weeks?|months?|hours?|years?))', t)
    if m:
        details["duration"] = m.group(2)
    else:
        # Relative: "since this morning", "since yesterday", "since today morning"
        m2 = re.search(
            r'(since|from)\s+(today|this morning|yesterday|last night|last week|'
            r'this afternoon|this evening|morning|yesterday night)',
            t
        )
        if m2:
            details["duration"] = m2.group(0)

    # ── Severity ─────────────────────────────────────────────────────────────
    if any(w in t for w in SEVERITY_HIGH):
        details["severity"] = "high"
    elif any(w in t for w in SEVERITY_MEDIUM):
        details["severity"] = "medium"
    elif any(w in t for w in SEVERITY_LOW):
        details["severity"] = "low"

    # Numeric scale e.g. "7 out of 10", "7/10"
    scale_m = re.search(r'(\d{1,2})\s*(?:/|out of)\s*10', t)
    if scale_m:
        score = int(scale_m.group(1))
        if score >= 8:
            details["severity"] = "high"
        elif score >= 5:
            details["severity"] = "medium"
        else:
            details["severity"] = "low"

    # ── Temperature ──────────────────────────────────────────────────────────
    temp_m = re.search(
        r'(\d{2,3}(?:\.\d)?)\s*'
        r'(degrees?|°f|°c|\bf\b|\bc\b|celsius|fahrenheit)',
        t
    )
    if temp_m:
        details["temperature"] = temp_m.group(1)

    # ── Vomiting frequency ───────────────────────────────────────────────────
    freq_m = re.search(r'(\d+|once|twice|thrice)\s*(times?\s*)?(a day|today|per day)?', t)
    if freq_m and any(w in t for w in ["vomit", "throw", "puke", "vomiting"]):
        details["vomiting_frequency"] = freq_m.group(0).strip()

    # ── Chills (yes/no answer detection) ─────────────────────────────────────
    chills_affirmatives = ["yes", "yeah", "experiencing chills", "have chills",
                           "chills", "shivering", "rigors", "feeling cold"]
    chills_negatives    = ["no chills", "no shivering", "not shivering",
                           "no rigors", "without chills"]
    if any(w in t for w in chills_negatives):
        details["chills"] = False
    elif any(w in t for w in chills_affirmatives):
        details["chills"] = True

    # ── Pain type ─────────────────────────────────────────────────────────────
    if any(w in t for w in PAIN_SHARP):
        details["pain_type"] = "sharp"
    elif any(w in t for w in PAIN_PRESSURE):
        details["pain_type"] = "pressure"
    elif any(w in t for w in PAIN_DULL):
        details["pain_type"] = "dull"

    return details
