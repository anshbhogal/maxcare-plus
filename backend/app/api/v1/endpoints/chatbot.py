import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import List, Optional, Dict

from app.db.database import get_db
from app.models.doctor import Doctor
from app.api.v1.endpoints.symptom_checker import symptom_check, SymptomRequest
from app.ai.llm.symptom_parser import extract_symptoms_with_confidence, extract_symptom_details
from app.ai.llm.intent_detector import detect_intent, Intent
from app.ai.llm.response_generator import generate_chatbot_response
from app.ai.llm.state_manager import (
    ChatState, ConversationManager, ConversationMemory,
    MemoryDetails, merge_memory, MAX_REFINE_TURNS
)
from app.ai.clarification.question_generator import (
    generate_questions, resolve_questions, QUESTION_BANK
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────
class Message(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message:       str
    history:       List[Message]        = []
    session_state: ChatState            = ChatState.START
    memory:        Optional[ConversationMemory] = None

class ChatResponse(BaseModel):
    response:           str
    intent:             str
    session_state:      ChatState
    extracted_symptoms: List[str]
    memory:             ConversationMemory
    symptom_analysis:   Optional[Dict]  = None

class FeedbackRequest(BaseModel):
    symptoms:    List[str]
    predictions: List[str]
    is_helpful:  bool


# ─────────────────────────────────────────────
# MAIN CHATBOT ENDPOINT
# ─────────────────────────────────────────────
@router.post("/chatbot", response_model=ChatResponse)
async def chatbot_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    """
    MaxCare+ v2 Orchestrator
    ────────────────────────
    Flow:
      1. Extract symptoms from CURRENT message only (not history)
      2. Merge delta into persistent ConversationMemory
      3. Detect intent from current message
      4. FSM transition with hard exit conditions
      5. Run analysis if entering ANALYZING state
      6. Generate follow-up questions (key-based dedup)
      7. Build response
    """
    try:
        # ── Init memory ───────────────────────────────────────────────────────
        if not req.memory:
            req.memory = ConversationMemory()
        if not req.memory.details:
            req.memory.details = MemoryDetails()

        current_turn = len(req.history)

        # ── Step 1: Extract from current message ONLY ─────────────────────────
        extraction   = extract_symptoms_with_confidence(req.message)
        new_symptoms = extraction["symptoms"]
        neg_symptoms = extraction.get("negated", [])
        extr_conf    = extraction["confidence"]

        new_details  = extract_symptom_details(req.message)

        # ── Step 2: Merge into memory ─────────────────────────────────────────
        req.memory = merge_memory(
            req.memory,
            new_symptoms,
            neg_symptoms,
            new_details,
            current_turn,
        )

        if req.memory.contradictions:
            logger.warning(f"Contradictions: {req.memory.contradictions}")

        # ── Step 3: Intent detection ──────────────────────────────────────────
        intent = detect_intent(req.message)

        logger.info(
            f"Turn {current_turn} | msg='{req.message}' "
            f"| new_symptoms={new_symptoms} | neg={neg_symptoms} "
            f"| total_symptoms={req.memory.symptoms} "
            f"| intent={intent} | state={req.session_state}"
        )

        # ── Step 4: FSM transition ────────────────────────────────────────────
        ml_confidence    = 1.0
        symptom_results  = None

        # Pre-flight: run analysis early if we're about to exit REFINING
        about_to_analyze = (
            req.session_state == ChatState.REFINING and (
                intent in [Intent.REQUEST_ANALYSIS, Intent.ANALYZE_NOW] or
                len(req.memory.symptoms) >= 4 or
                req.memory.refine_turn_count >= MAX_REFINE_TURNS
            )
        )
        if about_to_analyze and req.memory.symptoms:
            symptom_results, ml_confidence = await _run_analysis(req)

        next_state = ConversationManager.get_next_state(
            current_state=req.session_state,
            intent=intent,
            memory=req.memory,
            ml_confidence=ml_confidence,
            extraction_confidence=extr_conf,
        )

        # Increment refine counter AFTER the transition decision
        if next_state == ChatState.REFINING:
            req.memory.refine_turn_count += 1

        logger.info(f"FSM: {req.session_state} → {next_state}")

        # ── Step 5: Run analysis if entering ANALYZING ────────────────────────
        booking_data = None

        if next_state in [ChatState.ANALYZING, ChatState.RECOMMENDING, ChatState.BOOKING]:
            if not symptom_results and req.memory.symptoms:
                symptom_results, _ = await _run_analysis(req)

            if next_state == ChatState.BOOKING and symptom_results:
                booking_data = await _fetch_doctors(
                    db, symptom_results.get("recommended_department")
                )

        # ── Step 6: Generate follow-up questions ──────────────────────────────
        follow_up_text = None

        if next_state == ChatState.REFINING:
            new_keys = generate_questions(
                symptoms=req.memory.symptoms,
                memory_details=req.memory.details.model_dump(),
                asked_question_keys=req.memory.asked_question_keys,
                refine_turn_count=req.memory.refine_turn_count,
            )
            if new_keys:
                req.memory.asked_question_keys.extend(new_keys)
                follow_up_text = resolve_questions(new_keys)
                logger.info(f"Questions asked: {new_keys}")

        # ── Step 7: Build response ────────────────────────────────────────────
        response_text = generate_chatbot_response(
            state=next_state,
            symptom_results=symptom_results,
            booking_data=booking_data,
            symptoms=req.memory.symptoms,
            follow_up_questions=follow_up_text,
            contradictions=req.memory.contradictions,
            last_user_message=req.message,
        )

        return ChatResponse(
            response=response_text,
            intent=intent,
            session_state=next_state,
            extracted_symptoms=req.memory.symptoms,
            memory=req.memory,
            symptom_analysis=symptom_results,
        )

    except Exception as e:
        logger.error(f"Chatbot error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Conversation failed")


# ─────────────────────────────────────────────
# FEEDBACK
# ─────────────────────────────────────────────
@router.post("/chatbot/feedback")
async def feedback_endpoint(req: FeedbackRequest):
    try:
        logger.info(
            f"Feedback | helpful={req.is_helpful} "
            f"| symptoms={req.symptoms} | predictions={req.predictions}"
        )
        return {"status": "success", "message": "Feedback recorded for future ML training."}
    except Exception as e:
        logger.error(f"Feedback storage failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to store feedback")


# ─────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────
async def _run_analysis(req: ChatRequest):
    """Run symptom_check and return (results_dict, ml_confidence)."""
    symptom_req = SymptomRequest(
        symptoms=req.memory.symptoms,
        duration=req.memory.details.duration,
        severity=req.memory.details.severity,
    )
    result = await symptom_check(symptom_req)
    if hasattr(result, "model_dump"):
        result = result.model_dump()

    ml_conf = 1.0
    ml_pred = result.get("ml_prediction")
    if ml_pred and ml_pred.get("top_confidence"):
        ml_conf = ml_pred["top_confidence"]

    return result, ml_conf


async def _fetch_doctors(db: Session, dept: Optional[str]) -> Dict:
    """Fetch top 3 available doctors for a given department."""
    query = db.query(Doctor).filter(Doctor.is_available == True)
    if dept:
        query = query.filter(Doctor.specialization.ilike(f"%{dept}%"))
    doctors = query.order_by(desc(Doctor.is_available), Doctor.id).limit(3).all()
    return {
        "doctors": [
            {"name": d.full_name, "specialization": d.specialization}
            for d in doctors
        ]
    }
