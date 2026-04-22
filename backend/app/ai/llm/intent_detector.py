from enum import Enum
from typing import List

class Intent(str, Enum):
    CHOICE_ANALYZE  = "choice_analyze"
    CHOICE_BOOK     = "choice_book"
    CHOICE_QUERY    = "choice_query"
    PROVIDE_SYMPTOMS = "provide_symptoms"
    REQUEST_ANALYSIS = "request_analysis"
    ANALYZE_NOW      = "analyze_now"
    BOOK_APPOINTMENT = "book_appointment"
    CONFIRM          = "confirm"
    DENY             = "deny"
    RESTART          = "restart"
    GENERAL_QUERY    = "general_query"


# ─────────────────────────────────────────────
# KEYWORD SETS
# Order of checks matters — more specific first
# ─────────────────────────────────────────────
_RESTART_KW      = {"restart", "start over", "start again", "reset", "begin again"}
_ANALYZE_NOW_KW  = {"analyze now", "check now", "tell me now", "show results",
                    "what do i have", "that's all", "thats all", "done",
                    "no more", "proceed", "go ahead"}
_CONFIRM_KW      = {"yes", "yeah", "yep", "sure", "ok", "okay", "correct",
                    "right", "confirm", "please book", "go ahead", "proceed",
                    "sounds good", "that works"}
_DENY_KW         = {"no", "nope", "nah", "not now", "skip", "cancel",
                    "don't book", "dont book", "no thanks"}
_BOOK_KW         = {"book", "appointment", "schedule", "reserve", "fix appointment",
                    "make appointment", "see a doctor"}
_ANALYSIS_KW     = {"analyze", "analysis", "diagnose", "diagnosis",
                    "what is it", "result", "results", "tell me"}
_SYMPTOM_KW      = {"pain", "ache", "hurt", "hurting", "fever", "cough", "feel",
                    "feeling", "dizzy", "dizziness", "nausea", "vomit", "vomiting",
                    "rash", "sweat", "sweating", "tired", "fatigue", "weak",
                    "weakness", "headache", "chills", "shivering", "diarrhea",
                    "loose motion", "breathless", "chest", "stomach", "body pain",
                    "body ache", "temperature", "cold", "running"}


def detect_intent(text: str, history: List[dict] = None) -> Intent:
    """
    Rule-based intent detection on CURRENT MESSAGE ONLY.
    Uses word-boundary matching to avoid false positives
    (e.g., "ok" inside "book" should not trigger CONFIRM).
    """
    t     = text.lower().strip()
    words = set(re.sub(r'[^\w\s]', '', t).split())

    # ── Restart (highest priority) ───────────────────────────────────────────
    if words & _RESTART_KW or any(kw in t for kw in _RESTART_KW):
        return Intent.RESTART

    # ── Analyze now (explicit trigger) ───────────────────────────────────────
    if any(kw in t for kw in _ANALYZE_NOW_KW):
        return Intent.ANALYZE_NOW

    # ── Confirm / Deny ───────────────────────────────────────────────────────
    # Only trigger if the message is SHORT (likely a direct reply)
    # This prevents "yes I have fever" from being treated as pure CONFIRM
    is_short = len(words) <= 5
    if is_short:
        if words & _CONFIRM_KW:
            return Intent.CONFIRM
        if words & _DENY_KW:
            return Intent.DENY

    # ── Booking intent ───────────────────────────────────────────────────────
    # Check for booking ONLY when NOT combined with symptom description
    # "I have fever and want to book" → PROVIDE_SYMPTOMS (symptoms take priority)
    has_book_kw    = any(kw in t for kw in _BOOK_KW)
    has_symptom_kw = any(kw in t for kw in _SYMPTOM_KW)

    if has_book_kw and not has_symptom_kw:
        return Intent.BOOK_APPOINTMENT

    # ── Analysis request ─────────────────────────────────────────────────────
    has_analysis_kw = any(kw in t for kw in _ANALYSIS_KW)
    if has_analysis_kw and not has_symptom_kw:
        return Intent.REQUEST_ANALYSIS

    # ── Symptom provision ────────────────────────────────────────────────────
    if has_symptom_kw:
        return Intent.PROVIDE_SYMPTOMS

    # ── Start screen choices ─────────────────────────────────────────────────
    if "analyze" in t and "symptom" in t:
        return Intent.CHOICE_ANALYZE
    if "book" in t and "appointment" in t:
        return Intent.CHOICE_BOOK

    # ── Long confirm (e.g., "yes please go ahead") ───────────────────────────
    if words & _CONFIRM_KW:
        return Intent.CONFIRM
    if words & _DENY_KW:
        return Intent.DENY

    return Intent.GENERAL_QUERY


# ── needed for word-boundary cleanup ────────────────────────────────────────
import re
