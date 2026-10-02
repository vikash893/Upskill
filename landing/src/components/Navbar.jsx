import { useState } from 'react'
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
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ]

  return (
    <>
      <header className="site-header" id="top">
        <Brand variant="logo" to="/" onClick={() => setMobileOpen(false)} />

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={isActive ? 'active-nav-link' : ''}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Header Actions */}
        <div className="header-actions">
          <ThemeToggle />

          {/* Secondary CTA: Login */}
          <a
            href={getLoginUrl()}
            className="outline-button"
            style={{ padding: '9px 18px', fontSize: '13px' }}
          >
            Login
          </a>

          {/* Primary CTA: Explore UniSkill */}
          <a
            href={getAppUrl()}
            className="cta-explore-btn"
          >
            <span>Explore UniSkill</span>
            <span>↗</span>
          </a>

          {/* Mobile Hamburger */}
          <button
            className="mobile-hamburger-btn"
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <Brand variant="wordmark" to="/" onClick={() => setMobileOpen(false)} />
              <button
                type="button"
                className="drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="mobile-nav-links">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    color: location.pathname === link.path ? 'var(--orange)' : 'var(--ink)',
                  }}
                >
                  {link.label}
                </Link>
              ))}

              <div style={{ height: '1px', background: 'var(--line)', margin: '10px 0' }} />

              <a
                href={getLoginUrl()}
                className="outline-button"
                style={{ textAlign: 'center', width: '100%' }}
              >
                Login to Platform
              </a>

              <a
                href={getRegisterUrl()}
                className="primary-button"
                style={{ textAlign: 'center', width: '100%' }}
              >
                Get Started Free ↗
              </a>

              <a
                href={getAppUrl()}
                className="cta-explore-btn"
                style={{ textAlign: 'center', justifyContent: 'center', width: '100%' }}
              >
                Explore UniSkill ↗
              </a>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
