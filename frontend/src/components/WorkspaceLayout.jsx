import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function WorkspaceLayout() {
  const { session, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (!session) return null

  // Role-based navigation items
  let navItems = []

  if (session.role === 'STUDENT') {
    navItems = [
      { num: '01', label: 'Dashboard & Progress', path: '/dashboard' },
      { num: '02', label: 'My Courses', path: '/student/my-courses' },
      { num: '03', label: 'Explore Catalogue', path: '/student/explore-courses' },
      { num: '04', label: 'My Assignments', path: '/student/assignments' },
      { num: '05', label: 'Live Classes', path: '/student/live-classes' },
      { num: '06', label: 'Payment History', path: '/student/payments' },
      { num: '07', label: 'Profile Settings', path: '/profile' },
    ]
  } else if (session.role === 'TEACHER') {
    navItems = [
      { num: '01', label: 'Instructor Dashboard', path: '/dashboard' },
      { num: '02', label: 'My Assigned Courses', path: '/teacher/courses' },
      { num: '03', label: 'Assignment Center', path: '/teacher/assignments' },
      { num: '04', label: 'Live Class Studio', path: '/teacher/live-studio' },
      { num: '05', label: 'Enrolled Students', path: '/teacher/students' },
      { num: '06', label: 'Teacher Profile', path: '/profile' },
    ]
  } else if (session.role === 'ADMIN') {
    navItems = [
      { num: '01', label: 'Admin Dashboard', path: '/admin/dashboard' },
      { num: '02', label: 'Payment Approvals', path: '/admin/payments' },
      { num: '03', label: 'Course Management', path: '/admin/courses' },
      { num: '04', label: 'Faculty & Teachers', path: '/admin/teachers' },
      { num: '05', label: 'Student Directory', path: '/admin/users' },
      { num: '06', label: 'Audit Activity Logs', path: '/admin/logs' },
      { num: '07', label: 'Inquiries & Support', path: '/admin/inquiries' },
      { num: '08', label: 'QR & Payment Config', path: '/profile' },
    ]
  }

  const currentItem = navItems.find((item) => item.path === location.pathname) || navItems[0]

  const userPhoto = session?.photo
    ? session.photo.startsWith('http')
      ? session.photo
      : `http://localhost:8000/${session.photo.replace(/^[\/\\]+/, '').replace(/\\/g, '/')}`
    : null

  const renderNavList = () => (
    <ul className="sidebar-nav-list">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileSidebarOpen(false)}
              title={item.label}
            >
              <span className="nav-num">{item.num}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className={`workspace-layout ${collapsed ? 'collapsed' : ''}`}>
      {/* FIXED SIDEBAR (DESKTOP) */}
      <aside className="workspace-sidebar">
        <div className="sidebar-header">
          <Link className="brand" to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="UniSkills" style={{ height: '24px', width: 'auto', display: 'block' }} />
            <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>
              Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
            </span>
          </Link>
          <button
            className="sidebar-toggle-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <p className="sidebar-label" style={{ marginBottom: '14px' }}>
          {session.role} PORTAL
        </p>

        {/* Navigation Items */}
        {renderNavList()}

        {/* Logout at bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <button
            className="sidebar-nav-item"
            style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', color: '#ff8a8a' }}
            onClick={() => {
              logout()
              navigate('/')
            }}
            title="Log out"
          >
            <span className="nav-num" style={{ color: '#ff8a8a' }}>↗</span>
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileSidebarOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
              <Link className="brand" to="/dashboard" onClick={() => setMobileSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none' }}>
                <img src="/logo.png" alt="UniSkills" style={{ height: '24px', width: 'auto' }} />
                <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>
                  Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
                </span>
              </Link>
              <button onClick={() => setMobileSidebarOpen(false)} style={{ background: 'none', border: 0, fontSize: '20px', color: 'white', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <p className="sidebar-label" style={{ marginBottom: '14px', color: 'var(--lime)' }}>
              {session.role} PORTAL NAVIGATION
            </p>

            {renderNavList()}

            <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'grid', gap: '10px' }}>
              <button
                className="outline-button"
                style={{ borderColor: '#ef4444', color: '#ff8a8a', fontSize: '12px' }}
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Log Out ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW AREA */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header
          style={{
            minHeight: '68px',
            borderBottom: '1px solid var(--line)',
            background: 'rgba(244,241,233,.94)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4vw',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Hamburger toggle */}
            <button
              className="mobile-hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open Workspace Menu"
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
              ☰
            </button>

            <span style={{ font: '10px var(--mono)', color: 'var(--orange)', letterSpacing: '1px' }}>
              SECTION / {currentItem?.num || '01'}
            </span>
            <strong style={{ fontSize: '15px' }}>{currentItem?.label || 'Workspace'}</strong>
          </div>

          {/* User controls and Profile link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={session.name || session.email}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                  />
                ) : (
                  <div className="avatar small" style={{ width: '32px', height: '32px' }}>
                    {(session.name || session.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="desktop-only" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  {(session.name || session.email).split(' ')[0]}
                </span>
              </Link>

              <button
                className="outline-button desktop-only"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="workspace-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
