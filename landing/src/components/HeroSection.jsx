import { getAppUrl, getRegisterUrl } from '../config'
import { useState, useEffect } from 'react'
import founder1 from "../public/photos/ts2.png"
import founder2 from "../public/photos/ts2.png"
import founder3 from "../public/photos/ts2.png"

export default function HeroSection() {
  const founders = [founder1, founder2, founder3]
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % founders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [founders.length])

  return (
    <>
      <style>{`
        .hero-slider {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-slider .hero-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
          pointer-events: none;
          border: 2px solid var(--border, #e5e7eb);
          border-radius: 16px;
          box-sizing: border-box;
        }

        .hero-slider .hero-slide.active {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

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

            <div className="hero-slider">
              {founders.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Student learning on UniSkill ${index + 1}`}
                  className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
                />
              ))}
            </div>

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
    </>
  )
}