import { useState } from 'react'
import { Link } from 'react-router-dom'
import TermsModal from './TermsModal'
import Brand from './Brand'

export default function Footer() {
  const [activeLegalTab, setActiveLegalTab] = useState(null)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterSubscribed(true)
    setNewsletterEmail('')
  }

  return (
    <>
      <footer style={{ background: '#181b17', color: '#dedbd2', borderTop: '1px solid #2e332c', padding: '70px 6vw 40px' }}>
        {/* Top 4-column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '45px', marginBottom: '60px' }}>
          
          {/* Col 1: Brand & Identity */}
          <div>
            <Brand variant="wordmark" to="/" className="footer-wordmark" />
            <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#9fa198', marginBottom: '20px' }}>
              A modern digital learning academy engineered for clarity, practical mastery, and career outcomes. Learn in public with leading mentors.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--lime)' }}></span>
              <span style={{ font: '11px var(--mono)', color: '#b5b7ad' }}>ISO 9001:2026 Certified Platform</span>
            </div>
          </div>

          {/* Col 2: Academics & Courses */}
          <div>
            <h4 style={{ font: '11px var(--mono)', letterSpacing: '1.5px', color: 'var(--lime)', textTransform: 'uppercase', marginBottom: '20px' }}>
              ACADEMIC TRACKS
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px', fontSize: '13px', color: '#b5b7ad' }}>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Full-Stack Web Engineering
                </Link>
              </li>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  AI & Applied Machine Learning
                </Link>
              </li>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Cloud Computing & DevOps
                </Link>
              </li>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  UI/UX & Product Design
                </Link>
              </li>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Data Analytics & SQL Mastery
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company & Discovery */}
          <div>
            <h4 style={{ font: '11px var(--mono)', letterSpacing: '1.5px', color: 'var(--lime)', textTransform: 'uppercase', marginBottom: '20px' }}>
              ORGANIZATION
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px', fontSize: '13px', color: '#b5b7ad' }}>
              <li>
                <Link to="/about" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  About UniSkill & Story
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Contact & Campus Locations
                </Link>
              </li>
              <li>
                <a href="#about" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Faculty Mentors & Careers
                </a>
              </li>
              <li>
                <Link to="/courses" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Curriculum & Syllabus
                </Link>
              </li>
              <li>
                <Link to="/admin" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--orange)'} onMouseLeave={(e) => e.target.style.color = '#b5b7ad'}>
                  Administrative Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Legal Quick Links */}
          <div>
            <h4 style={{ font: '11px var(--mono)', letterSpacing: '1.5px', color: 'var(--lime)', textTransform: 'uppercase', marginBottom: '20px' }}>
              NEWSLETTER & UPDATES
            </h4>
            <p style={{ fontSize: '12px', color: '#9fa198', lineHeight: 1.6, marginBottom: '14px' }}>
              Receive weekly engineering briefs, live workshop schedules, and scholarship announcements.
            </p>
            {newsletterSubscribed ? (
              <div style={{ padding: '10px 14px', background: '#273822', border: '1px solid #3d5e34', color: '#bbf7d0', fontSize: '12px', borderRadius: '4px' }}>
                ✓ Thank you for subscribing to UniSkill Dispatch!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: '#242923',
                    border: '1px solid #3a4038',
                    color: '#F0F6FF',
                    fontSize: '12px',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                />
                <button className="primary-button" type="submit" style={{ padding: '10px 16px', fontSize: '11px', background: 'var(--orange)' }}>
                  Join
                </button>
              </form>
            )}

            {/* Social handles */}
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#9fa198' }}>
              <a href="https://www.instagram.com/uniskill27/" target="_blank" rel="noreferrer" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = '#9fa198'}>Instagram</a>
              {/* <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = '#9fa198'}>Twitter / X</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = '#9fa198'}>LinkedIn</a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" style={{ transition: 'color .2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = '#9fa198'}>Discord</a> */}
            </div>
          </div>
        </div>

        {/* Legal Strip */}
        <div style={{ borderTop: '1px solid #2e332c', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          {/* Legal links */}
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '12px', color: '#9fa198' }}>
            <button onClick={() => setActiveLegalTab('terms')} style={{ background: 'none', border: 0, padding: 0, color: '#9fa198', cursor: 'pointer', fontSize: '12px' }}>
              Terms of Service
            </button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('privacy')} style={{ background: 'none', border: 0, padding: 0, color: '#9fa198', cursor: 'pointer', fontSize: '12px' }}>
              Privacy & IP Policy
            </button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('refund')} style={{ background: 'none', border: 0, padding: 0, color: '#9fa198', cursor: 'pointer', fontSize: '12px' }}>
              Refund & Expiry Terms
            </button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('conduct')} style={{ background: 'none', border: 0, padding: 0, color: '#9fa198', cursor: 'pointer', fontSize: '12px' }}>
              Honor Code
            </button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('cookies')} style={{ background: 'none', border: 0, padding: 0, color: '#9fa198', cursor: 'pointer', fontSize: '12px' }}>
              Cookie Preferences
            </button>
          </div>

          {/* Copyright */}
          <div style={{ font: '11px var(--mono)', color: '#7e8275' }}>
            <span>© 2026 UniSkill Inc. · Co-founded by Tushar Sharma · Built by Vikash Bhardwaj</span>
          </div>
        </div>
      </footer>

      {/* Interactive Legal Modal */}
      {activeLegalTab && (
        <TermsModal initialTab={activeLegalTab} onClose={() => setActiveLegalTab(null)} />
      )}
    </>
  )
}
