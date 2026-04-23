import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import { SPECIALIZATIONS } from '../../utils/data'
import { useScrollReveal } from '../../hooks/useScrollReveal'

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const STATS = [
  { n: '50+',  l: 'Specialists',   icon: '👨‍⚕️' },
  { n: '20+',  l: 'Departments',   icon: '🏥' },
  { n: '24/7', l: 'Emergency',     icon: '🚨' },
  { n: '12K+', l: 'Patients',      icon: '❤️' },
]

const REVIEWS = [
  {
    name:    'Priya Sharma',
    role:    'Patient — Cardiology',
    avatar:  'PS',
    color:   '#0ea5e9',
    rating:  5,
    text:    'Dr. Mehta\'s team at MaxCare+ caught a blockage my previous hospital missed entirely. The diagnostic speed and precision here is genuinely world-class. I owe them my life.',
    dept:    'Cardiology',
    date:    'March 2024',
  },
  {
    name:    'Rajesh Iyer',
    role:    'Patient — Orthopaedics',
    avatar:  'RI',
    color:   '#10b981',
    rating:  5,
    text:    'After 3 years of chronic knee pain and two failed surgeries elsewhere, MaxCare+ had me walking pain-free within 6 weeks. The physiotherapy team is exceptional.',
    dept:    'Orthopaedics',
    date:    'January 2024',
  },
  {
    name:    'Meena Krishnaswamy',
    role:    'Patient — Neurology',
    avatar:  'MK',
    color:   '#8b5cf6',
    rating:  5,
    text:    'The AI symptom assistant flagged my migraine as a potential hypertension issue. Turned out to be exactly that. The technology here genuinely saves lives.',
    dept:    'Neurology',
    date:    'February 2024',
  },
  {
    name:    'Arjun Nair',
    role:    'Patient — Gastroenterology',
    avatar:  'AN',
    color:   '#f59e0b',
    rating:  5,
    text:    'Booking was done in under 2 minutes through the portal. The doctor had my full history ready before I even sat down. This is how healthcare should work.',
    dept:    'Gastroenterology',
    date:    'April 2024',
  },
  {
    name:    'Sunita Desai',
    role:    'Patient — Obstetrics',
    avatar:  'SD',
    color:   '#ec4899',
    rating:  5,
    text:    'My entire pregnancy was managed seamlessly at MaxCare+. The 24/7 helpline gave me peace of mind I didn\'t know I needed. Delivered healthy twins here in December.',
    dept:    'Obstetrics',
    date:    'December 2023',
  },
  {
    name:    'Vikram Patel',
    role:    'Patient — Pulmonology',
    avatar:  'VP',
    color:   '#06b6d4',
    rating:  5,
    text:    'Diagnosed with early-stage COPD that I\'d been ignoring for years. The team here was direct, compassionate, and immediately had a management plan ready. Outstanding.',
    dept:    'Pulmonology',
    date:    'May 2024',
  },
]

const HOW_IT_WORKS = [
  {
    step:  '01',
    icon:  '🧠',
    title: 'Describe Your Symptoms',
    desc:  'Our AI assistant understands natural language. Type what you\'re feeling — it extracts symptoms, detects patterns, and thinks like a clinician.',
    color: '#0ea5e9',
  },
  {
    step:  '02',
    icon:  '🔬',
    title: 'AI Analyzes & Routes',
    desc:  'The system maps your symptoms to the right department using a 1.3M-patient clinical dataset and a deterministic safety engine — no guesswork.',
    color: '#8b5cf6',
  },
  {
    step:  '03',
    icon:  '📅',
    title: 'Book in Seconds',
    desc:  'See available specialists, pick a slot, confirm. Your doctor receives a pre-built clinical summary before you even arrive.',
    color: '#10b981',
  },
]

const TRUST_BADGES = [
  { icon: '🏆', label: 'NABH Accredited',       sub: 'National Board' },
  { icon: '🔬', label: 'ISO 9001:2015',          sub: 'Quality Certified' },
  { icon: '❤️', label: '98.4% Patient Satisfaction', sub: '12K+ Reviews' },
  { icon: '🛡️', label: 'HIPAA Compliant',        sub: 'Data Protected' },
]

