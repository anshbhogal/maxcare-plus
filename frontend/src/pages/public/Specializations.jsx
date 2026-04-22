import React from 'react'
import PublicLayout from '../../components/layout/PublicLayout'
import { SPECIALIZATIONS } from '../../utils/data'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function Specializations() {
  useScrollReveal()
  return (
    <PublicLayout>
      <section style={{ padding: '40px 5% 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 80 }}>
            <div className="section-label" style={{ justifyContent: 'center' }}>Departments</div>
            <h1 className="section-title">Every speciality,<br />under one roof.</h1>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              From routine consultations to complex surgical interventions — MaxCare+ covers the full spectrum of medical specialities with dedicated department teams.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {SPECIALIZATIONS.map((s, idx) => (
              <div key={s.name} className="glass-card reveal" style={{ transitionDelay: `${idx * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 40, marginBottom: 20 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: 'var(--text)' }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.tags.map(t => (
                    <span key={t} style={{ padding: '4px 10px', borderRadius: 100, background: 'var(--navy)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {t}
                    </span>
                  ))}
                </div>
                {/* Animated Bottom Border */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'var(--grad)', opacity: 0.8 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
