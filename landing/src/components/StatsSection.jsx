export default function StatsSection({ stats }) {
  return (
    <section className="stats-strip" aria-label="Platform Statistics">
      <div className="stat-box">
        <strong>{stats?.total_students ? `${stats.total_students}+` : '10,000+'}</strong>
        <span>Enrolled Students</span>
      </div>
      <div className="stat-box">
        <strong>{stats?.total_courses ? `${stats.total_courses}+` : '50+'}</strong>
        <span>Live Masterclasses</span>
      </div>
      <div className="stat-box">
        <strong>{stats?.total_teachers ? `${stats.total_teachers}+` : '30+'}</strong>
        <span>Faculty Mentors</span>
      </div>
      <div className="stat-box">
        <strong>{stats?.total_live_classes ? `${stats.total_live_classes}+` : '100+'}</strong>
        <span>Live Studio Sessions</span>
      </div>
    </section>
  )
}
