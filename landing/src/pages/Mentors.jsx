import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { getAppUrl, getRegisterUrl } from '../config'
import CtaBanner from '../components/CtaBanner'

export default function Mentors() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    request('/mentors')
      .then((data) => {
        setMentors(data.mentors || [])
      })
      .catch((err) => {
        setError(err.message || 'Unable to load mentors at the moment')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredMentors = mentors.filter((m) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q) ||
      (Array.isArray(m.expertise) && m.expertise.some((e) => e.toLowerCase().includes(q)))
    )
  })

  return (
    <div className="landing-container">
      {/* Header */}
      <section style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow">INDUSTRY GUIDANCE & TECHNICAL MENTORSHIP</p>
        <h1 className="section-title">
          Learn directly from engineers<br /><em>shaping top global tech.</em>
        </h1>
        <p className="section-subtitle">
          Our industry mentors review your code, conduct mock interviews, explain real production architectures, and help you land high-impact technical roles.
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: '540px', marginTop: '28px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by mentor name, company, role, or technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mentors-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mentors-search-clear"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section" style={{ paddingTop: '10px' }}>
        {loading ? (
          <div className="mentors-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="mentor-card skeleton-card">
                <div className="mentor-avatar-skeleton skeleton-pulse" />
                <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                  <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: '18px' }} />
                  <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '14px' }} />
                  <div className="skeleton-line skeleton-pulse" style={{ width: '90%', height: '12px', marginTop: '8px' }} />
                  <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mentors-empty-card">
            <p style={{ color: '#dc2626', margin: '0 0 12px' }}>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="mentors-empty-card">
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px' }}>
              {search ? 'No mentors match your search criteria' : 'Our Mentors Roster is Being Updated'}
            </h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px', maxWidth: '440px', lineHeight: 1.5 }}>
              {search
                ? 'Try searching with another keyword like Google, React, System Design, or AWS.'
                : 'Our instructors and industry leaders are being onboarded. Check back shortly or connect with our academic team.'}
            </p>
            {search ? (
              <button className="outline-button" onClick={() => setSearch('')}>
                Clear Filter
              </button>
            ) : (
              <a href={getAppUrl()} className="primary-button">
                Explore Live Courses ↗
              </a>
            )}
          </div>
        ) : (
          <div className="mentors-grid">
            {filteredMentors.map((mentor) => {
              const photo = mentor.photo ? mentor.photo.replace(/\\/g, '/') : null

              return (
                <article key={mentor._id} className="mentor-card">
                  <div className="mentor-card-header">
                    {photo ? (
                      <div
                        className="mentor-avatar"
                        style={{ backgroundImage: `url(${photo})` }}
                        role="img"
                        aria-label={mentor.name}
                      />
                    ) : (
                      <div className="mentor-avatar mentor-avatar-fallback">
                        {mentor.name?.charAt(0) || 'M'}
                      </div>
                    )}

                    <div className="mentor-header-info">
                      <h2 className="mentor-name">{mentor.name}</h2>
                      <p className="mentor-role">{mentor.role}</p>
                      {mentor.company && (
                        <div className="mentor-company-badge">
                          <span className="company-badge-dot" />
                          <span>{mentor.company}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mentor-card-body">
                    <p className="mentor-bio">{mentor.bio}</p>

                    {Array.isArray(mentor.expertise) && mentor.expertise.length > 0 && (
                      <div className="mentor-skills-wrap">
                        {mentor.expertise.map((skill, idx) => (
                          <span key={idx} className="mentor-skill-pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mentor-card-footer">
                    {mentor.linkedin ? (
                      <a
                        href={mentor.linkedin.startsWith('http') ? mentor.linkedin : `https://${mentor.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mentor-linkedin-btn"
                        aria-label={`${mentor.name}'s LinkedIn profile`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8v-8.37M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
                        </svg>
                        <span>LinkedIn</span>
                      </a>
                    ) : (
                      <span className="mentor-verified-tag">✓ Verified Mentor</span>
                    )}

                    <a
                      href={getRegisterUrl()}
                      className="mentor-connect-btn"
                    >
                      <span>Join Cohort</span>
                      <span>→</span>
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <CtaBanner />
    </div>
  )
}
