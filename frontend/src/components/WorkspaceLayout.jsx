import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'
import MediaImage from './MediaImage'
import ThemeToggle from './ThemeToggle'
import AnnouncementBell from './AnnouncementBell'
import ActivityStreak from './ActivityStreak'

function getNavSections(role) {
  if (role === 'STUDENT') {
    return [
      {
        title: 'Learning',
        items: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'My Courses', path: '/student/my-courses' },
          { label: 'Explore Courses', path: '/student/explore-courses' },
          { label: 'Assignments', path: '/student/assignments' },
          { label: 'Live Classes', path: '/student/live-classes' },
          { label: 'Announcements', path: '/announcements' },
        ],
      },
      {
        title: 'Feedback & Forms',
        items: [
          { label: 'Feedback Forms', path: '/student/forms' },
          { label: 'Help & Support', path: '/contact' },
        ],
      },
      {
        title: 'Profile',
        items: [
          { label: 'Account Profile', path: '/profile' },
          { label: 'Certificates', path: '/student/certificates' },
        ],
      },
      {
        title: 'Payment',
        items: [
          { label: 'Payment History', path: '/student/payments' },
        ],
      },
    ]
  }

  if (role === 'TEACHER') {
    return [
      {
        title: 'Teaching & Learning',
        items: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'My Courses', path: '/teacher/courses' },
          { label: 'Assignments', path: '/teacher/assignments' },
          { label: 'Live Studio', path: '/teacher/live-studio' },
          { label: 'Students', path: '/teacher/students' },
        ],
      },
      {
        title: 'Feedback & Forms',
        items: [
          { label: 'Broadcast Announcements', path: '/announcements' },
          { label: 'Interactive Forms', path: '/teacher/forms' },
          { label: 'Help & Support', path: '/contact' },
        ],
      },
      {
        title: 'Profile',
        items: [
          { label: 'Account Profile', path: '/profile' },
        ],
      },
    ]
  }

  return [
    {
      title: 'Overview & Analytics',
      items: [
        { label: 'Admin Dashboard', path: '/admin/dashboard' },
        { label: 'Activity Logs', path: '/admin/logs' },
        { label: 'Admin Team', path: '/admin/team' },
      ],
    },
    {
      title: 'People & Academics',
      items: [
        { label: 'Students', path: '/admin/users' },
        { label: 'Teachers', path: '/admin/teachers' },
        { label: 'Courses', path: '/admin/courses' },
        { label: 'Certificates', path: '/admin/certificates' },
      ],
    },
    {
      title: 'Communication & Forms',
      items: [
        { label: 'Broadcast Announcements', path: '/announcements' },
        { label: 'Custom Forms', path: '/admin/forms' },
        { label: 'Inquiries', path: '/admin/inquiries' },
      ],
    },
    {
      title: 'Payment & Finance',
      items: [
        { label: 'Payment History', path: '/admin/payments' },
      ],
    },
    {
      title: 'Profile & Governance',
      items: [
        { label: 'Admin Profile & Terms', path: '/profile' },
      ],
    },
  ]
}

export default function WorkspaceLayout() {
  const { session, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (!session) return null

  const navSections = getNavSections(session.role)
  const flatItems = navSections.flatMap((section) => section.items)
  const currentItem = flatItems.find((item) => item.path === location.pathname) || flatItems[0]
  const displayName = (session.name || session.email).split(' ')[0]
  const roleLabel = session.role === 'ADMIN' ? 'Administrator' : session.role === 'TEACHER' ? 'Teacher' : 'Student'

  const renderNavList = () => (
    <div className="sidebar-sections">
      {navSections.map((section) => (
        <div key={section.title} className="sidebar-section">
          <p className="sidebar-section-title">{section.title}</p>
          <ul className="sidebar-nav-list">
            {section.items.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileSidebarOpen(false)}
                    title={item.label}
                  >
                    <span className="nav-mark">{item.label.charAt(0).toUpperCase()}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={`workspace-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="workspace-sidebar desktop-sidebar">
        <div className="sidebar-header">
          <Brand variant="logo" to="/dashboard" />
          <button
            className="sidebar-toggle-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            type="button"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <p className="sidebar-label">{session.role} portal</p>
        {renderNavList()}

        <div className="sidebar-footer">
          <button className="sidebar-nav-item logout-item" type="button" onClick={handleLogout} title="Log out">
            <span className="nav-mark">L</span>
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <div className="mobile-drawer-content workspace-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <Brand variant="logo" to="/dashboard" onClick={() => setMobileSidebarOpen(false)} />
              <button type="button" className="drawer-close" onClick={() => setMobileSidebarOpen(false)}>
                ✕
              </button>
            </div>
            <p className="sidebar-label">{session.role} portal</p>
            {renderNavList()}
            <button className="outline-button" type="button" onClick={handleLogout} style={{ marginTop: 24, borderColor: '#ef4444', color: '#b91c1c' }}>
              Log out
            </button>
          </div>
        </div>
      )}

      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <button
              className="mobile-hamburger-btn"
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <strong>{currentItem?.label || 'Workspace'}</strong>
          </div>

          <div className="workspace-topbar-actions">
            <ThemeToggle />
            <ActivityStreak />
            <AnnouncementBell />
            <Link to="/profile" className="workspace-user">
              <MediaImage
                src={session.photo}
                alt={session.name || session.email}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                fallback={
                  <div className="avatar small" style={{ width: 36, height: 36 }}>
                    {(session.name || session.email).charAt(0).toUpperCase()}
                  </div>
                }
              />
              <span className="workspace-user-meta">
                <strong>{displayName}</strong>
                <small>{roleLabel}</small>
              </span>
            </Link>
          </div>
        </header>

        <div className="workspace-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
