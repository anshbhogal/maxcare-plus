import React from 'react'

// ── Design tokens (inline, match CSS vars) ────────────────────────────────────
const T = {
  primary: '#2563eb', primaryLight: '#eff6ff',
  success: '#16a34a', successLight: '#f0fdf4',
  danger: '#dc2626', dangerLight: '#fef2f2',
  warning: '#d97706', warningLight: '#fffbeb',
  purple: '#7c3aed', purpleLight: '#f5f3ff',
  gray100: '#f1f5f9', gray200: '#e2e8f0', gray300: '#cbd5e1',
  gray400: '#94a3b8', gray500: '#64748b', gray600: '#475569',
  gray700: '#334155', gray800: '#1e293b',
  border: '#e2e8f0', radius: 10, radiusLg: 14,
}

// ── MaxCare+ Logo (inline SVG) ────────────────────────────────────────────────
export function MCLogo({ size = 32 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" fill="none">
      <path d="M20 2L4 8v14c0 9.4 6.9 18.2 16 20.5C29.1 40.2 36 31.4 36 22V8L20 2z" stroke="url(#mc1)" strokeWidth="1.5" fill="none"/>
      <path d="M8 22h5l3-6 4 12 3-8 2 4h7" stroke="url(#mc2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M28 15v4M26 17h4" stroke="url(#mc2)" strokeWidth="1.5" strokeLinecap="round"/>
      <defs>
        <linearGradient id="mc1" x1="4" y1="2" x2="36" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#1a5fd4"/><stop offset="100%" stopColor="#1ad48f"/></linearGradient>
        <linearGradient id="mc2" x1="8" y1="15" x2="35" y2="28" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#4a8af4"/><stop offset="100%" stopColor="#2ae8a0"/></linearGradient>
      </defs>
    </svg>
  )
}

// ── Brand name ────────────────────────────────────────────────────────────────
export function MCBrandName({ size = 18 }) {
  return (
    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: size, letterSpacing: '-0.01em' }}>
      <span style={{ color: '#2563eb' }}>Max</span><span style={{ color: '#16a34a' }}>Care+</span>
    </span>
  )
}

// ── Phone Input with +91 prefix ───────────────────────────────────────────────
export function PhoneInput({ label, value, onChange, error, required }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    onChange(digits)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.gray700 }}>{label}{required && ' *'}</label>}
      <div style={{ display: 'flex' }}>
        <div style={{
          padding: '9px 12px', background: T.gray100, border: `1px solid ${error ? T.danger : T.border}`,
          borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 14, color: T.gray500,
          flexShrink: 0, display: 'flex', alignItems: 'center', fontWeight: 500,
        }}>+91</div>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          maxLength={10}
          placeholder="10-digit number"
          style={{
            flex: 1, padding: '9px 12px', border: `1px solid ${error ? T.danger : T.border}`,
            borderRadius: '0 10px 10px 0', fontSize: 14, outline: 'none',
            background: '#fff', color: T.gray800,
          }}
          onFocus={e => e.target.style.borderColor = T.primary}
          onBlur={e => e.target.style.borderColor = error ? T.danger : T.border}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
      {value && value.length > 0 && value.length < 10 && !error && (
        <span style={{ fontSize: 12, color: T.warning }}>{10 - value.length} more digits needed</span>
      )}
    </div>
  )
}

