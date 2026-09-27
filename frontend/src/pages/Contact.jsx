import { useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/request'

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
      q: 'How quickly will I receive course access after payment?',
      a: 'If you pay via Razorpay Online Checkout, access is instant! If you submit a manual UPI receipt, administrators verify it within 1–2 hours.',
    },
    {
      q: 'Can I switch between monthly and yearly billing?',
      a: 'Yes, you can upgrade to a yearly pass anytime from your student workspace to lock in 12-month access and bonuses.',
    },
    {
      q: 'Are live class recordings accessible if I miss a lecture?',
      a: 'Absolutely. All live classes are automatically archived under the Recorded tab inside your course classroom.',
    },
    {
      q: 'How do I submit assignments and get teacher feedback?',
      a: 'Inside each course classroom, navigate to the Assignments tab to upload your solutions. Instructors review and grade your submissions directly.',
    },
  ]

  return (
    <main>
      {/* HEADER SECTION */}
      <section className="hero-section" style={{ minHeight: '420px', padding: '70px 9vw 40px' }}>
        <div className="hero-copy">
          <p className="eyebrow reveal">CONTACT & SUPPORT</p>
          <h1 className="reveal delay-one" style={{ fontSize: 'clamp(40px, 5.5vw, 76px)' }}>
            We're here to help<br /><em>your journey forward.</em>
          </h1>
          <p className="hero-text reveal delay-two" style={{ maxWidth: '460px' }}>
            Have a question regarding course enrollments, billing plans, instructor mentorship, or technical support? Send us a message and our team will get back to you promptly.
          </p>
        </div>
        <div className="hero-art" style={{ minHeight: '340px' }}>
          <div className="art-note note-one">01 / talk to us</div>
          <div className="art-note note-two">24h response</div>
          <div className="art-circle" style={{ inset: '20% 15%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <img src="/logo.png" alt="UniSkills" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
              Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
            </span>
          </div>
          <div className="art-line"></div>
        </div>
      </section>

      {/* QUICK CONTACT CHANNELS */}
      <section className="signal-strip" style={{ background: '#fffdf8' }}>
        <div><strong>OFFICIAL EMAIL</strong><span>support@uniskill.in</span></div>
        <div><strong>STUDENT HELPDESK</strong><span>+91 98765 43210</span></div>
        <div><strong>WHATSAPP ADVISORY</strong><span>+91 98765 43211</span></div>
      </section>

      {/* MAIN INTERACTIVE FORM & SUPPORT FAQS */}
      <section className="content-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '50px', alignItems: 'start' }}>
          
          {/* Left: Interactive Form */}
          <div style={{ background: '#fffdf8', border: '1px solid var(--line)', padding: '36px' }}>
            <p className="eyebrow" style={{ marginBottom: '8px' }}>SEND A MESSAGE</p>
            <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px', marginBottom: '8px' }}>
              Direct Inquiry Desk
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              Fill out the form below. Our academic counseling and support team responds within 24 business hours.
            </p>

            {submitted ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>📬</div>
                <h3 style={{ fontSize: '22px', color: '#166534', margin: '0 0 8px' }}>Inquiry Received!</h3>
                <p style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.6, marginBottom: '20px' }}>
                  Thank you, <strong>{formData.name}</strong>. An academic counselor will contact you at <strong>{formData.email}</strong> shortly.
                </p>
                <button
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
                {error && <p className="form-message" style={{ margin: 0, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                    Full Name *
                    <input
                      required
                      placeholder="e.g. Aditi Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                    Email Address *
                    <input
                      required
                      type="email"
                      placeholder="name@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                    Phone Number
                    <input
                      placeholder="+91 98765 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                    Inquiry Topic *
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit', fontSize: '12px' }}
                    >
                      <option value="Course Admissions">Course Admissions & Plans</option>
                      <option value="Billing & Payments">Billing & Receipt Verification</option>
                      <option value="Faculty & Mentorship">Faculty & Mentorship</option>
                      <option value="Partnership & Enterprise">Partnership & Enterprise</option>
                      <option value="Technical Support">Technical & Classroom Help</option>
                      <option value="General Query">General Query</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                  Subject *
                  <input
                    required
                    placeholder="Brief description of your query"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                  Message Details *
                  <textarea
                    required
                    rows="4"
                    placeholder="Tell us what you'd like help with..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ padding: '12px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit', fontSize: '12px', resize: 'vertical' }}
                  />
                </label>

                <button className="primary-button" disabled={submitting} type="submit" style={{ justifySelf: 'start', marginTop: '6px' }}>
                  {submitting ? 'Transmitting...' : 'Submit Inquiry ↗'}
                </button>
              </form>
            )}
          </div>

          {/* Right: Support Info & FAQs */}
          <div>
            <p className="eyebrow" style={{ marginBottom: '8px' }}>SUPPORT & ADMISSIONS</p>
            <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px', marginBottom: '20px' }}>
              Frequently Asked Questions
            </h2>

            <div style={{ display: 'grid', gap: '16px', marginBottom: '30px' }}>
              {supportFaqs.map((faq, idx) => (
                <div key={idx} style={{ padding: '20px', background: '#fffdf8', border: '1px solid var(--line)' }}>
                  <h3 style={{ fontSize: '15px', margin: '0 0 8px', color: 'var(--ink)' }}>
                    {faq.q}
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12.5px', lineHeight: 1.6, margin: 0 }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ padding: '24px', background: 'var(--ink)', color: 'white', border: '1px solid #333' }}>
              <span className="badge" style={{ position: 'static', background: 'var(--lime)', color: 'black', marginBottom: '10px', display: 'inline-block' }}>
                DIRECT ADMISSIONS COUNSELING
              </span>
              <h3 style={{ fontSize: '18px', color: 'white', margin: '6px 0 8px' }}>
                Need personalized roadmap advice?
              </h3>
              <p style={{ color: '#aaa', fontSize: '12px', lineHeight: 1.6, margin: '0 0 16px' }}>
                Book a 1-on-1 career consultation session with one of our senior engineering mentors.
              </p>
              <Link to="/courses" className="primary-button" style={{ fontSize: '11px', padding: '8px 16px', display: 'inline-block', textDecoration: 'none' }}>
                Browse Course Catalog ↗
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  )
}
