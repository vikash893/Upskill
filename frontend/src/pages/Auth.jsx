import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import Brand from '../components/Brand'
import TermsModal from '../components/TermsModal'
import { celebrate, prepareCelebrationAudio } from '../utils/celebration'
import { LANDING_URL } from '../config'

export default function Auth({ initialMode = 'login' }) {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine mode from prop or path
  const [activeMode, setActiveMode] = useState(() => {
    if (location.pathname === '/register') return 'register'
    return initialMode || 'login'
  })

  useEffect(() => {
    if (location.pathname === '/register') setActiveMode('register')
    else if (location.pathname === '/login') setActiveMode('login')
  }, [location.pathname])

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [googleBtnRendered, setGoogleBtnRendered] = useState(false)
  const googleBtnRef = useRef(null)

  // OTP Verification state for manual registration
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('')

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isGoogleConfigured = googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE'

  // Get return URL from query params
  const searchParams = new URLSearchParams(location.search)
  const redirectPath = searchParams.get('redirect') || '/dashboard'

  // If already logged in, redirect
  useEffect(() => {
    if (session) {
      navigate(redirectPath, { replace: true })
    }
  }, [session, navigate, redirectPath])

  // Google OAuth callback
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
        const userSession = {
          token: data.token,
          role: data.user?.role || 'STUDENT',
          email: data.user?.email,
          name: data.user?.name || '',
          photo: data.user?.photo || null,
        }
        login(userSession)
        celebrate()
        navigate(redirectPath)
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
  }, [activeMode, isGoogleConfigured, googleClientId, login, navigate, redirectPath])

  const handleCustomGoogleClick = () => {
    if (!isGoogleConfigured) {
      setError('Please configure VITE_GOOGLE_CLIENT_ID in frontend/.env to enable Google Authentication.')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOtpSuccessMessage('')
    setLoading(true)

    try {
      if (activeMode === 'register') {
        if (!agreedTerms) {
          throw new Error('You must accept the Terms of Service & Privacy Policy to register.')
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/
        if (!passwordRegex.test(form.password)) {
          throw new Error('Password must be at least 8 characters long, contain at least one uppercase letter and one special character (!@#$%^&*).')
        }

        const fd = new FormData()
        fd.append('name', form.name)
        fd.append('email', form.email)
        fd.append('phone', form.phone)
        fd.append('password', form.password)

        const data = await request('/auth/register', { method: 'POST', body: fd })
        
        // If server returns requires_otp, switch to on-page OTP verification step
        if (data.requires_otp) {
          setOtpStep(true)
          setOtpEmail(data.email || form.email)
          setResendCooldown(30)
          setOtpSuccessMessage('Verification code sent to your email. Enter the 6-digit code below.')
          return
        }

        const userSession = {
          token: data.token,
          role: data.user?.role || 'STUDENT',
          email: data.user?.email,
          name: data.user?.name || form.name,
          photo: data.user?.photo || null,
        }
        login(userSession)
        celebrate()
        navigate(redirectPath)
      } else {
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password }),
        })
        const userSession = {
          token: data.token,
          role: data.user?.role || 'STUDENT',
          email: data.user?.email,
          name: data.user?.name || '',
          photo: data.user?.photo || null,
        }
        login(userSession)
        celebrate()
        navigate(redirectPath)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const data = await request('/auth/register/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: otpEmail, otp: otp.trim() })
      })

      const userSession = {
        token: data.token,
        role: data.user?.role || 'STUDENT',
        email: data.user?.email || otpEmail,
        name: data.user?.name || form.name,
        photo: data.user?.photo || null,
      }
      login(userSession)
      celebrate()
      navigate(redirectPath)
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Resend OTP (with 30-second rate-limit)
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    setOtpSuccessMessage('')
    setLoading(true)
    try {
      await request('/auth/register/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: otpEmail })
      })
      setResendCooldown(30)
      setOtpSuccessMessage('New verification code sent! Check your email.')
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header style={{ height: '70px', padding: '0 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <Brand variant="logo" to="/login" />
        <a
          href={LANDING_URL}
          style={{ fontSize: '13px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          <span>← Back to uniskill.in</span>
        </a>
      </header>

      {/* Main Form Center Box */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '36px 32px',
            boxShadow: '0 10px 30px rgba(0, 86, 210, 0.08)',
          }}
        >
          {/* Top Wordmark & Heading */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'var(--orange)', textTransform: 'uppercase' }}>
              UNISKILL PORTAL
            </span>
            <h1 style={{ margin: '6px 0 8px', fontSize: '26px', letterSpacing: '-1px', color: 'var(--ink)' }}>
              {activeMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
              {activeMode === 'login'
                ? 'Sign in to access your classrooms, assignments, and streaks.'
                : 'Join thousands of students learning in public.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--light)',
              padding: '4px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveMode('login')
                setError('')
              }}
              style={{
                padding: '9px 0',
                border: 'none',
                borderRadius: '6px',
                background: activeMode === 'login' ? 'var(--surface)' : 'transparent',
                color: activeMode === 'login' ? 'var(--orange)' : 'var(--muted)',
                fontWeight: activeMode === 'login' ? 700 : 500,
                fontSize: '13.5px',
                boxShadow: activeMode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('register')
                setError('')
              }}
              style={{
                padding: '9px 0',
                border: 'none',
                borderRadius: '6px',
                background: activeMode === 'register' ? 'var(--surface)' : 'transparent',
                color: activeMode === 'register' ? 'var(--orange)' : 'var(--muted)',
                fontWeight: activeMode === 'register' ? 700 : 500,
                fontSize: '13.5px',
                boxShadow: activeMode === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Register
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                borderRadius: '6px',
                fontSize: '12.5px',
                marginBottom: '18px',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* Google Sign-in Button */}
          <div style={{ marginBottom: '18px' }}>
            <div
              ref={googleBtnRef}
              style={{
                width: '100%',
                minHeight: isGoogleConfigured ? '40px' : '0',
                display: isGoogleConfigured && googleBtnRendered ? 'flex' : 'none',
                justifyContent: 'center',
              }}
            />

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
                  borderRadius: '6px',
                  color: '#3c4043',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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

            {googleLoading && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', margin: '6px 0 0' }}>
                Connecting Google account...
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Or with email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          </div>

          {/* Authentication Form */}
          {otpStep && activeMode === 'register' ? (
            /* ─── Inline OTP Verification Step ─── */
            <form onSubmit={handleVerifyOtp} style={{ display: 'grid', gap: '14px' }}>
              {otpSuccessMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                  }}
                >
                  {otpSuccessMessage}
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  margin: '0 auto 12px',
                  border: '2px solid #BFDBFE'
                }}>
                  ✉️
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--ink)' }}>
                  Verify your email
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{otpEmail}</strong>
                </p>
              </div>

              <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                VERIFICATION CODE *
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  autoFocus
                  style={{
                    padding: '14px',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '8px',
                    textAlign: 'center',
                    background: '#FFFFFF'
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="primary-button"
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                {loading ? 'Verifying...' : 'Verify & Create Account ↗'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--muted)' : 'var(--orange)',
                    fontWeight: 700,
                    cursor: resendCooldown > 0 ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtp(''); setError(''); setOtpSuccessMessage('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textAlign: 'center',
                }}
              >
                ← Back to registration form
              </button>
            </form>
          ) : (
            /* ─── Standard Login / Register Form ─── */
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
              {activeMode === 'register' && (
                <>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    FULL NAME *
                    <input
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', background: '#FFFFFF' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    PHONE NUMBER *
                    <input
                      required
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{ padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', background: '#FFFFFF' }}
                    />
                  </label>
                </>
              )}

              <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                EMAIL ADDRESS *
                <input
                  required
                  type="email"
                  placeholder="name@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', background: '#FFFFFF' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                PASSWORD *
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', background: '#FFFFFF' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>

                {activeMode === 'register' && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Min. 8 chars, 1 uppercase, 1 symbol
                  </span>
                )}
              </div>

              {activeMode === 'register' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--muted)', marginTop: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    required
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowTermsModal(true)
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--orange)', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Terms of Service & Privacy Policy
                    </button>
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="primary-button"
                style={{ width: '100%', padding: '12px', marginTop: '10px', fontSize: '14px' }}
              >
                {loading
                  ? 'Authenticating...'
                  : activeMode === 'login'
                  ? 'Sign In to Workspace ↗'
                  : 'Create Account & Continue ↗'}
              </button>
            </form>
          )}

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '22px', marginBottom: 0 }}>
            {activeMode === 'login' ? (
              <>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('register')
                    setError('')
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('login')
                    setError('')
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Sign in here
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      {/* Interactive Legal Modal */}
      {showTermsModal && (
        <TermsModal initialTab="terms" onClose={() => setShowTermsModal(false)} />
      )}
    </div>
  )
}
