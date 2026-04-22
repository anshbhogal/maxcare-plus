import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

function MCLogo() {
  return (
    <svg width="52" height="58" viewBox="0 0 40 44" fill="none">
      <path d="M20 2L4 8v14c0 9.4 6.9 18.2 16 20.5C29.1 40.2 36 31.4 36 22V8L20 2z" stroke="url(#ll1)" strokeWidth="1.5" fill="none"/>
      <path d="M8 22h5l3-6 4 12 3-8 2 4h7" stroke="url(#ll2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M28 15v4M26 17h4" stroke="url(#ll2)" strokeWidth="1.5" strokeLinecap="round"/>
      <defs>
        <linearGradient id="ll1" x1="4" y1="2" x2="36" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#1a5fd4"/><stop offset="100%" stopColor="#1ad48f"/></linearGradient>
        <linearGradient id="ll2" x1="8" y1="15" x2="35" y2="28" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#4a8af4"/><stop offset="100%" stopColor="#2ae8a0"/></linearGradient>
      </defs>
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot Password State
  const [resetStep, setResetStep] = useState(0) // 0: login, 1: request, 2: confirm
  const [resetEmail, setResetEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  const { token, user, login, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleResetRequest = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) { setError('Please enter your email'); return }
    setLoading(true); setError(''); setResetMsg('')
    try {
      const { data } = await api.post('/auth/password-reset/request', { email: resetEmail.trim().toLowerCase() })
      setResetStep(2)
      setResetMsg(data.message)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request reset')
    } finally { setLoading(true); setTimeout(() => setLoading(false), 500) }
  }

  const handleResetConfirm = async (e) => {
    e.preventDefault()
    if (!otp || !newPassword) { setError('All fields are required'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/password-reset/confirm', {
        email: resetEmail.trim().toLowerCase(),
        otp,
        new_password: newPassword
      })
      setResetStep(0)
      setResetMsg(data.message)
      setEmail(resetEmail)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
    } finally { setLoading(false) }
  }

  // Check if arriving via ?switch=true (switching accounts)
  const isSwitching = new URLSearchParams(location.search).get('switch') === 'true'

  useEffect(() => {
    // If switching accounts, log out current session silently
    if (isSwitching && token) {
      logout()
      return
    }
    // If already logged in AND not switching, redirect to their portal
    if (token && user && !isSwitching) {
      navigate(`/${user.role}`, { replace: true })
    }
  }, []) // run once on mount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address'); return }
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('username', email.toLowerCase().trim())
      form.append('password', password)
      const { data } = await api.post('/auth/login', form)
      login(data.access_token, { email: data.email || email.toLowerCase(), role: data.role, user_id: data.user_id })
      navigate(`/${data.role}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show current session info if logged in and not switching
  const showSessionBanner = token && user && !isSwitching

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#050d1a,#091526,#0d1f38)', fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .mc-inp{width:100%;padding:11px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(26,95,212,0.25);border-radius:10px;color:#e8edf5;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;}
        .mc-inp:focus{border-color:rgba(26,212,143,0.5);background:rgba(255,255,255,0.09);}
        .mc-inp::placeholder{color:#3d5270;}
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}><MCLogo /></div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 6 }}>
            <span style={{ color: '#4a8af4' }}>Max</span><span style={{ color: '#1ad48f' }}>Care+</span>
          </div>
          <p style={{ color: '#7b8fa8', fontSize: 14 }}>Multi-Speciality Hospital · Staff & Patient Portal</p>
        </div>

        {/* Already logged in as different role — show session banner */}
        {showSessionBanner && (
          <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(26,212,143,0.08)', border: '1px solid rgba(26,212,143,0.25)', borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: '#1ad48f', fontWeight: 600, marginBottom: 6 }}>
              ✓ Currently signed in as {user.role}
            </div>
            <div style={{ fontSize: 12, color: '#7b8fa8', marginBottom: 12 }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate(`/${user.role}`)}
                style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Go to {user.role} portal →
              </button>
              <button
                onClick={() => { logout(); setError(''); setEmail(''); setPassword('') }}
                style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid rgba(220,38,38,0.35)', borderRadius: 8, color: '#fca5a5', fontWeight: 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Switch account
              </button>
            </div>
          </div>
        )}

        {/* Login card — always visible so user can switch accounts */}
        <div style={{ background: 'rgba(9,21,38,0.92)', border: '1px solid rgba(26,95,212,0.2)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,.4)' }}>
          <div style={{ height: 3, background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)' }} />
          <div style={{ padding: 28 }}>
            
            {resetStep === 0 && (
              <>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#e8edf5', marginBottom: 20 }}>
                  {showSessionBanner ? 'Sign in with a different account' : 'Sign in to your account'}
                </h2>
                {resetMsg && <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(26,212,143,0.1)', border: '1px solid rgba(26,212,143,0.2)', borderRadius: 8, color: '#1ad48f', fontSize: 13 }}>{resetMsg}</div>}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#7b8fa8', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email Address</label>
                    <input className="mc-inp" type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} placeholder="you@maxcareplus.in" required autoFocus={!showSessionBanner} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#7b8fa8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                      <button type="button" onClick={() => { setResetStep(1); setError(''); setResetMsg('') }} style={{ background: 'none', border: 'none', color: '#4a8af4', fontSize: 12, cursor: 'pointer', padding: 0 }}>Forgot Password?</button>
                    </div>
                    <input className="mc-inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  {error && <div style={{ padding: '11px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
                  <button type="submit" disabled={loading} style={{ padding: '13px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
                </form>
              </>
            )}

            {resetStep === 1 && (
              <>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#e8edf5', marginBottom: 12 }}>Reset Password</h2>
                <p style={{ color: '#7b8fa8', fontSize: 13, marginBottom: 20 }}>Enter your registered email and we'll send you an OTP.</p>
                <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input className="mc-inp" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Enter your email" required autoFocus />
                  {error && <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div>}
                  <button type="submit" disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send OTP'}</button>
                  <button type="button" onClick={() => setResetStep(0)} style={{ background: 'none', border: 'none', color: '#7b8fa8', fontSize: 13, cursor: 'pointer' }}>Back to Login</button>
                </form>
              </>
            )}

            {resetStep === 2 && (
              <>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#e8edf5', marginBottom: 12 }}>Enter OTP</h2>
                {resetMsg && <div style={{ marginBottom: 16, color: '#1ad48f', fontSize: 13 }}>{resetMsg}</div>}
                <form onSubmit={handleResetConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input className="mc-inp" type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} placeholder="6-digit OTP" required autoFocus />
                  <input className="mc-inp" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" required />
                  {error && <div style={{ color: '#fca5a5', fontSize: 12 }}>{error}</div>}
                  <button type="submit" disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reset Password</button>
                  <button type="button" onClick={() => setResetStep(1)} style={{ background: 'none', border: 'none', color: '#7b8fa8', fontSize: 13, cursor: 'pointer' }}>Resend OTP</button>
                </form>
              </>
            )}

            {resetStep === 0 && (
              <div style={{ borderTop: '1px solid rgba(26,95,212,0.15)', marginTop: 22, paddingTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3d5270', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Default Credentials</div>
                <div style={{ fontSize: 13, color: '#7b8fa8', lineHeight: 2 }}>
                  <div>Admin: <span style={{ color: '#e8edf5', fontFamily: 'monospace' }}>admin@hms.local</span> / <span style={{ fontFamily: 'monospace', color: '#e8edf5' }}>Admin@123</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#7b8fa8' }}>
          New patient? <Link to="/register" style={{ color: '#1ad48f', fontWeight: 600 }}>Create account →</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Link to="/" style={{ fontSize: 13, color: '#3d5270' }}>← Back to MaxCare+ website</Link>
        </div>
      </div>
    </div>
  )
}
