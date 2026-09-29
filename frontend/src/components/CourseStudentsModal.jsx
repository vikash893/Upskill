import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function CourseStudentsModal({ course, onClose }) {
  const { session } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const fetchStudents = () => {
    setLoading(true)
    request(`/course/${course.course_id}/students`)
      .then((data) => setStudents(data.students || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStudents()
  }, [course])

  const handleRemoveStudent = async (studentEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${studentEmail} from this course?`)) return
    try {
      await request(`/admin/remove-student/${course.course_id}/${studentEmail}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setMessage(`Student ${studentEmail} removed from course.`)
      fetchStudents()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" style={{ width: 'min(680px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>

        <p className="eyebrow">ENROLLED STUDENTS</p>
        <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px', marginBottom: '6px' }}>
          {course.course_title}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>
          Total active enrollments: <strong>{students.length}</strong>
        </p>

        {message && <p className="form-message" style={{ marginBottom: '15px' }}>{message}</p>}

        {loading ? (
          <div className="empty-state">Loading enrolled students...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : students.length === 0 ? (
          <div className="empty-state">No students are currently enrolled in this course.</div>
        ) : (
          <div style={{ border: '1px solid var(--line)', background: '#FFFFFF' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 1fr auto', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--line)', font: '10px var(--mono)', color: 'var(--muted)' }}>
              <span></span>
              <span>NAME</span>
              <span>EMAIL</span>
              <span>ENROLLED ON</span>
              {session.role === 'ADMIN' && <span>ACTION</span>}
            </div>

            {students.map((st) => {
              const photoUrl = st.student_photo || st.photo
                ? (st.student_photo || st.photo).startsWith('http')
                  ? (st.student_photo || st.photo)
                  : `http://localhost:8000/${(st.student_photo || st.photo).replace(/^[\/\\]+/, '').replace(/\\/g, '/')}`
                : null

              return (
                <div
                  key={st._id || st.student_email}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: session.role === 'ADMIN' ? '40px 1fr 1.2fr 1fr auto' : '40px 1fr 1.2fr 1fr',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={st.student_name}
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
                    {st.student_name?.charAt(0) || 'S'}
                  </div>
                  <strong>{st.student_name}</strong>
                  <span style={{ color: 'var(--muted)' }}>{st.student_email}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    {new Date(st.enrolled_at || st.createdAt).toLocaleDateString()}
                  </span>
                  {session.role === 'ADMIN' && (
                    <button
                      className="outline-button"
                      style={{ fontSize: '10px', padding: '5px 10px', borderColor: '#c0392b', color: '#c0392b' }}
                      onClick={() => handleRemoveStudent(st.student_email)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
