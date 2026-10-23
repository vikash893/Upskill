import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import AssignCourseModal from '../components/AssignCourseModal'
import { mediaUrl } from '../utils/mediaUrl'
import Skeleton from '../components/Skeleton'
import Pagination from '../components/Pagination'

export default function AdminTeachers() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const fetchTeachers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search.trim()) params.set('search', search.trim())

    request(`/get-all-teachers?${params.toString()}`)
      .then((d) => {
        setTeachers(d.teachers || [])
        if (d.pagination) {
          setPagination(d.pagination)
        } else {
          const tot = d.total || (d.teachers ? d.teachers.length : 0)
          setPagination({
            currentPage: page,
            pageSize: limit,
            totalRecords: tot,
            totalPages: Math.ceil(tot / limit) || 1,
            hasNextPage: page * limit < tot,
            hasPreviousPage: page > 1,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTeachers() }, [page, limit, search])

  const addTeacher = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('email', form.email)
      fd.append('phone', form.phone)
      fd.append('password', form.password)
      if (photo) fd.append('photo', photo)

      await request('/add-teacher', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })
      setMessage('Teacher created successfully! You can now assign courses below.')
      setForm({ name: '', email: '', phone: '', password: '' })
      setPhoto(null)
      setShowAdd(false)
      fetchTeachers()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteTeacher = async (id) => {
    if (!window.confirm('Remove this teacher from the platform?')) return
    try {
      await request(`/delete-teacher/${id}`, { method: 'DELETE', headers })
      setMessage('Teacher removed.')
      fetchTeachers()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADMIN PORTAL</p>
            <h2>Teacher Faculty & Course Assignment</h2>
          </div>
          <button className="primary-button" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : '+ Add New Teacher'}
          </button>
        </div>

        {message && <p className="form-message" style={{ marginBottom: '20px' }}>{message}</p>}

        <input
          type="text"
          placeholder="Search teachers by name, email, or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            outlineColor: 'var(--orange)',
            fontFamily: 'inherit',
            marginBottom: '25px',
          }}
        />

        {/* Add Teacher Form (No initial course assignment input as requested) */}
        {showAdd && (
          <form onSubmit={addTeacher} style={{ padding: '25px', border: '1px solid var(--line)', background: '#FFFFFF', marginBottom: '30px', display: 'grid', gap: '15px' }}>
            <p className="eyebrow">CREATE TEACHER ACCOUNT</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Full Name *
                <input required placeholder="e.g. Dr. Rajesh Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Email Address *
                <input required type="email" placeholder="teacher@uniskill.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Phone Number *
                <input required placeholder="+91 98765 00000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Temporary Password *
                <input required type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }} />
              </label>
            </div>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Profile Photo (Optional)
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} style={{ padding: '8px', background: 'white' }} />
            </label>
            <div style={{ padding: '10px 14px', background: '#f8f6f0', border: '1px dashed var(--line)', fontSize: '11px', color: 'var(--muted)' }}>
              ℹ Note: Course assignments are configured after teacher creation using the "📚 Assign Courses" button.
            </div>
            <button className="primary-button" style={{ justifySelf: 'start' }} disabled={saving} type="submit">
              {saving ? 'Creating Teacher...' : 'Create Teacher Account'}
            </button>
          </form>
        )}

        {loading ? (
          <Skeleton variant="rows" count={4} label="Loading teachers" />
        ) : teachers.length === 0 ? (
          <div className="empty-state">No teachers added yet. Click above to register your first instructor.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {teachers.map((t) => {
              const img = mediaUrl(t.photo)
              return (
                <div key={t._id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: '18px', alignItems: 'center', padding: '18px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
                  {img ? (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `url(${img}) center/cover`, border: '1px solid var(--line)' }} />
                  ) : (
                    <div className="avatar">{t.name?.charAt(0)}</div>
                  )}
                  <div>
                    <strong>{t.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      {t.email} · {t.phone}
                    </p>
                    {t.course_assigned?.length > 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--orange)', margin: '4px 0 0' }}>
                        Assigned ({t.course_assigned.length}): {t.course_assigned.join(', ')}
                      </p>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
                        No courses assigned yet — click Assign Courses to add
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="primary-button"
                      style={{ fontSize: '10px', padding: '7px 12px' }}
                      onClick={() => setSelectedTeacherForAssignment(t)}
                    >
                      📚 Assign / Manage Courses
                    </button>
                    <button
                      className="outline-button"
                      style={{ fontSize: '10px', padding: '7px 12px', borderColor: '#c0392b', color: '#c0392b' }}
                      onClick={() => deleteTeacher(t._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setLimit(newSize)
            setPage(1)
          }}
          itemName="teachers"
          loading={loading}
        />

        {/* Course Assignment Modal */}
        {selectedTeacherForAssignment && (
          <AssignCourseModal
            teacher={selectedTeacherForAssignment}
            onClose={() => setSelectedTeacherForAssignment(null)}
            onUpdated={fetchTeachers}
          />
        )}
      </section>
    </main>
  )
}
