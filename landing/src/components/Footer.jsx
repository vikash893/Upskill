import { useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from './Brand'
import TermsModal from './TermsModal'
import { getAppUrl, getLoginUrl, getRegisterUrl } from '../config'

export default function Footer() {
  const [activeLegalTab, setActiveLegalTab] = useState(null)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setSubscribed(true)
    setNewsletterEmail('')
  }

  return (
    <>
      <footer className="landing-footer">
        <div className="footer-grid">
          {/* Col 1: Brand & Bio */}
          <div className="footer-brand">
            <Brand variant="wordmark" to="/" />
            <p>
              A modern digital learning academy engineered for clarity, practical mastery, and tangible career outcomes. Learn in public with leading engineering mentors.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--lime)' }} />
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>ISO 9001:2026 Certified Platform</span>
            </div>
          </div>

          {/* Col 2: Academic Tracks */}
          <div className="footer-col">
            <h4>ACADEMIC TRACKS</h4>
            <ul className="footer-links">
              <li><Link to="/courses">Full-Stack Web Engineering</Link></li>
              <li><Link to="/courses">AI & Applied Machine Learning</Link></li>
              <li><Link to="/courses">Cloud Computing & DevOps</Link></li>
              <li><Link to="/courses">UI/UX & Product Design</Link></li>
              <li><Link to="/courses">Data Analytics & SQL Mastery</Link></li>
            </ul>
          </div>

          {/* Col 3: Discovery & Platform */}
          <div className="footer-col">
            <h4>PLATFORM</h4>
            <ul className="footer-links">
              <li><Link to="/about">About UniSkill & Story</Link></li>
              <li><Link to="/courses">Course Discovery</Link></li>
              <li><Link to="/contact">Contact & Helpdesk</Link></li>
              <li><a href={getLoginUrl()}>Student & Teacher Login ↗</a></li>
              <li><a href={getRegisterUrl()}>Get Started Free ↗</a></li>
              <li><a href={getAppUrl()}>Launch Application ↗</a></li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Social */}
          <div className="footer-col">
            <h4>NEWSLETTER & UPDATES</h4>
            <p style={{ fontSize: '12.5px', color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 14px' }}>
              Receive weekly engineering briefs, live workshop schedules, and placement opportunities.
            </p>

            {subscribed ? (
              <div style={{ padding: '10px 14px', background: '#166534', color: '#DCFCE7', fontSize: '12px', borderRadius: '4px' }}>
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
                    padding: '9px 12px',
                    background: '#1F2937',
                    border: '1px solid #374151',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="primary-button"
                  style={{ padding: '9px 16px', fontSize: '11px', borderRadius: '4px' }}
                >
                  Join
                </button>
              </form>
            )}

            {/* Social Links */}
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#9CA3AF' }}>
              <a
                href="https://www.instagram.com/uniskill27/"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#9CA3AF', transition: 'color .2s' }}
                onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')}
                onMouseLeave={(e) => (e.target.style.color = '#9CA3AF')}
              >
                Instagram ↗
              </a>
            </div>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="footer-bottom">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveLegalTab('terms')}>Terms of Service</button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('privacy')}>Privacy Policy</button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('refund')}>Refund Policy</button>
            <span>·</span>
            <button onClick={() => setActiveLegalTab('conduct')}>Honor Code</button>
          </div>

          <div>
            <span>© 2026 UniSkill Inc. · Co-founded by Tushar Sharma · Built for Future Engineers</span>
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
