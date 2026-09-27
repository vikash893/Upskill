import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import CourseStudentsModal from '../../components/CourseStudentsModal'

export default function TeacherCourses() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null)

  const fetchCourses = () => {
    setLoading(true)
    request('/teacher/my-courses', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => setCourses(data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">FACULTY DIRECTORY</p>
          <h2>My Assigned Courses</h2>
        </div>
        <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>{courses.length} courses under instruction</span>
      </div>

      {loading ? (
        <div className="empty-state">Loading assigned courses...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">No courses are currently assigned to your teacher account.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px' }}>
          {courses.map((course) => {
            const image = course.photo ? `http://localhost:8000/${course.photo}` : null

            return (
              <article key={course.course_id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="course-image" style={image ? { backgroundImage: `url(${image})` } : undefined}>
                  {!image && <span className="course-image-fallback">UNI / SKILL</span>}
                  <span className="badge" style={{ background: 'var(--lime)' }}>
                    👥 {course.student_count || 0} Students Enrolled
                  </span>
                </div>

                <div className="course-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p className="eyebrow">COURSE CLASSROOM</p>
                  <h3>{course.course_title}</h3>
                  <p className="course-description">{course.course_description}</p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '15px' }}>
                    <button
                      className="primary-button"
                      style={{ flex: 1, fontSize: '11px' }}
                      onClick={() => navigate(`/learning/${course.course_id}`)}
                    >
                      Open Studio ↗
                    </button>
                    <button
                      className="outline-button"
                      style={{ fontSize: '11px', padding: '8px 12px' }}
                      onClick={() => setSelectedCourseForStudents(course)}
                    >
                      👥 View Roster
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Enrolled Students Modal */}
      {selectedCourseForStudents && (
        <CourseStudentsModal
          course={selectedCourseForStudents}
          onClose={() => setSelectedCourseForStudents(null)}
        />
      )}
    </div>
  )
}
