import { useState } from 'react'
import { request } from '../api/request'
import CtaBanner from '../components/CtaBanner'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Course Admissions',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await request('/contact/submit', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const supportFaqs = [
    {
      q: 'How quickly will I receive access after enrollment?',
      a: 'Access is granted immediately upon enrollment. You will receive immediate entry to live class schedules, recorded lecture archives, and downloadable notes.',
    },
    {
      q: 'Can I choose between Monthly and Yearly subscription plans?',
      a: 'Yes, UniSkill gives you the choice between 30-day Monthly access and 365-day Yearly access with discounted rates.',
    },
    {
      q: 'How do live studio sessions work?',
      a: 'Live classes run browser-natively via our studio integration. No complicated downloads or logins needed.',
    },
    {
      q: 'How do students get evaluated on assignments?',
      a: 'You can submit project files and repository links. Your instructor evaluates your code and gives personalized scoring and actionable feedback.',
    },
  ]

  return (
    <div className="landing-container">
      {/* Header */}
      <section style={{ padding: '60px 0 20px' }}>
        <p className="eyebrow">CONTACT & STUDENT HELPDESK</p>
        <h1 className="section-title">
          We're here to help your<br /><em>journey forward.</em>
        </h1>
        <p className="section-subtitle">
          Questions about enrollments, monthly plans, live video studios, mentorship, or placement portal? Reach out to our team.
        </p>
      </section>

      {/* Quick Contact Strip */}
      <section className="stats-strip" style={{ margin: '0 0 50px' }}>
        <div className="stat-box">
          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>OFFICIAL EMAIL</span>
          <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>hello@uniskill.in</strong>
        </div>
        <div className="stat-box">
          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>STUDENT HELPDESK</span>
          <strong style={{ fontSize: '18px', color: 'var(--orange)' }}>+91 7817888216</strong>
        </div>
        <div className="stat-box">
          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>WHATSAPP ADVISORY</span>
          <strong style={{ fontSize: '18px', color: '#166534' }}>+91 7817888216</strong>
        </div>
      </section>

      {/* Contact Form & Support Box */}
      <section className="content-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'start' }}>
          
          {/* Form */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '36px', borderRadius: '14px', boxShadow: 'var(--shadow-sm)' }}>
            <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '8px' }}>SEND A MESSAGE</p>
            <h2 style={{ fontSize: '24px', letterSpacing: '-1px', margin: '0 0 10px' }}>
              Direct Inquiry Desk
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '24px' }}>
              Fill out the form below and an academic counselor will respond within 24 business hours.
            </p>

            {submitted ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📬</div>
                <h3 style={{ fontSize: '20px', color: '#166534', margin: '0 0 8px' }}>Inquiry Transmitted!</h3>
                <p style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Thank you, <strong>{formData.name}</strong>. Our counselors will contact you at <strong>{formData.email}</strong> shortly.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setSubmitted(false)
                    setFormData({ name: '', email: '', phone: '', category: 'Course Admissions', subject: '', message: '' })
                  }}
                  style={{ fontSize: '12px', padding: '10px 20px' }}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '4px', fontSize: '12.5px' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    FULL NAME *
                    <input
                      required
                      placeholder="e.g. Aditi Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontSize: '13px' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    EMAIL ADDRESS *
                    <input
                      required
                      type="email"
                      placeholder="name@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontSize: '13px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    PHONE NUMBER
                    <input
                      placeholder="+91 98765 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontSize: '13px' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    INQUIRY CATEGORY *
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontSize: '13px' }}
                    >
                      <option value="Course Admissions">Course Admissions & Plans</option>
                      <option value="Billing & Payments">Billing & Receipt Verification</option>
                      <option value="Faculty & Mentorship">Faculty & Mentorship</option>
                      <option value="Technical Support">Technical & Classroom Help</option>
                      <option value="General Query">General Query</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  SUBJECT *
                  <input
                    required
                    placeholder="Brief summary of your query"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontSize: '13px' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  MESSAGE DETAILS *
                  <textarea
                    required
                    rows="4"
                    placeholder="How can our counseling team assist you today?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ padding: '11px 13px', border: '1px solid var(--line)', borderRadius: '6px', background: '#FFFFFF', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical' }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-button"
                  style={{ justifySelf: 'start', marginTop: '6px' }}
                >
                  {submitting ? 'Transmitting...' : 'Submit Inquiry ↗'}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Support FAQs */}
          <div>
            <p className="eyebrow">SUPPORT & ADMISSIONS</p>
            <h2 style={{ fontSize: '24px', letterSpacing: '-1px', margin: '0 0 20px' }}>
              Helpdesk Clarifications
            </h2>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '30px' }}>
              {supportFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '18px 20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                  }}
                >
                  <h4 style={{ margin: '0 0 6px', fontSize: '14.5px', color: 'var(--ink)' }}>
                    {faq.q}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ background: '#181B17', color: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #2E332C' }}>
              <span style={{ fontSize: '10px', background: 'var(--lime)', color: '#000000', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginBottom: '10px' }}>
                DIRECT ADMISSIONS COUNSELING
              </span>
              <h3 style={{ fontSize: '18px', color: '#FFFFFF', margin: '0 0 8px' }}>
                Need personalized roadmap guidance?
              </h3>
              <p style={{ color: '#9FA198', fontSize: '12.5px', lineHeight: 1.6, margin: '0 0 16px' }}>
                Connect with our academic team for 1-on-1 advice on course tracks, syllabus coverage, and placement roadmaps.
              </p>
              <a href="mailto:hello@uniskill.in" className="primary-button" style={{ fontSize: '12px', padding: '9px 18px' }}>
                Email Counseling Desk ↗
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <CtaBanner />
    </div>
  )
}
