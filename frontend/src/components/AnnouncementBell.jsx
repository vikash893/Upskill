import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function AnnouncementBell() {
  const { session } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true
    const headers = { Authorization: `Bearer ${session.token}` }

    const loadUnread = () => request('/announcements/mine', { headers })
      .then((data) => {
        if (active) setUnreadCount(data.unread_count || 0)
      })
      .catch(() => {})

    loadUnread()
    const timer = window.setInterval(loadUnread, 30000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [session.token])

  return (
    <Link to="/announcements" className="announcement-bell" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} title="Notifications">
      <span aria-hidden="true" style={{ fontSize: '16px' }}>🔔</span>
      {unreadCount > 0 && <span className="announcement-bell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </Link>
  )
}