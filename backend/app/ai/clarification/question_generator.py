from typing import List, Dict

# ─────────────────────────────────────────────
# QUESTION BANK
# Keys are stable identifiers — never change a key once shipped
# because they are stored in memory.asked_question_keys
# ─────────────────────────────────────────────
QUESTION_BANK: Dict[str, str] = {
    # General — always relevant
    "duration":        "How long have you been experiencing these symptoms?",
    "severity":        "How severe is it on a scale of 1–10?",

    # Fever-specific
    "temperature":     "Have you measured your temperature? If so, what was it?",
    "chills":          "Are you also experiencing chills or shivering?",

    # Chest pain
    "chest_type":      "Is the chest pain sharp, or more of a pressure / tightness?",
    "chest_sudden":    "Did the chest pain come on suddenly?",

    # Headache
    "headache_side":   "Is the headache on one side or all over?",
    "headache_light":  "Does light or sound make it worse?",

    # Stomach / GI
    "stomach_type":    "Is the stomach pain sharp, cramping, or a dull ache?",
    "stomach_food":    "Does eating make the pain better or worse?",

    # Vomiting / Nausea
    "vomit_freq":      "How many times have you vomited or felt nauseous today?",

    # Body pain / Fever together
    "body_location":   "Which parts of your body are aching the most?",

    # Sweating
    "sweat_dizzy":     "Is the sweating accompanied by dizziness or feeling faint?",

    # Diarrhea / Loose motions
    "stool_blood":     "Have you noticed any blood in your stool?",
    "stool_frequency": "Roughly how many times have you had loose motions today?",

    # Fallback
    "anything_else":   "Is there anything else you'd like to add before I analyze this?",
}

# ─────────────────────────────────────────────
# ANSWER MAP
# Maps question key → lambda that checks if memory_details already has the answer
# If it returns truthy, the question is considered answered and will be skipped
# ─────────────────────────────────────────────
ANSWER_MAP = {
    "duration":    lambda d: d.get("duration"),
    "severity":    lambda d: d.get("severity"),
    "temperature": lambda d: d.get("temperature"),
    "chills":      lambda d: d.get("chills") is not None,
    "vomit_freq":  lambda d: d.get("vomiting_frequency"),
    "chest_type":  lambda d: d.get("pain_type"),
    "stomach_type":lambda d: d.get("pain_type"),
}

MAX_REFINE_TURNS = 3
MAX_QUESTIONS_PER_TURN = 2


def _should_ask(key: str, asked_keys: List[str], memory_details: dict) -> bool:
    """Returns True if this question should be asked this turn."""
    # Already asked?
    if key in asked_keys:
        return False
    # Already answered via memory?
    checker = ANSWER_MAP.get(key)
    if checker and checker(memory_details):
        return False
    return True


def generate_questions(
    symptoms:           List[str],
    memory_details:     dict,
    asked_question_keys: List[str],
    refine_turn_count:  int = 0,
) -> List[str]:
    """
    Returns up to MAX_QUESTIONS_PER_TURN question keys to ask this turn.
    Returns empty list when:
      - refine_turn_count >= MAX_REFINE_TURNS  (hard exit signal to FSM)
      - all relevant questions already asked / answered

    The caller (chatbot.py) is responsible for:
      1. Extending memory.asked_question_keys with the returned keys
      2. Resolving keys to text via QUESTION_BANK[key]
    """
    if refine_turn_count >= MAX_REFINE_TURNS:
        return []

    symptoms_str = " ".join(symptoms).lower()
    candidates: List[str] = []

    def want(key: str):
        if _should_ask(key, asked_question_keys, memory_details):
            candidates.append(key)

    # ── Always ask duration + severity first ─────────────────────────────────
    want("duration")
    want("severity")

    # ── Symptom-specific ─────────────────────────────────────────────────────
    if "fever" in symptoms_str:
        want("temperature")
        want("chills")

    if "chest pain" in symptoms_str:
        want("chest_type")
        want("chest_sudden")

    if "severe headache" in symptoms_str or "headache" in symptoms_str:
        want("headache_side")
        want("headache_light")

    if "stomach ache" in symptoms_str:
        want("stomach_type")
        want("stomach_food")

    if "vomiting" in symptoms_str or "nausea" in symptoms_str:
        want("vomit_freq")

    if "body pain" in symptoms_str or "body ache" in symptoms_str:
        want("body_location")

    if "sweating" in symptoms_str:
        want("sweat_dizzy")

    if "diarrhea" in symptoms_str or "loose motion" in symptoms_str:
        want("stool_frequency")
        want("stool_blood")

    # ── Fallback ──────────────────────────────────────────────────────────────
    if not candidates:
        want("anything_else")

    return candidates[:MAX_QUESTIONS_PER_TURN]


def resolve_questions(keys: List[str]) -> List[str]:
    """Convert question keys → human-readable question strings."""
    return [QUESTION_BANK[k] for k in keys if k in QUESTION_BANK]
