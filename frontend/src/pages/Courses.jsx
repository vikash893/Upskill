import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import CourseCard from '../components/CourseCard'
import PaymentModal from '../components/PaymentModal'

export default function Courses() {
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
    if (!session) {
      alert('Please sign in or create an account to enroll.')
      return
    }
    try {
      await request(`/enroll/free/${courseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      alert('Enrolled successfully!')
      fetchCatalogue()
      navigate(`/learning/${courseId}`)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE</p>
            <h2>All Courses Catalogue</h2>
          </div>
          <p className="section-note">{courses.length} courses available for learning</p>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search courses by title or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px',
              border: '1px solid var(--line)',
              background: '#FFFFFF',
              outlineColor: 'var(--orange)',
              fontFamily: 'inherit',
            }}
          />
          <div className="role-picker" style={{ border: 0, margin: 0 }}>
            {['all', 'free', 'paid'].map((t) => (
              <button key={t} className={typeFilter === t ? 'active' : ''} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All' : t === 'free' ? 'Free Courses' : 'Paid Courses'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading catalogue...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : filtered.length ? (
          <div className="course-grid">
            {filtered.map((course) => {
              const isEnrolled = myCourseIds.includes(course.course_id)
              return (
                <div key={course.course_id} style={{ position: 'relative' }}>
                  <CourseCard course={course} />
                  {isEnrolled && (
                    <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 2 }}>
                      <span className="badge" style={{ position: 'static', background: 'var(--ink)', color: 'var(--lime)' }}>
                        ✓ Enrolled
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">No courses match your search or filter.</div>
        )}
      </section>

      {/* Payment Modal */}
      {selectedCourseForPayment && (
        <PaymentModal
          course={selectedCourseForPayment}
          onClose={() => setSelectedCourseForPayment(null)}
          onSuccess={() => {
            setSelectedCourseForPayment(null)
            fetchCatalogue()
          }}
        />
      )}
    </main>
  )
}
