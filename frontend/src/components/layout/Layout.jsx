import React, { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { MCLogo } from '../common/index.jsx'

const NAV = {
  admin: [
    { path: '/admin',              label: 'Dashboard',    icon: 'grid_view', exact: true },
    { path: '/admin/patients',     label: 'Patients',     icon: 'person' },
    { path: '/admin/doctors',      label: 'Doctors',      icon: 'medical_services' },
    { path: '/admin/appointments', label: 'Appointments', icon: 'calendar_month' },
    { path: '/admin/billing',      label: 'Billing',      icon: 'receipt_long' },
    { path: '/admin/ipd',          label: 'IPD / Beds',   icon: 'bed' },
    { path: '/admin/lab',          label: 'Laboratory',   icon: 'biotech' },
    { path: '/admin/pharmacy',     label: 'Pharmacy',     icon: 'medication' },
  ],
  doctor: [
    { path: '/doctor',              label: 'Dashboard',    icon: 'grid_view', exact: true },
    { path: '/doctor/appointments', label: 'Appointments', icon: 'calendar_month' },
    { path: '/doctor/patients',     label: 'My Patients',  icon: 'person' },
    { path: '/doctor/prescriptions',label: 'Prescriptions',icon: 'pill' },
    { path: '/doctor/lab',          label: 'Lab Tests',    icon: 'biotech' },
  ],
  patient: [
    { path: '/patient',              label: 'Dashboard',    icon: 'grid_view', exact: true },
    { path: '/patient/appointments', label: 'Appointments', icon: 'calendar_month' },
    { path: '/patient/billing',      label: 'My Bills',     icon: 'receipt_long' },
    { path: '/patient/prescriptions',label: 'Prescriptions',icon: 'pill' },
    { path: '/patient/lab',          label: 'Lab Reports',  icon: 'biotech' },
  ],
}

const ROLE_META = {
  admin:   { label: 'Admin Panel',     accent: 'var(--blue)', light: '#f5f3ff' },
  doctor:  { label: 'Doctor Portal',   accent: '#0891b2', light: '#ecfeff' },
  patient: { label: 'Patient Portal',  accent: '#2563eb', light: '#eff6ff' },
}

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const items = NAV[user?.role] || []
  const meta = ROLE_META[user?.role] || ROLE_META.patient
  const initials = user?.email?.[0]?.toUpperCase() || '?'

  const NavItem = ({ item }) => (
    <NavLink 
      key={item.path} 
      to={item.path} 
      end={item.exact} 
      className={({ isActive }) => `mc-nav-link ${isActive ? 'active' : ''}`}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? item.label : ''}
    >
      <span className="icon" style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
      <span className="label" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>{item.label}</span>
    </NavLink>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--navy)', color: 'var(--text)' }}>
      <style>{`
        .mc-nav-link { 
          display: flex; align-items: center; gap: 12px; padding: 10px 14px; 
          border-radius: 12px; text-decoration: none; color: var(--text-muted);
          transition: all 0.2s; font-weight: 600; font-size: 13px;
        }
        .mc-nav-link:hover { background: var(--navy-2); color: var(--text); }
        .mc-nav-link.active { background: var(--navy-3); color: var(--blue); }
        .mc-nav-link .icon { transition: transform 0.2s; }
        .mc-nav-link:hover .icon { transform: scale(1.05); }
        
        .sidebar-scroll { flex: 1; overflow-y: auto; padding: 12px; scrollbar-width: none; }
        .sidebar-scroll::-webkit-scrollbar { display: none; }

        @media (max-width: 900px) {
          .desktop-sidebar, .desktop-header { display: none !important; }
          .mobile-header { display: flex !important; }
          .main-content { padding: 24px 16px !important; }
          .mc-nav-link { font-size: 15px; padding: 14px 16px; }
        }
      `}</style>

      {/* ── SIDEBAR (Desktop) ── */}
      <aside className="desktop-sidebar" style={{
        width: collapsed ? 70 : 240, background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width .3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', zIndex: 100
      }}>
        {/* Fixed Header */}
        <div style={{ padding: '16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 70 }}>
          <MCLogo size={30} />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--blue)' }}>Max</span><span style={{ color: 'var(--green-dim)' }}>Care+</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{meta.label}</div>
            </div>
          )}
        </div>

        {/* Scrollable Nav Area */}
        <nav className="sidebar-scroll">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </nav>

        {/* Fixed Footer (Controls) */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span className="icon" style={{ fontSize: 20, flexShrink: 0 }}>{collapsed ? 'side_navigation' : 'menu_open'}</span>
            <span style={{ fontWeight: 600, fontSize: 13, opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>Collapse</span>
          </button>
          <button onClick={() => { logout(); navigate('/login') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span className="icon" style={{ fontSize: 20, flexShrink: 0 }}>logout</span>
            <span style={{ fontWeight: 600, fontSize: 13, opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER (Web App Style) ── */}
      <header className="mobile-header" style={{ 
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, 
        height: 64, background: 'var(--card)', borderBottom: '1px solid var(--border)', 
        zIndex: 1000, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setMobileOpen(true)}
            style={{ background: 'var(--navy-2)', border: 'none', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <span className="icon" style={{ color: 'var(--text)' }}>menu</span>
          </button>
          <MCLogo size={28} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{meta.label.split(' ')[0]}</div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>{user?.role}</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--navy-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', fontWeight: 800, fontSize: 13 }}>
            {initials}
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={() => setMobileOpen(false)}>
          <div style={{ width: '80%', maxWidth: 300, height: '100%', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '20px 0 50px rgba(0,0,0,0.15)', animation: 'slideRight 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <style>{`
              @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            `}</style>
            
            <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MCLogo size={32} />
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18 }}>MaxCare+</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'var(--navy-2)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="icon" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <nav className="sidebar-scroll" style={{ padding: '20px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map(item => <NavItem key={item.path} item={item} />)}
              </div>
            </nav>

            <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{user?.email?.split('@')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user?.email}</div>
              </div>
              <button onClick={() => { logout(); navigate('/login') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12, border: 'none', background: '#fef2f2', color: '#ef4444', textAlign: 'left', fontWeight: 700, fontSize: 14 }}>
                <span className="icon">logout</span> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar (Desktop Only) */}
        <header className="desktop-header" style={{ height: 70, background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 90 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{user?.role} Access</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--navy-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', fontWeight: 800, fontSize: 14 }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="main-content" style={{ flex: 1, padding: '32px', paddingTop: 'calc(32px + 0px)' }}>
          {/* Top spacer on mobile to clear fixed header */}
          <div className="mobile-header" style={{ display: 'none', height: 64 }} />
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
