import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import { DOCTORS } from '../../utils/data'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function DoctorsDirectory() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const initialDept = params.get('department') || 'All'

  const [filter, setFilter] = useState(initialDept)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  useScrollReveal(filter)
  
  const specs = ['All', ...new Set(DOCTORS.map(d => d.spec))]
  const filtered = filter === 'All' ? DOCTORS : DOCTORS.filter(d => d.spec === filter)

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setSelectedDoctor(null) }
    window.addEventListener('keydown', handleEsc)
    if (selectedDoctor) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'auto'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'
    }
  }, [selectedDoctor])

  return (
    <PublicLayout>
      <section style={{ padding: '40px 5% 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>Our Team</div>
            <h1 className="section-title">Doctors who define<br /><span style={{ background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>excellence.</span></h1>
            <p className="section-sub" style={{ margin: '0 auto 40px' }}>
              Handpicked specialists with decades of combined experience across top institutions in India and abroad.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {specs.map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)}
                  style={{ 
                    padding: '8px 20px', borderRadius: 100, border: '1px solid var(--border)',
                    background: filter === s ? 'rgba(26,95,212,0.08)' : 'var(--card)',
                    color: filter === s ? 'var(--blue)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filtered.map((d, idx) => (
              <div 
                key={d.id} 
                className="glass-card reveal" 
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setSelectedDoctor(d)}
              >
                <div style={{ height: 200, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.03, fontSize: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>⚕</div>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: d.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-head)', position: 'relative', zIndex: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                    {d.initials}
                  </div>
                </div>
                
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{d.spec}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{d.name}</h3>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 16 }}>{d.qual}</div>
                  
                  <div style={{ display: 'flex', gap: 16, marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800 }}>{d.exp}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Yrs Exp.</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800 }}>{Math.round(d.patients / 100) / 10}k</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Patients</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800 }}>{d.rating}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Rating</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-dim)', animation: 'pulse 2s infinite' }} />
                    Available {d.avail} · {d.slots}
                  </div>

                  <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>View Profile & Book</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctor Modal ── */}
      {selectedDoctor && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setSelectedDoctor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(41, 37, 36, 0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div className="glass-card" style={{ width: '100%', maxWidth: 580, padding: 40, background: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Doctor Profile</h2>
              <button onClick={() => setSelectedDoctor(null)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--navy)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="icon">close</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ width: 88, height: 88, borderRadius: 20, background: selectedDoctor.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-head)', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
                {selectedDoctor.initials}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--green-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{selectedDoctor.spec}</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{selectedDoctor.name}</h2>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{selectedDoctor.qual}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 24, padding: 24, background: 'var(--navy)', borderRadius: 16, border: '1px solid var(--border)' }}>
              <div><div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>{selectedDoctor.exp}</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>Years Exp.</div></div>
              <div><div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>{selectedDoctor.patients.toLocaleString()}</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>Patients</div></div>
              <div><div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>{selectedDoctor.rating}</div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>Rating</div></div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>About</div>
            <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>{selectedDoctor.bio}</p>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>OPD Schedule</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
              {selectedDoctor.schedule.map(s => (
                <div key={s.day} style={{ background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{s.day}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{s.time}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <Link to="/book" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>Book Appointment</Link>
              <button onClick={() => setSelectedDoctor(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 14, border: '1px solid var(--border)' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
