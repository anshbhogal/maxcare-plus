"""
disease_predictor.py
─────────────────────
Drop-in replacement for the original disease_predictor.py.
Loads 3 models trained by the Colab notebook:
  - disease_model.pkl    → pathology prediction (49 conditions)
  - urgency_model.pkl    → urgency (low/medium/high)
  - dept_model.pkl       → hospital department
  + conditions_map.json  → enriches predictions at runtime
  + model_meta.json      → quality gate config

Public interface (unchanged):
  get_ml_prediction(symptoms: List[str]) → Dict
"""

import os
import json
import logging
import joblib
from typing import List, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Model directory ──────────────────────────────────────────────────────────
# Place the 5 files from Google Drive here:
#   app/ml/predictors/models/
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

# ── Quality gate ─────────────────────────────────────────────────────────────
MIN_CLASSES  = 10      # refuse predictions if model has fewer classes
MIN_SAMPLES  = 1_000   # refuse if trained on fewer samples


class DDXPlusPredictor:

    def __init__(self):
        self.disease_model  = None
        self.urgency_model  = None
        self.dept_model     = None
        self.conditions_map = {}
        self.model_meta     = {}
        self._ready         = False
        self._load()

    def _load(self):
        required = ['disease_model.pkl', 'urgency_model.pkl',
                    'dept_model.pkl',    'conditions_map.json']
        missing = [f for f in required
                   if not os.path.exists(os.path.join(MODELS_DIR, f))]
        if missing:
            logger.warning(
                f"DDXPlus models not found: {missing}. "
                f"Expected in: {MODELS_DIR}. "
                "Run the Colab notebook and copy models here."
            )
            return

        try:
            self.disease_model = joblib.load(os.path.join(MODELS_DIR, 'disease_model.pkl'))
            self.urgency_model = joblib.load(os.path.join(MODELS_DIR, 'urgency_model.pkl'))
            self.dept_model    = joblib.load(os.path.join(MODELS_DIR, 'dept_model.pkl'))

            with open(os.path.join(MODELS_DIR, 'conditions_map.json'), encoding='utf-8') as f:
                self.conditions_map = json.load(f)

            meta_path = os.path.join(MODELS_DIR, 'model_meta.json')
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    self.model_meta = json.load(f)

            # Quality gate
            n_classes = self.model_meta.get('n_classes', 0)
            n_train   = self.model_meta.get('n_train',   0)
            if n_classes < MIN_CLASSES or n_train < MIN_SAMPLES:
                logger.warning(
                    f"Model quality gate failed: n_classes={n_classes}, n_train={n_train}. "
                    "Suppressing predictions."
                )
                return

            self._ready = True
            logger.info(
                f"DDXPlus models loaded. "
                f"Pathologies={n_classes}, "
                f"Train={n_train:,}, "
                f"TopAcc={self.model_meta.get('disease_val_acc','?')}, "
                f"Top3Acc={self.model_meta.get('disease_top3_acc','?')}"
            )

        except Exception as e:
            logger.error(f"Failed to load DDXPlus models: {e}")

    def predict(self, symptoms: List[str]) -> Dict:
        """
        Returns:
        {
          'predictions': [
            {'disease', 'confidence', 'department', 'urgency', 'icd10'},
            ...  top 3
          ],
          'top_confidence':    float,
          'predicted_urgency': str,     # from urgency model
          'predicted_dept':    str,     # from department model
          'differential':      [str],   # disease names, top 3
          'suppressed':        bool,
        }
        """
        if not self._ready:
            return self._suppressed('Model not ready.')
        if not symptoms:
            return self._suppressed('No symptoms provided.')

        # Build input text — same format as training (pipe-separated)
        text = ' | '.join(s.lower().strip() for s in symptoms if s.strip())

        try:
            # ── Disease prediction ────────────────────────────────────────────
            proba   = self.disease_model.predict_proba([text])[0]
            classes = self.disease_model.classes_
            top3    = np.argsort(proba)[-3:][::-1]

            predictions = []
            for idx in top3:
                conf    = float(proba[idx])
                disease = classes[idx]
                if conf < 0.03:
                    continue
                cond = self.conditions_map.get(disease, {})
                predictions.append({
                    'disease':    disease,
                    'confidence': round(conf, 3),
                    'department': cond.get('department', 'General Medicine & Diabetes'),
                    'urgency':    cond.get('urgency',    'medium'),
                    'icd10':      cond.get('icd10',      ''),
                })

            if not predictions:
                return self._suppressed('All predictions below threshold.')

            # ── Urgency prediction ────────────────────────────────────────────
            try:
                predicted_urgency = self.urgency_model.predict([text])[0]
            except Exception:
                predicted_urgency = predictions[0]['urgency']

            # ── Department prediction ─────────────────────────────────────────
            try:
                predicted_dept = self.dept_model.predict([text])[0]
            except Exception:
                predicted_dept = predictions[0]['department']

            return {
                'predictions':       predictions,
                'top_confidence':    predictions[0]['confidence'],
                'predicted_urgency': predicted_urgency,
                'predicted_dept':    predicted_dept,
                'differential':      [p['disease'] for p in predictions],
                'suppressed':        False,
            }

        except Exception as e:
            logger.error(f"DDXPlus prediction error: {e}")
            return self._suppressed(str(e))

    @staticmethod
    def _suppressed(reason: str) -> Dict:
        return {
            'predictions':       [],
            'top_confidence':    0.0,
            'predicted_urgency': 'medium',
            'predicted_dept':    'General Medicine & Diabetes',
            'differential':      [],
            'suppressed':        True,
            'reason':            reason,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_predictor: Optional[DDXPlusPredictor] = None

def get_predictor() -> DDXPlusPredictor:
    global _predictor
    if _predictor is None:
        _predictor = DDXPlusPredictor()
    return _predictor

def get_ml_prediction(symptoms: List[str]) -> Dict:
    """Drop-in replacement — identical interface to original disease_predictor.py."""
    return get_predictor().predict(symptoms)
