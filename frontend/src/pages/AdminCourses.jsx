import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import CourseStudentsModal from '../components/CourseStudentsModal'
import { mediaUrl } from '../utils/mediaUrl'
import Skeleton from '../components/Skeleton'
import Pagination from '../components/Pagination'

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
    duration_months: '',
    duration_days: '',
    course_type: 'paid',
  })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [discountForm, setDiscountForm] = useState({ course_id: '', discount: '', discount_time: '' })
  const [couponForm, setCouponForm] = useState({ course_id: '', person_name: '', coupon_discount: '', coupon_code_time: '' })
  const [activePanel, setActivePanel] = useState(null) // 'discount' | 'coupon' | 'manage-coupons'
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null)

  // Multi-coupon state
  const [manageCouponsCourseId, setManageCouponsCourseId] = useState(null)
  const [manageCouponsTitle, setManageCouponsTitle] = useState('')
  const [couponsList, setCouponsList] = useState([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [bulkTiers, setBulkTiers] = useState([])
  const [bulkTierDraft, setBulkTierDraft] = useState({ minimum_courses: '2', discount_percent: '' })
  const [bulkTiersLoading, setBulkTiersLoading] = useState(true)
  const [bulkTiersSaving, setBulkTiersSaving] = useState(false)
  const [coursePage, setCoursePage] = useState(1)
  const [courseLimit, setCourseLimit] = useState(10)
  const [courseSearch, setCourseSearch] = useState('')
  const [coursePagination, setCoursePagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const fetchCourses = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(coursePage))
    params.set('limit', String(courseLimit))
    if (courseSearch.trim()) params.set('search', courseSearch.trim())

    request(`/admin/all-courses?${params.toString()}`, { headers })
      .then((d) => {
        setCourses(d.courses || [])
        if (d.pagination) {
          setCoursePagination(d.pagination)
        } else {
          const tot = d.total || (d.courses ? d.courses.length : 0)
          setCoursePagination({
            currentPage: coursePage,
            pageSize: courseLimit,
            totalRecords: tot,
            totalPages: Math.ceil(tot / courseLimit) || 1,
            hasNextPage: coursePage * courseLimit < tot,
            hasPreviousPage: coursePage > 1,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCourses() }, [coursePage, courseLimit, courseSearch])

  useEffect(() => {
    request('/payment/admin/bulk-discounts', { headers })
      .then((data) => setBulkTiers(data.tiers || []))
      .catch((err) => setMessage(err.message))
      .finally(() => setBulkTiersLoading(false))
  }, [])

  const addBulkTier = () => {
    const minimumCourses = Number(bulkTierDraft.minimum_courses)
    const discountPercent = Number(bulkTierDraft.discount_percent)
    if (!Number.isInteger(minimumCourses) || minimumCourses < 2 || discountPercent <= 0 || discountPercent > 100) {
      setMessage('Use a course threshold of 2 or more and a discount between 1 and 100%.')
      return
    }
    if (bulkTiers.some((tier) => tier.minimum_courses === minimumCourses)) {
      setMessage('That course-count threshold already exists.')
      return
    }
    setBulkTiers((current) => [...current, { minimum_courses: minimumCourses, discount_percent: discountPercent }]
      .sort((left, right) => left.minimum_courses - right.minimum_courses))
    setBulkTierDraft({ minimum_courses: String(minimumCourses + 1), discount_percent: '' })
    setMessage('Tier added. Save the bulk discount settings to publish it.')
  }

  const saveBulkTiers = async () => {
    setBulkTiersSaving(true)
    try {
      const result = await request('/payment/admin/bulk-discounts', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tiers: bulkTiers }),
      })
      setBulkTiers(result.tiers || [])
      setMessage(result.message || 'Multi-course discounts saved.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setBulkTiersSaving(false)
    }
  }

  const addCourse = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('course_title', form.course_title)
      fd.append('course_description', form.course_description)
      fd.append('course_type', form.course_type)
      fd.append('course_amount', form.course_amount || '0')
      fd.append('duration_months', form.duration_months || '0')
      fd.append('duration_days', form.duration_days || '0')
      if (photo) fd.append('photo', photo)

      await request('/add-course', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: fd })
      setMessage('Course added successfully!')
      setForm({
        course_title: '',
        course_description: '',
        course_amount: '',
        duration_months: '',
        duration_days: '',
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
      setCouponForm({ ...couponForm, person_name: '', coupon_discount: '', coupon_code_time: '' })
      // Refresh coupons list if manage panel is open for same course
      if (manageCouponsCourseId === couponForm.course_id) {
        fetchCouponsForCourse(couponForm.course_id)
      }
      fetchCourses()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const fetchCouponsForCourse = async (courseId) => {
    setCouponsLoading(true)
    try {
      const data = await request(`/coupons/${courseId}`, { headers })
      setCouponsList(data.coupons || [])
      setManageCouponsTitle(data.course_title || courseId)
    } catch (err) {
      setMessage(err.message)
      setCouponsList([])
    } finally {
      setCouponsLoading(false)
    }
  }

  const openManageCoupons = (course) => {
    setManageCouponsCourseId(course.course_id)
    setCouponForm({ ...couponForm, course_id: course.course_id })
    setActivePanel('manage-coupons')
    fetchCouponsForCourse(course.course_id)
  }

  const deleteCoupon = async (courseId, couponId) => {
    if (!window.confirm('Delete this coupon code? Students will no longer be able to use it.')) return
    try {
      await request(`/delete-coupon/${courseId}/${couponId}`, { method: 'DELETE', headers })
      setMessage('Coupon deleted successfully')
      fetchCouponsForCourse(courseId)
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

        <section className="bulk-discount-panel" aria-labelledby="bulk-discount-title">
          <div className="bulk-discount-heading">
            <div>
              <p className="eyebrow">CART PRICING</p>
              <h3 id="bulk-discount-title">Multi-course discount tiers</h3>
              <p>These cart-wide discounts stack after each course's own flash discount and coupon.</p>
            </div>
            <button className="primary-button" type="button" onClick={saveBulkTiers} disabled={bulkTiersLoading || bulkTiersSaving}>
              {bulkTiersSaving ? 'Saving…' : 'Save tiers'}
            </button>
          </div>

          {bulkTiersLoading ? (
            <Skeleton variant="rows" count={2} label="Loading multi-course discounts" />
          ) : (
            <>
              <div className="bulk-discount-tier-list">
                {bulkTiers.length ? bulkTiers.map((tier) => (
                  <div className="bulk-discount-tier" key={tier.minimum_courses}>
                    <span><strong>{tier.minimum_courses}+</strong> courses</span>
                    <strong>{tier.discount_percent}% off cart subtotal</strong>
                    <button className="text-button" type="button" aria-label={`Remove ${tier.minimum_courses}-course discount tier`} onClick={() => setBulkTiers((current) => current.filter((item) => item.minimum_courses !== tier.minimum_courses))}>Remove</button>
                  </div>
                )) : <p className="bulk-discount-empty">No cart-wide discount tiers are active.</p>}
              </div>
              <div className="bulk-discount-form">
                <label>Minimum courses<input type="number" min="2" max="100" value={bulkTierDraft.minimum_courses} onChange={(event) => setBulkTierDraft((current) => ({ ...current, minimum_courses: event.target.value }))} /></label>
                <label>Cart discount %<input type="number" min="1" max="100" value={bulkTierDraft.discount_percent} onChange={(event) => setBulkTierDraft((current) => ({ ...current, discount_percent: event.target.value }))} /></label>
                <button className="outline-button" type="button" onClick={addBulkTier}>Add tier</button>
              </div>
            </>
          )}
        </section>

        {/* Add Course Form */}
        {showAdd && (
          <form onSubmit={addCourse} style={{ padding: '25px', border: '1px solid var(--line)', background: '#FFFFFF', marginBottom: '30px', display: 'grid', gap: '15px' }}>
            <p className="eyebrow">CREATE NEW COURSE</p>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Course Title *
              <input required value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }} />
            </label>
            <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
              Course Description *
              <textarea required value={form.course_description} onChange={(e) => setForm({ ...form, course_description: e.target.value })} rows="3" style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF', fontFamily: 'inherit', resize: 'vertical' }} />
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
                    Course Fee (₹) *
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1499"
                      value={form.course_amount}
                      onChange={(e) => setForm({ ...form, course_amount: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Duration (Months)
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 3"
                      value={form.duration_months}
                      onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Duration (Days)
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 15"
                      value={form.duration_days}
                      onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }}
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

        {/* Manage Coupons Panel (multi-coupon) */}
        {activePanel === 'manage-coupons' && (
          <div style={{ padding: '25px', border: '1px solid var(--orange)', background: '#fef7f0', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <p className="eyebrow" style={{ color: 'var(--orange)' }}>COUPON MANAGER</p>
                <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>{manageCouponsTitle}</h3>
              </div>
              <button className="outline-button" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={() => { setActivePanel(null); setManageCouponsCourseId(null) }}>
                Close
              </button>
            </div>

            {/* Add New Coupon Form */}
            <form onSubmit={addCoupon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '20px', padding: '16px', background: '#fff', border: '1px solid var(--line)' }}>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--muted)', fontSize: '11px' }}>
                Assignee / Prefix *
                <input required placeholder="e.g. John" value={couponForm.person_name} onChange={(e) => setCouponForm({ ...couponForm, person_name: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--muted)', fontSize: '11px' }}>
                Discount % *
                <input type="number" min="1" max="100" required placeholder="e.g. 20" value={couponForm.coupon_discount} onChange={(e) => setCouponForm({ ...couponForm, coupon_discount: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
              </label>
              <label style={{ display: 'grid', gap: '5px', color: 'var(--muted)', fontSize: '11px' }}>
                Expires At *
                <input type="datetime-local" required value={couponForm.coupon_code_time} onChange={(e) => setCouponForm({ ...couponForm, coupon_code_time: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
              </label>
              <button className="primary-button" type="submit" style={{ padding: '10px 18px', fontSize: '12px' }}>
                + Add Coupon
              </button>
            </form>

            {/* Coupons List */}
            {couponsLoading ? (
              <Skeleton variant="rows" count={2} label="Loading course coupons" />
            ) : couponsList.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No coupons yet. Create one above.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{couponsList.length} COUPON{couponsList.length > 1 ? 'S' : ''} ACTIVE</p>
                {couponsList.map((cp) => {
                  const isExpired = cp.expires_at && new Date() > new Date(cp.expires_at)
                  return (
                    <div
                      key={cp._id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: isExpired ? '#fef2f2' : '#fff',
                        border: `1px solid ${isExpired ? '#fecaca' : 'var(--line)'}`,
                        borderRadius: '4px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <code style={{ fontSize: '14px', fontWeight: 700, color: isExpired ? '#991b1b' : 'var(--orange)', letterSpacing: '1px' }}>
                            {cp.code}
                          </code>
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: isExpired ? '#fecaca' : '#dcfce7', color: isExpired ? '#991b1b' : '#166534', borderRadius: '3px', fontWeight: 600 }}>
                            {isExpired ? 'EXPIRED' : `${cp.discount}% OFF`}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                          {cp.person_name && <span>For: <strong>{cp.person_name}</strong> · </span>}
                          Expires: {cp.expires_at ? new Date(cp.expires_at).toLocaleString() : '—'}
                          {cp.created_at && <span> · Created: {new Date(cp.created_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button
                        className="outline-button"
                        style={{ fontSize: '10px', padding: '6px 12px', borderColor: '#c0392b', color: '#c0392b' }}
                        onClick={() => deleteCoupon(manageCouponsCourseId, cp._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Course List */}
        <input
          type="text"
          placeholder="Search courses by title or description..."
          value={courseSearch}
          onChange={(e) => {
            setCourseSearch(e.target.value)
            setCoursePage(1)
          }}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            outlineColor: 'var(--orange)',
            fontFamily: 'inherit',
            marginBottom: '20px',
          }}
        />

        {loading ? (
          <Skeleton variant="course-cards" count={3} label="Loading courses" />
        ) : courses.length === 0 ? (
          <div className="empty-state">No courses in the catalogue yet. Add your first course above.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {courses.map((c) => {
              const img = mediaUrl(c.photo)
              const durMonths = c.duration_months || 0
              const durDays = c.duration_days || 0
              const activeCoupons = (c.coupons || []).filter((cp) => !cp.expires_at || new Date() < new Date(cp.expires_at))
              const totalCoupons = (c.coupons || []).length

              return (
                <div key={c.course_id} style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr auto', gap: '18px', alignItems: 'center', padding: '18px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
                  <div style={{ width: '80px', height: '60px', background: img ? `url(${img}) center/cover` : '#E9EEF7', borderRadius: '4px' }} />
                  <div>
                    <strong>{c.course_title}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      {c.course_type === 'free' ? (
                        <span style={{ color: '#166534', fontWeight: 600 }}>Free Course</span>
                      ) : (
                        <span>
                          <strong>Fee:</strong> ₹{c.course_amount || c.actual_amount || 0}
                          {(durMonths > 0 || durDays > 0) && (
                            <> · <strong>Duration:</strong> {durMonths > 0 ? `${durMonths}M ` : ''}{durDays > 0 ? `${durDays}D` : ''}</>
                          )}
                        </span>
                      )}
                      {c.discount > 0 && ` · Flash: ${c.discount}% off`}
                      {totalCoupons > 0 && (
                        <span style={{ color: 'var(--orange)' }}>
                          {' '}· {activeCoupons.length} active coupon{activeCoupons.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="primary-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => navigate(`/learning/${c.course_id}`)}>
                      Classroom ↗
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => setSelectedCourseForStudents(c)}>
                      Students
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => { setDiscountForm({ ...discountForm, course_id: c.course_id }); setActivePanel('discount') }}>
                      Discount
                    </button>
                    <button className="outline-button" style={{ fontSize: '10px', padding: '7px 12px' }} onClick={() => openManageCoupons(c)}>
                      Coupons{totalCoupons > 0 ? ` (${totalCoupons})` : ''}
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

        <Pagination
          pagination={coursePagination}
          onPageChange={setCoursePage}
          onPageSizeChange={(newSize) => {
            setCourseLimit(newSize)
            setCoursePage(1)
          }}
          itemName="courses"
          loading={loading}
        />

        {/* Enrolled Students Modal */}
        {selectedCourseForStudents && (
          <CourseStudentsModal course={selectedCourseForStudents} onClose={() => setSelectedCourseForStudents(null)} />
        )}
      </section>
    </main>
  )
}
