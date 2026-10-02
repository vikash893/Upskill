export default function FeaturesSection() {
  const features = [
    {
      icon: '🔴',
      title: 'Interactive Live Classrooms',
      desc: 'Join scheduled video studio classes directly in your browser with zero logins required. Ask real-time questions and build alongside instructors.',
    },
    {
      icon: '🎥',
      title: 'HD Lecture Archive & Notes',
      desc: 'Never miss a session. Replay lecture recordings anytime and download curated PDF problem sets and code starter files.',
    },
    {
      icon: '📝',
      title: 'Graded Assignments & Feedback',
      desc: 'Submit project code and evaluated problem sheets. Receive direct written grades and actionable critiques from course mentors.',
    },
    {
      icon: '🔥',
      title: 'Daily Streak & Activity Heatmap',
      desc: 'Stay motivated with automated daily check-ins, streak counters, and a 365-day visual GitHub-style activity heatmap in your profile.',
    },
    {
      icon: '💼',
      title: 'Verified Job & Internship Portal',
      desc: 'Discover vetted job openings and student internships from LinkedIn, Instagram, and hiring portals filtered specifically for BCA, BBA, B.Tech, and MCA.',
    },
    {
      icon: '📜',
      title: 'Verifiable Industry Credentials',
      desc: 'Earn tamper-proof completion certificates equipped with unique verification IDs and ISO 9001:2026 academic standards.',
    },
  ]

  return (
    <section className="content-section" aria-labelledby="features-title">
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p className="eyebrow">THE UNISKILL ADVANTAGE</p>
        <h2 id="features-title" className="section-title">
          Engineered for outcomes,<br /><em>not passive viewing.</em>
        </h2>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Traditional video platforms leave learners stranded. UniSkill bridges the gap with active classrooms, evaluated milestones, and direct mentorship.
        </p>
      </div>

      <div className="feature-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
