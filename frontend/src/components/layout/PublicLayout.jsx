import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { MCLogo } from '../common/index.jsx'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function PublicLayout({ children }) {
  useScrollReveal()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/specializations', label: 'Specializations' },
    { path: '/doctors', label: 'Our Doctors' },
    { path: '/symptom-checker', label: 'AI Assistant' },
    { path: '/book', label: 'Booking' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* ── Visual Backdrop ── */}
      <div className="grid-overlay" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Navbar ── */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, 
        height: 72, background: 'var(--glass)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <MCLogo size={32} />
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: 'var(--blue)' }}>Max</span><span style={{ color: 'var(--green-dim)' }}>Care+</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-desktop-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {navLinks.map(link => (
            <NavLink 
              key={link.path} 
              to={link.path} 
              style={({ isActive }) => ({
                textDecoration: 'none',
                color: isActive ? 'var(--blue)' : 'var(--text-muted)',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.02em'
              })}
            >
              {link.label}
            </NavLink>
          ))}
          <Link to="/login" className="btn btn-outline" style={{ padding: '8px 18px', fontSize: 13 }}>
            Login
          </Link>
          <Link to="/book" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
            Book Now
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="nav-mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="icon" style={{ fontSize: 28 }}>{isMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, top: 72, background: 'white', zIndex: 999, padding: '40px 5%' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {navLinks.map(link => (
              <Link 
                key={link.path} 
                to={link.path} 
                onClick={() => setIsMenuOpen(false)}
                style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-outline" style={{ justifyContent: 'center', fontSize: 16 }}>Login</Link>
            <Link to="/book" onClick={() => setIsMenuOpen(false)} className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 16 }}>Book Now</Link>
           </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="main-content" style={{ flex: 1, position: 'relative', zIndex: 1, paddingTop: 140 }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--navy-3)', borderTop: '1px solid var(--border)', padding: '60px 5% 40px', position: 'relative', zIndex: 1 }}>
        <div className="footer-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <MCLogo size={28} />
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800 }}>
                <span style={{ color: 'var(--blue)' }}>Max</span><span style={{ color: 'var(--green-dim)' }}>Care+</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, maxWidth: 280, marginBottom: 24 }}>
              Delivering world-class healthcare with compassion and precision.
            </p>
          </div>

          <div className="footer-col">
            <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Our Doctors', 'Specializations', 'Book Appointment'].map(s => (
                <Link key={s} to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>{s}</Link>
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ maxWidth: 1200, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
          <span>© 2026 MaxCare+ — All Rights Reserved.</span>
          <div style={{ fontWeight: 600 }}>
            Developed by - <span style={{ color: 'var(--blue)' }}>Ansh Bhogal</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop-links { display: none !important; }
          .nav-mobile-toggle { display: block !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .main-content { padding-top: 100px !important; }
        }
      `}</style>
    </div>
  )
}
