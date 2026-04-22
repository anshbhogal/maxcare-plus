import React, { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const FSM_STATES = ["START", "COLLECTING", "REFINING", "ANALYZING", "RECOMMENDING", "BOOKING", "COMPLETED"];
const STATE_META = {
  START:        { color: "#64748b" },
  COLLECTING:   { color: "#3b82f6" },
  REFINING:     { color: "#8b5cf6" },
  ANALYZING:    { color: "#f59e0b" },
  RECOMMENDING: { color: "#10b981" },
  BOOKING:      { color: "#06b6d4" },
  COMPLETED:    { color: "#22c55e" },
};

const INITIAL_MEMORY = {
  symptoms: [],
  details: { duration: null, severity: null, temperature: null, vomiting_frequency: null },
  asked_questions: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function formatTime(date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FSMBar({ current }) {
  const currentUpper = current?.toUpperCase() || "START";
  const curIdx = FSM_STATES.indexOf(currentUpper);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap" }}>
      {FSM_STATES.map((s, i) => {
        const active = s === currentUpper;
        const past = curIdx > i;
        const col = STATE_META[s]?.color || "#ffffff";
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <div style={{
              padding: "2px 9px", borderRadius: "999px", fontSize: "9.5px",
              fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.4px",
              transition: "all 0.35s",
              background: active ? col : past ? `${col}22` : "rgba(255,255,255,0.04)",
              color: active ? "#fff" : past ? col : "rgba(255,255,255,0.22)",
              border: `1px solid ${active ? col : past ? `${col}44` : "rgba(255,255,255,0.07)"}`,
              boxShadow: active ? `0 0 14px ${col}55` : "none",
            }}>
              {s}
            </div>
            {i < FSM_STATES.length - 1 && (
              <span style={{ color: "rgba(255,255,255,0.13)", fontSize: "9px" }}>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const Label = ({ children }) => (
  <div style={{ color: "#334155", fontSize: "9.5px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
    {children}
  </div>
);

const MRow = ({ k, v }) => (
  <div style={{ display: "flex", gap: "8px" }}>
    <span style={{ color: "#334155", minWidth: "68px" }}>{k}:</span>{v}
  </div>
);

function MemPanel({ memory, sessionState, dept, urgency, conditions }) {
  const c = STATE_META[sessionState?.toUpperCase()]?.color || "#fff";
  return (
    <div style={{
      background: "rgba(0,0,0,0.38)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px", padding: "15px",
      fontFamily: "'DM Mono', monospace", fontSize: "11px", lineHeight: "2",
    }}>
      <Label>◈ Live Memory</Label>
      <MRow k="stage" v={<span style={{ color: c, fontWeight: 700 }}>{sessionState?.toUpperCase()}</span>} />
      
      {memory.symptoms?.length > 0 &&
        <MRow k="symptoms" v={<span style={{ color: "#c4b5fd" }}>[{memory.symptoms.join(", ")}]</span>} />}
      
      {memory.details?.duration && <MRow k="duration" v={<span style={{ color: "#34d399" }}>{memory.details.duration}</span>} />}
      {memory.details?.severity && <MRow k="severity" v={<span style={{ color: "#fb923c" }}>{memory.details.severity}/10</span>} />}
      {memory.details?.temperature && <MRow k="temp" v={<span style={{ color: "#34d399" }}>{memory.details.temperature}</span>} />}
      {memory.details?.vomiting_frequency && <MRow k="frequency" v={<span style={{ color: "#34d399" }}>{memory.details.vomiting_frequency}</span>} />}
      
      {dept && <MRow k="dept" v={<span style={{ color: "#38bdf8" }}>{dept}</span>} />}
      {urgency && urgency !== "normal" && (
        <MRow k="urgency" v={
          <span style={{ color: urgency === "high" || urgency === "emergency" ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
            ⚠ {urgency.toUpperCase()}
          </span>
        } />
      )}
      {conditions?.length > 0 && (
        <MRow k="possible" v={<span style={{ color: "#e2e8f0" }}>{conditions.join(", ")}</span>} />
      )}
      
      {memory.asked_questions?.length > 0 &&
        <MRow k="asked" v={<span style={{ color: "#475569" }}>[{memory.asked_questions.length} questions tracked]</span>} />}
    </div>
  );
}

function DoctorCard({ doc, onBook }) {
  return (
    <div style={{
      background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.17)",
      borderRadius: "9px", padding: "10px 13px",
      display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "7px",
    }}>
      <div>
        <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "13px" }}>{doc.name || doc.full_name}</div>
        <div style={{ color: "#38bdf8", fontSize: "11px", marginTop: "2px" }}>{doc.specialization}</div>
      </div>
      <button onClick={() => onBook(doc)} style={{
        background: "linear-gradient(135deg, #06b6d4, #3b82f6)", border: "none",
        borderRadius: "7px", color: "#fff", padding: "6px 13px",
        fontSize: "11.5px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
        Book
      </button>
    </div>
  );
}

function Bubble({ msg, onBook }) {
  const isUser = msg.role === "user";
  const isEmg = msg.urgency === "high" || msg.urgency === "emergency";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: "9px", alignItems: "flex-start", marginBottom: "17px",
      animation: "fadeIn 0.28s ease forwards",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: isUser ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : isEmg ? "linear-gradient(135deg, #ef4444, #dc2626)"
          : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px",
        boxShadow: isEmg ? "0 0 18px rgba(239,68,68,0.5)" : "none",
      }}>
        {isUser ? "👤" : isEmg ? "🚨" : "⚕"}
      </div>
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{
          background: isUser ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.16))"
            : isEmg ? "rgba(239,68,68,0.13)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isUser ? "rgba(139,92,246,0.26)" : isEmg ? "rgba(239,68,68,0.38)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "11px 15px", color: "#e2e8f0", fontSize: "13.5px", lineHeight: "1.65", whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
        {msg.showDoctors && msg.doctors?.length > 0 && (
          <div style={{ marginTop: "3px" }}>
            <div style={{ color: "#475569", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
              Available in {msg.dept}
            </div>
            {msg.doctors.map((d, i) => <DoctorCard key={i} doc={d} onBook={onBook} />)}
          </div>
        )}
        <div style={{ color: "#1a2e3a", fontSize: "10px", textAlign: isUser ? "right" : "left", display: "flex", gap: "8px", justifyContent: isUser ? "flex-end" : "flex-start" }}>
          <span>{formatTime(new Date(msg.ts))}</span>
          {msg.stateLabel && (
            <span style={{
              color: STATE_META[msg.stateLabel?.toUpperCase()]?.color || "#475569",
              fontFamily: "'DM Mono', monospace",
            }}>[{msg.stateLabel?.toUpperCase()}]</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function MaxCareChatbot() {
  const [msgs, setMsgs] = useState([{
    id: 1, role: "assistant", ts: Date.now(), urgency: "normal", stateLabel: "START",
    content: "Hello! I'm the MaxCare+ AI Assistant. 👋\n\nPlease tell me what you're experiencing — describe your symptoms naturally. The more detail you provide, the better I can guide you.\n\n⚠ This is guidance only — not a medical diagnosis.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("analyzing...");
  
  // Core AI State
  const [sessionState, setSessionState] = useState("start");
  const [memory, setMemory] = useState(INITIAL_MEMORY);
  const [department, setDepartment] = useState(null);
  const [urgency, setUrgency] = useState("normal");
  const [possibleConditions, setPossibleConditions] = useState([]);
  
  const [bookedDoc, setBookedDoc] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const handleBook = useCallback(async (doc) => {
    setBookedDoc(doc);
    setSessionState("completed");
    setMsgs(prev => [...prev, {
      id: Date.now(), role: "assistant", ts: Date.now(), urgency: "normal", stateLabel: "COMPLETED",
      content: `✅ Appointment Confirmed!\n\n👨‍⚕️ ${doc.name || doc.full_name}\n🏥 ${doc.specialization}\n\nPlease arrive 10 minutes early and bring any previous reports or test results. A confirmation SMS will be sent shortly.\n\nWishing you a swift recovery. 🏥\n\n⚠ This is guidance only — not a medical diagnosis.`,
    }]);
    
    // In a real implementation, you would post to `/api/v1/appointments` here
  }, []);

  const send = useCallback(async (textOverride = null) => {
    const text = textOverride || input.trim();
    if (!text || loading) return;
    
    setInput("");
    setMsgs(prev => [...prev, { id: Date.now(), role: "user", ts: Date.now(), content: text }]);
    setLoading(true);
    setLoadingText("analyzing symptoms...");

    try {
      // 1. Prepare history payload for backend
      const history = msgs.map(m => ({
        role: m.role,
        text: m.content
      }));

      // 2. Fetch from backend AI Endpoint
      const res = await fetch("/api/v1/ai/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization header here if needed
        },
        body: JSON.stringify({
          message: text,
          history: history,
          session_state: sessionState,
          memory: memory
        })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();
      
      // 3. Safe Memory Sync (Prevent data loss)
      const newMemory = data.memory || memory;
      setMemory(prev => ({
        ...prev,
        symptoms: newMemory.symptoms || prev.symptoms,
        details: {
          ...prev.details,
          ...(newMemory.details || {})
        },
        asked_questions: newMemory.asked_questions || prev.asked_questions
      }));
      
      const newStage = data.session_state || sessionState;
      setSessionState(newStage);

      // 4. Respect Backend Medical Logic Override
      let newDept = department;
      let newUrgency = urgency;
      let newConditions = possibleConditions;

      if (data.symptom_analysis) {
        newDept = data.symptom_analysis.recommended_department || newDept;
        newUrgency = data.symptom_analysis.urgency || newUrgency;
        newConditions = data.symptom_analysis.possible_conditions || newConditions;
        
        setDepartment(newDept);
        setUrgency(newUrgency);
        setPossibleConditions(newConditions);
      }

      // 5. Dynamic Doctor Fetching
      let docs = [];
      if ((newStage === "recommending" || newStage === "booking") && newDept) {
        setLoadingText("finding specialists...");
        try {
          const docRes = await fetch(`/api/v1/public/doctors?specialization=${encodeURIComponent(newDept)}`);
          if (docRes.ok) {
            const docData = await docRes.json();
            docs = docData.slice(0, 3); // Get top 3
          }
        } catch (e) {
          console.error("Failed to fetch doctors:", e);
        }
      }

      // 6. Commit UI Message
      setMsgs(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        ts: Date.now(),
        content: data.response || data.message || "I've noted your symptoms. Could you share a bit more?",
        urgency: newUrgency,
        dept: newDept,
        showDoctors: docs.length > 0,
        doctors: docs,
        stateLabel: newStage,
      }]);

    } catch (err) {
      console.error("Chatbot Error:", err);
      setMsgs(prev => [...prev, {
        id: Date.now() + 1, role: "assistant", ts: Date.now(), urgency: "normal",
        content: "I encountered a network error connecting to the AI core. Please check your connection and try again.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, msgs, memory, sessionState, department, urgency, possibleConditions]);

  const onKey = useCallback(e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const QUICK = [
    "I have fever and vomiting for 2 days",
    "Knee pain when walking, no fever at all",
    "Chest pain and difficulty breathing",
    "Analyze now",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        textarea:focus{outline:none}
        button{transition:all 0.2s}
      `}</style>

      {/* HEADER */}
      <header style={{
        background: "rgba(6,10,16,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 22px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: "1130px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px",
              background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "17px", boxShadow: "0 0 18px rgba(14,165,233,0.3)",
            }}>⚕</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>
                MaxCare<span style={{ color: "#06b6d4" }}>+</span>
                <span style={{
                  marginLeft: "8px", fontSize: "9.5px", fontFamily: "'DM Mono', monospace",
                  color: "#0ea5e9", background: "rgba(14,165,233,0.1)",
                  border: "1px solid rgba(14,165,233,0.22)", borderRadius: "4px", padding: "1px 6px",
                }}>v2.1 API LINKED</span>
              </div>
              <div style={{ color: "#2d4a5a", fontSize: "10px", fontFamily: "'DM Mono', monospace" }}>
                Backend Driven · Safe Medical AI · Deterministic Control
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#2d4a5a", fontSize: "11px" }}>Connected to API</span>
            </div>
            <button onClick={() => setShowPanel(v => !v)} style={{
              background: showPanel ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${showPanel ? "rgba(99,102,241,0.32)" : "rgba(255,255,255,0.08)"}`,
              color: showPanel ? "#a78bfa" : "#475569",
              borderRadius: "8px", padding: "5px 11px", fontSize: "11px", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 600,
            }}>
              {showPanel ? "◈ Memory ON" : "◈ Memory OFF"}
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{
        maxWidth: "1130px", margin: "0 auto", padding: "16px",
        display: "grid",
        gridTemplateColumns: showPanel ? "1fr 290px" : "1fr",
        gap: "16px", alignItems: "start",
      }}>

        {/* LEFT: CHAT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* FSM */}
          <div style={{
            background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "11px", padding: "11px 14px",
          }}>
            <div style={{ color: "#2d4a5a", fontSize: "9.5px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "7px", fontFamily: "'DM Mono', monospace" }}>
              Backend State Sync
            </div>
            <FSMBar current={sessionState} />
          </div>

          {/* Messages */}
          <div style={{
            background: "rgba(255,255,255,0.016)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "13px", padding: "17px",
            minHeight: "420px", maxHeight: "510px", overflowY: "auto",
          }}>
            {msgs.map(m => <Bubble key={m.id} msg={m} onBook={handleBook} />)}
            {loading && (
              <div style={{ display: "flex", gap: "9px", alignItems: "center", marginBottom: "16px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px",
                }}>⚕</div>
                <div style={{
                  background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "4px 18px 18px 18px", padding: "10px 15px",
                  display: "flex", gap: "5px", alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4",
                      animation: `pulse 1.1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                  <span style={{ color: "#2d4a5a", fontSize: "11px", marginLeft: "5px", fontFamily: "'DM Mono', monospace" }}>
                    {loadingText}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {msgs.length <= 2 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {QUICK.map((p, i) => (
                <button key={i} onClick={() => { setInput(p); inputRef.current?.focus(); }} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "20px", color: "#64748b", padding: "5px 12px",
                  fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
                }}
                  onMouseEnter={e => { e.target.style.borderColor = "rgba(6,182,212,0.38)"; e.target.style.color = "#94a3b8"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.color = "#64748b"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* EMERGENCY ALERT */}
          {(urgency === "high" || urgency === "emergency") && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "12px", padding: "12px", color: "#ef4444", textAlign: "center",
              fontSize: "12px", fontWeight: 700, animation: "pulse 2s infinite"
            }}>
              🚨 HIGH RISK SYMPTOMS DETECTED. PLEASE SEEK IMMEDIATE MEDICAL ATTENTION.
            </div>
          )}

          {/* Input */}
          <div style={{
            background: "rgba(255,255,255,0.032)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-end",
            opacity: sessionState === "completed" || urgency === "high" || urgency === "emergency" ? 0.5 : 1,
            pointerEvents: sessionState === "completed" || urgency === "high" || urgency === "emergency" ? "none" : "auto",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={sessionState === "completed" ? "Conversation finished." : "Describe your symptoms in plain language…"}
              rows={2}
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#e2e8f0", fontSize: "13.5px", fontFamily: "inherit",
                resize: "none", lineHeight: "1.55",
              }}
            />
            <button onClick={() => send(null)} disabled={loading || !input.trim()} style={{
              background: loading || !input.trim()
                ? "rgba(255,255,255,0.055)"
                : "linear-gradient(135deg, #0ea5e9, #06b6d4)",
              border: "none", borderRadius: "8px", width: "37px", height: "37px",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", flexShrink: 0, color: "white",
              boxShadow: loading || !input.trim() ? "none" : "0 0 14px rgba(6,182,212,0.38)",
            }}>
              {loading
                ? <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.22)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                : "↑"}
            </button>
          </div>
          <div style={{ textAlign: "center", color: "#1a2e38", fontSize: "10.5px" }}>
            ⚠ MaxCare+ provides guidance only. Always consult a qualified physician for medical decisions.
          </div>
        </div>

        {/* RIGHT: PANEL */}
        {showPanel && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "68px" }}>
            <MemPanel memory={memory} sessionState={sessionState} dept={department} urgency={urgency} conditions={possibleConditions} />

            {/* Architecture */}
            <div style={{
              background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "11px", padding: "13px",
              fontFamily: "'DM Mono', monospace", fontSize: "10px", lineHeight: "1.9",
            }}>
              <Label>◈ Active Backend Layers</Label>
              {[
                { c: "#3b82f6", l: "FastAPI Backend", n: "/api/ai/chatbot" },
                { c: "#8b5cf6", l: "Hybrid NLP Engine", n: "Server-side" },
                { c: "#f59e0b", l: "Memory Sync", n: "Safe merge" },
                { c: "#10b981", l: "FSM State Controller", n: "Source of Truth" },
                { c: "#06b6d4", l: "Medical Logic Engine", n: "Rule-based routing" },
                { c: "#22c55e", l: "Public Doctors API", n: "Live fetching" },
              ].map(({ c, l, n }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c, flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>{l}</span>
                  <span style={{ color: "#1e3a4a", marginLeft: "auto", fontSize: "9.5px" }}>{n}</span>
                </div>
              ))}
            </div>

            {bookedDoc && (
              <div style={{
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "11px", padding: "12px",
              }}>
                <div style={{ color: "#22c55e", fontSize: "10px", fontWeight: 700, marginBottom: "5px" }}>✅ APPOINTMENT CONFIRMED</div>
                <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>{bookedDoc.name || bookedDoc.full_name}</div>
                <div style={{ color: "#38bdf8", fontSize: "11px" }}>{bookedDoc.specialization}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
