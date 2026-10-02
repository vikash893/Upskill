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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
            <div ref={googleBtnRef} style={{ minHeight: '44px' }} />
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
