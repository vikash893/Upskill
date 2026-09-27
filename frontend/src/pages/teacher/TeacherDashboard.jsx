import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import LiveClassModal from '../../components/LiveClassModal'

export default function TeacherDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [pendingSubmissions, setPendingSubmissions] = useState([])
  const [liveClasses, setLiveClasses] = useState([])
  const [activeLiveModal, setActiveLiveModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTeacherData = async () => {
    setLoading(true)
    const headers = { Authorization: `Bearer ${session.token}` }

    try {
      const [profData, coursesData] = await Promise.all([
        request('/teacher/profile', { headers }).catch(() => ({ teacher: null })),
        request('/teacher/my-courses', { headers }).catch(() => ({ courses: [] })),
      ])

      setProfile(profData.teacher)
      const myCourses = coursesData.courses || []
      setCourses(myCourses)

      // Fetch pending assignment submissions & live classes across courses
      const allSubmissions = []
      const allClasses = []

      await Promise.all(
        myCourses.map(async (c) => {
          const [asgRes, liveRes] = await Promise.all([
            request(`/assignment/course/${c.course_id}`, { headers }).catch(() => ({ assignments: [] })),
            request(`/live-class/course/${c.course_id}`, { headers }).catch(() => ({ classes: [] })),
          ])

          if (asgRes.assignments) {
            asgRes.assignments.forEach((a) => {
              if (a.submissions) {
                a.submissions.forEach((sub) => {
                  if (sub.status === 'submitted') {
                    allSubmissions.push({
                      ...sub,
                      assignment_id: a.assignment_id,
                      assignment_title: a.title,
                      course_title: c.course_title,
                      total_points: a.total_points,
                    })
                  }
                })
              }
            })
          }

          if (liveRes.classes) {
            liveRes.classes.forEach((cl) => {
              allClasses.push({ ...cl, course_title: c.course_title })
            })
          }
        })
      )

      setPendingSubmissions(allSubmissions)
      setLiveClasses(allClasses)
    } catch (err) {
      console.log('Teacher dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeacherData()
  }, [session])

  const totalStudents = courses.reduce((sum, c) => sum + (c.student_count || 0), 0)

  return (
    <div>
      <section style={{ marginBottom: '35px' }}>
        <p className="eyebrow">FACULTY PORTAL</p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-3px', margin: '0 0 12px' }}>
          Welcome, <em>{profile?.name || 'Instructor'}.</em>
        </h1>
        <p className="muted" style={{ maxWidth: '650px', fontSize: '15px' }}>
          Manage your assigned classes, upload course curriculum, grade student submissions, and host interactive live classes.
        </p>
      </section>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '35px' }}>
        <div className="stat-card-clean" style={{ background: 'var(--orange)', color: 'white', borderColor: 'var(--orange)' }}>
          <span style={{ font: '10px var(--mono)', color: '#ffe0bd' }}>ASSIGNED COURSES</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {courses.length < 10 ? `0${courses.length}` : courses.length}
          </strong>
          <small style={{ color: '#fff0d8', fontSize: '11px' }}>active in your curriculum</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>TOTAL ENROLLED STUDENTS</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {totalStudents}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>across all your courses</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>PENDING EVALUATIONS</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {pendingSubmissions.length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>student submissions to grade</small>
        </div>
      </div>

      {/* Quick Launch & Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left: Assigned courses quick table */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">CLASSROOM ROSTER</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>My Assigned Classes</h2>
            </div>
            <Link to="/teacher/courses" className="text-button" style={{ fontSize: '12px' }}>
              View All <span>↗</span>
            </Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="empty-state">No courses assigned to your profile yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {courses.map((c) => (
                <div key={c.course_id} className="stat-card-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '16px' }}>{c.course_title}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      👥 {c.student_count || 0} active students enrolled
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    style={{ fontSize: '11px', padding: '8px 16px' }}
                    onClick={() => navigate(`/learning/${c.course_id}`)}
                  >
                    Open Studio ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Submissions to grade */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">SUBMISSIONS QUEUE</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>Awaiting Grading</h2>
            </div>
            <Link to="/teacher/assignments" className="text-button" style={{ fontSize: '12px' }}>
              Assignments <span>↗</span>
            </Link>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="empty-state" style={{ background: '#fcfbf8' }}>
              ✓ All student tasks are graded up to date!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingSubmissions.slice(0, 5).map((sub, idx) => (
                <div key={idx} className="notification-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px' }}>{sub.student_name}</strong>
                    <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>{sub.assignment_title}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 8px' }}>
                    Course: <strong>{sub.course_title}</strong>
                  </p>
                  <button
                    className="primary-button"
                    style={{ fontSize: '10px', padding: '6px 12px' }}
                    onClick={() => navigate('/teacher/assignments')}
                  >
                    Grade Submission ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Class Modal */}
      {activeLiveModal && (
        <LiveClassModal liveClass={activeLiveModal} onClose={() => setActiveLiveModal(null)} />
      )}
    </div>
  )
}
