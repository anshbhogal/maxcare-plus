import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import api from '../../api/client'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { Spinner } from '../../components/common'

// ─────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────
const FSM_STATES = {
  start: "START",
  collecting: "COLLECTING",
  refining: "REFINING",
  analyzing: "ANALYZING",
  recommending: "RECOMMENDING",
  booking: "BOOKING",
  completed: "COMPLETED",
};

const STATE_COLORS = {
  start: "#64748b",
  collecting: "#3b82f6",
  refining: "#8b5cf6",
  analyzing: "#f59e0b",
  recommending: "#10b981",
  booking: "#06b6d4",
  completed: "#22c55e",
};

const INITIAL_MEMORY = {
  symptoms: [],
  details: { duration: null, severity: null, temperature: null, vomiting_frequency: null },
  asked_questions: []
};

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function FSMDiagram({ currentState }) {
  const states = Object.keys(FSM_STATES);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", padding: "10px 0" }}>
      {states.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            background: currentState === s ? STATE_COLORS[s] : "rgba(255,255,255,0.07)",
            color: currentState === s ? "#fff" : "rgba(255,255,255,0.35)",
            border: `1px solid ${currentState === s ? STATE_COLORS[s] : "rgba(255,255,255,0.1)"}`,
            transition: "all 0.3s ease",
            letterSpacing: "0.5px",
            boxShadow: currentState === s ? `0 0 12px ${STATE_COLORS[s]}66` : "none",
          }}>
            {FSM_STATES[s]}
          </div>
          {i < states.length - 1 && (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MemoryPanel({ memory, department, urgency, possibleConditions, sessionState }) {
  return (
    <div style={{
      background: "var(--navy-2)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      fontSize: "12px",
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{ color: "#64748b", marginBottom: "10px", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>
        ◈ Live Memory State
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {memory.symptoms && memory.symptoms.length > 0 && (
          <div>
            <span style={{ color: "#64748b" }}>symptoms: </span>
            <span style={{ color: "#a78bfa" }}>[{memory.symptoms.join(", ")}]</span>
          </div>
        )}
        {memory.details?.duration && (
          <div>
            <span style={{ color: "#64748b" }}>duration: </span>
            <span style={{ color: "#34d399" }}>{memory.details.duration}</span>
          </div>
        )}
        {memory.details?.severity && (
          <div>
            <span style={{ color: "#64748b" }}>severity: </span>
            <span style={{ color: "#fb923c" }}>{memory.details.severity}/10</span>
          </div>
        )}
        {memory.details?.temperature && (
          <div>
            <span style={{ color: "#64748b" }}>temperature: </span>
            <span style={{ color: "#fb923c" }}>{memory.details.temperature}</span>
          </div>
        )}
        {memory.details?.vomiting_frequency && (
          <div>
            <span style={{ color: "#64748b" }}>vomiting_frequency: </span>
            <span style={{ color: "#fb923c" }}>{memory.details.vomiting_frequency}</span>
          </div>
        )}
        {department && (
          <div>
            <span style={{ color: "#64748b" }}>department: </span>
            <span style={{ color: "#38bdf8" }}>{department}</span>
          </div>
        )}
        {urgency && urgency !== "normal" && (
          <div>
            <span style={{ color: "#64748b" }}>urgency: </span>
            <span style={{ color: urgency === "high" ? "#ef4444" : "#f59e0b" }}>⚠ {urgency.toUpperCase()}</span>
          </div>
        )}
        {possibleConditions && possibleConditions.length > 0 && (
          <div>
            <span style={{ color: "#64748b" }}>possible: </span>
            <span style={{ color: "#e2e8f0" }}>{possibleConditions.join(", ")}</span>
          </div>
        )}
        <div>
          <span style={{ color: "#64748b" }}>stage: </span>
          <span style={{ color: STATE_COLORS[sessionState] || "#fff" }}>
            {FSM_STATES[sessionState] || sessionState}
          </span>
        </div>
        {memory.asked_questions && memory.asked_questions.length > 0 && (
          <div>
            <span style={{ color: "#64748b" }}>asked: </span>
            <span style={{ color: "#94a3b8" }}>[{memory.asked_questions.join(", ")}]</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor, onBook }) {
  return (
    <div style={{
      background: "rgba(56,189,248,0.08)",
      border: "1px solid rgba(56,189,248,0.2)",
      borderRadius: "10px",
      padding: "12px 14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "8px",
    }}>
      <div>
        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "13px" }}>{doctor.name}</div>
        <div style={{ color: "#38bdf8", fontSize: "11px", marginTop: "2px" }}>{doctor.specialization}</div>
      </div>
      <button
        onClick={() => onBook(doctor)}
        style={{
          background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          padding: "7px 14px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Book
      </button>
    </div>
  );
}

function ChatBubble({ msg, onBookDoctor }) {
  const isUser = msg.role === "user";
  const isEmergency = msg.urgency === "high";

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: "10px",
      alignItems: "flex-start",
      marginBottom: "16px",
      animation: "fadeSlideIn 0.3s ease forwards",
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
        boxShadow: isEmergency ? "0 0 20px rgba(239,68,68,0.5)" : "none",
      }}>
        {isUser ? "👤" : isEmergency ? "🚨" : "⚕"}
      </div>

      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Bubble */}
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))"
            : isEmergency
            ? "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.15))"
            : "var(--navy-2)",
          border: `1px solid ${isUser ? "rgba(139,92,246,0.3)" : isEmergency ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "12px 16px",
          color: "var(--text)",
          fontSize: "14px",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>

        {/* Doctor cards if available */}
        {msg.doctors && msg.doctors.length > 0 && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Available Specialists
            </div>
            {msg.doctors.map((d, i) => (
              <DoctorCard key={i} doctor={d} onBook={onBookDoctor} />
            ))}
          </div>
        )}

        <div style={{ color: "#475569", fontSize: "11px", textAlign: isUser ? "right" : "left" }}>
          {formatTime(new Date(msg.timestamp))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────
export default function SymptomChecker() {
  useScrollReveal();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([{
    id: 1,
    role: "assistant",
    content: "Hello! I'm the MaxCare+ AI Medical Assistant. 👋\n\nI'm here to help understand your symptoms and guide you to the right specialist. Please describe what you're experiencing — be as detailed as you like.",
    timestamp: Date.now(),
    urgency: "normal",
  }]);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState(INITIAL_MEMORY);
  const [sessionState, setSessionState] = useState("start");
  const [department, setDepartment] = useState(null);
  const [urgency, setUrgency] = useState("normal");
  const [possibleConditions, setPossibleConditions] = useState([]);
  const [showMemory, setShowMemory] = useState(true);
  const [bookedDoctor, setBookedDoctor] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleBookDoctor = useCallback((doctor) => {
    setBookedDoctor(doctor);
    const confirmMsg = {
      id: Date.now(),
      role: "assistant",
      content: `✅ Appointment Confirmed!\n\nDoctor: ${doctor.name}\nDepartment: ${doctor.specialization}\n\nPlease arrive 10 minutes early and bring any previous medical records. You'll receive a confirmation SMS shortly.\n\nTake care! 🏥`,
      timestamp: Date.now(),
      urgency: "normal",
    };
    setMessages(prev => [...prev, confirmMsg]);
    setSessionState("completed");
  }, []);

  const sendMessage = useCallback(async (textOverride = null) => {
    const userText = textOverride || input.trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Use clean history for the backend
      const history = messages.map(m => ({
        role: m.role,
        text: m.content
      }));

      // Direct backend integration - using the robust FSM and safety engine
      const res = await api.post('/ai/chatbot', { 
        message: userText,
        history: history,
        session_state: sessionState,
        memory: memory
      });
      
      const data = res.data;
      
      // Sanitizing and updating memory safely
      const newMemory = data.memory || memory;
      setMemory(prev => ({
        ...prev,
        ...newMemory,
        details: {
          ...prev.details,
          ...(newMemory.details || {})
        }
      }));
      setSessionState(data.session_state);

      let newDept = department;
      let newUrgency = "normal";
      let newConditions = [];
      let docs = [];

      // Backend provides symptom analysis which is the source of truth
      if (data.symptom_analysis) {
        newDept = data.symptom_analysis.recommended_department;
        newUrgency = data.symptom_analysis.urgency;
        newConditions = data.symptom_analysis.possible_conditions || [];
        setDepartment(newDept);
        setUrgency(newUrgency);
        setPossibleConditions(newConditions);
      }

      // Fetch real doctors if backend says RECOMMENDING or BOOKING
      if (data.session_state === "recommending" || data.session_state === "booking") {
          try {
             // Let's use the public API route to get doctors for the specified department
             const docRes = await api.get('/public/doctors', { params: { specialization: newDept } });
             if (docRes.data && docRes.data.length > 0) {
                 docs = docRes.data.slice(0, 3); // Get top 3
             }
          } catch (e) {
             console.error("Failed to fetch doctors", e);
          }
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
        urgency: newUrgency,
        department: newDept,
        doctors: docs,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: "I encountered an error connecting to the analysis engine. Please try again or contact support.",
        timestamp: Date.now(),
        urgency: "normal",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, memory, sessionState, department]);

  const handleKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const quickPrompts = [
    "I have fever and severe headache since 2 days",
    "My knee hurts when I walk, no fever",
    "Chest pain and shortness of breath",
    "Vomiting and stomach pain since morning",
  ];

  return (
    <PublicLayout>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); } to { transform: rotate(360deg); }
          }
          textarea:focus { outline: none; }
          button:active { transform: scale(0.97); }
        `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 5% 120px' }}>
        
        {/* HEADER CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
             <span className="icon" style={{ fontSize: 16 }}>psychology</span>
             AI ASSISTANT
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: "#22c55e",
                animation: "pulse 2s infinite",
              }} />
              <span style={{ color: "var(--text-dim)", fontSize: "12px", fontWeight: 600 }}>System Online</span>
            </div>
            <button
              onClick={() => setShowMemory(v => !v)}
              style={{
                background: showMemory ? "var(--blue)" : "var(--navy-2)",
                border: "none",
                color: showMemory ? "#fff" : "var(--text-dim)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {showMemory ? "Hide Memory" : "Show Memory"}
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{
          display: "grid",
          gridTemplateColumns: showMemory ? "1fr 300px" : "1fr",
          gap: "24px",
          alignItems: "start",
        }}>

          {/* CHAT COLUMN */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: 20 }}>
            {/* FSM Diagram */}
            <div style={{
              background: "var(--navy-2)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "12px 16px",
            }}>
              <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px", fontFamily: "'DM Mono', monospace" }}>
                FSM State Machine
              </div>
              <FSMDiagram currentState={sessionState} />
            </div>

            {/* Messages */}
            <div style={{
              background: "var(--navy-2)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "20px",
              height: "500px",
              overflowY: "auto",
            }}>
              {messages.map(msg => (
                <ChatBubble key={msg.id} msg={msg} onBookDoctor={handleBookDoctor} />
              ))}
              {loading && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                  }}>⚕</div>
                  <div style={{
                    background: "var(--navy-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px 18px 18px 18px",
                    padding: "12px 16px",
                    display: "flex", gap: "6px", alignItems: "center",
                  }}>
                    <Spinner size="sm" />
                    <span style={{ color: "var(--text-dim)", fontSize: "12px", marginLeft: "6px", fontFamily: "'DM Mono', monospace" }}>
                      analyzing…
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(p); inputRef.current?.focus(); }}
                    style={{
                      background: "var(--navy-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "20px",
                      color: "var(--text-dim)",
                      padding: "6px 14px",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.target.style.borderColor = "var(--blue)"}
                    onMouseLeave={e => e.target.style.borderColor = "var(--border)"}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{
              background: "var(--navy-2)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              transition: "border-color 0.2s",
            }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--blue)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe your symptoms…"
                rows={2}
                disabled={sessionState === "completed" || urgency === "high"}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "none",
                  lineHeight: "1.5",
                  opacity: (sessionState === "completed" || urgency === "high") ? 0.5 : 1
                }}
              />
              <button
                onClick={() => sendMessage(null)}
                disabled={loading || !input.trim() || sessionState === "completed" || urgency === "high"}
                style={{
                  background: loading || !input.trim() || sessionState === "completed" || urgency === "high"
                    ? "var(--navy-3)"
                    : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  border: "none",
                  borderRadius: "10px",
                  width: "40px",
                  height: "40px",
                  cursor: loading || !input.trim() || sessionState === "completed" || urgency === "high" ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  boxShadow: loading || !input.trim() || sessionState === "completed" || urgency === "high" ? "none" : "0 0 16px rgba(6,182,212,0.4)",
                }}
              >
                {loading ? <Spinner size="sm" /> : "↑"}
              </button>
            </div>
            
            {/* Interactive State Prompts */}
            {sessionState === "start" && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                   <button onClick={() => sendMessage("Analyze my symptoms")} className="section-label" style={{ marginBottom: 0, cursor: 'pointer', border: 'none' }}>🧠 Analyze Symptoms</button>
                   <button onClick={() => sendMessage("Book an appointment")} className="section-label" style={{ marginBottom: 0, cursor: 'pointer', border: 'none', background: 'rgba(26, 212, 143, 0.05)', color: 'var(--green-dim)' }}>📅 Book appointment</button>
                </div>
            )}
            {sessionState === "refining" && !loading && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                   <button onClick={() => sendMessage("Analyze now")} className="section-label" style={{ marginBottom: 0, cursor: 'pointer', border: 'none' }}>🚀 Analyze Now</button>
                </div>
            )}

            {urgency === "high" && (
                <div style={{ textAlign: "center", color: "#ef4444", fontSize: "12px", fontWeight: 700, padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                  🚨 EMERGENCY MODE ACTIVATED. PLEASE CALL EMERGENCY SERVICES. CHAT DISABLED.
                </div>
            )}

            <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "11px" }}>
              ⚠️ MaxCare+ provides guidance only. Always consult a qualified physician for medical decisions.
            </div>
          </div>

          {/* SIDEBAR */}
          {showMemory && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "80px" }}>
              <MemoryPanel
                memory={memory}
                department={department}
                urgency={urgency}
                possibleConditions={possibleConditions}
                sessionState={sessionState}
              />

              {bookedDoctor && (
                <div style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: "12px",
                  padding: "14px",
                }}>
                  <div style={{ color: "#22c55e", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>✅ APPOINTMENT BOOKED</div>
                  <div style={{ color: "var(--text)", fontSize: "13px" }}>{bookedDoctor.name}</div>
                  <div style={{ color: "#38bdf8", fontSize: "12px" }}>{bookedDoctor.specialization}</div>
                </div>
              )}

              <div style={{
                background: "var(--navy-2)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                color: "var(--text-dim)",
                lineHeight: "1.7",
              }}>
                <div style={{ color: "var(--text)", marginBottom: "6px", fontWeight: 600 }}>◈ Active Modules</div>
                <div>✓ FSM State Manager</div>
                <div>✓ Hybrid NLP Parser</div>
                <div>✓ Memory Accumulator</div>
                <div>✓ Multi-Symptom Reasoner</div>
                <div>✓ Safety Guardrails</div>
                <div>✓ Doctor Recommender</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
