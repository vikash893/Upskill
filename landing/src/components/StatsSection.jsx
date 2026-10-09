function formatStat(value, fallback = '0') {
  if (value === undefined || value === null) return fallback
  const num = Number(value)
  if (isNaN(num)) return value
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k+`
  if (num > 0) return `${num}+`
  return `${num}`
}

export default function StatsSection({ stats }) {
  return (
    <section className="stats-strip" aria-label="Platform Statistics">
      <div className="stat-box">
        <strong>{stats ? formatStat(stats.total_students, '0') : '...'}</strong>
        <span>Enrolled Students</span>
      </div>
      <div className="stat-box">
        <strong>{stats ? formatStat(stats.total_courses, '0') : '...'}</strong>
        <span>Live Masterclasses</span>
      </div>
      <div className="stat-box">
        <strong>{stats ? formatStat(stats.total_teachers, '0') : '...'}</strong>
        <span>Faculty Mentors</span>
      </div>
      <div className="stat-box">
        <strong>{stats ? formatStat(stats.total_live_classes, '0') : '...'}</strong>
        <span>Live Studio Sessions</span>
      </div>
    </section>
  )
}
