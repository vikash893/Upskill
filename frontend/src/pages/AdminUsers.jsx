import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function AdminUsers() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const fetchUsers = () => {
    setLoading(true)
    request('/get-alluser', { headers })
      .then((d) => setUsers(d.user || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const deleteUser = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return
    try {
      await request(`/delete-user/${email}`, { method: 'DELETE', headers })
      setMessage('User deleted.')
      fetchUsers()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADMIN</p>
            <h2>User Management</h2>
          </div>
          <span style={{ color: 'var(--muted)', font: '11px var(--mono)' }}>{users.length} total users</span>
        </div>

        {message && <p className="form-message" style={{ marginBottom: '20px' }}>{message}</p>}

        <input
          type="text"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '400px', padding: '12px', border: '1px solid var(--line)',
            background: '#fffdf8', outlineColor: 'var(--orange)', fontFamily: 'inherit', marginBottom: '25px',
          }}
        />

        {loading ? (
          <div className="empty-state">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">{search ? 'No users match your search.' : 'No users registered yet.'}</div>
        ) : (
          <div style={{ border: '1px solid var(--line)', background: '#fffdf8' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 0.8fr auto', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              <span></span><span>NAME</span><span>EMAIL</span><span>PHONE</span><span>ACTION</span>
            </div>
            {filtered.map((user) => {
              const photoUrl = user.photo
                ? user.photo.startsWith('http')
                  ? user.photo
                  : `http://localhost:8000/${user.photo.replace(/^[\/\\]+/, '').replace(/\\/g, '/')}`
                : null

              return (
                <div key={user._id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 0.8fr auto', gap: '12px', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={user.name}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--line)',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
                      }}
                    />
                  ) : null}
                  <div
                    className="avatar small"
                    style={{ display: photoUrl ? 'none' : 'flex' }}
                  >
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <strong>{user.name}</strong>
                  <span style={{ color: 'var(--muted)' }}>{user.email}</span>
                  <span style={{ color: 'var(--muted)' }}>{user.phone || '\u2014'}</span>
                  <button
                    className="outline-button"
                    style={{ fontSize: '10px', padding: '6px 10px', borderColor: '#c0392b', color: '#c0392b' }}
                    onClick={() => deleteUser(user.email)}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
