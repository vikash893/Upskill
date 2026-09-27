import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function StudentMyCourses() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMyCourses = () => {
    setLoading(true)
    request('/my-courses', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => setCourses(data.courses || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMyCourses()
  }, [])

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">STUDENT CLASSROOMS</p>
          <h2>My Enrolled Courses & Classrooms</h2>
        </div>
        <Link to="/student/explore-courses" className="primary-button" style={{ fontSize: '11px', padding: '10px 18px' }}>
          + Explore More Tracks
        </Link>
      </div>

      {loading ? (
        <div className="empty-state">Loading your course classrooms...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          You are not enrolled in any courses yet.
          <br />
          <Link to="/student/explore-courses" className="primary-button" style={{ display: 'inline-block', marginTop: '15px' }}>
            Explore Catalogue ↗
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {courses.map((course) => {
            const image = course.photo ? `http://localhost:8000/${course.photo.replace(/\\/g, '/')}` : null
            const hasLive = course.active_live_classes?.some((l) => l.status === 'live')
            const planType = course.plan_type || (course.course_type === 'free' ? 'lifetime' : 'monthly')
            const expiryDate = course.plan_expiry ? new Date(course.plan_expiry) : null
            const isExpired = expiryDate && expiryDate < new Date()

            return (
              <article key={course.course_id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="course-image" style={image ? { backgroundImage: `url(${image})` } : undefined}>
                  {!image && <span className="course-image-fallback">UNI / SKILL</span>}
                  {hasLive && (
                    <span className="badge" style={{ background: '#dc2626', color: 'white', fontWeight: 700 }}>
                      ● LIVE NOW
                    </span>
                  )}
                  {!hasLive && (
                    <span className="badge" style={{ background: 'var(--lime)' }}>
                      {planType === 'yearly' ? 'Yearly Access' : planType === 'lifetime' ? 'Lifetime Access' : 'Monthly Plan'}
                    </span>
                  )}
                </div>

                <div className="course-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '6px' }}>ACTIVE CLASSROOM</p>
                  <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{course.course_title}</h3>
                  <p className="course-description" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
                    {course.course_description}
                  </p>

                  {/* Plan & Expiry badge */}
                  <div style={{ padding: '10px 12px', background: isExpired ? '#fef2f2' : '#f8fdf0', border: '1px solid', borderColor: isExpired ? '#fca5a5' : 'var(--lime)', borderRadius: '4px', marginBottom: '16px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>Plan:</strong> {planType.toUpperCase()}</span>
                      <span style={{ color: isExpired ? '#dc2626' : '#166534', fontWeight: 600 }}>
                        {isExpired ? '⚠ Expired' : '✓ Active'}
                      </span>
                    </div>
                    {expiryDate && (
                      <div style={{ color: 'var(--muted)', marginTop: '4px' }}>
                        Expires: <strong>{expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                      </div>
                    )}
                  </div>

                  {/* Course metrics */}
                  <div style={{ display: 'flex', gap: '15px', font: '11px var(--mono)', color: 'var(--muted)', marginBottom: '16px' }}>
                    <span>🎥 {course.lecture_count || 0} Lessons</span>
                    <span>📝 {course.assignment_count || 0} Tasks</span>
                    {hasLive && <span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Live Studio</span>}
                  </div>

                  {/* Classroom Distinct Action Navigation */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    <button
                      className="outline-button"
                      style={{ padding: '8px 4px', fontSize: '11px', textAlign: 'center', background: '#fff' }}
                      onClick={() => navigate(`/learning/${course.course_id}?tab=live`)}
                      title="Enter Live Class"
                    >
                      🔴 Live
                    </button>
                    <button
                      className="outline-button"
                      style={{ padding: '8px 4px', fontSize: '11px', textAlign: 'center', background: '#fff' }}
                      onClick={() => navigate(`/learning/${course.course_id}?tab=lectures`)}
                      title="Watch Recorded Lectures"
                    >
                      🎥 Lectures
                    </button>
                    <button
                      className="outline-button"
                      style={{ padding: '8px 4px', fontSize: '11px', textAlign: 'center', background: '#fff' }}
                      onClick={() => navigate(`/learning/${course.course_id}?tab=assignments`)}
                      title="View & Submit Assignments"
                    >
                      📝 Tasks
                    </button>
                  </div>

                  <button
                    className="primary-button full-width"
                    style={{ marginTop: 'auto' }}
                    onClick={() => navigate(`/learning/${course.course_id}`)}
                  >
                    Enter Full Classroom <span>↗</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
