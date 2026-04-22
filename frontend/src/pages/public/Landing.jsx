import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import { SPECIALIZATIONS } from '../../utils/data'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function Landing() {
  useScrollReveal()

  return (
    <PublicLayout>
      {/* ── HERO ── */}
      <section className="hero-section" style={{ 
        minHeight: 'calc(80vh - 140px)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 5% 80px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div className="hero-content" style={{ maxWidth: 800, position: 'relative', zIndex: 2 }}>
          <div className="reveal hero-badge" style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100, border: '1px solid var(--border-g)',
            background: 'rgba(26,212,143,0.06)', fontSize: 11, fontWeight: 700,
            color: 'var(--green-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 28
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-dim)', animation: 'pulse 2s infinite' }} />
            Now accepting new patients
          </div>
          
          <h1 className="reveal hero-title" style={{ fontSize: 'clamp(40px, 6vw, 76px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 24 }}>
            Advanced Care,<br />
            <span style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Closer to Home.</span>
          </h1>
          
          <p className="reveal hero-sub" style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 400, lineHeight: 1.7, maxWidth: 600, margin: '0 auto 40px' }}>
            MaxCare+ brings world-class multi-speciality healthcare to the heart of the city with 50+ specialists, cutting-edge diagnostics, and patient-first care.
          </p>

          <div className="reveal hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
            <Link to="/book" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: 16 }}>Book Appointment</Link>
            <Link to="/doctors" className="btn btn-outline" style={{ padding: '16px 40px', fontSize: 16 }}>Meet Our Doctors</Link>
          </div>

          <div className="reveal stats-grid" style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 40, borderTop: '1px solid var(--border)' }}>
            {[
              { n: '50+', l: 'Specialists' },
              { n: '20+', l: 'Departments' },
              { n: '24/7', l: 'Emergency' },
              { n: '12K+', l: 'Patients' }
            ].map(s => (
              <div key={s.l} style={{ minWidth: 100 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.n}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMERGENCY BAR ── */}
      <div className="reveal emergency-bar" style={{ 
        margin: '0 5% 80px', padding: '32px 48px',
        background: 'linear-gradient(90deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.03) 100%)',
        border: '1px solid rgba(220,38,38,0.15)', borderRadius: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span className="emergency-icon" style={{ fontSize: 48 }}>🚨</span>
          <div>
            <div style={{ fontSize: 10, color: '#b91c1c', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>24/7 Emergency Helpline</div>
            <div className="emergency-num" style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 800, color: '#7f1d1d', lineHeight: 1 }}>+91 98765 00000</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginTop: 6 }}>Trauma · Cardiac · Stroke · Maternity</div>
          </div>
        </div>
        <div className="emergency-pills" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['🫀 Cardiac ICU', '🧠 Neuro ICU', '👶 NICU', '🏥 24h OT'].map(p => (
            <div key={p} style={{ padding: '8px 16px', borderRadius: 100, border: '1px solid rgba(220,38,38,0.15)', background: 'white', fontSize: 12, fontWeight: 700, color: '#991b1b' }}>{p}</div>
          ))}
        </div>
      </div>

      {/* ── DEPARTMENTS PREVIEW ── */}
      <section style={{ padding: '100px 5% 120px', background: 'var(--navy-2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="section-label">
              <span className="icon" style={{ fontSize: 14 }}>medical_services</span>
              OUR DEPARTMENTS
            </div>
          </div>
          <h2 className="reveal section-title" style={{ textAlign: 'center' }}>Every speciality,<br />under one roof.</h2>
          <p className="reveal section-sub" style={{ textAlign: 'center', margin: '0 auto 64px' }}>From routine consultations to complex surgical interventions — MaxCare+ covers the full spectrum of medical specialities.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {SPECIALIZATIONS.slice(0, 4).map(s => (
              <div key={s.name} className="glass-card reveal" style={{ position: 'relative', overflow: 'hidden' }}>
                <span className="icon" style={{ fontSize: 40, marginBottom: 20, display: 'block', color: 'var(--blue)' }}>{s.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>{s.desc}</p>
                <Link to="/specializations" style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Learn More <span className="icon" style={{ fontSize: 16 }}>arrow_forward</span></Link>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--grad)' }} />
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Link to="/specializations" className="btn btn-outline" style={{ border: '1px solid var(--border)', padding: '14px 40px' }}>View All Specialities</Link>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section style={{ padding: '120px 5%' }}>
        <div className="reveal glass-card" style={{ 
          background: 'var(--navy-3)', textAlign: 'center', padding: '80px 40px',
          border: '1px solid var(--border)', borderRadius: 40
        }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 20 }}>Book your visit in 60 seconds.</h2>
          <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 40px' }}>
            Experience healthcare redefined. Pick your department, choose a slot, and get instant confirmation.
          </p>
          <Link to="/book" className="btn btn-primary" style={{ padding: '18px 60px', fontSize: 18, borderRadius: 14 }}>Book Appointment Now</Link>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .emergency-bar { flexDirection: column; textAlign: center; padding: 32px 20px !important; margin-bottom: 60px !important; }
          .emergency-num { fontSize: 30px !important; }
          .stats-grid { gap: 24px !important; }
        }
        @media (max-width: 480px) {
          .hero-title { fontSize: 36px !important; }
          .hero-section { padding-top: 40px !important; min-height: auto !important; }
        }
      `}</style>
    </PublicLayout>
  )
}
