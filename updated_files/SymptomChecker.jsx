import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import api from '../../api/client'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Spinner } from '../../components/common'

// ─────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────
const FSM_STATES = {
  start:        "START",
  collecting:   "COLLECTING",
  refining:     "REFINING",
  analyzing:    "ANALYZING",
  recommending: "RECOMMENDING",
  booking:      "BOOKING",
  completed:    "COMPLETED",
}

const STATE_META = {
  start:        { color: "#64748b", label: "START",        icon: "◎" },
  collecting:   { color: "#3b82f6", label: "COLLECTING",   icon: "◉" },
  refining:     { color: "#8b5cf6", label: "REFINING",     icon: "◈" },
  analyzing:    { color: "#f59e0b", label: "ANALYZING",    icon: "◐" },
  recommending: { color: "#10b981", label: "RECOMMENDING", icon: "◑" },
  booking:      { color: "#06b6d4", label: "BOOKING",      icon: "◒" },
  completed:    { color: "#22c55e", label: "COMPLETED",    icon: "◉" },
}

// v2 memory shape — matches state_manager.py ConversationMemory
const INITIAL_MEMORY = {
  symptoms:            [],
  details:             {
    duration:           null,
    severity:           null,
    temperature:        null,
    vomiting_frequency: null,
    chills:             null,
    pain_type:          null,
  },
  asked_question_keys: [],   // v2: keys not full strings
  refine_turn_count:   0,
  contradictions:      [],
  negated_symptoms:    [],
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

// ─────────────────────────────────────────────
// FSM DIAGRAM
// ─────────────────────────────────────────────
function FSMDiagram({ currentState }) {
  const states = Object.keys(FSM_STATES)
  const currentIdx = states.indexOf(currentState)

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap", padding: "8px 0" }}>
      {states.map((s, i) => {
        const meta    = STATE_META[s]
        const active  = currentState === s
        const past    = i < currentIdx
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <div style={{
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
              background: active
                ? meta.color
                : past
                  ? `${meta.color}22`
                  : "rgba(255,255,255,0.04)",
              color: active
                ? "#fff"
                : past
                  ? `${meta.color}cc`
                  : "rgba(255,255,255,0.25)",
              border: `1px solid ${active ? meta.color : past ? `${meta.color}44` : "rgba(255,255,255,0.08)"}`,
              transition: "all 0.35s ease",
              letterSpacing: "0.5px",
              boxShadow: active ? `0 0 14px ${meta.color}55` : "none",
            }}>
              {meta.icon} {meta.label}
            </div>
            {i < states.length - 1 && (
              <div style={{
                color: past ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
                fontSize: "9px",
                transition: "color 0.3s",
              }}>→</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// MEMORY PANEL  (v2 — shows new fields)
// ─────────────────────────────────────────────
function MemoryPanel({ memory, department, urgency, possibleConditions, sessionState, differential }) {
  const meta = STATE_META[sessionState] || STATE_META.start

  const Row = ({ label, value, color = "#e2e8f0" }) => (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", lineHeight: 1.5 }}>
      <span style={{ color: "#475569", minWidth: 80, flexShrink: 0 }}>{label}:</span>
      <span style={{ color, wordBreak: "break-word" }}>{value}</span>
    </div>
  )

  return (
    <div style={{
      background: "var(--navy-2)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      fontSize: "11px",
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{
        color: "#64748b",
        marginBottom: "12px",
        fontSize: "9px",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        <span style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#22c55e",
          animation: "pulse 2s infinite",
        }} />
        Live Memory
      </div>

      <div style={{ display: "grid", gap: "7px" }}>
        {/* State */}
        <Row
          label="stage"
          value={FSM_STATES[sessionState] || sessionState}
          color={meta.color}
        />

        {/* Symptoms */}
        {memory.symptoms?.length > 0 && (
          <Row
            label="symptoms"
            value={`[${memory.symptoms.join(", ")}]`}
            color="#a78bfa"
          />
        )}

        {/* Negated */}
        {memory.negated_symptoms?.length > 0 && (
          <Row
            label="negated"
            value={`[${memory.negated_symptoms.join(", ")}]`}
            color="#ef444488"
          />
        )}

        {/* Details */}
        {memory.details?.duration && (
          <Row label="duration" value={memory.details.duration} color="#34d399" />
        )}
        {memory.details?.severity && (
          <Row label="severity" value={`${memory.details.severity}`} color="#fb923c" />
        )}
        {memory.details?.temperature && (
          <Row label="temp" value={`${memory.details.temperature}°`} color="#fb923c" />
        )}
        {memory.details?.chills != null && (
          <Row label="chills" value={memory.details.chills ? "yes" : "no"} color="#94a3b8" />
        )}
        {memory.details?.pain_type && (
          <Row label="pain_type" value={memory.details.pain_type} color="#94a3b8" />
        )}
        {memory.details?.vomiting_frequency && (
          <Row label="vomit_freq" value={memory.details.vomiting_frequency} color="#fb923c" />
        )}

        {/* Refine turn count */}
        {memory.refine_turn_count > 0 && (
          <Row
            label="refine_turns"
            value={`${memory.refine_turn_count} / 3`}
            color={memory.refine_turn_count >= 2 ? "#f59e0b" : "#64748b"}
          />
        )}

        {/* Department */}
        {department && (
          <Row label="department" value={department} color="#38bdf8" />
        )}

        {/* Urgency */}
        {urgency && urgency !== "normal" && (
          <Row
            label="urgency"
            value={`⚠ ${urgency.toUpperCase()}`}
            color={urgency === "high" ? "#ef4444" : "#f59e0b"}
          />
        )}

        {/* Conditions */}
        {possibleConditions?.length > 0 && (
          <Row
            label="conditions"
            value={possibleConditions.slice(0, 3).join(", ")}
            color="#e2e8f0"
          />
        )}

        {/* DDXPlus differential */}
        {differential?.length > 0 && (
          <Row
            label="ddx"
            value={differential.slice(0, 3).join(", ")}
            color="#818cf8"
          />
        )}

        {/* Contradictions */}
        {memory.contradictions?.length > 0 && (
          <Row
            label="⚠ conflict"
            value={memory.contradictions[memory.contradictions.length - 1]}
            color="#fbbf24"
          />
        )}

        {/* Questions asked count */}
        {memory.asked_question_keys?.length > 0 && (
          <Row
            label="asked"
            value={`${memory.asked_question_keys.length} questions`}
            color="#475569"
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DOCTOR CARD
// ─────────────────────────────────────────────
function DoctorCard({ doctor, onBook }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{
      background: hovered ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.06)",
      border: `1px solid ${hovered ? "rgba(56,189,248,0.35)" : "rgba(56,189,248,0.15)"}`,
      borderRadius: "10px",
      padding: "11px 14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "8px",
      transition: "all 0.2s",
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div>
        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "13px" }}>
          Dr. {doctor.name}
        </div>
        <div style={{ color: "#38bdf8", fontSize: "11px", marginTop: "2px" }}>
          {doctor.specialization}
        </div>
        {doctor.experience && (
          <div style={{ color: "#475569", fontSize: "10px", marginTop: "2px" }}>
            {doctor.experience} yrs exp
          </div>
        )}
      </div>
      <button
        onClick={() => onBook(doctor)}
        style={{
          background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          padding: "7px 16px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s",
          boxShadow: "0 0 12px rgba(6,182,212,0.3)",
        }}
      >
        Book
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────
function ChatBubble({ msg, onBookDoctor }) {
  const isUser      = msg.role === "user"
  const isEmergency = msg.urgency === "high"
  const isSystem    = msg.role === "system"

  if (isSystem) {
    return (
      <div style={{
        textAlign: "center",
        padding: "6px 14px",
        marginBottom: "12px",
        color: "#475569",
        fontSize: "11px",
        fontFamily: "'DM Mono', monospace",
      }}>
        — {msg.content} —
      </div>
    )
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: "10px",
      alignItems: "flex-start",
      marginBottom: "16px",
      animation: "fadeSlideIn 0.25s ease forwards",
    }}>
      {/* Avatar */}
      <div style={{
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        background: isUser
          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : isEmergency
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        flexShrink: 0,
        boxShadow: isEmergency
          ? "0 0 20px rgba(239,68,68,0.5)"
          : isUser
            ? "none"
            : "0 0 12px rgba(6,182,212,0.3)",
      }}>
        {isUser ? "👤" : isEmergency ? "🚨" : "⚕"}
      </div>

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Bubble */}
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))"
            : isEmergency
              ? "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.12))"
              : "var(--navy-2)",
          border: `1px solid ${
            isUser
              ? "rgba(139,92,246,0.3)"
              : isEmergency
                ? "rgba(239,68,68,0.45)"
                : "var(--border)"
          }`,
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "12px 16px",
          color: "var(--text)",
          fontSize: "14px",
          lineHeight: "1.65",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>

        {/* Doctor cards */}
        {msg.doctors?.length > 0 && (
          <div style={{ marginTop: "4px" }}>
            <div style={{
              color: "#64748b",
              fontSize: "10px",
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              fontFamily: "'DM Mono', monospace",
            }}>
              Available Specialists
            </div>
            {msg.doctors.map((d, i) => (
              <DoctorCard key={i} doctor={d} onBook={onBookDoctor} />
            ))}
          </div>
        )}

        {/* Analysis badge — shown on RECOMMENDING messages */}
        {msg.department && msg.urgency && msg.urgency !== "normal" && (
          <div style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            marginTop: "2px",
          }}>
            <span style={{
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.25)",
              borderRadius: "999px",
              padding: "2px 10px",
              fontSize: "10px",
              color: "#38bdf8",
              fontFamily: "'DM Mono', monospace",
            }}>
              🏥 {msg.department}
            </span>
            <span style={{
              background: msg.urgency === "high"
                ? "rgba(239,68,68,0.12)"
                : "rgba(245,158,11,0.12)",
              border: `1px solid ${msg.urgency === "high"
                ? "rgba(239,68,68,0.3)"
                : "rgba(245,158,11,0.3)"}`,
              borderRadius: "999px",
              padding: "2px 10px",
              fontSize: "10px",
              color: msg.urgency === "high" ? "#ef4444" : "#f59e0b",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 700,
            }}>
              ⚠ {msg.urgency.toUpperCase()}
            </span>
          </div>
        )}

        <div style={{
          color: "#334155",
          fontSize: "10px",
          textAlign: isUser ? "right" : "left",
          fontFamily: "'DM Mono', monospace",
        }}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// QUICK PROMPT CHIPS
// ─────────────────────────────────────────────
function QuickPrompts({ onSelect }) {
  const prompts = [
    "I have fever and body pain since this morning",
    "Chest pain and shortness of breath",
    "Vomiting and stomach pain since morning",
    "My knee hurts when I walk, no fever",
    "Severe headache and dizziness",
  ]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {prompts.map((p, i) => (
        <button
          key={i}
          onClick={() => onSelect(p)}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            color: "var(--text-dim)",
            padding: "5px 14px",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)"
            e.currentTarget.style.color = "#e2e8f0"
            e.currentTarget.style.background = "rgba(56,189,248,0.06)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--border)"
            e.currentTarget.style.color = "var(--text-dim)"
            e.currentTarget.style.background = "rgba(255,255,255,0.03)"
          }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// ACTIVE MODULES PANEL
// ─────────────────────────────────────────────
function ActiveModules({ ddxReady }) {
  const modules = [
    { label: "FSM State Manager",      active: true  },
    { label: "Hybrid NLP Parser",      active: true  },
    { label: "Memory Accumulator",     active: true  },
    { label: "Multi-Symptom Reasoner", active: true  },
    { label: "Safety Guardrails",      active: true  },
    { label: "Doctor Recommender",     active: true  },
    { label: "DDXPlus ML (1.3M pts)",  active: ddxReady },
  ]
  return (
    <div style={{
      background: "var(--navy-2)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "12px",
      fontSize: "11px",
      fontFamily: "'DM Mono', monospace",
      color: "var(--text-dim)",
      lineHeight: "1.8",
    }}>
      <div style={{ color: "var(--text)", marginBottom: "8px", fontWeight: 600, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>
        ◈ Active Modules
      </div>
      {modules.map(m => (
        <div key={m.label} style={{
          color: m.active ? "var(--text-dim)" : "#334155",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <span style={{ color: m.active ? "#22c55e" : "#334155" }}>
            {m.active ? "✓" : "○"}
          </span>
          {m.label}
          {m.label.includes("DDXPlus") && !m.active && (
            <span style={{ color: "#475569", fontSize: "9px" }}>(setup pending)</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function SymptomChecker() {
  useScrollReveal()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([{
    id: 1,
    role: "assistant",
    content: "Hello! I'm the MaxCare+ AI Medical Assistant. 👋\n\nI'm here to help understand your symptoms and guide you to the right specialist. Please describe what you're experiencing — be as detailed as you like.",
    timestamp: Date.now(),
    urgency: "normal",
  }])

  const [input,             setInput]             = useState("")
  const [loading,           setLoading]           = useState(false)
  const [memory,            setMemory]            = useState(INITIAL_MEMORY)
  const [sessionState,      setSessionState]      = useState("start")
  const [department,        setDepartment]        = useState(null)
  const [urgency,           setUrgency]           = useState("normal")
  const [possibleConditions,setPossibleConditions]= useState([])
  const [differential,      setDifferential]      = useState([])
  const [showMemory,        setShowMemory]        = useState(true)
  const [bookedDoctor,      setBookedDoctor]      = useState(null)
  const [ddxReady,          setDdxReady]          = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Check DDXPlus health on mount
  useEffect(() => {
    api.get('/ai/health').then(res => {
      setDdxReady(res.data?.ml_ready === true)
    }).catch(() => {})
  }, [])

  // ── Book doctor handler ───────────────────────────────────────────────────
  const handleBookDoctor = useCallback((doctor) => {
    setBookedDoctor(doctor)
    setMessages(prev => [...prev, {
      id:        Date.now(),
      role:      "assistant",
      content:   `✅ Appointment Confirmed!\n\nDoctor: ${doctor.name}\nDepartment: ${doctor.specialization}\n\nPlease arrive 10 minutes early and bring any previous medical records. You'll receive a confirmation SMS shortly.\n\nTake care! 🏥`,
      timestamp: Date.now(),
      urgency:   "normal",
    }])
    setSessionState("completed")
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride = null) => {
    const userText = (textOverride || input).trim()
    if (!userText || loading) return
    setInput("")

    const userMsg = {
      id:        Date.now(),
      role:      "user",
      content:   userText,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, text: m.content }))

      const res  = await api.post('/ai/chatbot', {
        message:       userText,
        history:       history,
        session_state: sessionState,
        memory:        memory,
      })
      const data = res.data

      // ── Update memory (v2 shape) ────────────────────────────────────────
      const newMemory = data.memory || {}
      setMemory(prev => ({
        ...prev,
        ...newMemory,
        symptoms:            newMemory.symptoms            ?? prev.symptoms,
        negated_symptoms:    newMemory.negated_symptoms    ?? prev.negated_symptoms,
        asked_question_keys: newMemory.asked_question_keys ?? prev.asked_question_keys,
        refine_turn_count:   newMemory.refine_turn_count   ?? prev.refine_turn_count,
        contradictions:      newMemory.contradictions      ?? prev.contradictions,
        details: {
          ...prev.details,
          ...(newMemory.details || {}),
        },
      }))

      setSessionState(data.session_state)

      // ── Extract analysis data ───────────────────────────────────────────
      let newDept       = department
      let newUrgency    = "normal"
      let newConditions = []
      let newDiff       = []
      let docs          = []

      if (data.symptom_analysis) {
        const sa   = data.symptom_analysis
        newDept       = sa.recommended_department   || newDept
        newUrgency    = sa.urgency                  || "normal"
        newConditions = sa.possible_conditions      || []
        newDiff       = sa.ml_prediction?.differential || []

        setDepartment(newDept)
        setUrgency(newUrgency)
        setPossibleConditions(newConditions)
        setDifferential(newDiff)
      }

      // ── Fetch doctors on RECOMMENDING / BOOKING ─────────────────────────
      if (["recommending", "booking"].includes(data.session_state) && newDept) {
        try {
          const docRes = await api.get('/public/doctors', {
            params: { specialization: newDept },
          })
          if (docRes.data?.length > 0) {
            docs = docRes.data.slice(0, 3)
          }
        } catch (e) {
          console.error("Failed to fetch doctors:", e)
        }
      }

      // ── Add assistant message ───────────────────────────────────────────
      setMessages(prev => [...prev, {
        id:         Date.now() + 1,
        role:       "assistant",
        content:    data.response,
        timestamp:  Date.now(),
        urgency:    newUrgency,
        department: newDept,
        doctors:    docs,
      }])

    } catch (err) {
      console.error("Chatbot error:", err)
      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        role:      "assistant",
        content:   "I encountered an error connecting to the analysis engine. Please try again or contact support.",
        timestamp: Date.now(),
        urgency:   "normal",
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, memory, sessionState, department])

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // ── Reset handler ─────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setMessages([{
      id:        Date.now(),
      role:      "assistant",
      content:   "Hello! I'm the MaxCare+ AI Medical Assistant. 👋\n\nI'm here to help understand your symptoms and guide you to the right specialist. Please describe what you're experiencing — be as detailed as you like.",
      timestamp: Date.now(),
      urgency:   "normal",
    }])
    setInput("")
    setMemory(INITIAL_MEMORY)
    setSessionState("start")
    setDepartment(null)
    setUrgency("normal")
    setPossibleConditions([])
    setDifferential([])
    setBookedDoctor(null)
    inputRef.current?.focus()
  }, [])

  const inputDisabled = sessionState === "completed" || urgency === "high"

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <PublicLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes emergencePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        textarea:focus { outline: none; }
        button:active  { transform: scale(0.97); }
      `}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 5% 120px" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            <span className="icon" style={{ fontSize: 16 }}>psychology</span>
            AI ASSISTANT
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Online indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{
                width: 7, height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                animation: "pulse 2s infinite",
              }} />
              <span style={{ color: "var(--text-dim)", fontSize: "12px", fontWeight: 600 }}>
                System Online
              </span>
            </div>

            {/* DDX badge */}
            {ddxReady && (
              <span style={{
                background: "rgba(129,140,248,0.12)",
                border: "1px solid rgba(129,140,248,0.3)",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "10px",
                color: "#818cf8",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
              }}>
                DDXPlus ✓
              </span>
            )}

            {/* Memory toggle */}
            <button
              onClick={() => setShowMemory(v => !v)}
              style={{
                background:   showMemory ? "rgba(56,189,248,0.15)" : "var(--navy-2)",
                border:       `1px solid ${showMemory ? "rgba(56,189,248,0.4)" : "var(--border)"}`,
                color:        showMemory ? "#38bdf8" : "var(--text-dim)",
                borderRadius: "8px",
                padding:      "5px 14px",
                fontSize:     "11px",
                cursor:       "pointer",
                fontWeight:   600,
                transition:   "all 0.2s",
                fontFamily:   "inherit",
              }}
            >
              {showMemory ? "Hide Memory" : "Show Memory"}
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              style={{
                background:   "transparent",
                border:       "1px solid var(--border)",
                color:        "var(--text-dim)",
                borderRadius: "8px",
                padding:      "5px 14px",
                fontSize:     "11px",
                cursor:       "pointer",
                transition:   "all 0.2s",
                fontFamily:   "inherit",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: showMemory ? "1fr 290px" : "1fr",
          gap:                 "20px",
          alignItems:          "start",
        }}>

          {/* ── CHAT COLUMN ──────────────────────────────────────────────── */}
          <div className="glass-card" style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "12px",
            padding:       20,
          }}>

            {/* FSM Diagram */}
            <div style={{
              background:   "var(--navy-2)",
              border:       "1px solid var(--border)",
              borderRadius: "12px",
              padding:      "10px 16px",
            }}>
              <div style={{
                color:         "var(--text-dim)",
                fontSize:      "9px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom:  "6px",
                fontFamily:    "'DM Mono', monospace",
              }}>
                FSM Pipeline
              </div>
              <FSMDiagram currentState={sessionState} />
            </div>

            {/* Message window */}
            <div style={{
              background:   "var(--navy-2)",
              border:       "1px solid var(--border)",
              borderRadius: "16px",
              padding:      "20px",
              height:       "500px",
              overflowY:    "auto",
            }}>
              {messages.map(msg => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  onBookDoctor={handleBookDoctor}
                />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div style={{
                  display:    "flex",
                  gap:        "10px",
                  alignItems: "center",
                  marginBottom: "16px",
                  animation:  "fadeSlideIn 0.2s ease forwards",
                }}>
                  <div style={{
                    width:          "34px",
                    height:         "34px",
                    borderRadius:   "50%",
                    background:     "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       "14px",
                    boxShadow:      "0 0 12px rgba(6,182,212,0.3)",
                  }}>⚕</div>
                  <div style={{
                    background:   "var(--navy-2)",
                    border:       "1px solid var(--border)",
                    borderRadius: "4px 18px 18px 18px",
                    padding:      "12px 16px",
                    display:      "flex",
                    gap:          "8px",
                    alignItems:   "center",
                  }}>
                    <Spinner size="sm" />
                    <span style={{
                      color:      "var(--text-dim)",
                      fontSize:   "12px",
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      analyzing…
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts — only on first load */}
            {messages.length <= 1 && (
              <QuickPrompts onSelect={p => { setInput(p); inputRef.current?.focus() }} />
            )}

            {/* Contextual action buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {sessionState === "start" && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                <>
                  <button
                    onClick={() => sendMessage("Analyze my symptoms")}
                    className="section-label"
                    style={{ marginBottom: 0, cursor: "pointer", border: "none" }}
                  >
                    🧠 Analyze Symptoms
                  </button>
                  <button
                    onClick={() => sendMessage("Book an appointment")}
                    className="section-label"
                    style={{
                      marginBottom: 0,
                      cursor:       "pointer",
                      border:       "none",
                      background:   "rgba(26,212,143,0.05)",
                      color:        "var(--green-dim)",
                    }}
                  >
                    📅 Book Appointment
                  </button>
                </>
              )}
              {sessionState === "refining" && !loading && (
                <button
                  onClick={() => sendMessage("Analyze now")}
                  className="section-label"
                  style={{ marginBottom: 0, cursor: "pointer", border: "none" }}
                >
                  🚀 Analyze Now
                </button>
              )}
              {sessionState === "recommending" && !loading && (
                <button
                  onClick={() => sendMessage("Yes, book an appointment")}
                  className="section-label"
                  style={{ marginBottom: 0, cursor: "pointer", border: "none" }}
                >
                  📅 Book Now
                </button>
              )}
              {sessionState === "completed" && (
                <button
                  onClick={handleReset}
                  className="section-label"
                  style={{ marginBottom: 0, cursor: "pointer", border: "none" }}
                >
                  ↺ Start New Consultation
                </button>
              )}
            </div>

            {/* Emergency banner */}
            {urgency === "high" && (
              <div style={{
                textAlign:    "center",
                color:        "#ef4444",
                fontSize:     "13px",
                fontWeight:   700,
                padding:      "12px",
                background:   "rgba(239,68,68,0.1)",
                borderRadius: "8px",
                border:       "1px solid rgba(239,68,68,0.3)",
                animation:    "emergencePulse 1.5s infinite",
                fontFamily:   "'DM Mono', monospace",
              }}>
                🚨 EMERGENCY DETECTED — PLEASE CALL 112 OR VISIT EMERGENCY IMMEDIATELY
              </div>
            )}

            {/* Input area */}
            <div
              style={{
                background:   "var(--navy-2)",
                border:       "1px solid var(--border)",
                borderRadius: "14px",
                padding:      "12px 16px",
                display:      "flex",
                gap:          "12px",
                alignItems:   "flex-end",
                transition:   "border-color 0.2s",
                opacity:      inputDisabled ? 0.5 : 1,
              }}
              onFocus={e => { if (!inputDisabled) e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)" }}
              onBlur={e  => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  inputDisabled
                    ? urgency === "high"
                      ? "Chat disabled — please seek immediate help"
                      : "Consultation complete"
                    : "Describe your symptoms…"
                }
                rows={2}
                disabled={inputDisabled}
                style={{
                  flex:        1,
                  background:  "transparent",
                  border:      "none",
                  color:       "var(--text)",
                  fontSize:    "14px",
                  fontFamily:  "inherit",
                  resize:      "none",
                  lineHeight:  "1.5",
                  cursor:      inputDisabled ? "not-allowed" : "text",
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim() || inputDisabled}
                style={{
                  background:     loading || !input.trim() || inputDisabled
                    ? "var(--navy-3)"
                    : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  border:         "none",
                  borderRadius:   "10px",
                  width:          "40px",
                  height:         "40px",
                  cursor:         loading || !input.trim() || inputDisabled ? "not-allowed" : "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "white",
                  fontSize:       "18px",
                  flexShrink:     0,
                  transition:     "all 0.2s",
                  boxShadow:      loading || !input.trim() || inputDisabled
                    ? "none"
                    : "0 0 16px rgba(6,182,212,0.4)",
                }}
              >
                {loading ? <Spinner size="sm" /> : "↑"}
              </button>
            </div>

            {/* Disclaimer */}
            <div style={{
              textAlign:  "center",
              color:      "var(--text-dim)",
              fontSize:   "10px",
              fontFamily: "'DM Mono', monospace",
              opacity:    0.6,
            }}>
              ⚠️ MaxCare+ provides guidance only. Always consult a qualified physician for medical decisions.
            </div>
          </div>

          {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
          {showMemory && (
            <div style={{
              display:       "flex",
              flexDirection: "column",
              gap:           "12px",
              position:      "sticky",
              top:           "80px",
            }}>
              <MemoryPanel
                memory={memory}
                department={department}
                urgency={urgency}
                possibleConditions={possibleConditions}
                sessionState={sessionState}
                differential={differential}
              />

              {/* Booked doctor card */}
              {bookedDoctor && (
                <div style={{
                  background:   "rgba(34,197,94,0.07)",
                  border:       "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "12px",
                  padding:      "14px",
                }}>
                  <div style={{
                    color:        "#22c55e",
                    fontSize:     "9px",
                    fontWeight:   700,
                    marginBottom: "8px",
                    letterSpacing:"1px",
                    textTransform:"uppercase",
                    fontFamily:   "'DM Mono', monospace",
                  }}>
                    ✅ Appointment Booked
                  </div>
                  <div style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>
                    Dr. {bookedDoctor.name}
                  </div>
                  <div style={{ color: "#38bdf8", fontSize: "11px", marginTop: "2px" }}>
                    {bookedDoctor.specialization}
                  </div>
                </div>
              )}

              <ActiveModules ddxReady={ddxReady} />
            </div>
          )}
          </div>{/* end chat column */}
        </div>{/* end main grid */}
      </div>{/* end maxWidth wrapper */}
    </PublicLayout>
  )
}

