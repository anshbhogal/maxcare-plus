from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

# ─────────────────────────────────────────────
# FSM STATES
# ─────────────────────────────────────────────
class ChatState(str, Enum):
    START        = "start"
    COLLECTING   = "collecting"
    REFINING     = "refining"
    ANALYZING    = "analyzing"
    RECOMMENDING = "recommending"
    BOOKING      = "booking"
    COMPLETED    = "completed"

# ─────────────────────────────────────────────
# MEMORY MODELS
# ─────────────────────────────────────────────
class MemoryDetails(BaseModel):
    duration:           Optional[str] = None
    severity:           Optional[str] = None
    temperature:        Optional[str] = None
    vomiting_frequency: Optional[str] = None
    chills:             Optional[bool] = None   # NEW: track yes/no answers
    pain_type:          Optional[str] = None    # NEW: sharp / dull / pressure

class ConversationMemory(BaseModel):
    # Core symptom list — merged across all turns, no duplicates
    symptoms: List[str] = []

    # Detail fields
    details: MemoryDetails = Field(default_factory=MemoryDetails)

    # Question tracking — store KEYS not full strings to avoid string-match bugs
    asked_question_keys: List[str] = []

    # How many turns have been spent in REFINING state
    refine_turn_count: int = 0

    # Detected contradictions (e.g., fever + normal temp reading)
    contradictions: List[str] = []

    # Negated symptoms — so we never re-add them
    negated_symptoms: List[str] = []


# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────
MAX_REFINE_TURNS = 3   # Hard exit: after 3 REFINING turns, always move to ANALYZING


# ─────────────────────────────────────────────
# MEMORY MERGE
# ─────────────────────────────────────────────
def merge_memory(
    memory:           ConversationMemory,
    new_symptoms:     List[str],
    negated_symptoms: List[str],
    new_details:      dict,
    current_turn:     int
) -> ConversationMemory:
    """
    Merge per-turn extraction into persistent memory.

    Rules:
    - New symptoms are added only if not in negated list
    - Negated symptoms are removed from active list and added to negated list
    - Re-affirming a negated symptom logs a contradiction and re-adds it
    - Details are filled only once (never overwritten)
    - Temperature vs fever contradiction is detected
    """

    # ── Handle negations ──────────────────────────────────────────────────────
    for sym in negated_symptoms:
        if sym in memory.symptoms and sym not in memory.negated_symptoms:
            memory.contradictions.append(
                f"Turn {current_turn}: '{sym}' was previously reported but now denied."
            )
            memory.symptoms.remove(sym)
        if sym not in memory.negated_symptoms:
            memory.negated_symptoms.append(sym)

    # ── Add new symptoms ──────────────────────────────────────────────────────
    for sym in new_symptoms:
        if sym in memory.negated_symptoms:
            # Re-affirmed after negation → contradiction
            memory.contradictions.append(
                f"Turn {current_turn}: '{sym}' was previously denied but now re-reported."
            )
            memory.negated_symptoms.remove(sym)
        if sym not in memory.symptoms:
            memory.symptoms.append(sym)

    # ── Temperature vs fever contradiction ───────────────────────────────────
    temp_str = new_details.get("temperature")
    if temp_str and "fever" in memory.symptoms:
        try:
            t = float(temp_str)
            # Normal range 97–99°F or 35–37.2°C
            is_normal = (90 < t < 99.1) or (35.0 < t < 37.3)
            if is_normal:
                memory.contradictions.append(
                    f"Reported 'fever' but temperature {temp_str} is within normal range — "
                    "worth clarifying."
                )
        except ValueError:
            pass

    # ── Merge details (fill-once, never overwrite) ────────────────────────────
    d = memory.details
    if new_details.get("duration")           and not d.duration:
        d.duration           = new_details["duration"]
    if new_details.get("severity")           and not d.severity:
        d.severity           = new_details["severity"]
    if new_details.get("temperature")        and not d.temperature:
        d.temperature        = new_details["temperature"]
    if new_details.get("vomiting_frequency") and not d.vomiting_frequency:
        d.vomiting_frequency = new_details["vomiting_frequency"]
    if new_details.get("chills") is not None and d.chills is None:
        d.chills             = new_details["chills"]
    if new_details.get("pain_type")          and not d.pain_type:
        d.pain_type          = new_details["pain_type"]

    return memory


# ─────────────────────────────────────────────
# FSM TRANSITION ENGINE
# ─────────────────────────────────────────────
class ConversationManager:

    @staticmethod
    def get_next_state(
        current_state:        ChatState,
        intent:               str,
        memory:               ConversationMemory,
        ml_confidence:        float = 1.0,
        extraction_confidence: float = 1.0
    ) -> ChatState:

        symptoms = memory.symptoms

        # ── Global overrides ─────────────────────────────────────────────────
        if intent == "restart":
            return ChatState.START

        if intent in ["request_analysis", "analyze_now"]:
            return ChatState.ANALYZING

        # ── START ────────────────────────────────────────────────────────────
        if current_state == ChatState.START:
            # If user already gave symptoms in their very first message → skip COLLECTING
            if symptoms:
                return ChatState.REFINING
            if intent in ["choice_analyze", "provide_symptoms"]:
                return ChatState.COLLECTING
            if intent in ["choice_book", "book_appointment"]:
                return ChatState.BOOKING
            return ChatState.START

        # ── COLLECTING ───────────────────────────────────────────────────────
        if current_state == ChatState.COLLECTING:
            if symptoms:
                return ChatState.REFINING
            return ChatState.COLLECTING

        # ── REFINING ─────────────────────────────────────────────────────────
        if current_state == ChatState.REFINING:
            # Hard exit conditions — any one is enough to proceed
            enough_symptoms  = len(symptoms) >= 4
            enough_details   = (memory.details.duration is not None
                                and memory.details.severity is not None)
            turn_limit_hit   = memory.refine_turn_count >= MAX_REFINE_TURNS
            no_more_questions = len(memory.asked_question_keys) >= 6  # all key questions exhausted

            if enough_symptoms or enough_details or turn_limit_hit or no_more_questions:
                return ChatState.ANALYZING

            return ChatState.REFINING

        # ── ANALYZING ────────────────────────────────────────────────────────
        if current_state == ChatState.ANALYZING:
            # Only bounce back to REFINING if confidence is low AND turns remain
            if ml_confidence < 0.4 and memory.refine_turn_count < MAX_REFINE_TURNS:
                return ChatState.REFINING
            return ChatState.RECOMMENDING

        # ── RECOMMENDING ─────────────────────────────────────────────────────
        if current_state == ChatState.RECOMMENDING:
            if intent == "provide_symptoms":
                return ChatState.COLLECTING
            if intent in ["book_appointment", "confirm"]:
                return ChatState.BOOKING
            return ChatState.RECOMMENDING

        # ── BOOKING ──────────────────────────────────────────────────────────
        if current_state == ChatState.BOOKING:
            if intent == "confirm":
                return ChatState.COMPLETED
            return ChatState.BOOKING

        return current_state
