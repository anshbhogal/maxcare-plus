import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import { SPECIALIZATIONS, SLOTS } from '../../utils/data'
import Toast from '../../components/common/Toast'
import api from '../../api/client'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function BookAppointment() {
  const [step, setStep] = useState(1)
  useScrollReveal(step)

  const [form, setForm] = useState({
    dept: '',
    date: '',
    time: '',
    name: '',
    phone: '',
    email: '',
    reason: '',
    symptoms: '',
    type: 'First Consultation'
  })
  
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // ── Realtime Calendar State ──
  const [currentDate, setCurrentDate] = useState(new Date())
  const viewMonth = currentDate.getMonth()
  const viewYear = currentDate.getFullYear()

  const nextMonth = () => setCurrentDate(new Date(viewYear, viewMonth + 1, 1))
  const prevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1)
    if (prev >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
      setCurrentDate(prev)
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  
  const handleNext = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStep(s => s + 1)
  }
  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post('/public/appointment-request', {
        full_name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        department: form.dept,
        preferred_date: form.date,
        preferred_time: form.time,
        consultation_type: form.type,
        message: `${form.reason}\n\nSymptoms: ${form.symptoms}`
      })
      setStep(4)
    } catch (err) {
      setToast({ title: 'Booking Error', message: err.response?.data?.detail || 'Something went wrong.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Specialization', 'Schedule', 'Patient Info']

  return (
    <PublicLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 5% 120px' }}>
        
        {/* ── Hero ── */}
        <section className="reveal" style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 12 }}>
            Book Your <span style={{ color: 'var(--blue)' }}>Consultation</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            Choose your department and we'll assign the best specialist for you.
          </p>
        </section>

        {/* ── Stepper ── */}
        <div className="reveal stepper-container" style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          marginBottom: 48, gap: 12, padding: '0 10px'
        }}>
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ 
                  width: 28, height: 28, borderRadius: '50%', 
                  background: step >= i + 1 ? 'var(--blue)' : 'var(--navy-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 11
                }}>{i + 1}</div>
                <span className="step-label" style={{ fontSize: 12, fontWeight: step >= i + 1 ? 700 : 500, color: step >= i + 1 ? 'var(--text)' : 'var(--text-dim)' }}>{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div style={{ width: 30, height: 1, background: 'var(--border)' }} className="step-divider" />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ minWidth: 0 }}>
          {step === 1 && (
            <div className="reveal glass-card" style={{ padding: 'clamp(20px, 5%, 40px)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>01. Choose Specialization</h2>
              <div className="spec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {SPECIALIZATIONS.map(s => (
                  <button 
                    key={s.name}
                    onClick={() => { setForm({ ...form, dept: s.name }); handleNext() }}
                    className="spec-btn"
                    style={{ 
                      padding: '12px 14px', borderRadius: 12, 
                      border: form.dept === s.name ? '2px solid var(--blue)' : '1px solid var(--border)',
                      background: form.dept === s.name ? 'rgba(26, 95, 212, 0.05)' : 'var(--navy)',
                      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s',
                      minWidth: 0
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="reveal glass-card" style={{ padding: 'clamp(20px, 5%, 40px)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>02. Select Date & Time</h2>
              
              <div className="cal-time-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
                {/* Calendar */}
                <div style={{ background: 'var(--navy-2)', padding: 20, borderRadius: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={prevMonth} className="icon" style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 20 }}>chevron_left</button>
                      <button onClick={nextMonth} className="icon" style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 20 }}>chevron_right</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', marginBottom: 12 }}>
                    {['S','M','T','W','T','F','S'].map(d => <span key={d}>{d}</span>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array(daysInMonth).fill(null).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const isPast = new Date(viewYear, viewMonth, day) < new Date().setHours(0,0,0,0)
                      const isSelected = form.date === dateStr
                      return (
                        <button 
                          key={day} disabled={isPast}
                          style={{ 
                            padding: '10px 0', borderRadius: '50%', border: 'none', cursor: isPast ? 'not-allowed' : 'pointer',
                            background: isSelected ? 'var(--blue)' : 'transparent',
                            color: isSelected ? 'white' : (isPast ? 'var(--text-dim)' : 'var(--text)'),
                            opacity: isPast ? 0.3 : 1, fontWeight: 700, fontSize: 13
                          }}
                          onClick={() => setForm({...form, date: dateStr})}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Available Slots</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Morning</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                        {SLOTS.slice(0, 6).map(t => (
                          <button key={t} style={{ padding: '10px', borderRadius: 8, border: 'none', background: form.time === t ? 'var(--blue)' : 'var(--navy-2)', color: form.time === t ? 'white' : 'var(--text)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }} onClick={() => setForm({...form, time: t})}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Afternoon</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                        {SLOTS.slice(6).map(t => (
                          <button key={t} style={{ padding: '10px', borderRadius: 8, border: 'none', background: form.time === t ? 'var(--blue)' : 'var(--navy-2)', color: form.time === t ? 'white' : 'var(--text)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }} onClick={() => setForm({...form, time: t})}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <button onClick={handleBack} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                <button onClick={handleNext} disabled={!form.date || !form.time} className="btn btn-primary" style={{ flex: 1.5, justifyContent: 'center' }}>Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="reveal glass-card" style={{ padding: 'clamp(20px, 5%, 40px)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>03. Patient Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-row-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Full Name</label>
                    <input style={{ padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none' }} placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Phone</label>
                    <input style={{ padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none' }} placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '').slice(0,10)})} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Email Address</label>
                  <input style={{ padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none' }} placeholder="john@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Reason for Visit</label>
                  <input style={{ padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none' }} placeholder="e.g. Regular Checkup" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Consultation Type</label>
                  <select style={{ padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none' }} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option>First Consultation</option><option>Follow-up</option><option>Second Opinion</option><option>Emergency OPD</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <button onClick={handleBack} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                <button onClick={handleSubmit} disabled={loading || !form.name || form.phone.length < 10} className="btn btn-primary" style={{ flex: 1.5, justifyContent: 'center' }}>{loading ? 'Processing...' : 'Confirm'}</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="reveal glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(26, 212, 143, 0.1)', color: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><span className="icon" style={{ fontSize: 40 }}>check_circle</span></div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Request Received!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 15 }}>Thank you, <b>{form.name}</b>! We'll call you shortly to confirm your visit to <b>{form.dept}</b>.</p>
              <Link to="/" className="btn btn-primary">Back to Home</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .cal-time-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .spec-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important; }
          .form-row-mobile { grid-template-columns: 1fr !important; }
          .step-label { display: none; }
          .stepper-container { gap: 8px !important; }
        }
      `}</style>
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </PublicLayout>
  )
}
