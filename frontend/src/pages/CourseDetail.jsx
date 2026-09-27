import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import PaymentModal from '../components/PaymentModal'

export default function CourseDetail({ onAuthOpen }) {
  const { courseId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollingFree, setEnrollingFree] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('monthly') // 'monthly' or 'yearly'

  const checkCourseData = async () => {
    setLoading(true)
    try {
      const data = await request(`/course/${courseId}`)
      setCourse(data.course)

      if (session?.role === 'STUDENT') {
        const enrData = await request(`/check-enrollment/${courseId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }).catch(() => ({}))
        setIsEnrolled(!!enrData.enrolled)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkCourseData()
  }, [courseId, session])

  const handleFreeEnroll = async () => {
    if (!session) {
      if (onAuthOpen) onAuthOpen('login')
      return
    }

    setEnrollingFree(true)
    try {
      await request(`/enroll/free/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      alert('Congratulations! You are now enrolled in this course.')
      setIsEnrolled(true)
      navigate(`/learning/${courseId}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setEnrollingFree(false)
    }
  }

  if (loading) return <main><section className="content-section"><div className="empty-state">Loading course details...</div></section></main>
  if (error) return <main><section className="content-section"><div className="empty-state">{error}</div></section></main>
  if (!course) return <main><section className="content-section"><div className="empty-state">Course not found.</div></section></main>

  const image = course.photo ? `http://localhost:8000/${course.photo.replace(/\\/g, '/')}` : null

  // Monthly vs Yearly prices
  const monthlyPrice = course.final_monthly_amount || course.monthly_amount || course.final_amount || course.actual_amount || 0
  const yearlyPrice = course.final_yearly_amount || course.yearly_amount || (monthlyPrice > 0 ? monthlyPrice * 10 : 0)
  const activePlanPrice = selectedPlan === 'yearly' ? yearlyPrice : monthlyPrice

  return (
    <main>
      <section className="content-section">
        <Link to="/courses" className="text-button" style={{ marginBottom: '30px', display: 'inline-block' }}>
          ← Back to catalogue
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'start' }}>
          {/* Left: Course Image & Highlights */}
          <div>
            <div className="course-image" style={{
              height: '340px',
              borderRadius: '4px',
              ...(image ? { backgroundImage: `url(${image})` } : {}),
            }}>
              {!image && <span className="course-image-fallback">UNI / SKILL</span>}
              <span className="badge">
                {course.course_type === 'free' ? 'Free to learn' : course.discount > 0 ? `${course.discount}% flash discount` : 'Verified Masterclass'}
              </span>
            </div>

            {/* Course Features Checklist */}
            <div style={{ padding: '24px', background: '#fffdf8', border: '1px solid var(--line)', marginTop: '20px', borderRadius: '4px' }}>
              <p className="eyebrow" style={{ marginBottom: '10px' }}>WHAT'S INCLUDED IN THIS TRACK</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px', fontSize: '13px', color: '#444' }}>
                <li>✓ Full access to HD recorded curriculum lectures & updates</li>
                <li>✓ Live interactive video studio sessions & Q&A</li>
                <li>✓ Problem sheets & practical code assignment evaluations</li>
                <li>✓ Downloadable PDF notes and instructor reference assets</li>
                <li>✓ Verified Certificate of Completion upon graduation</li>
              </ul>
            </div>
          </div>

          {/* Right: Details, Plan Selector & Checkout Actions */}
          <div>
            <p className="eyebrow">CURATED TRACK</p>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 42px)', letterSpacing: '-2px', marginBottom: '14px' }}>{course.course_title}</h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: '15px', marginBottom: '22px' }}>{course.course_description}</p>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 14px', border: '1px solid var(--line)', borderRadius: '99px', fontSize: '12px' }}>
                {course.course_type === 'free' ? '🆓 Free Access' : '💳 Certificate Included'}
              </span>
              {course.discount > 0 && (
                <span style={{ padding: '6px 14px', background: 'var(--lime)', borderRadius: '99px', fontSize: '12px' }}>
                  🏷 {course.discount}% off active
                </span>
              )}
              {course.has_active_coupon && (
                <span style={{ padding: '6px 14px', border: '1px dashed var(--orange)', color: 'var(--orange)', borderRadius: '99px', fontSize: '12px' }}>
                  🎟 Coupons redeemable at checkout
                </span>
              )}
            </div>

            {/* Plan Selector for Paid Courses */}
            {course.course_type === 'paid' && !isEnrolled && (
              <div style={{ background: '#fffdf8', border: '1px solid var(--line)', padding: '20px', marginBottom: '25px', borderRadius: '4px' }}>
                <p className="eyebrow" style={{ marginBottom: '12px' }}>CHOOSE YOUR ACCESS PLAN</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  
                  {/* Monthly Option */}
                  <label
                    onClick={() => setSelectedPlan('monthly')}
                    style={{
                      padding: '14px',
                      border: selectedPlan === 'monthly' ? '2px solid var(--orange)' : '1px solid var(--line)',
                      background: selectedPlan === 'monthly' ? '#fff9f4' : 'white',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'block',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>Monthly Plan</strong>
                      <span style={{ fontSize: '10px', font: 'var(--mono)', color: 'var(--muted)' }}>30 Days</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', margin: '6px 0 0' }}>
                      ₹{monthlyPrice} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)' }}>/mo</span>
                    </div>
                  </label>

                  {/* Yearly Option */}
                  <label
                    onClick={() => setSelectedPlan('yearly')}
                    style={{
                      padding: '14px',
                      border: selectedPlan === 'yearly' ? '2px solid var(--orange)' : '1px solid var(--line)',
                      background: selectedPlan === 'yearly' ? '#fff9f4' : 'white',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'block',
                      position: 'relative',
                    }}
                  >
                    <span className="badge" style={{ top: '-8px', right: '6px', left: 'auto', background: 'var(--lime)', fontSize: '8px', padding: '2px 6px' }}>
                      SAVE 17%
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>Yearly Plan</strong>
                      <span style={{ fontSize: '10px', font: 'var(--mono)', color: 'var(--muted)' }}>365 Days</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--orange)', margin: '6px 0 0' }}>
                      ₹{yearlyPrice} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)' }}>/yr</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Price display row */}
            <div className="price-row" style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '34px', color: 'var(--ink)' }}>
                {course.course_type === 'free' ? 'Free' : `₹${activePlanPrice}`}
              </strong>
              {course.course_type === 'paid' && (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {selectedPlan === 'yearly' ? 'for 1 Year Full Access' : 'for 1 Month Access'}
                </span>
              )}
            </div>

            {/* Enrollment Buttons */}
            <div>
              {isEnrolled ? (
                <div style={{ padding: '20px', border: '1px solid var(--lime)', background: '#f8fdf0', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span className="badge" style={{ position: 'static', background: 'var(--lime)' }}>✓ ENROLLED</span>
                    <strong style={{ fontSize: '14px' }}>You have active access to this course.</strong>
                  </div>
                  <button className="primary-button full-width" onClick={() => navigate(`/learning/${courseId}`)}>
                    Enter Course Classroom (Lectures, Tasks & Live) ↗
                  </button>
                </div>
              ) : session?.role === 'STUDENT' || !session ? (
                <div>
                  {course.course_type === 'free' ? (
                    <button
                      className="primary-button full-width"
                      disabled={enrollingFree}
                      onClick={handleFreeEnroll}
                      style={{ fontSize: '14px', padding: '16px' }}
                    >
                      {enrollingFree ? 'Enrolling...' : 'Enroll in Free Course ↗'}
                    </button>
                  ) : (
                    <button
                      className="primary-button full-width"
                      onClick={() => {
                        if (!session) {
                          alert('Please sign in or create an account first to purchase courses.')
                          if (onAuthOpen) onAuthOpen('login')
                          return
                        }
                        setShowPaymentModal(true)
                      }}
                      style={{ fontSize: '14px', padding: '16px', background: 'var(--orange)' }}
                    >
                      Pay ₹{activePlanPrice} via QR & Buy {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Plan ↗
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', border: '1px solid var(--line)', background: '#fffdf8' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 10px' }}>
                    Logged in as <strong>{session.role}</strong>.
                  </p>
                  <button className="primary-button" onClick={() => navigate(`/learning/${courseId}`)}>
                    View Course Classroom ↗
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          course={course}
          initialPlan={selectedPlan}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false)
            checkCourseData()
          }}
        />
      )}
    </main>
  )
}
