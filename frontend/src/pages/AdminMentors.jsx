import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import Skeleton from '../components/Skeleton'

export default function AdminMentors() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session?.token}` }
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    bio: '',
    linkedin: '',
    expertise: '',
    order: 0,
    is_active: true,
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [search, setSearch] = useState('')

  const fetchMentors = () => {
    setLoading(true)
    request('/admin/mentors', { headers })
      .then((d) => setMentors(d.mentors || []))
      .catch(() => {
        // Fallback to public endpoint if needed
        request('/mentors')
          .then((d) => setMentors(d.mentors || []))
          .catch((err) => setMessage({ type: 'error', text: err.message }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMentors()
  }, [])

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      company: '',
      bio: '',
      linkedin: '',
      expertise: '',
      order: 0,
      is_active: true,
    })
    setPhotoFile(null)
    setPhotoPreview('')
    setEditingId(null)
    setShowForm(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const startEdit = (mentor) => {
    setEditingId(mentor._id)
    setForm({
      name: mentor.name || '',
      role: mentor.role || '',
      company: mentor.company || '',
      bio: mentor.bio || '',
      linkedin: mentor.linkedin || '',
      expertise: Array.isArray(mentor.expertise) ? mentor.expertise.join(', ') : '',
      order: mentor.order ?? 0,
      is_active: mentor.is_active !== false,
    })
    setPhotoFile(null)
    setPhotoPreview(mediaUrl(mentor.photo) || '')
    setShowForm(true)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('role', form.role)
      fd.append('company', form.company)
      fd.append('bio', form.bio)
      fd.append('linkedin', form.linkedin)
      fd.append('expertise', form.expertise)
      fd.append('order', String(form.order))
      fd.append('is_active', String(form.is_active))
      if (photoFile) {
        fd.append('photo', photoFile)
      }

      if (editingId) {
        await request(`/mentor/${editingId}`, {
          method: 'PUT',
          headers,
          body: fd,
        })
        setMessage({ type: 'success', text: 'Mentor profile updated successfully!' })
      } else {
        await request('/add-mentor', {
          method: 'POST',
          headers,
          body: fd,
        })
        setMessage({ type: 'success', text: 'New mentor added to platform successfully!' })
      }

      resetForm()
      fetchMentors()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActiveStatus = async (mentor) => {
    try {
      await request(`/mentor/${mentor._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !mentor.is_active }),
      })
      fetchMentors()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const deleteMentor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from mentors?`)) return
    try {
      await request(`/mentor/${id}`, { method: 'DELETE', headers })
      setMessage({ type: 'success', text: `Mentor ${name} removed.` })
      fetchMentors()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const filteredMentors = mentors.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q)
    )
  })

  return (
    <main>
      <section className="content-section">
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p className="eyebrow">ADMIN PORTAL</p>
            <h2>Industry Mentors Directory</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
              Add, edit, and curate expert mentors displayed on the UniSkill landing page.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              if (showForm) resetForm()
              else setShowForm(true)
            }}
          >
            {showForm ? '✕ Close Form' : '+ Add New Mentor'}
          </button>
        </div>

        {message.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '13px',
              background: message.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: message.type === 'error' ? '#991b1b' : '#166534',
              border: `1px solid ${message.type === 'error' ? '#f87171' : '#86efac'}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Add / Edit Mentor Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '24px',
              border: '1px solid var(--line)',
              background: 'var(--surface, #FFFFFF)',
              borderRadius: '8px',
              marginBottom: '30px',
              display: 'grid',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                {editingId ? 'EDIT MENTOR PROFILE' : 'NEW MENTOR PROFILE'}
              </p>
              <button
                type="button"
                onClick={resetForm}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕ Cancel
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Name *
                <input
                  required
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Role / Title *
                <input
                  required
                  type="text"
                  placeholder="e.g. Senior Tech Lead, Cloud Solutions"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current / Ex Company
                <input
                  type="text"
                  placeholder="e.g. Google, Microsoft, Amazon"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LinkedIn Profile URL
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              About / Bio * (Tell students about their experience, achievements & mentorship style)
              <textarea
                required
                rows={4}
                placeholder="Write a concise overview of the mentor's industry journey, specialties, and real-world tech experience..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Key Skills / Expertise (Comma-separated)
                <input
                  type="text"
                  placeholder="e.g. System Design, React, AWS, Microservices"
                  value={form.expertise}
                  onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                  style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
                  Display Priority Order
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    style={{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--input-bg, #fff)' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Show on Landing Page</span>
                </label>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>
                Profile Photo {editingId ? '(Leave empty to keep existing)' : '(Recommended)'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {photoPreview && (
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      backgroundImage: `url(${photoPreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '2px solid var(--accent, #0f172a)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{
                    padding: '8px 12px',
                    border: '1px dashed var(--line)',
                    borderRadius: '6px',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start', marginTop: '10px' }}>
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? (editingId ? 'Updating Mentor...' : 'Saving Mentor...') : (editingId ? 'Update Mentor Profile' : 'Publish Mentor')}
              </button>
              <button type="button" className="outline-button" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Directory Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search mentors by name, role, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              maxWidth: '360px',
              width: '100%',
              background: 'var(--surface, #fff)',
              fontSize: '13px',
            }}
          />
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Showing <strong>{filteredMentors.length}</strong> {filteredMentors.length === 1 ? 'mentor' : 'mentors'}
          </div>
        </div>

        {/* Mentors List */}
        {loading ? (
          <Skeleton variant="rows" count={4} label="Loading mentors" />
        ) : filteredMentors.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              border: '1px dashed var(--line)',
              borderRadius: '8px',
              background: 'var(--surface, #fafafa)',
            }}
          >
            <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '14px' }}>
              {search ? 'No mentors match your search query.' : 'No mentors added yet.'}
            </p>
            {!search && (
              <button className="primary-button" onClick={() => setShowForm(true)}>
                + Add Your First Mentor
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredMentors.map((m) => {
              const photo = mediaUrl(m.photo)
              return (
                <div
                  key={m._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '20px',
                    alignItems: 'start',
                    padding: '20px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--surface, #FFFFFF)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Photo or Initials */}
                  {photo ? (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundImage: `url(${photo})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid var(--line)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: '#0f172a',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {m.name?.charAt(0) || 'M'}
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{m.name}</h3>
                      {m.company && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                          }}
                        >
                          {m.company}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: m.is_active ? '#dcfce7' : '#fee2e2',
                          color: m.is_active ? '#166534' : '#991b1b',
                        }}
                      >
                        {m.is_active ? '● Active on Landing' : '○ Hidden'}
                      </span>
                    </div>

                    <p style={{ margin: '4px 0 8px', fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                      {m.role}
                    </p>

                    <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text, #334155)' }}>
                      {m.bio}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {Array.isArray(m.expertise) &&
                        m.expertise.map((exp, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--subtle, #f1f5f9)',
                              color: 'var(--muted)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            {exp}
                          </span>
                        ))}
                      {m.linkedin && (
                        <a
                          href={m.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '12px',
                            color: '#0a66c2',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: '6px',
                          }}
                        >
                          LinkedIn ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '90px' }}>
                    <button
                      className="outline-button"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => startEdit(m)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActiveStatus(m)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: m.is_active ? '#b45309' : '#166534',
                      }}
                    >
                      {m.is_active ? 'Hide' : 'Unhide'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMentor(m._id, m.name)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        border: '1px solid #fecaca',
                        background: '#fff5f5',
                        color: '#dc2626',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
