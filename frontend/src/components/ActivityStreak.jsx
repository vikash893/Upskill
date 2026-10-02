import { Link } from 'react-router-dom'
import { useActivity } from '../context/activityContextStore'

export default function ActivityStreak() {
  const { current_streak: currentStreak } = useActivity()

  const streak = currentStreak || 0

  return (
    <Link
      to="/profile"
      className="activity-streak-badge"
      title={`${streak} consecutive active ${streak === 1 ? 'day' : 'days'}. Click to view activity heatmap.`}
      style={{ textDecoration: 'none' }}
    >
      <span aria-hidden="true" style={{ fontSize: '15px' }}>🔥</span>
      <strong>{streak}</strong>
    </Link>
  )
}