// ── Email Input (auto-lowercase) ──────────────────────────────────────────────
export function EmailInput({ label, value, onChange, error, required, ...props }) {
  return (
    <Input
      label={label}
      type="email"
      value={value}
      onChange={e => onChange(e.target.value.toLowerCase())}
      error={error}
      required={required}
      placeholder="email@example.com"
      {...props}
    />
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, style: extStyle = {}, disabled, ...props }) {
  const variantStyles = {
    primary:   { background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none' },
    secondary: { background: '#fff', color: T.gray700, border: `1px solid ${T.border}` },
    danger:    { background: T.danger, color: '#fff', border: 'none' },
    ghost:     { background: 'transparent', color: T.gray600, border: `1px solid ${T.border}` },
    success:   { background: T.success, color: '#fff', border: 'none' },
    brand:     { background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', color: '#fff', border: 'none' },
  }
  const sizeStyles = {
    sm: { padding: '6px 14px', fontSize: 12, borderRadius: 7 },
    md: { padding: '9px 18px', fontSize: 14, borderRadius: 9 },
    lg: { padding: '12px 24px', fontSize: 15, borderRadius: 10 },
  }
  return (
    <button
      disabled={loading || disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        fontFamily: 'inherit', fontWeight: 600, cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.65 : 1, transition: 'all .15s',
        ...variantStyles[variant], ...sizeStyles[size], ...extStyle,
      }}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, style: extStyle = {}, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.gray700 }}>{label}{required && ' *'}</label>}
      <input
        style={{
          padding: '9px 12px', border: `1px solid ${error ? T.danger : T.border}`,
          borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color .15s',
          background: '#fff', color: T.gray800, width: '100%', ...extStyle,
        }}
        onFocus={e => e.target.style.borderColor = T.primary}
        onBlur={e => e.target.style.borderColor = error ? T.danger : T.border}
        {...props}
      />
      {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, disabled, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.gray700 }}>{label}{required && ' *'}</label>}
      <select
        disabled={disabled}
        style={{
          padding: '9px 12px', border: `1px solid ${error ? T.danger : T.border}`,
          borderRadius: 10, fontSize: 14, background: disabled ? T.gray100 : '#fff',
          color: T.gray800, outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        {...props}
      >{children}</select>
      {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, error, rows = 3, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.gray700 }}>{label}</label>}
      <textarea
        rows={rows}
        style={{
          padding: '9px 12px', border: `1px solid ${error ? T.danger : T.border}`,
          borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical',
          background: '#fff', color: T.gray800, fontFamily: 'inherit', width: '100%',
        }}
        onFocus={e => e.target.style.borderColor = T.primary}
        onBlur={e => e.target.style.borderColor = error ? T.danger : T.border}
        {...props}
      />
      {error && <span style={{ fontSize: 12, color: T.danger }}>{error}</span>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, padding = 24 }) {
  return (
    <div style={{
      background: '#fff', borderRadius: T.radiusLg, border: `1px solid ${T.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding, ...style,
    }}>{children}</div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.gray800, fontFamily: 'Syne, sans-serif' }}>{title}</h1>
        {subtitle && <p style={{ color: T.gray500, fontSize: 14, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  pending:          { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  confirmed:        { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  completed:        { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  cancelled:        { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
  paid:             { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  available:        { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  occupied:         { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
  admitted:         { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  discharged:       { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  requested:        { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  sample_collected: { bg: '#fff7ed', color: '#9a3412', dot: '#f97316' },
  processing:       { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  low:              { bg: '#fff7ed', color: '#9a3412', dot: '#f97316' },
  active:           { bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  inactive:         { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
}
export function Badge({ status, label }) {
  const c = BADGE_COLORS[status] || { bg: T.gray100, color: T.gray600, dot: T.gray400 }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500,
      background: c.bg, color: c.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {label || status}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 14 : size === 'lg' ? 36 : 22
  return (
    <div style={{
      width: s, height: s, border: `2px solid ${T.gray200}`, borderTop: `2px solid ${T.primary}`,
      borderRadius: '50%', animation: 'mc-spin .7s linear infinite', flexShrink: 0,
    }} />
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ columns, data, emptyMsg = 'No records found', onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: T.gray50, borderBottom: `2px solid ${T.border}` }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: T.gray600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '40px 14px', textAlign: 'center', color: T.gray400 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              {emptyMsg}
            </td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i}
              onClick={() => onRowClick?.(row)}
              style={{ borderBottom: `1px solid ${T.gray100}`, cursor: onRowClick ? 'pointer' : 'default', transition: 'background .1s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.gray50}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '11px 14px', color: T.gray700, verticalAlign: 'middle' }}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = T.primary, sub, trend }) {
  return (
    <div style={{
      background: '#fff', borderRadius: T.radiusLg, border: `1px solid ${T.border}`,
      padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
    }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: T.gray500, fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.gray800, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: T.gray400, marginTop: 5 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.15)', border: `1px solid ${T.border}` }}>
        {/* Modal header with brand accent */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc, #eff6ff)', borderRadius: '18px 18px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 20, background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', borderRadius: 2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.gray800, fontFamily: 'Syne, sans-serif' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${T.border}`, background: '#fff', color: T.gray500, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#14532d', icon: '✓' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '✕' },
  }
  const s = styles[type]
  return (
    <div style={{ padding: '12px 16px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, color: s.color, fontSize: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0 }}>{s.icon}</span>
      <div>{children}</div>
    </div>
  )
}

// ── SectionDivider ────────────────────────────────────────────────────────────
export function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      {label && <span style={{ fontSize: 11, color: T.gray400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// ── InfoRow ────────────────────────────────────────────────────────────────────
export function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.gray100}` }}>
      <span style={{ fontSize: 13, color: T.gray500, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: T.gray800, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
    </div>
  )
}

// ── Global styles injected once ───────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('mc-styles')) {
  const style = document.createElement('style')
  style.id = 'mc-styles'
  style.textContent = `
    @keyframes mc-spin { to { transform: rotate(360deg) } }
    @keyframes mc-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  `
  document.head.appendChild(style)
}
