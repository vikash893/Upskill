import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [unreadInquiries, setUnreadInquiries] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const [usersData, coursesData, teachersData, pendingPayData, allPayData, inqData] = await Promise.all([
        request('/get-alluser', { headers }).catch(() => ({ user: [] })),
        request('/admin/all-courses', { headers }).catch(() => ({ courses: [] })),
        request('/get-all-teachers').catch(() => ({ teachers: [] })),
        request('/payment/all?status=pending', { headers }).catch(() => ({ payments: [] })),
        request('/payment/all', { headers }).catch(() => ({ payments: [] })),
        request('/admin/inquiries?status=unread', { headers }).catch(() => ({ unreadCount: 0 })),
      ])

      setUsers(usersData.user || [])
      setCourses(coursesData.courses || [])
      setTeachers(teachersData.teachers || [])
      setPendingPayments(pendingPayData.payments || [])
      setAllPayments(allPayData.payments || [])
      setUnreadInquiries(inqData.unreadCount || 0)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  const handleQuickApprove = async (paymentId) => {
    try {
      await request(`/payment/approve/${paymentId}`, {
        method: 'PATCH',
        headers,
      })
      alert('Payment approved and student enrolled!')
      fetchAdminData()
    } catch (err) {
      alert(err.message)
    }
  }

  const totalRevenue = allPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.final_amount || 0), 0)

  return (
    <div>
      <section style={{ marginBottom: '35px' }}>
        <p className="eyebrow">EXECUTIVE COMMAND</p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-3px', margin: '0 0 12px' }}>
          System Overview & Metrics
        </h1>
        <p className="muted" style={{ maxWidth: '650px', fontSize: '15px' }}>
          Real-time metrics, revenue performance, pending receipt verifications, and catalogue distribution.
        </p>
      </section>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '35px' }}>
        <div className="stat-card-clean" style={{ background: 'var(--orange)', color: 'white', borderColor: 'var(--orange)' }}>
          <span style={{ font: '10px var(--mono)', color: '#ffe0bd' }}>TOTAL REVENUE</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px' }}>
            ₹{totalRevenue}
          </strong>
          <small style={{ color: '#fff0d8', fontSize: '11px' }}>from approved course payments</small>
        </div>

        <div className="stat-card-clean" style={{ background: pendingPayments.length > 0 ? '#fff7ed' : '#fffdf8', borderColor: pendingPayments.length > 0 ? '#fed7aa' : 'var(--line)' }}>
          <span style={{ font: '10px var(--mono)', color: pendingPayments.length > 0 ? '#c2410c' : 'var(--muted)' }}>
            PENDING APPROVALS
          </span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px', color: pendingPayments.length > 0 ? '#c2410c' : 'var(--ink)' }}>
            {pendingPayments.length < 10 ? `0${pendingPayments.length}` : pendingPayments.length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>awaiting receipt review</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>REGISTERED STUDENTS</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px' }}>
            {users.length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>active learner accounts</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>CATALOGUE COURSES</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px' }}>
            {courses.length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>active courses across faculty</small>
        </div>

        <div className="stat-card-clean">
          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>FACULTY TEACHERS</span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px' }}>
            {teachers.length}
          </strong>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>instructors assigned</small>
        </div>

        <div
          className="stat-card-clean"
          style={{
            background: unreadInquiries > 0 ? '#fef2f2' : '#fffdf8',
            borderColor: unreadInquiries > 0 ? '#fca5a5' : 'var(--line)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/admin/inquiries')}
        >
          <span style={{ font: '10px var(--mono)', color: unreadInquiries > 0 ? '#dc2626' : 'var(--muted)' }}>
            USER INQUIRIES
          </span>
          <strong style={{ display: 'block', fontSize: '38px', margin: '14px 0 6px', letterSpacing: '-2px', color: unreadInquiries > 0 ? '#dc2626' : 'var(--ink)' }}>
            {unreadInquiries < 10 ? `0${unreadInquiries}` : unreadInquiries}
          </strong>
          <small style={{ color: unreadInquiries > 0 ? '#b91c1c' : 'var(--muted)', fontSize: '11px' }}>
            {unreadInquiries > 0 ? 'new messages awaiting response' : 'view contact helpdesk'}
          </small>
        </div>
      </div>

      {/* Grid: Pending Approvals + Course Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left: Pending Payment Approvals */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">APPROVAL QUEUE</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>Recent Payment Requests</h2>
            </div>
            <Link to="/admin/payments" className="text-button" style={{ fontSize: '12px' }}>
              All Payments ({allPayments.length}) <span>↗</span>
            </Link>
          </div>

          {loading ? (
            <div className="empty-state">Loading payment queue...</div>
          ) : pendingPayments.length === 0 ? (
            <div className="empty-state" style={{ background: '#f8fdf0', borderColor: 'var(--lime)' }}>
              ✓ All clear! Zero pending payment receipts to review.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingPayments.slice(0, 5).map((p) => {
                const receiptImg = p.receipt_photo ? `http://localhost:8000/${p.receipt_photo.replace(/\\/g, '/')}` : null

                return (
                  <div
                    key={p.payment_id}
                    className="stat-card-clean"
                    style={{
                      border: '1px solid var(--orange)',
                      display: 'grid',
                      gridTemplateColumns: '60px 1.5fr 1fr auto',
                      gap: '14px',
                      alignItems: 'center',
                    }}
                  >
                    {receiptImg ? (
                      <a href={receiptImg} target="_blank" rel="noreferrer">
                        <img src={receiptImg} alt="Receipt" style={{ width: '60px', height: '60px', objectFit: 'cover', border: '1px solid var(--line)', borderRadius: '4px' }} />
                      </a>
                    ) : (
                      <div style={{ width: '60px', height: '60px', background: '#eeeade' }} />
                    )}

                    <div>
                      <strong>{p.course_title}</strong>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        {p.student_name} ({p.student_email})
                      </p>
                      {p.transaction_id && (
                        <span style={{ font: '10px var(--mono)', color: 'var(--orange)' }}>UTR: {p.transaction_id}</span>
                      )}
                    </div>

                    <strong style={{ fontSize: '18px', color: 'var(--orange)' }}>₹{p.final_amount}</strong>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="primary-button"
                        style={{ background: 'green', color: 'white', padding: '6px 12px', fontSize: '10px' }}
                        onClick={() => handleQuickApprove(p.payment_id)}
                      >
                        Approve ✓
                      </button>
                      <button
                        className="outline-button"
                        style={{ fontSize: '10px', padding: '6px 10px' }}
                        onClick={() => navigate('/admin/payments')}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Quick actions & catalogue stats */}
        <div>
          <div className="section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <p className="eyebrow">SHORTCUTS</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px' }}>Quick Controls</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="stat-card-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Course Management</strong>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Add courses, assign discounts, generate coupons
                </p>
              </div>
              <button className="primary-button" style={{ fontSize: '11px', padding: '8px 14px' }} onClick={() => navigate('/admin/courses')}>
                Open ↗
              </button>
            </div>

            <div className="stat-card-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Faculty & Assignments</strong>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Register instructors & assign courses
                </p>
              </div>
              <button className="primary-button" style={{ fontSize: '11px', padding: '8px 14px' }} onClick={() => navigate('/admin/teachers')}>
                Open ↗
              </button>
            </div>

            <div className="stat-card-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Audit Security Logs</strong>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Inspect API requests, IPs, status codes
                </p>
              </div>
              <button className="outline-button" style={{ fontSize: '11px', padding: '8px 14px' }} onClick={() => navigate('/admin/logs')}>
                Logs ↗
              </button>
            </div>

            <div className="stat-card-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Payment QR & UPI Settings</strong>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                  Upload QR code scanner for student purchases
                </p>
              </div>
              <button className="outline-button" style={{ fontSize: '11px', padding: '8px 14px' }} onClick={() => navigate('/profile')}>
                Settings ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
