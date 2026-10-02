import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from './AuthContext'
import { ActivityContext } from './activityContextStore'

const emptyActivity = { current_streak: 0, longest_streak: 0, active_days: 0, heatmap: [] }

export function ActivityProvider({ children }) {
  const { session } = useAuth()
  const identityKey = session?.token ? `${session.role}:${session.email}` : ''
  const [activityState, setActivityState] = useState({ identityKey: '', activity: emptyActivity })
  const activity = activityState.identityKey === identityKey ? activityState.activity : emptyActivity

  useEffect(() => {
    if (!session?.token || !['STUDENT', 'TEACHER', 'ADMIN'].includes(session.role)) return undefined

    let active = true
    const checkIn = () => request('/activity/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => {
        if (active) setActivityState({ identityKey, activity: data })
      })
      .catch(() => {})

    checkIn()
    const timer = window.setInterval(checkIn, 30 * 60 * 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkIn()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [identityKey, session?.token, session?.role])

  return <ActivityContext.Provider value={activity}>{children}</ActivityContext.Provider>
}