const FACILITIES = [
  { icon: '🖥️',  title: '256-Slice CT Scanner',    desc: 'Sub-millimetre imaging for cardiac, neuro, and oncology workups.' },
  { icon: '🧬',  title: 'Genomic Lab',              desc: 'Next-gen sequencing for precision oncology and rare disease diagnosis.' },
  { icon: '🤖',  title: 'Robotic Surgery Suite',   desc: 'Da Vinci system for minimally invasive procedures with 10x precision.' },
  { icon: '🫀',  title: 'Cardiac Cath Lab',         desc: '24/7 primary PCI capability. Door-to-balloon time under 60 minutes.' },
  { icon: '🧠',  title: '3T MRI',                   desc: 'High-field imaging for detailed neurological and musculoskeletal assessment.' },
  { icon: '👁️', title: 'LASIK Suite',               desc: 'Bladeless LASIK and cataract surgery with femtosecond laser precision.' },
]

// ─────────────────────────────────────────────
// ANIMATED MEDICAL ORBS (SVG)
// ─────────────────────────────────────────────
function MedicalOrb({ size = 300, color = '#0ea5e9', delay = 0, top, left, right, bottom, opacity = 0.12 }) {
  return (
    <div style={{
      position:  'absolute',
      top, left, right, bottom,
      width:     size,
      height:    size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
      filter:    'blur(40px)',
      animation: `orbFloat ${6 + delay}s ease-in-out infinite alternate`,
      animationDelay: `${delay}s`,
      pointerEvents: 'none',
    }} />
  )
}

