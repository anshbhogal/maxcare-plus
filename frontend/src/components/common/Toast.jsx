import React, { useEffect } from 'react'

export default function Toast({ title, message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  const icon = type === 'success' ? 'check_circle' : 'error'
  const accent = type === 'success' ? 'var(--mc-green)' : 'var(--danger)'

  return (
    <div className="glass" style={{ 
      position: 'fixed', 
      bottom: 28, 
      right: 28, 
      zIndex: 2000, 
      borderRadius: 16, 
      padding: '16px 24px', 
      maxWidth: 380, 
      boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      animation: 'slideIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%) opacity: 0; }
          to { transform: translateX(0) opacity: 1; }
        }
      `}</style>
      <span className="icon" style={{ color: accent, fontSize: 32 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{message}</div>
      </div>
    </div>
  )
}
