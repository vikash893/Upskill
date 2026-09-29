import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import LiveClassModal from '../../components/LiveClassModal'

export default function StudentDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [myCourses, setMyCourses] = useState([])
  const [courseStats, setCourseStats] = useState([])
  const [assignmentNotifications, setAssignmentNotifications] = useState([])
  const [upcomingLiveClass, setUpcomingLiveClass] = useState(null)
  const [activeLiveModal, setActiveLiveModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardMetrics = async () => {
    setLoading(true)
    const headers = { Authorization: `Bearer ${session.token}` }

    try {
      const [profData, myCoursesData] = await Promise.all([
        request('/get/user/id', { headers }).catch(() => ({ user: null })),
        request('/my-courses', { headers }).catch(() => ({ courses: [] })),
      ])

      setProfile(profData.user)
      const courses = myCoursesData.courses || []
      setMyCourses(courses)

      // Calculate attendance & completion percentage for each course
      const stats = await Promise.all(
        courses.map(async (course) => {
          const [lecData, liveData, asgData] = await Promise.all([
            request(`/lecture/course/${course.course_id}`, { headers }).catch(() => ({ lectures: [] })),
            request(`/live-class/course/${course.course_id}`, { headers }).catch(() => ({ classes: [] })),
            request(`/assignment/course/${course.course_id}`, { headers }).catch(() => ({ assignments: [] })),
          ])

          const lectures = lecData.lectures || []
          const liveClasses = liveData.classes || []
          const assignments = asgData.assignments || []

          // Classes completed / conducted
          const completedLiveClasses = liveClasses.filter((c) => c.status === 'ended' || c.status === 'live')
          const totalSessionsConducted = lectures.length + completedLiveClasses.length

          // Check how many live classes this student attended
          const attendedLiveClasses = completedLiveClasses.filter((c) =>
            c.attendance?.some(
              (att) => att.student_email?.toLowerCase() === session.email?.toLowerCase() && att.status === 'present'
            )
          )

          // Let completed recorded lectures count as 1 if at least one lecture or progress tracked
          const attendedLecturesCount = lectures.length > 0 ? 1 : 0
          const totalAttendedSessions = attendedLecturesCount + attendedLiveClasses.length

          const completionPercent =
            totalSessionsConducted > 0
              ? Math.min(100, Math.round((totalAttendedSessions / totalSessionsConducted) * 100))
              : 0

          // Check assignment submissions
          const pendingAssignments = assignments.filter((a) => !a.my_submission)
          const gradedAssignments = assignments.filter((a) => a.my_submission?.status === 'graded')

          return {
            course_id: course.course_id,
            course_title: course.course_title,
            total_sessions: totalSessionsConducted,
            attended_sessions: totalAttendedSessions,
            completion_percent: completionPercent,
            recorded_count: lectures.length,
            live_count: completedLiveClasses.length,
            attended_live: attendedLiveClasses.length,
            pending_assignments: pendingAssignments,
            graded_assignments: gradedAssignments,
            live_classes: liveClasses,
          }
        })
      )

      setCourseStats(stats)

      // Collect assignment notifications
      const notifications = []
      stats.forEach((st) => {
        st.pending_assignments.forEach((asg) => {
          notifications.push({
            id: asg.assignment_id,
            type: 'pending',
            title: asg.title,
            course: st.course_title,
            course_id: st.course_id,
            due: asg.due_date ? new Date(asg.due_date).toLocaleDateString() : 'No deadline',
          })
        })
        st.graded_assignments.forEach((asg) => {
          notifications.push({
            id: asg.assignment_id,
            type: 'graded',
            title: asg.title,
            course: st.course_title,
            course_id: st.course_id,
            grade: asg.my_submission.grade,
            total: asg.total_points,
            feedback: asg.my_submission.feedback,
          })
        })
      })
      setAssignmentNotifications(notifications)

      // Find earliest upcoming or live class
      let nextLive = null
      stats.forEach((st) => {
        st.live_classes.forEach((lc) => {
          if (lc.status === 'live') {
            nextLive = lc
          } else if (lc.status === 'upcoming' && !nextLive) {
            nextLive = lc
          }
        })
      })
      setUpcomingLiveClass(nextLive)
    } catch (err) {
      console.log('Metrics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardMetrics()
  }, [session])

  const firstName = profile?.name ? profile.name.split(' ')[0] : session.name || 'Student'
  const averageCompletion =
    courseStats.length > 0
      ? Math.round(courseStats.reduce((sum, c) => sum + c.completion_percent, 0) / courseStats.length)
      : 0

  return (
    <div>
      {/* Intro section */}
      <section style={{ marginBottom: '35px' }}>
        <p className="eyebrow">STUDENT PORTAL</p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-3px', margin: '0 0 12px' }}>
          Keep going, <em>{firstName}.</em>
        </h1>
        <p className="muted" style={{ maxWidth: '650px', fontSize: '15px' }}>
          Here is your live learning progress, course completion meters, assignment notifications, and scheduled classes.
        </p>
      </section>

      {/* Primary KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '35px' }}>
        <div className="stat-card-clean" style={{ background: 'var(--orange)', color: 'white', borderColor: 'var(--orange)' }}>
          <span style={{ font: '10px var(--mono)', color: 'rgba(255,255,255,.8)' }}>ENROLLED COURSES</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {myCourses.length < 10 ? `0${myCourses.length}` : myCourses.length}
          </strong>
          <small style={{ color: '#FFFFFF', fontSize: '11px' }}>active in your library</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>OVERALL COMPLETION</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {averageCompletion}%
          </strong>
          <div className="progress-track" style={{ marginTop: '10px' }}>
            <div className="progress-fill" style={{ width: `${averageCompletion}%` }} />
          </div>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>PENDING TASKS</span>
          <strong style={{ display: 'block', fontSize: '42px', margin: '18px 0 8px', letterSpacing: '-2px' }}>
            {assignmentNotifications.filter((n) => n.type === 'pending').length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>assignments requiring submission</small>
        </div>
      </div>

      {/* Live class banner if any */}
      {upcomingLiveClass && (
        <div
          style={{
            padding: '20px 24px',
            background: upcomingLiveClass.status === 'live' ? '#fff4ed' : '#FFFFFF',
            border: upcomingLiveClass.status === 'live' ? '2px solid var(--orange)' : '1px solid var(--line)',
            marginBottom: '35px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                className="badge"
                style={{
                  position: 'static',
                  background: upcomingLiveClass.status === 'live' ? 'red' : 'var(--lime)',
                  color: upcomingLiveClass.status === 'live' ? 'white' : 'var(--ink)',
                  fontWeight: 700,
                }}
              >
                {upcomingLiveClass.status === 'live' ? '● LIVE RIGHT NOW' : 'UPCOMING CLASS'}
              </span>
              <strong style={{ fontSize: '16px' }}>{upcomingLiveClass.title}</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
              Course: <strong>{upcomingLiveClass.course_title}</strong> · Instructor: {upcomingLiveClass.teacher_name}
            </p>
          </div>

          <button
            className="primary-button"
            style={{
              background: upcomingLiveClass.status === 'live' ? 'var(--orange)' : 'var(--ink)',
              padding: '10px 22px',
              fontSize: '12px',
            }}
            onClick={() => setActiveLiveModal(upcomingLiveClass)}
          >
            {upcomingLiveClass.status === 'live' ? 'Join Live Room ↗' : 'View Class Info ↗'}
          </button>
        </div>
      )}

      {/* Grid: Course Attendance & Completion Meters + Assignment Notifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Column: Progress & Attendance by Course */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">ATTENDANCE & PROGRESS GAUGE</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>Course Completion Rates</h2>
            </div>
            <Link to="/student/my-courses" className="text-button" style={{ fontSize: '12px' }}>
              My Courses <span>↗</span>
            </Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading your progress meters...</div>
          ) : courseStats.length === 0 ? (
            <div className="empty-state">
              You are not enrolled in any courses yet.
              <br />
              <Link to="/student/explore-courses" className="primary-button" style={{ display: 'inline-block', marginTop: '12px', fontSize: '11px' }}>
                Browse Catalogue ↗
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {courseStats.map((st) => (
                <div key={st.course_id} className="stat-card-clean">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>{st.course_title}</strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                        Conducted: {st.total_sessions} classes ({st.recorded_count} recorded + {st.live_count} live)
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '24px', color: st.completion_percent >= 50 ? 'var(--orange)' : 'var(--ink)' }}>
                        {st.completion_percent}%
                      </strong>
                      <span style={{ display: 'block', font: '10px var(--mono)', color: 'var(--muted)' }}>
                        {st.attended_sessions} of {st.total_sessions || 1} attended
                      </span>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="progress-track" style={{ height: '10px', margin: '14px 0 16px' }}>
                    <div
                      className={`progress-fill ${st.completion_percent === 100 ? 'green' : ''}`}
                      style={{ width: `${Math.max(5, st.completion_percent)}%` }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Live Attendance: <strong>{st.attended_live} / {st.live_count || 1}</strong>
                    </span>
                    <button
                      className="primary-button"
                      style={{ fontSize: '11px', padding: '7px 14px' }}
                      onClick={() => navigate(`/learning/${st.course_id}`)}
                    >
                      Open Classroom ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Assignment Notifications */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">TASK UPDATES</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>Notifications</h2>
            </div>
            <Link to="/student/assignments" className="text-button" style={{ fontSize: '12px' }}>
              All Tasks <span>↗</span>
            </Link>
          </div>

          {assignmentNotifications.length === 0 ? (
            <div className="empty-state" style={{ background: '#fcfbf8' }}>
              ✓ All clear! No pending assignments or new evaluation alerts.
            </div>
          ) : (
            <div>
              {assignmentNotifications.slice(0, 6).map((notif, idx) => (
                <div
                  key={idx}
                  className={`notification-card ${notif.type === 'graded' ? 'success' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px' }}>{notif.title}</strong>
                    <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
                      {notif.type === 'pending' ? `Due: ${notif.due}` : `Score: ${notif.grade}/${notif.total}`}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 8px' }}>
                    Course: <strong>{notif.course}</strong>
                  </p>
                  {notif.feedback && (
                    <p style={{ fontSize: '11px', color: '#166534', margin: '4px 0 8px' }}>
                      "{notif.feedback}"
                    </p>
                  )}
                  <button
                    className="text-button"
                    style={{ fontSize: '11px' }}
                    onClick={() => navigate(`/learning/${notif.course_id}`)}
                  >
                    {notif.type === 'pending' ? 'Submit task now ↗' : 'View graded submission ↗'}
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
