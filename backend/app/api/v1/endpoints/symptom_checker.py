from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import logging
import httpx
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class SymptomRequest(BaseModel):
    symptoms: List[str]
    duration: Optional[str] = None
    severity: Optional[str] = None


class SymptomResponse(BaseModel):
    recommended_department: str
    possible_conditions:    List[str]
    urgency:                str
    advice:                 str
    reasoning:              str
    ml_prediction:          Optional[dict] = None


# ─────────────────────────────────────────────
# SYMPTOM ENGINE
# Expanded to cover all symptoms in symptom_parser.py COMMON_SYMPTOMS
# ─────────────────────────────────────────────
SYMPTOM_ENGINE = {
    # Cardiology
    "chest pain":          {"dept": "Cardiology",                       "conditions": ["Angina", "Myocardial Infarction", "Muscular Pain"],         "urgency": "high",   "weight": 10},
    "palpitations":        {"dept": "Cardiology",                       "conditions": ["Arrhythmia", "Anxiety", "Tachycardia"],                      "urgency": "medium", "weight": 7},

    # Pulmonology
    "shortness of breath": {"dept": "Pulmonology",                      "conditions": ["Asthma", "Bronchitis", "Pneumonia"],                         "urgency": "high",   "weight": 9},
    "chronic cough":       {"dept": "Pulmonology",                      "conditions": ["COPD", "Allergies", "Reflux"],                               "urgency": "medium", "weight": 5},
    "cough":               {"dept": "Pulmonology",                      "conditions": ["Viral Infection", "Bronchitis", "Allergies"],                "urgency": "low",    "weight": 4},

    # Neurology
    "severe headache":     {"dept": "Neurology & Neurosurgery",         "conditions": ["Migraine", "Tension Headache", "Hypertension"],              "urgency": "high",   "weight": 8},
    "headache":            {"dept": "Neurology & Neurosurgery",         "conditions": ["Migraine", "Tension Headache", "Dehydration"],               "urgency": "medium", "weight": 6},
    "dizziness":           {"dept": "Neurology & Neurosurgery",         "conditions": ["Vertigo", "Inner Ear Issue", "Dehydration"],                 "urgency": "medium", "weight": 6},
    "blurred vision":      {"dept": "Ophthalmology",                    "conditions": ["Refractive Error", "Eye Strain", "Hypertension"],            "urgency": "medium", "weight": 7},

    # Orthopaedics
    "joint pain":          {"dept": "Orthopaedics & Joint Replacement", "conditions": ["Arthritis", "Ligament Strain", "Bursitis"],                  "urgency": "low",    "weight": 5},
    "back pain":           {"dept": "Orthopaedics & Joint Replacement", "conditions": ["Disc Issue", "Muscle Strain", "Sciatica"],                   "urgency": "medium", "weight": 6},

    # Gastroenterology
    "stomach ache":        {"dept": "Gastroenterology",                 "conditions": ["Gastritis", "Food Poisoning", "Indigestion"],                "urgency": "medium", "weight": 5},
    "nausea":              {"dept": "Gastroenterology",                 "conditions": ["Food Poisoning", "Gastritis", "Viral Gastroenteritis"],       "urgency": "low",    "weight": 4},
    "vomiting":            {"dept": "Gastroenterology",                 "conditions": ["Food Poisoning", "Gastroenteritis", "Viral Infection"],       "urgency": "medium", "weight": 6},
    "diarrhea":            {"dept": "Gastroenterology",                 "conditions": ["Gastroenteritis", "Food Poisoning", "IBS"],                  "urgency": "medium", "weight": 6},
    "loose motion":        {"dept": "Gastroenterology",                 "conditions": ["Gastroenteritis", "Food Poisoning", "Infection"],             "urgency": "medium", "weight": 6},

    # General Medicine / Infectious
    "fever":               {"dept": "General Medicine & Diabetes",      "conditions": ["Viral Infection", "Flu", "Dengue", "Typhoid"],               "urgency": "medium", "weight": 8},
    "chills":              {"dept": "General Medicine & Diabetes",      "conditions": ["Viral Infection", "Malaria", "Flu"],                         "urgency": "medium", "weight": 6},
    "body pain":           {"dept": "General Medicine & Diabetes",      "conditions": ["Viral Infection", "Flu", "Dengue", "Muscle Strain"],         "urgency": "low",    "weight": 5},
    "body ache":           {"dept": "General Medicine & Diabetes",      "conditions": ["Viral Infection", "Flu", "Dengue"],                          "urgency": "low",    "weight": 5},
    "fatigue":             {"dept": "General Medicine & Diabetes",      "conditions": ["Anaemia", "Viral Infection", "Thyroid Issue"],               "urgency": "low",    "weight": 3},
    "weakness":            {"dept": "General Medicine & Diabetes",      "conditions": ["Anaemia", "Hypoglycemia", "Dehydration"],                    "urgency": "low",    "weight": 3},
    "sweating":            {"dept": "General Medicine & Diabetes",      "conditions": ["Infection", "Anxiety", "Hypoglycemia"],                      "urgency": "low",    "weight": 4},
    "loss of appetite":    {"dept": "General Medicine & Diabetes",      "conditions": ["Viral Infection", "Gastritis", "Depression"],                "urgency": "low",    "weight": 3},

    # Dermatology
    "skin rash":           {"dept": "Dermatology",                      "conditions": ["Eczema", "Allergic Reaction", "Dengue", "Dermatitis"],       "urgency": "low",    "weight": 3},
}

