import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in as admin, redirect to admin dashboard
  if (session?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await request('/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      })

      const adminSession = {
        token: data.token,
        role: 'ADMIN',
        email: form.email,
        name: 'Administrator',
      }
      login(adminSession)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--ink)', padding: '20px' }}>
      <div className="auth-modal" style={{ background: 'var(--paper)', width: 'min(440px, 95vw)', boxShadow: '18px 18px 0 var(--lime)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link className="brand" to="/" style={{ color: 'var(--ink)' }}>uni<span>skill</span></Link>
          <span className="badge" style={{ position: 'static', background: 'var(--orange)', color: 'white', fontWeight: 700 }}>
            ADMIN ACCESS
          </span>
        </div>

        <p className="eyebrow" style={{ color: 'var(--orange)' }}>RESTRICTED AREA</p>
        <h2 style={{ fontSize: '32px', letterSpacing: '-1.5px', marginBottom: '10px' }}>
          Administrator Sign In
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '25px' }}>
          Authorized system management portal. Sign in with administrative credentials.
        </p>

        <form onSubmit={submit} style={{ display: 'grid', gap: '15px' }}>
          <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
            Admin Email
            <input
              required
              type="email"
              placeholder="admin@uniskill.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
            Password
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8' }}
            />
          </label>

          {error && <p className="form-message" style={{ margin: '5px 0' }}>{error}</p>}

          <button className="primary-button full-width" disabled={loading} type="submit" style={{ marginTop: '10px', padding: '14px' }}>
            {loading ? 'Authenticating...' : 'Enter Admin Control Panel ↗'}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <Link to="/" className="text-button" style={{ fontSize: '12px' }}>
            ← Return to public website
          </Link>
        </div>
      </div>
    </div>
  )
}
