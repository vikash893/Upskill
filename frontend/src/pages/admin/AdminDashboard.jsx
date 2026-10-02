import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function AdminDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const headers = { Authorization: `Bearer ${session.token}` }

  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [analytics, setAnalytics] = useState({ overview: {}, activity: [], courseEnrollments: [] })
  const [loading, setLoading] = useState(true)

  const fetchAdminData = async () => {
    setLoading(true)

    try {
      const [
        usersData,
        coursesData,
        teachersData,
        allPayData,
        inqData,
        analyticsData
      ] = await Promise.all([
        request('/get-alluser', { headers }).catch(() => ({ user: [] })),
        request('/admin/all-courses', { headers }).catch(() => ({ courses: [] })),
        request('/get-all-teachers').catch(() => ({ teachers: [] })),
        request('/payment/all', { headers }).catch(() => ({ payments: [] })),
        request('/admin/inquiries?status=unread', { headers }).catch(() => ({
          unreadCount: 0
        })),
        request('/admin/dashboard/stats', { headers }).catch(() => ({ overview: {}, activity: [], courseEnrollments: [] }))
      ])

      setUsers(usersData.user || [])
      setCourses(coursesData.courses || [])
      setTeachers(teachersData.teachers || [])

      const payments = allPayData.payments || []

      setAllPayments(payments)

      setRecentPayments(
        payments
          .filter((p) => p.status === 'approved')
          .slice(0, 5)
      )

      setUnreadInquiries(inqData.unreadCount || 0)
      setAnalytics(analyticsData)

    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  // Get only approved payments
  const approvedPayments = allPayments.filter(
    (p) => p.status === 'approved'
  )

  // Total number of approved payments
  const approvedCount = approvedPayments.length

  // Total revenue from approved payments
  const totalRevenue = approvedPayments.reduce(
    (sum, p) => sum + Number(p.final_amount || 0),
    0
  )
  const overview = analytics.overview || {}
  const loginCount = overview.loginsToday || 0

  return (
    <div>
      <section style={{ marginBottom: '35px' }}>
        <p className="eyebrow">EXECUTIVE COMMAND</p>

        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-3px',
            margin: '0 0 12px'
          }}
        >
          System Overview & Metrics
        </h1>

        <p
          className="muted"
          style={{
            maxWidth: '650px',
            fontSize: '15px'
          }}
        >
          Real-time metrics, Razorpay revenue, and catalogue health.
        </p>
      </section>

      {/* KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '35px'
        }}
      >
        {/* TOTAL REVENUE */}
        <div
          className="stat-card-clean"
          style={{
            background: 'var(--orange)',
            color: 'white',
            borderColor: 'var(--orange)'
          }}
        >
          <span
            style={{
              font: '10px var(--mono)',
              color: 'rgba(255,255,255,.8)'
            }}
          >
            TOTAL REVENUE
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px'
            }}
          >
            ₹{totalRevenue}
          </strong>

          <small
            style={{
              color: '#FFFFFF',
              fontSize: '11px'
            }}
          >
            from approved course payments
          </small>
        </div>

        {/* GATEWAY PAYMENTS */}
        <div className="stat-card-clean">
          <span
            style={{
              font: '10px var(--mono)',
              color: 'var(--muted)'
            }}
          >
            GATEWAY PAYMENTS
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px'
            }}
          >
            {approvedCount < 10
              ? `0${approvedCount}`
              : approvedCount}
          </strong>

          <small
            style={{
              color: 'var(--muted)',
              fontSize: '11px'
            }}
          >
            successful Razorpay checkouts
          </small>
        </div>

        {/* REGISTERED STUDENTS */}
        <div className="stat-card-clean">
          <span
            style={{
              font: '10px var(--mono)',
              color: 'var(--muted)'
            }}
          >
            REGISTERED STUDENTS
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px'
            }}
          >
            {overview.totalStudents ?? users.length}
          </strong>

          <small
            style={{
              color: 'var(--muted)',
              fontSize: '11px'
            }}
          >
            active learner accounts
          </small>
        </div>

        {/* CATALOGUE COURSES */}
        <div className="stat-card-clean">
          <span
            style={{
              font: '10px var(--mono)',
              color: 'var(--muted)'
            }}
          >
            CATALOGUE COURSES
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px'
            }}
          >
            {overview.totalCourses ?? courses.length}
          </strong>

          <small
            style={{
              color: 'var(--muted)',
              fontSize: '11px'
            }}
          >
            active courses across faculty
          </small>
        </div>

        {/* FACULTY TEACHERS */}
        <div className="stat-card-clean">
          <span
            style={{
              font: '10px var(--mono)',
              color: 'var(--muted)'
            }}
          >
            FACULTY TEACHERS
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px'
            }}
          >
            {teachers.length}
          </strong>

          <small
            style={{
              color: 'var(--muted)',
              fontSize: '11px'
            }}
          >
            instructors assigned
          </small>
        </div>

        <div className="stat-card-clean" style={{ background: '#eaf5f5', borderColor: '#b6d9d8' }}>
          <span style={{ font: '10px var(--mono)', color: '#426f70' }}>SUCCESSFUL LOGINS TODAY</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', color: '#155e63' }}>
            {loginCount}
          </strong>
          <small style={{ color: '#426f70', fontSize: '11px' }}>sign-ins recorded today · IST</small>
        </div>

        <div className="stat-card-clean" style={{ background: '#f6f1e8', borderColor: '#dfcfad' }}>
          <span style={{ font: '10px var(--mono)', color: '#78623b' }}>ACTIVE ENROLLMENTS</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', color: '#725c34' }}>
            {overview.activeEnrollments || 0}
          </strong>
          <small style={{ color: '#78623b', fontSize: '11px' }}>current course access</small>
        </div>

        {/* USER INQUIRIES */}
        <div
          className="stat-card-clean"
          style={{
            background:
              unreadInquiries > 0 ? '#fef2f2' : '#FFFFFF',
            borderColor:
              unreadInquiries > 0 ? '#fca5a5' : 'var(--line)',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/admin/inquiries')}
        >
          <span
            style={{
              font: '10px var(--mono)',
              color:
                unreadInquiries > 0
                  ? '#dc2626'
                  : 'var(--muted)'
            }}
          >
            USER INQUIRIES
          </span>

          <strong
            style={{
              display: 'block',
              fontSize: '38px',
              margin: '14px 0 6px',
              letterSpacing: '-2px',
              color:
                unreadInquiries > 0
                  ? '#dc2626'
                  : 'var(--ink)'
            }}
          >
            {unreadInquiries < 10
              ? `0${unreadInquiries}`
              : unreadInquiries}
          </strong>

          <small
            style={{
              color:
                unreadInquiries > 0
                  ? '#b91c1c'
                  : 'var(--muted)',
              fontSize: '11px'
            }}
          >
            {unreadInquiries > 0
              ? 'new messages awaiting response'
              : 'view contact helpdesk'}
          </small>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '35px'
        }}
      >
        <section className="stat-card-clean" style={{ minWidth: 0, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '14px', marginBottom: '16px' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: '6px' }}>ACCESS & ENROLLMENT</p>
              <h2 style={{ fontSize: '20px', letterSpacing: 0 }}>Last seven days</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--muted)', fontSize: '10px' }}>
              <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#177e89', marginRight: 5 }} />Sign-ins</span>
              <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#c69a4a', marginRight: 5 }} />Enrollments</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="loginFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#177e89" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#177e89" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c69a4a" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#c69a4a" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8edf1" strokeDasharray="3 5" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#748091', fontSize: 10 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#748091', fontSize: 10 }} width={34} />
                <Tooltip contentStyle={{ border: '1px solid #dce3e9', borderRadius: 4, fontSize: 11 }} />
                <Area type="monotone" dataKey="logins" name="Successful sign-ins" stroke="#177e89" strokeWidth={2.5} fill="url(#loginFill)" />
                <Area type="monotone" dataKey="enrollments" name="New enrollments" stroke="#c69a4a" strokeWidth={2.5} fill="url(#enrollmentFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="stat-card-clean" style={{ minWidth: 0, padding: '22px' }}>
          <div style={{ marginBottom: '16px' }}>
            <p className="eyebrow" style={{ marginBottom: '6px' }}>COURSE MOMENTUM</p>
            <h2 style={{ fontSize: '20px', letterSpacing: 0 }}>Active students by course</h2>
          </div>
          {analytics.courseEnrollments.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 14px' }}>Active course enrollments will appear here.</div>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.courseEnrollments} layout="vertical" margin={{ top: 2, right: 12, left: 4, bottom: 2 }}>
                  <CartesianGrid horizontal={false} stroke="#e8edf1" strokeDasharray="3 5" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#748091', fontSize: 10 }} />
                  <YAxis type="category" dataKey="title" width={112} tickLine={false} axisLine={false} tick={{ fill: '#455366', fontSize: 10 }} />
                  <Tooltip contentStyle={{ border: '1px solid #dce3e9', borderRadius: 4, fontSize: 11 }} />
                  <Bar dataKey="students" name="Active students" fill="#177e89" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Grid: Pending Approvals + Course Roster */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '28px',
          alignItems: 'start'
        }}
      >
        {/* Left: Recent Payments */}
        <div>
          <div
            className="section-heading"
            style={{ marginBottom: '20px' }}
          >
            <div>
              <p className="eyebrow">REVENUE</p>

              <h2
                style={{
                  fontSize: '24px',
                  letterSpacing: '-1px'
                }}
              >
                Recent Razorpay payments
              </h2>
            </div>

            <Link
              to="/admin/payments"
              className="text-button"
              style={{ fontSize: '12px' }}
            >
              All Payments ({allPayments.length}) <span>↗</span>
            </Link>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading payments...
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="empty-state">
              No completed gateway payments yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '12px'
              }}
            >
              {recentPayments.map((p) => (
                <div
                  key={p.payment_id}
                  className="stat-card-clean"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div>
                    <strong>{p.course_title}</strong>

                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        margin: '2px 0 0'
                      }}
                    >
                      {p.student_name} ·{' '}
                      {p.razorpay_payment_id ||
                        p.transaction_id ||
                        p.payment_id}
                    </p>
                  </div>

                  <strong
                    style={{
                      fontSize: '18px',
                      color: 'var(--orange)'
                    }}
                  >
                    ₹{p.final_amount}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick actions & catalogue stats */}
        <div>
          <div
            className="section-heading"
            style={{ marginBottom: '20px' }}
          >
            <div>
              <p className="eyebrow">SHORTCUTS</p>

              <h2
                style={{
                  fontSize: '24px',
                  letterSpacing: '-1px'
                }}
              >
                Quick Controls
              </h2>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '12px'
            }}
          >
            {/* COURSE MANAGEMENT */}
            <div
              className="stat-card-clean"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Course Management</strong>

                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    margin: '2px 0 0'
                  }}
                >
                  Add courses, assign discounts, generate coupons
                </p>
              </div>

              <button
                className="primary-button"
                style={{
                  fontSize: '11px',
                  padding: '8px 14px'
                }}
                onClick={() =>
                  navigate('/admin/courses')
                }
              >
                Open ↗
              </button>
            </div>

            {/* FACULTY */}
            <div
              className="stat-card-clean"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Faculty & Assignments</strong>

                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    margin: '2px 0 0'
                  }}
                >
                  Register instructors & assign courses
                </p>
              </div>

              <button
                className="primary-button"
                style={{
                  fontSize: '11px',
                  padding: '8px 14px'
                }}
                onClick={() =>
                  navigate('/admin/teachers')
                }
              >
                Open ↗
              </button>
            </div>

            <div
              className="stat-card-clean"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Admin team</strong>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Add administrators and review access
                </p>
              </div>
              <button
                className="outline-button"
                style={{ fontSize: '11px', padding: '8px 14px' }}
                onClick={() => navigate('/admin/team')}
              >
                Manage ↗
              </button>
            </div>

            {/* SECURITY LOGS */}
            <div
              className="stat-card-clean"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Audit Security Logs</strong>

                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    margin: '2px 0 0'
                  }}
                >
                  Inspect API requests, IPs, status codes
                </p>
              </div>

              <button
                className="outline-button"
                style={{
                  fontSize: '11px',
                  padding: '8px 14px'
                }}
                onClick={() =>
                  navigate('/admin/logs')
                }
              >
                Logs ↗
              </button>
            </div>

            {/* ACCOUNT & LEGAL */}
            <div
              className="stat-card-clean"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>Account & legal</strong>

                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    margin: '2px 0 0'
                  }}
                >
                  Terms, privacy, and admin profile
                </p>
              </div>

              <button
                className="outline-button"
                style={{
                  fontSize: '11px',
                  padding: '8px 14px'
                }}
                onClick={() =>
                  navigate('/profile')
                }
              >
                Open ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}