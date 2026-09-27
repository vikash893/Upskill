import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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

  const userPhoto = session?.photo ? (session.photo.startsWith('http') ? session.photo : `http://localhost:8000/${session.photo.replace(/\\/g, '/')}`) : null
  const userName = session?.name || session?.email || 'User'

  return (
    <>
      <header className="site-header" id="top">
        {/* Brand */}
        <Link className="brand" to={session ? '/dashboard' : '/'} onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="UniSkills" style={{ height: '36px', width: 'auto', display: 'block' }} />
          <span style={{ fontWeight: 800, fontSize: '23px', letterSpacing: '-0.8px', color: 'var(--ink)' }}>
            Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {!session ? (
            <>
              <Link to="/courses" className={location.pathname === '/courses' ? 'active-nav-link' : ''}>
                Courses
              </Link>
              <Link to="/about" className={location.pathname === '/about' ? 'active-nav-link' : ''}>
                About Us
              </Link>
              <Link to="/contact" className={location.pathname === '/contact' ? 'active-nav-link' : ''}>
                Contact
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className={location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/student') || location.pathname.startsWith('/teacher') || location.pathname.startsWith('/admin') ? 'active-nav-link' : ''}>
                Workspace
              </Link>
              <Link to="/profile" className={location.pathname === '/profile' ? 'active-nav-link' : ''}>
                Profile
              </Link>
            </>
          )}
        </nav>

        {/* Right CTA / Auth controls */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                  />
                ) : (
                  <div className="avatar small" style={{ width: '34px', height: '34px' }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="desktop-only" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  {userName.split(' ')[0]}
                </span>
              </Link>
              <button className="outline-button desktop-only" onClick={handleLogout} style={{ padding: '8px 14px', fontSize: '11px' }}>
                Log out <span>↗</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="outline-button" onClick={() => onAuthOpen('login')} style={{ padding: '9px 16px', fontSize: '12px' }}>
                Sign In <span>↗</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              display: 'none',
              background: 'none',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '14px', borderBottom: '1px solid var(--line)' }}>
              <Link className="brand" to="/" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/logo.png" alt="UniSkills" style={{ height: '30px', width: 'auto' }} />
                <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--ink)' }}>
                  Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
                </span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 0, fontSize: '20px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <nav style={{ display: 'grid', gap: '14px', fontSize: '15px' }}>
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    💻 Student Workspace
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    👤 Profile & Settings
                  </Link>
                  <button className="primary-button" onClick={handleLogout} style={{ marginTop: '10px' }}>
                    Log Out ↗
                  </button>
                </>
              ) : (
                <>
                  <Link to="/courses" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    📚 Explore Courses
                  </Link>
                  <Link to="/about" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    📖 About Academy
                  </Link>
                  <Link to="/contact" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    💬 Contact & Support
                  </Link>
                  <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                    <button className="primary-button" onClick={() => { setMobileMenuOpen(false); onAuthOpen('login') }}>
                      Sign In ↗
                    </button>
                    <button className="outline-button" onClick={() => { setMobileMenuOpen(false); onAuthOpen('register') }}>
                      Create Account ↗
                    </button>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
