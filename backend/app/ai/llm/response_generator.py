from typing import Dict, Optional, List
from app.ai.llm.state_manager import ChatState

DISCLAIMER = (
    "\n\n❗ **Disclaimer:** This is AI-assisted triage, not a medical diagnosis. "
    "Always consult a qualified doctor. Call emergency services if you feel this is urgent."
)


def generate_chatbot_response(
    state:              ChatState,
    symptom_results:    Optional[Dict]  = None,
    booking_data:       Optional[Dict]  = None,
    symptoms:           List[str]       = None,
    follow_up_questions: List[str]      = None,     # human-readable strings (already resolved from keys)
    contradictions:     List[str]       = None,
    last_user_message:  str             = "",
) -> str:
    """
    Generates the assistant's reply for every FSM state.

    Key improvements over v1:
    - COLLECTING is skipped when symptoms already present on first message
    - REFINING acknowledges what the user just said, not a generic prefix
    - Contradiction warnings are surfaced naturally
    - No random.choice() — responses are deterministic and context-aware
    - Analysis output includes differential (from DDXPlus) when available
    """
    symptoms       = symptoms or []
    contradictions = contradictions or []

    # ─────────────────────────────────────────
    # START
    # ─────────────────────────────────────────
    if state == ChatState.START:
        return (
            "Hello! I'm your MaxCare+ AI Assistant 👋\n"
            "How can I help you today?\n\n"
            "• **Analyze your symptoms** — describe what you're feeling\n"
            "• **Book an appointment** — I'll find the right specialist\n"
            "• **Health queries** — ask me anything"
        )

    # ─────────────────────────────────────────
    # COLLECTING
    # Only shown when user picked "Analyze" from the menu
    # WITHOUT describing symptoms yet.
    # ─────────────────────────────────────────
    if state == ChatState.COLLECTING:
        return (
            "I'm ready to help. Please describe what you're experiencing — "
            "include as much detail as you can, like when it started and how severe it feels."
        )

    # ─────────────────────────────────────────
    # REFINING
    # ─────────────────────────────────────────
    if state == ChatState.REFINING:
        lines = []

        # Acknowledge symptoms heard
        if symptoms:
            sym_str = _format_list(symptoms)
            lines.append(f"Got it — I've noted {sym_str}.")
        else:
            lines.append("I need a bit more information to assess this accurately.")

        # Surface contradictions naturally
        if contradictions:
            lines.append("")
            lines.append(f"⚠️ I noticed something worth clarifying: {contradictions[-1]}")

        # Ask follow-up questions
        if follow_up_questions:
            lines.append("")
            lines.append("To help me analyze this better, could you tell me:")
            for q in follow_up_questions:
                lines.append(f"• {q}")
        else:
            # No more questions — nudge to proceed
            lines.append("")
            lines.append(
                "I think I have enough to work with. "
                "Type **'analyze now'** to see your results, "
                "or add any details you haven't mentioned yet."
            )

        return "\n".join(lines)

    # ─────────────────────────────────────────
    # ANALYZING / RECOMMENDING
    # ─────────────────────────────────────────
    if state in [ChatState.ANALYZING, ChatState.RECOMMENDING] and symptom_results:
        dept     = symptom_results.get("recommended_department", "General Medicine")
        urgency  = symptom_results.get("urgency", "medium").upper()
        reasoning = symptom_results.get("reasoning", "")
        advice   = symptom_results.get("advice", "")

        lines = []
        lines.append("🔍 **Analysis Summary**")
        lines.append(f"• **Department:** {dept}")
        lines.append(f"• **Urgency:** {urgency}")
        lines.append("")

        # Possible conditions — include DDXPlus differential if available
        conditions = symptom_results.get("possible_conditions", [])
        ml         = symptom_results.get("ml_prediction")
        differential = []
        if ml and not ml.get("suppressed") and ml.get("differential"):
            differential = ml["differential"]

        if conditions or differential:
            lines.append("🧠 **Possible Conditions**")
            seen = set()
            for c in conditions[:3]:
                lines.append(f"• {c}")
                seen.add(c.lower())
            # Add DDX conditions not already listed
            for d in differential[:2]:
                if d.lower() not in seen:
                    lines.append(f"• {d} *(differential)*")
                    seen.add(d.lower())
            lines.append("")

        if reasoning:
            lines.append("⚠️ **Risk Assessment**")
            lines.append(reasoning)
            lines.append("")

        lines.append("📅 **Recommended Action**")
        lines.append(advice)

        if urgency == "HIGH":
            lines.append("")
            lines.append("🚨 **Please seek immediate medical attention.**")
        else:
            lines.append("")
            lines.append(f"Would you like me to find an available specialist in **{dept}**? (Yes / No)")

        return "\n".join(lines) + DISCLAIMER

    # Fallback if results not yet available
    if state == ChatState.ANALYZING:
        return "Analyzing your symptoms now, please wait a moment…"

    # ─────────────────────────────────────────
    # BOOKING
    # ─────────────────────────────────────────
    if state == ChatState.BOOKING:
        if booking_data and booking_data.get("doctors"):
            lines = ["Here are the top available specialists for you:\n"]
            for d in booking_data["doctors"][:3]:
                lines.append(f"• **Dr. {d['name']}** — {d['specialization']}")
            lines.append("\nWould you like me to confirm a booking? (Yes / No)")
            return "\n".join(lines) + DISCLAIMER
        return (
            "I can help you book an appointment. "
            "Please describe your symptoms or let me know which department you need."
        )

    # ─────────────────────────────────────────
    # COMPLETED
    # ─────────────────────────────────────────
    if state == ChatState.COMPLETED:
        return (
            "✅ You're all set! Your appointment has been noted.\n"
            "Is there anything else I can help you with? (Type **'restart'** to begin again)"
        )

    return "I'm here to help. Type **'restart'** if you'd like to start over."


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _format_list(items: List[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + ", and " + items[-1]
