import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/request'
import { getRegisterUrl } from '../config'

export default function MentorsSection() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request('/mentors')
      .then((data) => {
        setMentors(data.mentors || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && mentors.length === 0) {
    return null
  }

  const displayedMentors = mentors.slice(0, 3)

  return (
    <section className="content-section" aria-labelledby="mentors-section-title">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '36px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <p className="eyebrow">WORLD-CLASS FACULTY & MENTORS</p>
          <h2 id="mentors-section-title" className="section-title" style={{ margin: 0 }}>
            Guidance from engineers<br />
            <em>at the frontier of tech.</em>
          </h2>
        </div>
        <Link to="/mentors" className="primary-button" style={{ padding: '10px 22px', fontSize: '13px' }}>
          View All Mentors ({mentors.length}) ↗
        </Link>
      </div>

      {loading ? (
        <div className="mentors-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="mentor-card skeleton-card">
              <div className="mentor-avatar-skeleton skeleton-pulse" />
              <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: '18px' }} />
                <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '14px' }} />
                <div className="skeleton-line skeleton-pulse" style={{ width: '90%', height: '12px', marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mentors-grid">
          {displayedMentors.map((mentor) => {
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
                    <h3 className="mentor-name">{mentor.name}</h3>
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
                  <p className="mentor-bio">
                    {mentor.bio?.length > 150 ? `${mentor.bio.slice(0, 150)}...` : mentor.bio}
                  </p>

                  {Array.isArray(mentor.expertise) && mentor.expertise.length > 0 && (
                    <div className="mentor-skills-wrap">
                      {mentor.expertise.slice(0, 4).map((skill, idx) => (
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
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8v-8.37M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                  ) : (
                    <span className="mentor-verified-tag">✓ Verified Mentor</span>
                  )}

                  <Link to="/mentors" className="mentor-connect-btn">
                    <span>Learn More</span>
                    <span>→</span>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
