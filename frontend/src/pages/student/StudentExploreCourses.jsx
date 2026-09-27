import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import CourseCard from '../../components/CourseCard'
import PaymentModal from '../../components/PaymentModal'

export default function StudentExploreCourses() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [filtered, setFiltered] = useState([])
  const [myCourseIds, setMyCourseIds] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState(null)

  const fetchCatalogue = async () => {
    setLoading(true)
    try {
      const data = await request('/explore-courses')
      setCourses(data.courses || [])
      setFiltered(data.courses || [])

      if (session?.role === 'STUDENT') {
        const myCoursesData = await request('/my-courses', {
          headers: { Authorization: `Bearer ${session.token}` },
        }).catch(() => ({}))
        if (myCoursesData.courses) {
          setMyCourseIds(myCoursesData.courses.map((c) => c.course_id))
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogue()
  }, [session])

  useEffect(() => {
    let result = courses
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.course_type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.course_title.toLowerCase().includes(q) ||
          c.course_description.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, typeFilter, courses])

  const handleEnrollFree = async (e, courseId) => {
    e.stopPropagation()
    try {
      await request(`/enroll/free/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      fetchCatalogue()
      navigate(`/learning/${courseId}`)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="workspace-page-container">
      {/* Header Section */}
      <div className="section-heading" style={{ marginBottom: '24px' }}>
        <div>
          <p className="eyebrow">CATALOGUE & ADMISSIONS</p>
          <h1 style={{ fontSize: '28px', letterSpacing: '-1px', margin: '4px 0 6px' }}>
            Explore All Academy Courses
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
            Discover practical engineering tracks, masterclasses, and interactive live workshops.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '260px' }}>
          <input
            type="text"
            placeholder="🔍 Search course name or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--line)',
              background: '#ffffff',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All Programs (${courses.length})` },
          { key: 'paid', label: 'Premium Tracks (Paid)' },
          { key: 'free', label: 'Free Workshops' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={`tag ${typeFilter === tab.key ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: typeFilter === tab.key ? 'var(--orange)' : '#ffffff',
              color: typeFilter === tab.key ? '#ffffff' : 'var(--ink)',
              border: typeFilter === tab.key ? '1px solid var(--orange)' : '1px solid var(--line)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="empty-state">Loading Academy Catalogue...</div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#dc2626' }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          No courses match your search criteria.
          <br />
          <button
            className="outline-button"
            style={{ marginTop: '12px', fontSize: '11px' }}
            onClick={() => { setSearch(''); setTypeFilter('all'); }}
          >
            Reset Search Filters
          </button>
        </div>
      ) : (
        <div className="course-grid">
          {filtered.map((course) => {
            const isEnrolled = myCourseIds.includes(course.course_id)
            return (
              <div key={course.course_id} style={{ display: 'flex', flexDirection: 'column' }}>
                <CourseCard
                  course={course}
                  isEnrolled={isEnrolled}
                  onEnrollFree={(e) => handleEnrollFree(e, course.course_id)}
                  onEnrollPaid={(e) => {
                    e.stopPropagation()
                    setSelectedCourseForPayment(course)
                  }}
                  onViewDetails={() => navigate(`/course/${course.course_id}`)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Payment & Checkout Modal */}
      {selectedCourseForPayment && (
        <PaymentModal
          course={selectedCourseForPayment}
          initialPlan="monthly"
          onClose={() => setSelectedCourseForPayment(null)}
          onSuccess={() => {
            fetchCatalogue()
          }}
        />
      )}
    </div>
  )
}
