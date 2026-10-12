import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import TermsModal from './TermsModal'
import Brand from './Brand'
import { celebrate, prepareCelebrationAudio } from '../utils/celebration'

export default function AuthModal({ mode, onClose }) {
  const [activeMode, setActiveMode] = useState(mode)
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [googleBtnRendered, setGoogleBtnRendered] = useState(false)
  const googleBtnRef = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  // OTP state
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpMessage, setOtpMessage] = useState('')

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isGoogleConfigured = googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE'

  // Initialize Google Identity Services
  useEffect(() => {
    prepareCelebrationAudio()

    const handleGoogleCallback = async (response) => {
      if (!response.credential) return
      setError('')
      setGoogleLoading(true)
      try {
        const data = await request('/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential: response.credential }),
        })
        const session = {
          token: data.token,
          role: data.user?.role || 'STUDENT',
          email: data.user?.email,
          name: data.user?.name || '',
          photo: data.user?.photo || null,
        }
        login(session)
        celebrate()
        onClose()
        navigate('/dashboard')
      } catch (gErr) {
        setError(gErr.message || 'Google sign-in failed. Please try again.')
      } finally {
        setGoogleLoading(false)
      }
    }

    const setupGoogleBtn = () => {
      if (!window.google?.accounts?.id) return
      
      if (isGoogleConfigured) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
          })

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = ''
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: activeMode === 'login' ? 'signin_with' : 'signup_with',
              shape: 'rectangular',
              logo_alignment: 'center',
            })
            setGoogleBtnRendered(true)
          }
        } catch (err) {
          console.warn('Google Identity initialization notice:', err)
          setGoogleBtnRendered(false)
        }
      }
    }

    if (window.google?.accounts?.id) {
      setupGoogleBtn()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = setupGoogleBtn
      document.body.appendChild(script)
    }
  }, [activeMode, isGoogleConfigured, googleClientId, login, navigate, onClose])

  const handleCustomGoogleClick = () => {
    if (!isGoogleConfigured) {
      setError('Please configure your Google Client ID in frontend/.env and backend/.env to enable Google Authentication.')
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google prompt not displayed or skipped:', notification)
        }
      })
    } else {
      setError('Google Sign-In SDK is loading. Please try again in a moment.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    prepareCelebrationAudio()
    setError('')
    setOtpMessage('')
    setLoading(true)
    try {
      if (activeMode === 'register') {
        const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(form) })
        if (data.requires_otp) {
          setOtpStep(true)
          setOtpEmail(data.email || form.email)
          setResendCooldown(30)
          setOtpMessage('Verification code sent to your email.')
          return
        }
        setActiveMode('login')
        setError('Account created. Sign in to continue.')
      } else {
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password }),
        })
        const session = {
          token: data.token,
          role: data.user?.role || 'STUDENT',
          email: data.user?.email || form.email,
          name: data.user?.name || '',
          photo: data.user?.photo || null,
        }
        login(session)
        celebrate()
        onClose()
        navigate('/dashboard')
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) { setError('Enter the 6-digit code.'); return }
    setError(''); setLoading(true)
    try {
      const data = await request('/auth/register/verify-otp', {
        method: 'POST', body: JSON.stringify({ email: otpEmail, otp: otp.trim() })
      })
      login({ token: data.token, role: data.user?.role || 'STUDENT', email: data.user?.email || otpEmail, name: data.user?.name || form.name, photo: data.user?.photo || null })
      celebrate(); onClose(); navigate('/dashboard')
    } catch (err) { setError(err.message || 'Invalid or expired code.') }
    finally { setLoading(false) }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError(''); setOtpMessage(''); setLoading(true)
    try {
      await request('/auth/register/resend-otp', { method: 'POST', body: JSON.stringify({ email: otpEmail }) })
      setResendCooldown(30); setOtpMessage('New code sent!')
    } catch (err) { setError(err.message || 'Resend failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="auth-modal" style={{ maxWidth: '440px', width: '92vw' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        
        <Brand variant="logo" />

        <h2>{activeMode === 'login' ? 'Make room for your next skill.' : 'Start your learning story.'}</h2>

        <div className="auth-tabs">
          <button className={activeMode === 'login' ? 'active' : ''} onClick={() => { setActiveMode('login'); setError('') }}>Sign in</button>
          <button className={activeMode === 'register' ? 'active' : ''} onClick={() => { setActiveMode('register'); setError('') }}>Create account</button>
        </div>

        {/* Google sign-in is available for student accounts. */}
        <div style={{ margin: '18px 0 16px' }}>
            {/* If Google rendered iframe button is active, show only that */}
            <div
              ref={googleBtnRef}
              style={{
                width: '100%',
                minHeight: isGoogleConfigured ? '40px' : '0',
                display: isGoogleConfigured && googleBtnRendered ? 'flex' : 'none',
                justifyContent: 'center'
              }}
            ></div>

            {/* Custom Google Button shown if iframe button is not rendered */}
            {(!isGoogleConfigured || !googleBtnRendered) && (
              <button
                type="button"
                onClick={handleCustomGoogleClick}
                disabled={googleLoading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  color: '#3c4043',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#c1c3c7' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {googleLoading ? 'Connecting to Google...' : activeMode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
              </button>
            )}

            {/* DIVIDER */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0 14px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
              <span style={{ padding: '0 12px', font: 'var(--mono)' }}>or with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
            </div>
        </div>

        {otpStep && activeMode === 'register' ? (
          <form onSubmit={handleVerifyOtp}>
            {otpMessage && <p className="form-message" style={{ color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>{otpMessage}</p>}
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 8px' }}>Enter the 6-digit code sent to <strong>{otpEmail}</strong></p>
            </div>
            <label>Verification Code
              <input required type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} autoFocus
                style={{ fontSize: '20px', letterSpacing: '8px', textAlign: 'center', fontWeight: 700 }} />
            </label>
            {error && <p className="form-message">{error}</p>}
            <button className="primary-button full-width" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
              <span>Didn't get it?</span>
              <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--muted)' : 'var(--orange)', fontWeight: 700, cursor: resendCooldown > 0 ? 'default' : 'pointer', padding: 0 }}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
              </button>
            </div>
            <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setError(''); setOtpMessage('') }}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline', width: '100%', textAlign: 'center', marginTop: '6px' }}>
              ← Back to registration
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            {activeMode === 'register' && (
              <>
                <label>Full name
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label>Phone number
                  <input required inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
              </>
            )}
            <label>Email address
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>Password
              <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>

            {activeMode === 'register' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  style={{ width: '15px', height: '15px', marginTop: '2px', accentColor: 'var(--orange)' }}
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                    style={{ background: 'none', border: 0, padding: 0, color: 'var(--orange)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
                  >
                    Terms & Conditions and Privacy Policy
                  </button>
                  {' '}(including secure session & IP verification).
                </span>
              </label>
            )}

            {error && <p className="form-message">{error}</p>}
            <button className="primary-button full-width" disabled={loading || googleLoading}>
              {loading ? 'Please wait...' : activeMode === 'login' ? 'Enter UniSkill' : 'Create my account'}
            </button>
          </form>
        )}
      </section>

      {showTermsModal && (
        <TermsModal onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  )
}
