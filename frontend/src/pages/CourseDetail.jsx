import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import PaymentModal from '../components/PaymentModal'
import { mediaUrl } from '../utils/mediaUrl'
import { celebrate, prepareCelebrationAudio } from '../utils/celebration'
import Skeleton from '../components/Skeleton'

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
  const [selectedPlan, setSelectedPlan] = useState('custom')

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

    prepareCelebrationAudio()
    setEnrollingFree(true)
    try {
      await request(`/enroll/free/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      celebrate()
      setIsEnrolled(true)
      navigate(`/learning/${courseId}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setEnrollingFree(false)
    }
  }

  if (loading) return <main><section className="content-section"><Skeleton variant="detail" count={2} label="Loading course details" /></section></main>
  if (error) return <main><section className="content-section"><div className="empty-state">{error}</div></section></main>
  if (!course) return <main><section className="content-section"><div className="empty-state">Course not found.</div></section></main>

  const image = mediaUrl(course.photo)

  // Course price and duration
  const coursePrice = course.final_amount || course.course_amount || 0
  const activePlanPrice = coursePrice
  const durMonths = course.duration_months || 0
  const durDays = course.duration_days || 0
  const durationText = [
    durMonths > 0 ? `${durMonths} Month${durMonths > 1 ? 's' : ''}` : '',
    durDays > 0 ? `${durDays} Day${durDays > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(' ') || 'Full Access'

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
            <div style={{ padding: '24px', background: '#FFFFFF', border: '1px solid var(--line)', marginTop: '20px', borderRadius: '4px' }}>
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

            {course.assigned_teachers?.length > 0 && (
              <p style={{ fontSize: '13px', marginBottom: '22px' }}>
                Instructor{course.assigned_teachers.length > 1 ? 's' : ''}:{' '}
                <strong>{course.assigned_teachers.map((teacher) => teacher.name).join(', ')}</strong>
              </p>
            )}

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

            {/* Course Access Details for Paid Courses */}
            {course.course_type === 'paid' && !isEnrolled && (
              <div style={{ background: '#FFFFFF', border: '1px solid var(--line)', padding: '20px', marginBottom: '25px', borderRadius: '4px' }}>
                <p className="eyebrow" style={{ marginBottom: '12px' }}>COURSE ACCESS & DURATION</p>
                <div style={{
                  padding: '16px',
                  border: '2px solid var(--orange)',
                  background: '#fff9f4',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <strong style={{ fontSize: '15px' }}>Full Course Curriculum</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏱️ Access Duration:</span>
                      <strong style={{ color: 'var(--ink)' }}>{durationText}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--orange)' }}>
                      ₹{coursePrice}
                    </div>
                    {course.discount > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                        ₹{course.actual_amount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Price display row */}
            <div className="price-row" style={{ marginBottom: '20px' }}>
              <strong style={{ fontSize: '34px', color: 'var(--ink)' }}>
                {course.course_type === 'free' ? 'Free' : `₹${coursePrice}`}
              </strong>
              {course.course_type === 'paid' && (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  for {durationText}
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
                      Pay ₹{coursePrice} via QR & Buy Course ↗
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
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
