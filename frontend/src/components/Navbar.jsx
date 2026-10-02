import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'
import MediaImage from './MediaImage'
import ThemeToggle from './ThemeToggle'
import ActivityStreak from './ActivityStreak'
import AnnouncementBell from './AnnouncementBell'

export default function Navbar({ onAuthOpen }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const userName = session?.name || session?.email || 'User'
  const roleLabel = session?.role === 'ADMIN' ? 'Administrator' : session?.role === 'TEACHER' ? 'Teacher' : 'Student'

  return (
    <>
      <header className="site-header" id="top">
        <Brand variant="logo" to={session ? '/dashboard' : '/'} onClick={() => setMobileMenuOpen(false)} />

        <nav className="desktop-nav">
          {!session ? (
            <>
              <Link to="/courses" className={location.pathname === '/courses' ? 'active-nav-link' : ''}>
                Courses
              </Link>
              <Link to="/about" className={location.pathname === '/about' ? 'active-nav-link' : ''}>
                About
              </Link>
              <Link to="/contact" className={location.pathname === '/contact' ? 'active-nav-link' : ''}>
                Contact
              </Link>
            </>
          ) : (
            <Link to="/dashboard" className="active-nav-link">
              Workspace
            </Link>
          )}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          {session && (
            <>
              <ActivityStreak />
              <AnnouncementBell />
            </>
          )}
          {session ? (
            <div className="header-user">
              <Link to="/dashboard" className="desktop-only workspace-chip">
                Open workspace
              </Link>
              <MediaImage
                src={session.photo}
                alt={userName}
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                fallback={
                  <div className="avatar small" style={{ width: 34, height: 34 }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                }
              />
              <span className="public-user-meta">
                <strong>{userName.split(' ')[0]}</strong>
                <small>{roleLabel}</small>
              </span>
              <button className="outline-button desktop-only" type="button" onClick={handleLogout} style={{ padding: '8px 14px', fontSize: 12 }}>
                Log out
              </button>
            </div>
          ) : (
            <button className="outline-button" type="button" onClick={() => onAuthOpen('login')} style={{ padding: '9px 16px', fontSize: 12 }}>
              Sign in
            </button>
          )}

          <button
            className="mobile-hamburger-btn"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <Brand variant="wordmark" to="/" onClick={() => setMobileMenuOpen(false)} />
              <button type="button" className="drawer-close" onClick={() => setMobileMenuOpen(false)}>
                ✕
              </button>
            </div>

            <nav className="mobile-public-nav">
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Go to workspace
                  </Link>
                  <button className="primary-button" type="button" onClick={handleLogout}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/courses" onClick={() => setMobileMenuOpen(false)}>Courses</Link>
                  <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
                  <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                  <button className="primary-button" type="button" onClick={() => { setMobileMenuOpen(false); onAuthOpen('login') }}>
                    Sign in
                  </button>
                  <button className="outline-button" type="button" onClick={() => { setMobileMenuOpen(false); onAuthOpen('register') }}>
                    Join for free
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
