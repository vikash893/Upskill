import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/request'
import HeroSection from '../components/HeroSection'
import StatsSection from '../components/StatsSection'
import FeaturesSection from '../components/FeaturesSection'
import HowItWorksSection from '../components/HowItWorksSection'
import WhyUniSkillSection from '../components/WhyUniSkillSection'
import CourseCard from '../components/CourseCard'
import TestimonialsSection from '../components/TestimonialsSection'
import FaqSection from '../components/FaqSection'
import CtaBanner from '../components/CtaBanner'

export default function Home() {
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    request('/explore-courses')
      .then((data) => setCourses(data.courses || []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false))

    request('/public/platform-stats')
      .then((data) => {
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="landing-container">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Platform Statistics Strip */}
      <StatsSection stats={stats} />

      {/* 3. Core Advantages & Features */}
      <FeaturesSection />

      {/* 4. Deep-dive: Workspace & Credentials */}
      <WhyUniSkillSection />

      {/* 5. Featured Masterclasses Preview */}
      <section className="content-section" aria-labelledby="featured-courses-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p className="eyebrow">CURATED MASTERCLASSES</p>
            <h2 id="featured-courses-title" className="section-title" style={{ margin: 0 }}>
              Explore top engineering<br /><em>& design tracks.</em>
            </h2>
          </div>
          <Link to="/courses" className="primary-button" style={{ padding: '10px 22px', fontSize: '13px' }}>
            View All Courses ({courses.length || '50+'}) ↗
          </Link>
        </div>

        {loadingCourses ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--muted)' }}>
            Loading available courses...
          </div>
        ) : courses.length > 0 ? (
          <div className="courses-grid">
            {courses.slice(0, 3).map((course) => (
              <CourseCard key={course.course_id} course={course} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 14px', color: 'var(--muted)' }}>
              Explore our full catalog across Web Development, AI, Machine Learning, and Cloud DevOps.
            </p>
            <Link to="/courses" className="primary-button">
              Browse Course Catalogue ↗
            </Link>
          </div>
        )}
      </section>

      {/* 6. Four Step Methodology */}
      <HowItWorksSection />

      {/* 7. Student Outcomes & Testimonials */}
      <TestimonialsSection />

      {/* 8. Frequently Asked Questions */}
      <FaqSection />

      {/* 9. Final Call to Action */}
      <CtaBanner />
    </div>
  )
}