# ─────────────────────────────────────────────
# SYSTEMIC OVERRIDE RULES
# fever ALONE is enough to force General Medicine
# prevents "fever + leg pain → Orthopaedics"
# ─────────────────────────────────────────────
HARD_SYSTEMIC_TRIGGERS = {"fever"}
SOFT_SYSTEMIC_SYMPTOMS = {
    "vomiting", "nausea", "sweating", "dizziness",
    "chills", "body pain", "body ache", "fatigue", "weakness",
}

# These departments are NOT overridden even under systemic flag
# because they represent independent organ-level emergencies
OVERRIDE_EXEMPT_DEPTS = {"Cardiology", "Neurology & Neurosurgery", "Pulmonology"}

# ─────────────────────────────────────────────
# EMERGENCY COMBOS
# These symptom combinations force HIGH urgency immediately
# regardless of scoring engine result
# ─────────────────────────────────────────────
EMERGENCY_COMBOS = [
    {"chest pain", "shortness of breath"},
    {"chest pain", "sweating"},
    {"chest pain", "palpitations"},
    {"severe headache", "blurred vision"},
    {"shortness of breath", "palpitations"},
]


def _is_emergency(active_symptoms: List[str]) -> bool:
    s = set(active_symptoms)
    return any(combo.issubset(s) for combo in EMERGENCY_COMBOS)


def analyze_symptoms(req: SymptomRequest) -> Dict:
    user_symptoms = [
        s.lower().strip()
        for s in req.symptoms
        if s.lower().strip() in SYMPTOM_ENGINE
    ]

    if not user_symptoms:
        return {
            "recommended_department": "General Medicine & Diabetes",
            "possible_conditions":    ["General Consultation Required"],
            "urgency":                "low",
            "advice":                 "Please consult a general physician for a thorough evaluation.",
            "reasoning":              "Symptoms were not definitively matched. A standard evaluation is recommended.",
        }

    # ── Systemic override detection ──────────────────────────────────────────
    has_hard_systemic = any(s in HARD_SYSTEMIC_TRIGGERS for s in user_symptoms)
    soft_matches      = [s for s in user_symptoms if s in SOFT_SYSTEMIC_SYMPTOMS]
    has_soft_systemic = len(soft_matches) >= 2
    force_general     = has_hard_systemic or has_soft_systemic

    # ── Emergency detection ──────────────────────────────────────────────────
    is_emergency = _is_emergency(user_symptoms)

    # ── Score departments ────────────────────────────────────────────────────
    dept_scores = {}
    conditions  = set()
    max_urgency = "low"
    reasoning   = []

    for s in user_symptoms:
        data = SYMPTOM_ENGINE[s]

        if force_general and data["dept"] not in OVERRIDE_EXEMPT_DEPTS:
            dept = "General Medicine & Diabetes"
        else:
            dept = data["dept"]

        dept_scores[dept] = dept_scores.get(dept, 0) + data["weight"]
        conditions.update(data["conditions"])

        u = data["urgency"]
        if u == "high":
            max_urgency = "high"
        elif u == "medium" and max_urgency == "low":
            max_urgency = "medium"

    # ── Emergency override ───────────────────────────────────────────────────
    if is_emergency:
        max_urgency = "high"
        reasoning.append(
            "⚠️ Emergency symptom combination detected. This pattern requires immediate attention."
        )

    # ── Severity override ─────────────────────────────────────────────────────
    if req.severity == "high" and max_urgency != "high":
        max_urgency = "high"
        reasoning.append("Self-reported high severity escalates urgency.")

    # ── Reasoning narrative ──────────────────────────────────────────────────
    if max_urgency == "high" and not is_emergency:
        # FIX: guard against empty high_risk list before appending reasoning
        # Previously this produced: "High-risk symptoms present: ." with an empty list
        # when urgency was elevated only via severity override (not via high-urgency symptoms)
        high_risk = [s for s in user_symptoms if SYMPTOM_ENGINE[s]["urgency"] == "high"]
        if high_risk:
            reasoning.append(f"High-risk symptoms present: {', '.join(high_risk)}.")

    if force_general:
        trigger = (
            "fever" if has_hard_systemic
            else f"multiple systemic symptoms ({', '.join(soft_matches)})"
        )
        reasoning.append(
            f"Systemic override triggered by {trigger}. "
            "Routing to General Medicine to rule out underlying infection "
            "before specialist referral."
        )
        conditions.update(["Systemic Infection", "Viral Syndrome"])

    if not reasoning:
        if len(user_symptoms) == 1:
            reasoning.append(
                f"Isolated symptom ({user_symptoms[0]}) points to "
                f"{SYMPTOM_ENGINE[user_symptoms[0]]['dept']}."
            )
        else:
            reasoning.append(
                f"Combination of {len(user_symptoms)} symptoms analyzed. "
                "Department selected by weighted symptom scoring."
            )

    best_dept = max(dept_scores, key=dept_scores.get)

    return {
        "recommended_department": best_dept,
        "possible_conditions":    list(conditions)[:5],
        "urgency":                max_urgency,
        "advice":                 _get_advice(max_urgency, best_dept),
        "reasoning":              " ".join(reasoning),
    }


