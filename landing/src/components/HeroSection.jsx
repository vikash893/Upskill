import { getAppUrl, getRegisterUrl } from '../config'

export default function HeroSection() {
  return (
    <section className="hero-wrapper" aria-label="Hero Introduction">
      <div className="hero-grid">
        <div className="hero-content">
          <div className="hero-kicker">
            <span>✨</span>
            <span>NEXT-GEN LIVE LEARNING PLATFORM</span>
          </div>

          <h1 className="hero-title">
            Start in minutes.<br />
            Build skills this week.
          </h1>

          <p className="hero-lead">
            Master Full-Stack Web Development, AI & Machine Learning, Cloud DevOps, and Product Engineering with real-time live studio classes, hands-on evaluated assignments, and verified credentials.
          </p>

          <div className="hero-actions">
            <a href={getAppUrl()} className="hero-primary-btn">
              <span>Explore UniSkill</span>
              <span>↗</span>
            </a>

            <a href={getRegisterUrl()} className="hero-secondary-btn">
              <span>Create Free Account</span>
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-float-badge badge-top">
            <span style={{ fontSize: '24px' }}>⚡</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block' }}>Daily Streak System</strong>
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Build learning momentum</small>
            </div>
          </div>

          <img
            src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Student learning on UniSkill"
          />

          <div className="hero-float-badge badge-bottom">
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <strong style={{ fontSize: '13px', display: 'block' }}>Verified Certificates</strong>
              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Recognized by hiring teams</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
