import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Brand from './Brand'
import ThemeToggle from './ThemeToggle'
import { getAppUrl, getLoginUrl, getRegisterUrl } from '../config'

export default function Navbar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Courses', path: '/courses' },
    { label: 'Our Mentors', path: '/mentors' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ]

  // Lock body scroll and listen for Escape key when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }

    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <>
      <header className="site-header" id="top">
        <div className="site-header-inner">
          <Brand variant="logo" to="/" onClick={() => setMobileOpen(false)} />

          {/* Desktop Navigation */}
          <nav className="desktop-nav" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActive ? 'active-nav-link' : ''}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            <ThemeToggle />

            {/* Secondary CTA: Login (Hidden on small mobile) */}
            <a
              href={getLoginUrl()}
              className="outline-button header-login-btn"
            >
              Login
            </a>

            {/* Primary CTA: Explore UniSkill */}
            <a
              href={getAppUrl()}
              className="cta-explore-btn header-explore-btn"
            >
              <span>Explore UniSkill</span>
              <span className="btn-arrow">↗</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              className={`mobile-hamburger-btn ${mobileOpen ? 'is-active' : ''}`}
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              <span className="hamburger-box">
                <span className="hamburger-inner"></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <div
            className="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="drawer-top">
              <Brand variant="logo" to="/" onClick={() => setMobileOpen(false)} />
              <button
                type="button"
                className="drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <nav className="mobile-nav-links">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="mobile-active-dot"></span>}
                  </Link>
                )
              })}

              <div className="mobile-drawer-divider" />

              <div className="mobile-drawer-actions">
                <a
                  href={getLoginUrl()}
                  className="outline-button mobile-action-btn"
                  onClick={() => setMobileOpen(false)}
                >
                  Login to Platform
                </a>

                <a
                  href={getRegisterUrl()}
                  className="primary-button mobile-action-btn"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started Free ↗
                </a>

                <a
                  href={getAppUrl()}
                  className="cta-explore-btn mobile-action-btn"
                  onClick={() => setMobileOpen(false)}
                >
                  <span>Explore UniSkill</span>
                  <span className="btn-arrow">↗</span>
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
