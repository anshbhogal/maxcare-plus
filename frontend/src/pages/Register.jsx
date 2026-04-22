import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { MCLogo, MCBrandName } from '../components/common/index.jsx'

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']

// ── Step indicator ─────────────────────────────────────────────────────────────
function Steps({ current, steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, fontFamily: 'Syne,sans-serif',
              background: i < current ? '#16a34a' : i === current ? 'linear-gradient(135deg,#1a5fd4,#1ad48f)' : '#f1f5f9',
              color: i <= current ? '#fff' : '#94a3b8',
              border: i === current ? 'none' : i < current ? 'none' : '1px solid #e2e8f0',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i === current ? '#1e293b' : '#94a3b8', fontWeight: i === current ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? '#16a34a' : '#e2e8f0', margin: '0 6px', marginBottom: 18 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const iS = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', color: '#1e293b', width: '100%', fontFamily: 'inherit' }
  const lS = { fontSize: 13, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }

  // Registration form state
  const [step, setStep] = useState(0)  // 0=form, 1=otp-needed, 2=otp-verify, 3=done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    full_name: '', dob: '', gender: '', blood_group: '',
    phone: '', address: '',
  })

  // OTP linking state
  const [existingPatientName, setExistingPatientName] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')  // shown in dev mode
  const [otpErr, setOtpErr] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhone = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 10)
    set('phone', digits)
    setPhoneErr(digits.length > 0 && digits.length < 10 ? 'Must be exactly 10 digits' : '')
  }

  // ── Cooldown timer ──────────────────────────────────────────────────────────
  const startCooldown = () => {
    setResendCooldown(60)
    const timer = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  // ── Step 0: Submit registration form ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.phone && form.phone.length !== 10) { setPhoneErr('10 digits required'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true); setError('')

    try {
      // Check if phone already has a patient record
      if (form.phone) {
        const { data: check } = await api.post('/otp/check-phone', { phone: form.phone })
        if (check.exists && check.can_link) {
          // Existing walk-in patient — offer OTP linking
          setExistingPatientName(check.patient_name)
          setStep(1)
          setLoading(false)
          return
        }
        if (check.exists && check.has_real_account) {
          setError('This mobile number is already linked to a registered account. Please login instead.')
          setLoading(false)
          return
        }
      }

      // No conflict — normal registration
      await doRegister()
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const doRegister = async () => {
    await api.post('/patients/register', {
      email: form.email.toLowerCase().trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      dob: form.dob || null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,
      phone: form.phone || null,
      address: form.address.trim() || null,
    })
    navigate('/login')
  }

  // ── Step 1: User chooses to link or create new ─────────────────────────────
  const handleSendOtp = async () => {
    setOtpLoading(true); setOtpErr('')
    try {
      const { data } = await api.post('/otp/send', { phone: form.phone, purpose: 'account_link' })
      setOtpSent(true)
      setStep(2)
      startCooldown()
      if (data.dev_otp) {
        setDevOtp(data.dev_otp)
      }
    } catch (e) {
      setOtpErr(e.response?.data?.detail || 'Could not send OTP. Try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setOtpLoading(true); setOtpErr('')
    try {
      const { data } = await api.post('/otp/send', { phone: form.phone, purpose: 'account_link' })
      startCooldown()
      if (data.dev_otp) setDevOtp(data.dev_otp)
    } catch (e) {
      setOtpErr(e.response?.data?.detail || 'Resend failed')
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Step 2: Verify OTP and link account ────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setOtpErr('Enter the 6-digit OTP'); return }
    setOtpLoading(true); setOtpErr('')
    try {
      await api.post('/otp/verify-and-link', {
        phone: form.phone,
        code: otp,
        email: form.email.toLowerCase().trim(),
        password: form.password,
        full_name: form.full_name.trim() || undefined,
        gender: form.gender || undefined,
        blood_group: form.blood_group || undefined,
        dob: form.dob || undefined,
        address: form.address?.trim() || undefined,
      })
      setStep(3)
    } catch (e) {
      setOtpErr(e.response?.data?.detail || 'OTP verification failed')
    } finally {
      setOtpLoading(false)
    }
  }

  const STEPS = ['Your Details', 'Verify Mobile', 'Done']

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ width: '100%', maxWidth: 580 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', marginBottom: 10 }}><MCLogo size={42} /></div>
          <MCBrandName size={22} />
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Create your patient account</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          <div style={{ height: 4, background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)' }} />
          <div style={{ padding: 28 }}>

            {/* ══ STEP 0: Registration form ══ */}
            {step === 0 && (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 22 }}>Personal Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lS}>Full Name *</label>
                    <input required style={iS} placeholder="First and last name" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Email Address *</label>
                    <input required type="email" style={iS} placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value.toLowerCase())} />
                  </div>
                  <div>
                    <label style={lS}>Date of Birth</label>
                    <input type="date" style={iS} value={form.dob} onChange={e => set('dob', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label style={lS}>Gender</label>
                    <select style={{ ...iS, cursor: 'pointer' }} value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={lS}>Blood Group</label>
                    <select style={{ ...iS, cursor: 'pointer' }} value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  {/* Phone with +91 */}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lS}>Mobile Number</label>
                    <div style={{ display: 'flex' }}>
                      <div style={{ padding: '9px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 14, color: '#64748b', fontWeight: 500 }}>+91</div>
                      <input type="tel" maxLength={10} placeholder="10-digit mobile number" value={form.phone}
                        onChange={e => handlePhone(e.target.value)}
                        style={{ ...iS, borderRadius: '0 10px 10px 0', flex: 1, borderColor: phoneErr ? '#dc2626' : '#e2e8f0' }} />
                    </div>
                    {phoneErr && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{phoneErr}</div>}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>If you have visited MaxCare+ before, we'll link your records.</div>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lS}>Address</label>
                    <input style={iS} placeholder="Residential address" value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>

                {/* Password */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Set Password</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lS}>Password *</label>
                    <input required type="password" style={iS} placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Confirm Password *</label>
                    <input required type="password"
                      style={{ ...iS, borderColor: form.confirmPassword && form.password !== form.confirmPassword ? '#dc2626' : '#e2e8f0' }}
                      placeholder="Repeat password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords don't match</div>
                    )}
                  </div>
                </div>

                {error && <div style={{ marginTop: 14, padding: '11px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, color: '#991b1b', fontSize: 13 }}>{error}</div>}

                <button type="submit" disabled={loading || !!phoneErr || (form.confirmPassword && form.password !== form.confirmPassword)}
                  style={{ width: '100%', marginTop: 20, padding: '13px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {loading ? 'Checking...' : 'Create Account'}
                </button>
              </form>
            )}

            {/* ══ STEP 1: Existing patient found — offer linking ══ */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Steps current={1} steps={STEPS} />
                <div style={{ padding: '20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 17, color: '#1e293b', marginBottom: 8 }}>
                    Existing Record Found
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                    A patient record for <strong>+91 {form.phone}</strong> already exists at MaxCare+ under the name <strong>{existingPatientName}</strong>.
                    <br /><br />
                    Would you like to link this account to your visits and records?
                  </div>
                </div>

                <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13, color: '#166534' }}>
                  <strong>What linking does:</strong>
                  <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.8 }}>
                    <li>All your previous appointments will appear in your dashboard</li>
                    <li>Your prescriptions and lab reports will be accessible</li>
                    <li>No duplicate records — your history stays intact</li>
                  </ul>
                </div>

                {otpErr && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, color: '#991b1b', fontSize: 13 }}>{otpErr}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={handleSendOtp} disabled={otpLoading}
                    style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: otpLoading ? 'not-allowed' : 'pointer', opacity: otpLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {otpLoading ? 'Sending OTP...' : `Yes, link my account — Send OTP to +91 ${form.phone}`}
                  </button>
                  <button onClick={() => { setStep(0); setError('This mobile number is already in our system. You can skip the mobile number field or use a different number.') }}
                    style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10, color: '#64748b', fontWeight: 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    No, create a separate account
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2: OTP Verification ══ */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Steps current={1} steps={STEPS} />
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📱</div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 6 }}>Enter Verification Code</div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    A 6-digit OTP has been sent to <strong>+91 {form.phone}</strong>
                  </div>
                </div>

                {/* Dev OTP display */}
                {devOtp && (
                  <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Development Mode — OTP (remove in production)
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: '#1e293b', letterSpacing: '0.15em' }}>{devOtp}</div>
                  </div>
                )}

                {/* OTP input */}
                <div>
                  <label style={lS}>6-digit OTP *</label>
                  <input
                    type="tel" maxLength={6} value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpErr('') }}
                    placeholder="000000"
                    autoFocus
                    style={{ ...iS, fontSize: 24, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>

                {otpErr && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, color: '#991b1b', fontSize: 13 }}>{otpErr}</div>}

                <button onClick={handleVerifyOtp} disabled={otpLoading || otp.length !== 6}
                  style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: (otpLoading || otp.length !== 6) ? 'not-allowed' : 'pointer', opacity: (otpLoading || otp.length !== 6) ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {otpLoading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                  Didn't receive the OTP?{' '}
                  {resendCooldown > 0
                    ? <span style={{ color: '#94a3b8' }}>Resend in {resendCooldown}s</span>
                    : <button onClick={handleResendOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Resend OTP</button>
                  }
                </div>

                <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
                  ← Go back
                </button>
              </div>
            )}

            {/* ══ STEP 3: Success ══ */}
            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Steps current={2} steps={STEPS} />
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 22, color: '#1e293b', marginBottom: 10 }}>Account Created!</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
                  Your MaxCare+ account has been created and linked to your medical records. You can now log in and access your complete history.
                </div>
                <button onClick={() => navigate('/login')}
                  style={{ padding: '13px 36px', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to Login →
                </button>
              </div>
            )}

            {/* Sign in link */}
            {step === 0 && (
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748b' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Sign in →</Link>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link to="/" style={{ fontSize: 13, color: '#94a3b8' }}>← Back to MaxCare+ website</Link>
        </div>
      </div>
    </div>
  )
}