// ─────────────────────────────────────────────
// FLOATING MEDICAL ICONS
// ─────────────────────────────────────────────
function FloatingIcon({ icon, top, left, right, delay = 0, size = 36 }) {
  return (
    <div style={{
      position:  'absolute',
      top, left, right,
      fontSize:  size,
      opacity:   0.08,
      animation: `iconFloat ${4 + delay}s ease-in-out infinite alternate`,
      animationDelay: `${delay * 0.7}s`,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {icon}
    </div>
  )
}

// ─────────────────────────────────────────────
// PULSING ECG LINE (SVG)
// ─────────────────────────────────────────────
function ECGLine({ color = '#0ea5e9', width = '100%' }) {
  return (
    <div style={{ width, overflow: 'hidden', opacity: 0.15, pointerEvents: 'none' }}>
      <svg viewBox="0 0 1200 60" xmlns="http://www.w3.org/2000/svg" style={{ width: '200%', animation: 'ecgScroll 4s linear infinite' }}>
        <polyline
          points="0,30 80,30 100,30 120,5 140,55 160,30 180,30 260,30 280,30 300,5 320,55 340,30 360,30 440,30 460,30 480,5 500,55 520,30 540,30 620,30 640,30 660,5 680,55 700,30 720,30 800,30 820,30 840,5 860,55 880,30 900,30 980,30 1000,30 1020,5 1040,55 1060,30 1080,30 1160,30 1200,30"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────
// STAR RATING
// ─────────────────────────────────────────────
function Stars({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// REVIEW CAROUSEL
// ─────────────────────────────────────────────
function ReviewCarousel() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef(null)

  const go = (idx) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setActive((idx + REVIEWS.length) % REVIEWS.length)
      setAnimating(false)
    }, 250)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => go(active + 1), 5000)
    return () => clearInterval(timerRef.current)
  }, [active])

  const r = REVIEWS[active]

  return (
    <div style={{ position: 'relative' }}>
      {/* Main review card */}
      <div style={{
        background:   'var(--navy-2)',
        border:       `1px solid ${r.color}33`,
        borderRadius: 24,
        padding:      '48px 56px',
        position:     'relative',
        overflow:     'hidden',
        transition:   'border-color 0.4s ease',
        opacity:      animating ? 0 : 1,
        transform:    animating ? 'translateY(8px)' : 'translateY(0)',
        transition:   'all 0.25s ease',
      }}>
        {/* Accent line */}
        <div style={{
          position:    'absolute',
          top:         0, left: 0, right: 0,
          height:      3,
          background:  `linear-gradient(90deg, ${r.color}, transparent)`,
        }} />

        {/* Quote mark */}
        <div style={{
          position:   'absolute',
          top:        24, right: 48,
          fontSize:   120,
          lineHeight: 1,
          color:      r.color,
          opacity:    0.06,
          fontFamily: 'Georgia, serif',
          userSelect: 'none',
        }}>
          "
        </div>

        <Stars count={r.rating} />

        <p style={{
          fontSize:   18,
          lineHeight: 1.75,
          color:      'var(--text)',
          margin:     '20px 0 32px',
          fontStyle:  'italic',
          maxWidth:   640,
        }}>
          "{r.text}"
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width:          52,
            height:         52,
            borderRadius:   '50%',
            background:     `linear-gradient(135deg, ${r.color}, ${r.color}88)`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       16,
            fontWeight:     800,
            color:          '#fff',
            flexShrink:     0,
            boxShadow:      `0 0 20px ${r.color}44`,
          }}>
            {r.avatar}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.role}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{
              display:      'inline-block',
              padding:      '4px 12px',
              borderRadius: 100,
              background:   `${r.color}18`,
              border:       `1px solid ${r.color}33`,
              fontSize:     11,
              fontWeight:   700,
              color:        r.color,
            }}>
              {r.dept}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{r.date}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {REVIEWS.map((rv, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width:        i === active ? 28 : 8,
                height:       8,
                borderRadius: 100,
                background:   i === active ? REVIEWS[active].color : 'rgba(255,255,255,0.15)',
                border:       'none',
                cursor:       'pointer',
                transition:   'all 0.3s ease',
                padding:      0,
              }}
            />
          ))}
        </div>

        {/* Arrows */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[['←', active - 1], ['→', active + 1]].map(([arrow, idx]) => (
            <button
              key={arrow}
              onClick={() => go(idx)}
              style={{
                width:          40,
                height:         40,
                borderRadius:   '50%',
                background:     'var(--navy-3)',
                border:         '1px solid var(--border)',
                color:          'var(--text-muted)',
                fontSize:       16,
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                transition:     'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = REVIEWS[active].color
                e.currentTarget.style.color = REVIEWS[active].color
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              {arrow}
            </button>
          ))}
        </div>
      </div>

      {/* Mini review previews */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        {REVIEWS.filter((_, i) => i !== active).slice(0, 3).map((rv, i) => (
          <div
            key={i}
            onClick={() => go(REVIEWS.indexOf(rv))}
            style={{
              background:   'var(--navy-2)',
              border:       '1px solid var(--border)',
              borderRadius: 12,
              padding:      '12px 14px',
              cursor:       'pointer',
              transition:   'all 0.2s',
              opacity:      0.6,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.borderColor = rv.color + '55'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '0.6'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: rv.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff',
              }}>
                {rv.avatar}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{rv.name}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              "{rv.text.slice(0, 60)}…"
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────
function AnimatedStat({ value, label, icon }) {
  const [displayed, setDisplayed] = useState('0')
  const ref = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasRun.current) {
        hasRun.current = true
        const numericPart = parseFloat(value.replace(/[^0-9.]/g, ''))
        const suffix      = value.replace(/[0-9.]/g, '')
        let start = 0
        const duration = 1800
        const step = 16
        const increment = numericPart / (duration / step)
        const timer = setInterval(() => {
          start += increment
          if (start >= numericPart) {
            setDisplayed(value)
            clearInterval(timer)
          } else {
            setDisplayed(Math.floor(start) + suffix)
          }
        }, step)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} style={{ minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontFamily:          'var(--font-head)',
        fontSize:            40,
        fontWeight:          800,
        background:          'var(--grad)',
        WebkitBackgroundClip:'text',
        WebkitTextFillColor: 'transparent',
        lineHeight:          1,
      }}>
        {displayed}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Landing() {
  useScrollReveal()

  return (
    <PublicLayout>
      <style>{`
        @keyframes orbFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes iconFloat {
          from { transform: translateY(0px) rotate(0deg); }
          to   { transform: translateY(-16px) rotate(8deg); }
        }
        @keyframes ecgScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .facility-card:hover {
          transform: translateY(-4px) !important;
          border-color: var(--blue) !important;
        }
        .how-card:hover .how-step-num {
          transform: scale(1.1);
        }
        @media (max-width: 1024px) {
          .emergency-bar { flex-direction: column !important; text-align: center !important; padding: 32px 20px !important; margin-bottom: 60px !important; }
          .emergency-num { font-size: 30px !important; }
          .stats-grid    { gap: 24px !important; }
          .how-grid      { grid-template-columns: 1fr !important; }
          .review-previews { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .hero-title    { font-size: 36px !important; }
          .hero-section  { padding-top: 40px !important; min-height: auto !important; }
          .facilities-grid { grid-template-columns: 1fr 1fr !important; }
          .trust-grid    { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .facilities-grid { grid-template-columns: 1fr !important; }
          .trust-grid      { grid-template-columns: 1fr 1fr !important; }
          .review-mini-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="hero-section" style={{
        minHeight: 'calc(90vh - 140px)',
        display:   'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        padding:   '60px 5% 80px',
        textAlign: 'center',
        position:  'relative',
        overflow:  'hidden',
      }}>
        {/* Background orbs */}
        <MedicalOrb size={500} color="#0ea5e9" delay={0} top="-100px" left="-100px" opacity={0.10} />
        <MedicalOrb size={400} color="#8b5cf6" delay={2} top="50px"  right="-80px"  opacity={0.08} />
        <MedicalOrb size={300} color="#10b981" delay={1} bottom="0"  left="30%"     opacity={0.07} />

        {/* Floating medical icons */}
        <FloatingIcon icon="🫀" top="15%"  left="8%"  delay={0} size={44} />
        <FloatingIcon icon="🧬" top="25%"  right="7%" delay={1} size={36} />
        <FloatingIcon icon="💊" top="60%"  left="5%"  delay={2} size={32} />
        <FloatingIcon icon="🔬" top="70%"  right="5%" delay={0.5} size={38} />
        <FloatingIcon icon="🩺" bottom="20%" left="15%" delay={1.5} size={40} />
        <FloatingIcon icon="🧠" top="10%"  left="45%" delay={2.5} size={28} />

        <div className="hero-content" style={{ maxWidth: 860, position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div className="reveal hero-badge" style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           8,
            padding:       '6px 18px',
            borderRadius:  100,
            border:        '1px solid var(--border-g)',
            background:    'rgba(26,212,143,0.07)',
            fontSize:      11,
            fontWeight:    700,
            color:         'var(--green-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom:  32,
          }}>
            <span style={{
              width:      6,
              height:     6,
              borderRadius:'50%',
              background: 'var(--green-dim)',
              animation:  'pulse 2s infinite',
            }} />
            Now accepting new patients · AI-powered triage
          </div>

          <h1 className="reveal hero-title" style={{
            fontSize:      'clamp(40px, 6vw, 80px)',
            fontWeight:    800,
            lineHeight:    1.08,
            letterSpacing: '-0.04em',
            marginBottom:  24,
          }}>
            Advanced Care,<br />
            <span style={{
              background:          'var(--grad)',
              WebkitBackgroundClip:'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Closer to Home.
            </span>
          </h1>

          <p className="reveal hero-sub" style={{
            fontSize:   18,
            color:      'var(--text-muted)',
            fontWeight: 400,
            lineHeight: 1.7,
            maxWidth:   620,
            margin:     '0 auto 44px',
          }}>
            MaxCare+ brings world-class multi-speciality healthcare to the heart of the city — with 50+ specialists,
            AI-assisted diagnosis, cutting-edge diagnostics, and patient-first care.
          </p>

          <div className="reveal hero-ctas" style={{
            display:        'flex',
            gap:            14,
            flexWrap:       'wrap',
            justifyContent: 'center',
            marginBottom:   72,
          }}>
            <Link to="/book"    className="btn btn-primary" style={{ padding: '16px 44px', fontSize: 16 }}>
              Book Appointment
            </Link>
            <Link to="/ai-assistant" className="btn btn-outline" style={{ padding: '16px 44px', fontSize: 16 }}>
              🧠 Try AI Assistant
            </Link>
            <Link to="/doctors" className="btn btn-outline" style={{ padding: '16px 44px', fontSize: 16 }}>
              Meet Our Doctors
            </Link>
          </div>

          {/* ECG line */}
          <div className="reveal" style={{ marginBottom: 40, opacity: 0.6 }}>
            <ECGLine color="#0ea5e9" />
          </div>

          {/* Stats */}
          <div className="reveal stats-grid" style={{
            display:        'flex',
            gap:            48,
            flexWrap:       'wrap',
            justifyContent: 'center',
            paddingTop:     40,
            borderTop:      '1px solid var(--border)',
          }}>
            {STATS.map(s => (
              <AnimatedStat key={s.l} value={s.n} label={s.l} icon={s.icon} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TRUST BADGES
      ══════════════════════════════════════ */}
      <div style={{ padding: '0 5% 80px' }}>
        <div className="trust-grid" style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap:                 16,
          maxWidth:            1200,
          margin:              '0 auto',
        }}>
          {TRUST_BADGES.map(b => (
            <div key={b.label} className="reveal" style={{
              background:   'var(--navy-2)',
              border:       '1px solid var(--border)',
              borderRadius: 16,
              padding:      '20px 24px',
              display:      'flex',
              alignItems:   'center',
              gap:          14,
              transition:   'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{b.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{b.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          EMERGENCY BAR
      ══════════════════════════════════════ */}
      <div className="reveal emergency-bar" style={{
        margin:     '0 5% 100px',
        padding:    '32px 48px',
        background: 'linear-gradient(90deg, rgba(220,38,38,0.09) 0%, rgba(185,28,28,0.03) 100%)',
        border:     '1px solid rgba(220,38,38,0.18)',
        borderRadius: 24,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap:        24,
        position:   'relative',
        overflow:   'hidden',
      }}>
        {/* Pulse ring */}
        <div style={{
          position:     'absolute',
          left:         48,
          top:          '50%',
          transform:    'translateY(-50%)',
          width:        64,
          height:       64,
          borderRadius: '50%',
          border:       '2px solid rgba(220,38,38,0.3)',
          animation:    'pulse 2s infinite',
          pointerEvents:'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <span className="emergency-icon" style={{ fontSize: 48, position: 'relative', zIndex: 1 }}>🚨</span>
          <div>
            <div style={{
              fontSize:      10,
              color:         '#b91c1c',
              fontWeight:    800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom:  4,
            }}>
              24/7 Emergency Helpline
            </div>
            <div className="emergency-num" style={{
              fontFamily: 'var(--font-head)',
              fontSize:   36,
              fontWeight: 800,
              color:      '#7f1d1d',
              lineHeight: 1,
            }}>
              +91 98765 00000
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginTop: 6 }}>
              Trauma · Cardiac · Stroke · Maternity · Paediatric
            </div>
          </div>
        </div>

        <div className="emergency-pills" style={{
          display:        'flex',
          gap:            10,
          flexWrap:       'wrap',
          justifyContent: 'center',
        }}>
          {['🫀 Cardiac ICU', '🧠 Neuro ICU', '👶 NICU', '🏥 24h OT', '🚑 Air Ambulance'].map(p => (
            <div key={p} style={{
              padding:      '8px 16px',
              borderRadius: 100,
              border:       '1px solid rgba(220,38,38,0.18)',
              background:   'rgba(255,255,255,0.04)',
              fontSize:     12,
              fontWeight:   700,
              color:        '#fca5a5',
            }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          HOW IT WORKS — AI ASSISTANT
      ══════════════════════════════════════ */}
      <section style={{ padding: '100px 5%', position: 'relative', overflow: 'hidden' }}>
        <MedicalOrb size={400} color="#8b5cf6" delay={0} top="-50px" right="-50px" opacity={0.06} />

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="section-label">
              <span className="icon" style={{ fontSize: 14 }}>psychology</span>
              AI-POWERED TRIAGE
            </div>
          </div>

          <h2 className="reveal section-title" style={{ textAlign: 'center' }}>
            From symptoms to specialist<br />in under 2 minutes.
          </h2>
          <p className="reveal section-sub" style={{ textAlign: 'center', margin: '0 auto 72px', maxWidth: 560 }}>
            Our clinical AI understands natural language, thinks in differentials, and routes you to exactly the right doctor — not just a department.
          </p>

          <div className="how-grid" style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 24,
            position:            'relative',
          }}>
            {/* Connector line */}
            <div style={{
              position:   'absolute',
              top:        60,
              left:       '16.66%',
              right:      '16.66%',
              height:     2,
              background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6, #10b981)',
              opacity:    0.2,
              pointerEvents: 'none',
            }} />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="reveal how-card glass-card" style={{
                textAlign:  'center',
                padding:    '40px 32px',
                position:   'relative',
                overflow:   'hidden',
                transition: 'transform 0.2s',
              }}>
                {/* Step number */}
                <div className="how-step-num" style={{
                  display:         'inline-flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  width:           48,
                  height:          48,
                  borderRadius:    '50%',
                  background:      `${step.color}18`,
                  border:          `1px solid ${step.color}44`,
                  fontSize:        13,
                  fontWeight:      800,
                  color:           step.color,
                  marginBottom:    20,
                  transition:      'transform 0.2s',
                  fontFamily:      'var(--font-head)',
                }}>
                  {step.step}
                </div>

                <div style={{ fontSize: 44, marginBottom: 16 }}>{step.icon}</div>

                <h3 style={{
                  fontSize:   17,
                  fontWeight: 800,
                  marginBottom: 12,
                  color:      'var(--text)',
                }}>
                  {step.title}
                </h3>

                <p style={{
                  fontSize:   14,
                  color:      'var(--text-muted)',
                  lineHeight: 1.65,
                }}>
                  {step.desc}
                </p>

                {/* Bottom accent */}
                <div style={{
                  position:   'absolute',
                  bottom:     0, left: 0, right: 0,
                  height:     3,
                  background: `linear-gradient(90deg, ${step.color}, transparent)`,
                }} />
              </div>
            ))}
          </div>

          <div className="reveal" style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/ai-assistant" className="btn btn-primary" style={{ padding: '16px 48px', fontSize: 16 }}>
              🧠 Try the AI Assistant Now
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DEPARTMENTS PREVIEW
      ══════════════════════════════════════ */}
      <section style={{ padding: '100px 5% 120px', background: 'var(--navy-2)', position: 'relative', overflow: 'hidden' }}>
        <MedicalOrb size={350} color="#0ea5e9" delay={1} bottom="-80px" left="-60px" opacity={0.07} />

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="section-label">
              <span className="icon" style={{ fontSize: 14 }}>medical_services</span>
              OUR DEPARTMENTS
            </div>
          </div>

          <h2 className="reveal section-title" style={{ textAlign: 'center' }}>
            Every speciality,<br />under one roof.
          </h2>
          <p className="reveal section-sub" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
            From routine consultations to complex surgical interventions — MaxCare+ covers the full spectrum of medical specialities.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {SPECIALIZATIONS.slice(0, 6).map((s, i) => (
              <div key={s.name} className="glass-card reveal" style={{
                position:   'relative',
                overflow:   'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
                animationDelay: `${i * 0.08}s`,
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span className="icon" style={{
                  fontSize:    40,
                  marginBottom:20,
                  display:     'block',
                  color:       'var(--blue)',
                }}>
                  {s.icon}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>{s.desc}</p>
                <Link to="/specializations" style={{
                  fontSize:   13,
                  fontWeight: 700,
                  color:      'var(--blue)',
                  textDecoration:'none',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        4,
                }}>
                  Learn More
                  <span className="icon" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
                <div style={{
                  position:   'absolute',
                  bottom:     0, left: 0, right: 0,
                  height:     3,
                  background: 'var(--grad)',
                }} />
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <Link to="/specializations" className="btn btn-outline" style={{ border: '1px solid var(--border)', padding: '14px 40px' }}>
              View All Specialities
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FACILITIES & TECHNOLOGY
      ══════════════════════════════════════ */}
      <section style={{ padding: '100px 5%', position: 'relative', overflow: 'hidden' }}>
        <MedicalOrb size={300} color="#10b981" delay={2} top="0" right="0" opacity={0.06} />

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="section-label">
              <span className="icon" style={{ fontSize: 14 }}>biotech</span>
              TECHNOLOGY & FACILITIES
            </div>
          </div>

          <h2 className="reveal section-title" style={{ textAlign: 'center' }}>
            Built for the<br />cases that matter most.
          </h2>
          <p className="reveal section-sub" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
            State-of-the-art infrastructure means faster diagnosis, safer procedures, and better outcomes.
          </p>

          <div className="facilities-grid" style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 20,
          }}>
            {FACILITIES.map((f, i) => (
              <div key={i} className="reveal facility-card" style={{
                background:   'var(--navy-2)',
                border:       '1px solid var(--border)',
                borderRadius: 20,
                padding:      '28px 28px',
                transition:   'all 0.25s ease',
                cursor:       'default',
                animationDelay: `${i * 0.07}s`,
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PATIENT REVIEWS
      ══════════════════════════════════════ */}
      <section style={{ padding: '100px 5% 120px', background: 'var(--navy-2)', position: 'relative', overflow: 'hidden' }}>
        <MedicalOrb size={400} color="#f59e0b" delay={0} top="-100px" right="-100px" opacity={0.05} />
        <MedicalOrb size={300} color="#ec4899" delay={2} bottom="-60px" left="-60px" opacity={0.05} />

        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="section-label">
              <span className="icon" style={{ fontSize: 14 }}>format_quote</span>
              PATIENT STORIES
            </div>
          </div>

          <h2 className="reveal section-title" style={{ textAlign: 'center' }}>
            Trusted by thousands,<br />life-changing for many.
          </h2>

          {/* Overall rating bar */}
          <div className="reveal" style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            20,
            marginBottom:   56,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily:          'var(--font-head)',
                fontSize:            56,
                fontWeight:          800,
                background:          'var(--grad)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor: 'transparent',
                lineHeight:          1,
              }}>
                4.9
              </div>
              <Stars count={5} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>12,400+ reviews</div>
            </div>
            <div style={{ width: 1, height: 64, background: 'var(--border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[[5, 94], [4, 4], [3, 1], [2, 0], [1, 0]].map(([star, pct]) => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 16 }}>{star}★</span>
                  <div style={{ width: 120, height: 6, borderRadius: 100, background: 'var(--navy-3)', overflow: 'hidden' }}>
                    <div style={{
                      width:        `${pct}%`,
                      height:       '100%',
                      background:   star === 5 ? '#f59e0b' : star === 4 ? '#10b981' : '#64748b',
                      borderRadius: 100,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal">
            <ReviewCarousel />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          APPOINTMENT CTA
      ══════════════════════════════════════ */}
      <section style={{ padding: '120px 5%' }}>
        <div className="reveal glass-card" style={{
          background:   'var(--navy-3)',
          textAlign:    'center',
          padding:      '80px 40px',
          border:       '1px solid var(--border)',
          borderRadius: 40,
          position:     'relative',
          overflow:     'hidden',
        }}>
          <MedicalOrb size={300} color="#0ea5e9" delay={0} top="-60px" left="20%" opacity={0.08} />
          <MedicalOrb size={200} color="#8b5cf6" delay={1} bottom="-40px" right="20%" opacity={0.07} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* ECG line above CTA */}
            <div style={{ marginBottom: 40 }}>
              <ECGLine color="#0ea5e9" />
            </div>

            <h2 style={{
              fontSize:      'clamp(32px, 5vw, 52px)',
              fontWeight:    800,
              marginBottom:  16,
              letterSpacing: '-0.02em',
            }}>
              Book your visit in 60 seconds.
            </h2>
            <p style={{
              fontSize:   18,
              color:      'var(--text-muted)',
              maxWidth:   560,
              margin:     '0 auto 44px',
              lineHeight: 1.65,
            }}>
              Experience healthcare redefined. Pick your department, choose a slot, and get instant confirmation.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/book" className="btn btn-primary" style={{ padding: '18px 60px', fontSize: 18, borderRadius: 14 }}>
                Book Appointment Now
              </Link>
              <Link to="/ai-assistant" className="btn btn-outline" style={{ padding: '18px 40px', fontSize: 16, borderRadius: 14 }}>
                🧠 AI Symptom Check
              </Link>
            </div>

            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
              {['No hidden charges', 'Instant confirmation', 'Cancel anytime'].map(t => (
                <div key={t} style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        6,
                  fontSize:   13,
                  color:      'var(--text-muted)',
                  fontWeight: 600,
                }}>
                  <span style={{ color: '#10b981' }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
