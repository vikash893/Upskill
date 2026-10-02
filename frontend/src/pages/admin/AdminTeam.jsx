import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function AdminTeam() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadAdmins = async () => {
    try {
      const data = await request('/admin/admins', { headers })
      setAdmins(data.admins || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    request('/admin/admins', { headers: { Authorization: `Bearer ${session.token}` } })
      .then((data) => {
        if (active) setAdmins(data.admins || [])
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [session.token])

  const addAdmin = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const data = await request('/create-admin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      })
      setMessage(data.message)
      formElement.reset()
      await loadAdmins()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-team-page">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACCESS CONTROL</p>
            <h2>Admin team</h2>
          </div>
          <p className="section-note">Add trusted administrators with the same protected workspace permissions.</p>
        </div>

        <div className="admin-team-grid">
          <section className="admin-team-form-panel">
            <p className="eyebrow">NEW ACCOUNT</p>
            <h3>Add an administrator</h3>
            <p className="admin-team-intro">The account receives admin access automatically. Credentials are stored as a secure password hash.</p>

            {message && <p className="admin-team-message success" role="status">{message}</p>}
            {error && <p className="admin-team-message error" role="alert">{error}</p>}

            <form onSubmit={addAdmin}>
              <label>
                Full name
                <input name="name" type="text" autoComplete="name" maxLength={100} required />
              </label>
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <label>
                Temporary password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  pattern="(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}"
                  title="At least 8 characters, including an uppercase letter and a special character."
                  required
                />
              </label>
              <p className="admin-team-password-note">At least 8 characters, one uppercase letter, and one special character.</p>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Creating account...' : 'Create admin account'}
              </button>
            </form>
          </section>

          <section className="admin-team-list-panel">
            <div className="admin-team-list-heading">
              <div>
                <p className="eyebrow">AUTHORIZED ACCOUNTS</p>
                <h3>Administrators</h3>
              </div>
              <span>{admins.length} accounts</span>
            </div>

            {loading ? (
              <div className="empty-state">Loading administrators...</div>
            ) : admins.length === 0 ? (
              <div className="empty-state">No admin accounts found.</div>
            ) : (
              <div className="admin-team-list">
                {admins.map((admin) => (
                  <article className="admin-team-row" key={admin._id}>
                    <span className="admin-team-avatar" aria-hidden="true">{admin.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                    <div className="admin-team-identity">
                      <strong>{admin.name}</strong>
                      <span>{admin.email}</span>
                    </div>
                    <div className="admin-team-status">
                      <span>ADMIN</span>
                      <small>Added {formatDate(admin.createdAt)}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <style>{`
        .admin-team-page .content-section { padding-top: 56px; }
        .admin-team-grid { display: grid; grid-template-columns: minmax(300px, .78fr) minmax(0, 1.22fr); gap: 20px; align-items: start; }
        .admin-team-form-panel, .admin-team-list-panel { padding: 24px; border: 1px solid var(--line); background: #fff; }
        .admin-team-form-panel .eyebrow, .admin-team-list-heading .eyebrow { margin-bottom: 7px; font-size: 10px; }
        .admin-team-form-panel h3, .admin-team-list-heading h3 { margin: 0; font-size: 21px; }
        .admin-team-intro { margin: 10px 0 20px; color: var(--muted); font-size: 12px; line-height: 1.6; }
        .admin-team-form-panel form { display: grid; gap: 14px; }
        .admin-team-form-panel label { display: grid; gap: 6px; color: var(--muted); font-size: 11px; font-weight: 600; }
        .admin-team-form-panel input { width: 100%; min-width: 0; border: 1px solid var(--line); border-radius: 4px; background: #fff; padding: 11px 12px; color: var(--ink); font: inherit; font-size: 13px; }
        .admin-team-password-note { margin: -8px 0 0; color: var(--muted); font-size: 10px; line-height: 1.5; }
        .admin-team-form-panel .primary-button { justify-self: start; padding: 11px 18px; font-size: 12px; }
        .admin-team-message { margin: 0 0 14px; padding: 10px 12px; border: 1px solid; font-size: 12px; }
        .admin-team-message.success { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
        .admin-team-message.error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
        .admin-team-list-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; }
        .admin-team-list-heading > span { color: var(--muted); font: 10px var(--mono); }
        .admin-team-list { border-top: 1px solid var(--line); }
        .admin-team-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 13px 2px; border-bottom: 1px solid #edf0f4; }
        .admin-team-avatar { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: #e7eef4; color: #153652; font-size: 13px; font-weight: 700; }
        .admin-team-identity, .admin-team-status { display: grid; min-width: 0; gap: 4px; }
        .admin-team-identity strong { overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .admin-team-identity span, .admin-team-status small { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
        .admin-team-status { justify-items: end; }
        .admin-team-status > span { padding: 3px 7px; background: #eaf2f7; color: #163a54; font: 9px var(--mono); }
        @media (max-width: 800px) { .admin-team-grid { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .admin-team-page .content-section { padding: 36px 5vw; } .admin-team-form-panel, .admin-team-list-panel { padding: 18px; } .admin-team-row { grid-template-columns: 36px minmax(0, 1fr); } .admin-team-status { grid-column: 2; justify-items: start; } }
      `}</style>
    </main>
  )
}