import { getAppUrl, getRegisterUrl } from '../config'

export default function CtaBanner() {
  return (
    <section className="cta-banner" aria-label="Call to action">
      <p className="eyebrow" style={{ color: 'var(--lime)', marginBottom: '8px' }}>START YOUR JOURNEY TODAY</p>
      <h2>Ready to build skills that actually matter?</h2>
      <p>
        Join thousands of ambitious students mastering production engineering, AI, and design with live mentors and verifiable credentials.
      </p>
      <div className="cta-banner-actions">
        <a href={getAppUrl()} className="hero-primary-btn">
          <span>Explore UniSkill</span>
          <span>↗</span>
        </a>
        <a href={getRegisterUrl()} className="hero-secondary-btn">
          <span>Get Started Free</span>
        </a>
      </div>
    </section>
  )
}
