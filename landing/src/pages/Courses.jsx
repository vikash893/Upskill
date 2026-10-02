import { useEffect, useState } from 'react'
import { request } from '../api/request'
import CourseCard from '../components/CourseCard'
import CtaBanner from '../components/CtaBanner'

const CATEGORIES = ['All Tracks', 'Web Engineering', 'Artificial Intelligence', 'Cloud & Systems', 'Product Design']

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Tracks')

  useEffect(() => {
    setLoading(true)
    request('/explore-courses')
      .then((data) => {
        setCourses(data.courses || [])
      })
      .catch((err) => {
        setError(err.message || 'Failed to load live courses catalogue')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      selectedCategory === 'All Tracks' ||
      course.course_title.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0])
    const matchesSearch =
      !search.trim() ||
      course.course_title.toLowerCase().includes(search.toLowerCase()) ||
      course.course_description?.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="landing-container">
      {/* Header */}
      <section style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow">COURSE DISCOVERY & ACADEMIC CATALOGUE</p>
        <h1 className="section-title">
          Master the skills top<br /><em>engineering teams hire for.</em>
        </h1>
        <p className="section-subtitle">
          Explore comprehensive tracks with live interactive studios, hands-on evaluated assignments, and verified certificates.
        </p>

        {/* Search & Category Filter */}
        <div style={{ background: 'var(--surface)', padding: '24px', border: '1px solid var(--line)', borderRadius: '14px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by course title, framework, or technology (e.g. React, Python, Docker)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '12px 16px',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                background: '#FFFFFF',
                fontSize: '14px',
              }}
            />
            {search && (
              <button
                type="button"
                className="outline-button"
                onClick={() => setSearch('')}
                style={{ padding: '12px 20px', fontSize: '13px' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    border: isActive ? '1px solid var(--orange)' : '1px solid var(--line)',
                    background: isActive ? 'var(--orange)' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : 'var(--ink)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="content-section" style={{ paddingTop: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: '15px' }}>
            Loading course catalogue from live server...
          </div>
        ) : error && courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
            <small style={{ color: '#7F1D1D', display: 'block', marginTop: '6px' }}>
              Ensure your UniSkill backend server is running on port 8000.
            </small>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No courses match your search criteria.</p>
            <p style={{ margin: '6px 0 16px', color: 'var(--muted)', fontSize: '13px' }}>
              Try searching with another keyword or selecting "All Tracks".
            </p>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setSearch('')
                setSelectedCategory('All Tracks')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map((course) => (
              <CourseCard key={course.course_id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <CtaBanner />
    </div>
  )
}
