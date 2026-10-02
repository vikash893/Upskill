import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function FaqSection() {
  const [activeFaq, setActiveFaq] = useState(0)

  const faqs = [
    {
      q: 'How does UniSkill differ from traditional pre-recorded video sites?',
      a: 'Unlike passive pre-recorded video platforms, UniSkill combines scheduled live video studio lectures (with zero-login browser joining), evaluated assignments with line-by-line teacher feedback, downloadable PDF problem sets, and verified completion credentials.',
    },
    {
      q: 'How do Monthly vs. Yearly course fee plans work?',
      a: 'Courses offer flexible Monthly (30-day billing cycle) and Yearly (365-day access with discounted rate) options. When you enroll, your plan expiry date is recorded and shown clearly across your workspace and invoices.',
    },
    {
      q: 'How does the Jobs & Internships section work?',
      a: 'UniSkill features a dedicated career portal for students with curated job openings and internships sourced directly from LinkedIn, Instagram, and top tech hiring boards, categorized by degree (BCA, BBA, B.Tech, MCA, MBA).',
    },
    {
      q: 'How do Live Classes and Recorded Lectures work?',
      a: 'Inside each course classroom, you find dedicated tabs for Live Classes (scheduled video sessions hosted by assigned mentors), Recorded Lectures (HD archives with lesson notes), and Assignments (with scorecards and feedback).',
    },
    {
      q: 'Can I earn certificates upon completion?',
      a: 'Yes! Students who finish course modules, submit evaluated problem sets, and participate in live cohorts receive verifiable completion certificates with unique ID codes.',
    },
  ]

  const toggle = (idx) => {
    setActiveFaq((prev) => (prev === idx ? null : idx))
  }

  return (
    <section className="content-section" style={{ background: 'var(--surface)', padding: '70px 40px', borderRadius: '20px', border: '1px solid var(--line)' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p className="eyebrow">QUESTIONS & ANSWERS</p>
        <h2 className="section-title">
          Everything you need<br /><em>to know before starting.</em>
        </h2>
        <p className="section-subtitle" style={{ margin: '0 auto' }}>
          Have more questions? Check our comprehensive answers below or get in touch with our team.
        </p>
      </div>

      <div className="faq-list">
        {faqs.map((faq, idx) => {
          const isOpen = activeFaq === idx
          return (
            <div key={idx} className="faq-item" onClick={() => toggle(idx)}>
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
              </div>
              {isOpen && <p className="faq-answer">{faq.a}</p>}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '36px' }}>
        <Link to="/contact" className="outline-button">
          Have more questions? Contact Us ↗
        </Link>
      </div>
    </section>
  )
}
