import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function TeacherStudents() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const coursesData = await request('/teacher/my-courses', { headers })
      const myCourses = coursesData.courses || []

      const allStudents = []
      await Promise.all(
        myCourses.map(async (c) => {
          const res = await request(`/course/${c.course_id}/students`, { headers }).catch(() => ({ students: [] }))
          if (res.students) {
            res.students.forEach((st) => {
              allStudents.push({ ...st, course_title: c.course_title })
            })
          }
        })
      )

      setStudents(allStudents)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const filtered = search.trim()
    ? students.filter(
        (s) =>
          s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.student_email?.toLowerCase().includes(search.toLowerCase()) ||
          s.course_title?.toLowerCase().includes(search.toLowerCase())
      )
    : students

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">STUDENT DIRECTORY</p>
          <h2>Enrolled Students Roster</h2>
        </div>
        <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>{students.length} total active students</span>
      </div>

      <input
        type="text"
        placeholder="Search by student name, email, or course..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '12px',
          border: '1px solid var(--line)',
          background: '#fffdf8',
          outlineColor: 'var(--orange)',
          marginBottom: '20px',
        }}
      />

      {loading ? (
        <div className="empty-state">Loading enrolled students...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No students found matching your search.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', background: '#fffdf8' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1.2fr 1.4fr 1.4fr 1fr',
              gap: '10px',
              padding: '12px 18px',
              borderBottom: '1px solid var(--line)',
              font: '10px var(--mono)',
              color: 'var(--muted)',
            }}
          >
            <span></span>
            <span>STUDENT</span>
            <span>EMAIL</span>
            <span>COURSE ENROLLED</span>
            <span>JOINED ON</span>
          </div>

          {filtered.map((st, idx) => {
            const photoUrl = st.student_photo || st.photo
              ? (st.student_photo || st.photo).startsWith('http')
                ? (st.student_photo || st.photo)
                : `http://localhost:8000/${(st.student_photo || st.photo).replace(/^[\/\\]+/, '').replace(/\\/g, '/')}`
              : null

            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1.2fr 1.4fr 1.4fr 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--line)',
                  fontSize: '13px',
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
                <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{st.course_title}</span>
                <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>
                  {new Date(st.enrolled_at || st.createdAt).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
