from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.api.v1.endpoints.symptom_checker import analyze_symptoms, SymptomRequest, SymptomResponse
from app.ml.predictors.disease_predictor import get_ml_prediction

app = FastAPI(
    title="MaxCare+ AI Symptom Checker Service (DDXPlus)",
    description="CPU-isolated symptom analysis — rule engine + DDXPlus differential diagnosis",
    version="2.0.0",
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URGENCY_RANK = {"low": 0, "medium": 1, "high": 2}

SYMPTOM_TO_DDX_EVIDENCE = {
    "fever":               "Do you have a fever?",
    "cough":               "Do you have a cough?",
    "chronic cough":       "Do you have a cough?",
    "chest pain":          "Do you have chest pain?",
    "shortness of breath": "Are you experiencing shortness of breath?",
    "dizziness":           "Are you experiencing dizziness?",
    "severe headache":     "Do you have a headache?",
    "headache":            "Do you have a headache?",
    "stomach ache":        "Do you have abdominal pain?",
    "nausea":              "Do you have nausea or vomiting?",
    "vomiting":            "Do you have nausea or vomiting?",
    "diarrhea":            "Do you have diarrhea?",
    "loose motion":        "Do you have diarrhea?",
    "joint pain":          "Do you have joint pain?",
    "back pain":           "Do you have back pain?",
    "body pain":           "Do you have body aches or muscle pain?",
    "body ache":           "Do you have body aches or muscle pain?",
    "skin rash":           "Do you have skin rash?",
    "blurred vision":      "Do you have blurred vision?",
    "palpitations":        "Do you have palpitations?",
    "sweating":            "Are you sweating excessively?",
    "chills":              "Do you have chills or rigors?",
    "fatigue":             "Do you have fatigue or weakness?",
    "weakness":            "Do you have fatigue or weakness?",
    "loss of appetite":    "Do you have a loss of appetite?",
}

def translate_symptoms_for_ddx(symptoms: List[str]) -> List[str]:
    """Convert user-facing symptom names to DDXPlus evidence question format."""
    return [
        SYMPTOM_TO_DDX_EVIDENCE.get(s.lower().strip(), s)
        for s in symptoms
    ]


@app.get("/health")
def health():
    from app.ml.predictors.disease_predictor import get_predictor
    p = get_predictor()
    return {
        "status":    "ok",
        "service":   "symptom_checker_ddxplus",
        "ml_ready":  p._ready,
        "n_classes": p.model_meta.get("n_classes", 0),
        "n_train":   p.model_meta.get("n_train",   0),
        "val_acc":   p.model_meta.get("disease_val_acc", None),
    }


@app.post("/analyze", response_model=SymptomResponse)
def analyze(req: SymptomRequest):
    """
    Two-layer analysis:
      Layer 1 — Rule engine:  department, urgency, known conditions  (source of truth)
      Layer 2 — DDXPlus ML:   differential diagnosis enrichment      (insight layer)

    Fusion rules:
      - Rule urgency HIGH  → stays HIGH regardless of ML
      - ML urgency HIGH    → escalates even if rule says medium/low
      - ML conditions injected only if confidence >= 0.45 and model not suppressed
      - Department: rule engine decides; ML is informational only
    """
    if not req.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms provided")

    try:
        # ── Layer 1 ───────────────────────────────────────────────────────────
        result       = analyze_symptoms(req)
        rule_urgency = result.get("urgency", "low")

        # ── Layer 2 ───────────────────────────────────────────────────────────
        ml_result = None
        try:
            ddx_symptoms = translate_symptoms_for_ddx(req.symptoms)
            ml_result = get_ml_prediction(ddx_symptoms)
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")

        if ml_result and not ml_result.get("suppressed"):
            predictions  = ml_result.get("predictions", [])
            ml_urgency   = ml_result.get("predicted_urgency", "low")

            # Urgency fusion — escalate only, never de-escalate
            if URGENCY_RANK.get(ml_urgency, 0) > URGENCY_RANK.get(rule_urgency, 0):
                result["urgency"] = ml_urgency
                logger.info(f"ML escalated urgency: {rule_urgency} → {ml_urgency}")

            # Inject high-confidence ML conditions
            existing = {c.lower() for c in result.get("possible_conditions", [])}
            for pred in predictions[:3]:
                if pred["confidence"] >= 0.45:
                    label = f"{pred['disease']} (DDX {pred['confidence']:.0%})"
                    if pred["disease"].lower() not in existing:
                        result["possible_conditions"].append(label)
                        existing.add(pred["disease"].lower())

            # Append DDX narrative to reasoning
            if ml_result.get("differential"):
                diff_str = ", ".join(ml_result["differential"][:3])
                result["reasoning"] = (
                    result.get("reasoning", "") +
                    f" DDXPlus differential: {diff_str}."
                )

            result["ml_prediction"] = ml_result
        else:
            result["ml_prediction"] = None
            if ml_result and ml_result.get("suppressed"):
                logger.warning(f"ML suppressed: {ml_result.get('reason')}")

        return result

    except Exception as e:
        logger.error(f"Symptom analysis failure: {e}")
        raise HTTPException(status_code=500, detail="Analysis engine error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
