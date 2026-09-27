import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import CourseStudentsModal from '../components/CourseStudentsModal'

export default function AdminCourses() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    course_title: '',
    course_description: '',
    course_amount: '',
    monthly_amount: '',
    yearly_amount: '',
    course_type: 'paid',
  })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [discountForm, setDiscountForm] = useState({ course_id: '', discount: '', discount_time: '' })
  const [couponForm, setCouponForm] = useState({ course_id: '', person_name: '', coupon_discount: '', coupon_code_time: '' })
  const [activePanel, setActivePanel] = useState(null)
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null)

  const fetchCourses = () => {
    setLoading(true)
    request('/admin/all-courses', { headers })
      .then((d) => setCourses(d.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCourses() }, [])

  const addCourse = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('course_title', form.course_title)
      fd.append('course_description', form.course_description)
      fd.append('course_type', form.course_type)
      fd.append('course_amount', form.course_amount || form.monthly_amount || '0')
      fd.append('monthly_amount', form.monthly_amount || form.course_amount || '0')
      fd.append('yearly_amount', form.yearly_amount || '0')
      if (photo) fd.append('photo', photo)

      await request('/add-course', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: fd })
      setMessage('Course added successfully with Monthly and Yearly pricing options!')
      setForm({
        course_title: '',
        course_description: '',
        course_amount: '',
        monthly_amount: '',
        yearly_amount: '',
        course_type: 'paid',
      })
      setPhoto(null)
      setShowAdd(false)
      fetchCourses()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? All associated data will be removed.')) return
    try {
      await request(`/delete-course/${courseId}`, { method: 'DELETE', headers })
      fetchCourses()
    } catch (err) {
      alert(err.message)
    }
  }

  const addDiscount = async (e) => {
    e.preventDefault()
    try {
      await request(`/add-discount/${discountForm.course_id}`, {
        method: 'POST', headers,
        body: JSON.stringify({ discount: discountForm.discount, discount_time: discountForm.discount_time }),
      })
      setMessage('Flash discount applied!')
      setActivePanel(null)
      fetchCourses()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const addCoupon = async (e) => {
    e.preventDefault()
    try {
      const data = await request(`/add-coupon/${couponForm.course_id}`, {
        method: 'POST', headers,
        body: JSON.stringify({
          person_name: couponForm.person_name,
          coupon_discount: couponForm.coupon_discount,
          coupon_code_time: couponForm.coupon_code_time,
        }),
      })
      setMessage(`Coupon created: ${data.coupon?.coupon_code}`)
      setActivePanel(null)
      fetchCourses()
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADMIN PORTAL</p>
            <h2>Course Catalogue & Fee Management</h2>
          </div>
          <button className="primary-button" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : '+ Add New Course'}
          </button>
        </div>

        {message && <p className="form-message" style={{ marginBottom: '20px' }}>{message}</p>}

        {/* Add Course Form */}
        {showAdd && (
          <form onSubmit={addCourse} style={{ padding: '25px', border: '1px solid var(--line)', background: '#fffdf8', marginBottom: '30px', display: 'grid', gap: '15px' }}>
            <p className="eyebrow">CREATE NEW COURSE</p>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Course Title *
              <input required value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8' }} />
            </label>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Course Description *
              <textarea required value={form.course_description} onChange={(e) => setForm({ ...form, course_description: e.target.value })} rows="3" style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8', fontFamily: 'inherit', resize: 'vertical' }} />
            </label>

            {/* Course Type and Fee Options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Course Pricing Type
                <div className="role-picker" style={{ border: 0, margin: 0 }}>
                  {['paid', 'free'].map((t) => (
                    <button key={t} type="button" className={form.course_type === t ? 'active' : ''} onClick={() => setForm({ ...form, course_type: t })}>
                      {t === 'free' ? 'Free Access' : 'Paid (Plans)'}
                    </button>
                  ))}
                </div>
              </label>

              {form.course_type === 'paid' && (
                <>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Monthly Plan Fee (₹ / month) *
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 999"
                      value={form.monthly_amount}
                      onChange={(e) => setForm({ ...form, monthly_amount: e.target.value, course_amount: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Yearly Plan Fee (₹ / year) *
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 7999"
                      value={form.yearly_amount}
                      onChange={(e) => setForm({ ...form, yearly_amount: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#fffdf8' }}
                    />
                  </label>
                </>
              )}
            </div>

            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Course Cover Photo *
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} required style={{ padding: '10px' }} />
            </label>
            <button className="primary-button" style={{ justifySelf: 'start' }} disabled={saving} type="submit">
              {saving ? 'Publishing...' : 'Save & Publish Course'}
            </button>
          </form>
        )}

        {/* Discount Panel */}
        {activePanel === 'discount' && (
          <form onSubmit={addDiscount} style={{ padding: '25px', border: '1px solid var(--lime)', background: '#fafdf0', marginBottom: '30px', display: 'grid', gap: '15px' }}>
            <p className="eyebrow">FLASH DISCOUNT SETUP</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Discount Percentage (%)
                <input type="number" min="1" max="100" required value={discountForm.discount} onChange={(e) => setDiscountForm({ ...discountForm, discount: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Expires At
                <input type="datetime-local" required value={discountForm.discount_time} onChange={(e) => setDiscountForm({ ...discountForm, discount_time: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)' }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary-button" type="submit">Apply Discount</button>
              <button className="outline-button" type="button" onClick={() => setActivePanel(null)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Coupon Panel */}
        {activePanel === 'coupon' && (
          <form onSubmit={addCoupon} style={{ padding: '25px', border: '1px solid var(--orange)', background: '#fef7f0', marginBottom: '30px', display: 'grid', gap: '15px' }}>
            <p className="eyebrow">CUSTOM COUPON GENERATOR</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Assignee / Prefix
                <input required value={couponForm.person_name} onChange={(e) => setCouponForm({ ...couponForm, person_name: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Discount %
                <input type="number" min="1" max="100" required value={couponForm.coupon_discount} onChange={(e) => setCouponForm({ ...couponForm, coupon_discount: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)' }} />
              </label>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                Expires At
                <input type="datetime-local" required value={couponForm.coupon_code_time} onChange={(e) => setCouponForm({ ...couponForm, coupon_code_time: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)' }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary-button" type="submit">Generate Code</button>
              <button className="outline-button" type="button" onClick={() => setActivePanel(null)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Course List */}
        {loading ? (
          <div className="empty-state">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="empty-state">No courses in the catalogue yet. Add your first course above.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {courses.map((c) => {
              const img = c.photo ? `http://localhost:8000/${c.photo.replace(/\\/g, '/')}` : null
              const monthly = c.monthly_amount || c.course_amount || 0
              const yearly = c.yearly_amount || (monthly > 0 ? monthly * 10 : 0)

              return (
                <div key={c.course_id} style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr auto', gap: '18px', alignItems: 'center', padding: '18px', border: '1px solid var(--line)', background: '#fffdf8' }}>
                  <div style={{ width: '80px', height: '60px', background: img ? `url(${img}) center/cover` : '#d9d5c9', borderRadius: '4px' }} />
                  <div>
                    <strong>{c.course_title}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      {c.course_type === 'free' ? (
                        <span style={{ color: '#166534', fontWeight: 600 }}>Free Course</span>
                      ) : (
                        <span>
                          <strong>Monthly:</strong> ₹{monthly} · <strong>Yearly:</strong> ₹{yearly}
                        </span>
                      )}
                      {c.discount > 0 && ` · Flash: ${c.discount}% off`}
                      {c.coupon_code && ` · Coupon: ${c.coupon_code}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="primary-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => navigate(`/learning/${c.course_id}`)}>
                      Classroom ↗
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => setSelectedCourseForStudents(c)}>
                      👥 Students
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => { setDiscountForm({ ...discountForm, course_id: c.course_id }); setActivePanel('discount') }}>
                      Discount
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => { setCouponForm({ ...couponForm, course_id: c.course_id }); setActivePanel('coupon') }}>
                      Coupon
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px', borderColor: '#c0392b', color: '#c0392b' }} onClick={() => deleteCourse(c.course_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Enrolled Students Modal */}
        {selectedCourseForStudents && (
          <CourseStudentsModal course={selectedCourseForStudents} onClose={() => setSelectedCourseForStudents(null)} />
        )}
      </section>
    </main>
  )
}
