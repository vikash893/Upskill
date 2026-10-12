import { useState, useEffect } from 'react'
import student1 from '../public/gal/s1.png'

export default function StudentSuccess() {
  const students = [
    {
      name: 'Kanika',
      course: 'Marketing and Enterprenurship',
      photo: student1,
      quote: 'Went from zero level to Master in Marketing and Enterprenurship in 1 months.',
    },
  ]

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % students.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [students.length])

  return (
    <>
      <style>{`
        .student-success-section {
          padding: 80px 24px;
          background: var(--bg, #ffffff);
        }

        .student-success-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .student-success-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .student-success-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          background: var(--surface, #f3f4f6);
          border: 1px solid var(--border, #e5e7eb);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted, #6b7280);
          margin-bottom: 16px;
        }

        .student-success-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          color: var(--text, #111827);
          margin: 0 0 12px;
        }

        .student-success-subtitle {
          font-size: 16px;
          line-height: 1.6;
          color: var(--muted, #6b7280);
          max-width: 620px;
          margin: 0 auto;
        }

        /* ── Featured Spotlight ── */
        .student-spotlight {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 40px;
          align-items: center;
          padding: 32px;
          border-radius: 24px;
          background: var(--surface, #f9fafb);
          border: 1px solid var(--border, #e5e7eb);
          margin-bottom: 40px;
        }

        .student-spotlight-photo-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 20px;
          overflow: hidden;
          border: 2px solid var(--border, #e5e7eb);
          background: var(--bg, #ffffff);
          padding: 10px;
          box-sizing: border-box;
        }

        .student-spotlight-photo {
          position: absolute;
          inset: 10px;
          width: calc(100% - 20px);
          height: calc(100% - 20px);
          object-fit: contain;
          object-position: center;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
          border-radius: 12px;
        }

        .student-spotlight-photo.active {
          opacity: 1;
        }

        .student-spotlight-badge {
          position: absolute;
          bottom: 16px;
          left: 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.85);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          z-index: 2;
          backdrop-filter: blur(6px);
        }

        .student-spotlight-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .student-spotlight-quote {
          font-size: 20px;
          line-height: 1.5;
          font-weight: 500;
          color: var(--text, #111827);
          margin: 0;
        }

        .student-spotlight-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text, #111827);
          margin: 0;
        }

        .student-spotlight-meta {
          font-size: 14px;
          color: var(--muted, #6b7280);
          margin: 0;
        }

        .student-spotlight-dots {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .student-spotlight-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border, #e5e7eb);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .student-spotlight-dot.active {
          width: 24px;
          border-radius: 999px;
          background: var(--text, #111827);
        }

        /* ── Grid of All Students ── */
        .student-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .student-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 16px;
          border-radius: 18px;
          background: var(--surface, #f9fafb);
          border: 1px solid var(--border, #e5e7eb);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .student-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }

        .student-card-photo-wrap {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--border, #e5e7eb);
          margin-bottom: 14px;
          background: var(--bg, #ffffff);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          box-sizing: border-box;
        }

        .student-card-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          border-radius: 50%;
        }

        .student-card-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text, #111827);
          margin: 0 0 4px;
        }

        .student-card-course {
          font-size: 12px;
          color: var(--muted, #6b7280);
          margin: 0 0 10px;
        }

        @media (max-width: 768px) {
          .student-spotlight {
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 20px;
          }

          .student-spotlight-photo-wrap {
            max-width: 260px;
            margin: 0 auto;
          }

          .student-spotlight-quote {
            font-size: 17px;
          }
        }
      `}</style>

      <section className="student-success-section" aria-label="Student Success Stories">
        <div className="student-success-inner">
          <div className="student-success-header">
            <span className="student-success-kicker">
              <span>🎓</span>
              <span>Student Success Stories</span>
            </span>
            <h2 className="student-success-title">
              Real students. Real careers.
            </h2>
            <p className="student-success-subtitle">
              Thousands of learners have completed UniSkill courses and landed roles at top companies. Here are a few of their stories.
            </p>
          </div>

          {/* Featured Spotlight (auto-sliding) */}
          <div className="student-spotlight">
            <div className="student-spotlight-photo-wrap">
              {students.map((student, index) => (
                <img
                  key={student.name}
                  src={student.photo}
                  alt={`${student.name} — ${student.course} graduate`}
                  className={`student-spotlight-photo ${index === activeIndex ? 'active' : ''}`}
                  loading="lazy"
                />
              ))}
            </div>

            <div className="student-spotlight-info">
              <p className="student-spotlight-quote">
                "{students[activeIndex].quote}"
              </p>
              <div>
                <p className="student-spotlight-name">{students[activeIndex].name}</p>
                <p className="student-spotlight-meta">{students[activeIndex].course}</p>
              </div>

              <div className="student-spotlight-dots">
                {students.map((student, index) => (
                  <button
                    key={student.name}
                    type="button"
                    className={`student-spotlight-dot ${index === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${student.name}'s story`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Grid of All Students */}
          <div className="student-grid">
            {students.map((student) => (
              <div className="student-card" key={student.name}>
                <div className="student-card-photo-wrap">
                  <img
                    className="student-card-photo"
                    src={student.photo}
                    alt={`${student.name} — ${student.course} graduate`}
                    loading="lazy"
                  />
                </div>
                <p className="student-card-name">{student.name}</p>
                <p className="student-card-course">{student.course}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}