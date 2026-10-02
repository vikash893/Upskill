export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Pick Your Academic Track',
      desc: 'Select your preferred course from Web Engineering, AI & ML, Cloud, or Product Design with flexible monthly or yearly access plans.',
    },
    {
      step: '02',
      title: 'Enter Live Classrooms',
      desc: 'Join live video studio lectures, ask mentors questions in real-time, and watch HD recorded archives with downloadable PDF lesson notes.',
    },
    {
      step: '03',
      title: 'Build & Submit Projects',
      desc: 'Complete hands-on assignments and submit code repos. Receive direct line-by-line evaluation and feedback from industry mentors.',
    },
    {
      step: '04',
      title: 'Graduate With Verified Proof',
      desc: 'Earn tamper-proof certificates, maintain your daily activity streaks, and unlock targeted internship and job opportunities in your field.',
    },
  ]

  return (
    <section className="content-section" style={{ background: 'var(--surface)', padding: '70px 40px', borderRadius: '20px', border: '1px solid var(--line)', margin: '40px 0' }}>
      <div style={{ marginBottom: '40px' }}>
        <p className="eyebrow">THE METHODOLOGY</p>
        <h2 className="section-title">
          Four steps from zero to<br /><em>verifiable production mastery.</em>
        </h2>
        <p className="section-subtitle">
          A structured roadmap engineered to turn theoretical knowledge into real career accomplishments.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((s, idx) => (
          <div key={idx} className="step-card">
            <span className="step-number">{s.step}</span>
            <strong>{s.title}</strong>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