def _get_advice(urgency: str, dept: str) -> str:
    if urgency == "high":
        return (
            "⚠️ Immediate medical attention recommended. "
            "Please visit our Emergency unit or book an urgent consultation now."
        )
    elif urgency == "medium":
        return (
            f"We recommend scheduling an appointment with our {dept} department "
            "within the next 24–48 hours."
        )
    else:
        return (
            f"Your symptoms appear to be non-urgent. "
            f"A routine consultation with our {dept} specialists is advised."
        )


# ─────────────────────────────────────────────
# FASTAPI ROUTES
# ─────────────────────────────────────────────
@router.get("/health")
async def health_check():
    """Check AI status directly."""
    try:
        from app.ml.predictors.disease_predictor import get_predictor
        p = get_predictor()
        return {
            "status": "ok",
            "service": "api_gateway_direct",
            "ml_ready": p._ready,
            "n_classes": p.model_meta.get("n_classes", 0),
            "n_train": p.model_meta.get("n_train", 0)
        }
    except Exception as e:
        return {
            "status": "error",
            "ml_ready": False,
            "detail": str(e)
        }


@router.post("/symptom-check", response_model=SymptomResponse)
async def symptom_check(req: SymptomRequest):
    if not req.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms provided")

    try:
        # ── Layer 1: Rule engine (source of truth) ────────────────────────────
        result       = analyze_symptoms(req)
        rule_urgency = result.get("urgency", "low")

        # ── Layer 2: DDXPlus ML (insight layer) ───────────────────────────────
        try:
            from app.symptom_checker_main import translate_for_ddxplus
            from app.ml.predictors.disease_predictor import get_ml_prediction
            
            ddx_symptoms = translate_for_ddxplus(req.symptoms)
            ml_result    = get_ml_prediction(ddx_symptoms)
            
            if ml_result and not ml_result.get("suppressed"):
                predictions  = ml_result.get("predictions", [])
                ml_urgency   = ml_result.get("predicted_urgency", "low")

                URGENCY_RANK = {"low": 0, "medium": 1, "high": 2}
                if URGENCY_RANK.get(ml_urgency, 0) > URGENCY_RANK.get(rule_urgency, 0):
                    result["urgency"] = ml_urgency

                existing = {c.lower() for c in result.get("possible_conditions", [])}
                for pred in predictions[:3]:
                    if pred["confidence"] >= 0.45:
                        disease = pred["disease"]
                        label   = f"{disease} (DDX {pred['confidence']:.0%})"
                        if disease.lower() not in existing:
                            result["possible_conditions"].append(label)
                            existing.add(disease.lower())

                if ml_result.get("differential"):
                    diff_str = ", ".join(ml_result["differential"][:3])
                    result["reasoning"] = (
                        result.get("reasoning", "").rstrip()
                        + f" DDXPlus differential: {diff_str}."
                    )
                result["ml_prediction"] = ml_result
        except Exception as e:
            logger.warning(f"ML enrichment failed: {e}")

        return result

    except Exception as e:
        logger.error(f"Symptom check error: {e}")
        raise HTTPException(status_code=500, detail="Analysis engine failure")
