import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { request } from '../api/request'
import PublicHero from '../components/PublicHero'
import MediaImage from '../components/MediaImage'

export default function About({ onAuthOpen }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [activeFaq, setActiveFaq] = useState(null)
  const [platformStats, setPlatformStats] = useState(null)
  const [dbTeachers, setDbTeachers] = useState([])

  useEffect(() => {
    request('/public/platform-stats')
      .then((data) => {
        if (data.stats) setPlatformStats(data.stats)
      })
      .catch(() => {})

    request('/get-all-teachers')
      .then((data) => {
        if (data.teachers && data.teachers.length > 0) {
          setDbTeachers(data.teachers)
        }
      })
      .catch(() => {})
  }, [])

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  const milestones = [
    { year: '2024', title: 'The Genesis', desc: 'UniSkill was founded to bridge the gap between academic theory and practical industry production skills.' },
    { year: '2025', title: 'Live Studio Launch', desc: 'Introduced browser-based interactive live classrooms with real-time video, attendance tracking, and grading.' },
    { year: '2026', title: 'Scalable Growth', desc: 'Expanded masterclasses with monthly and yearly plans tailored for students across the globe.' },
  ]

  const mentors = [
    { name: 'Tushar Sharma', role: 'Co-Founder & Head of Academics', area: 'System Architecture & Distributed Engineering', bio: 'Passionate about demystifying high-scale software engineering and building outcome-focused learning tracks.' },
  ]

  const faqs = [
    {
      q: 'How does UniSkill differ from traditional online video platforms?',
      a: 'Unlike passive pre-recorded video sites, UniSkill combines live interactive video studio sessions (Jitsi Meet integration), structured problem assignments with personalized teacher evaluations, downloadable lesson assets, and flexible monthly or yearly subscription access.'
    },
    {
      q: 'Can I choose between Monthly and Yearly course access plans?',
      a: 'Yes! UniSkill provides full flexibility. When you enroll in any paid course, you can select either a Monthly Plan (30-day access) or a Yearly Plan (365-day access with discounted pricing). Your plan expiry date is clearly tracked in your dashboard.'
    },
    {
      q: 'Are certificates provided upon course completion?',
      a: 'Yes, every student who completes course lectures, submits required assignments, and maintains live session attendance receives a verified UniSkill certificate of completion.'
    },
    {
      q: 'Can teachers see all students on the platform?',
      a: 'No. To ensure academic focus and student privacy, instructors on UniSkill only have access to students enrolled in the specific courses they are officially assigned to teach.'
    },
  ]

  return (
    <main className="public-page">
      <PublicHero
        kicker="About UniSkill"
        title={<>Knowledge built for the real world.</>}
        description="Education should be practical, respectful of your time, and led by mentors who have actually built what they teach."
        image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
        imageAlt="Learners collaborating"
        actions={
          <>
            <Link to="/courses" className="hero-primary-cta">Explore courses</Link>
            <Link to="/contact" className="outline-button">Get in touch</Link>
          </>
        }
      />

      {/* STATS STRIP */}
      <section className="signal-strip" style={{ background: '#FFFFFF' }}>
        <div>
          <strong>{platformStats ? `${platformStats.total_students || 0}` : '10,000+'}</strong>
          <span>Active Students</span>
        </div>
        <div>
          <strong>{platformStats ? `${platformStats.total_courses || 0}` : '50+'}</strong>
          <span>Masterclass Courses</span>
        </div>
        <div>
          <strong>{platformStats ? `${platformStats.total_teachers || dbTeachers.length || 4}` : '30+'}</strong>
          <span>Faculty Mentors</span>
        </div>
      </section>

      {/* PILLARS & VALUES */}
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUR CORE PRINCIPLES</p>
            <h2>What we believe in<br /><em>and build by.</em></h2>
          </div>
          <p className="section-note">No fluff. No artificial complexity. Just honest, rigorous skill building.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ padding: '32px', background: '#FFFFFF', border: '1px solid var(--line)' }}>
            <span style={{ font: '14px var(--mono)', color: 'var(--orange)', display: 'block', marginBottom: '12px' }}>01 / CLARITY</span>
            <h3 style={{ fontSize: '22px', margin: '0 0 10px' }}>Clear First Principles</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
              We distill complex software systems, design fundamentals, and engineering frameworks down to foundational truths that stay relevant for decades.
            </p>
          </div>

          <div style={{ padding: '32px', background: '#FFFFFF', border: '1px solid var(--line)' }}>
            <span style={{ font: '14px var(--mono)', color: 'var(--orange)', display: 'block', marginBottom: '12px' }}>02 / MASTERY</span>
            <h3 style={{ fontSize: '22px', margin: '0 0 10px' }}>Learn by Shipping</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
              Every curriculum module centers on building tangible software, evaluating real-world trade-offs, and submitting graded problem assignments.
            </p>
          </div>

          <div style={{ padding: '32px', background: '#FFFFFF', border: '1px solid var(--line)' }}>
            <span style={{ font: '14px var(--mono)', color: 'var(--orange)', display: 'block', marginBottom: '12px' }}>03 / COMMUNITY</span>
            <h3 style={{ fontSize: '22px', margin: '0 0 10px' }}>Direct Faculty Guidance</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
              Live video studio classrooms let learners interact directly with instructors, ask questions, review live code, and receive individualized feedback.
            </p>
          </div>
        </div>
      </section>

      {/* OUR STORY & MILESTONES */}
      <section className="about-section" style={{ padding: '100px 9vw' }}>
        <div>
          <p className="eyebrow">OUR JOURNEY</p>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', marginBottom: '20px' }}>
            Built for learners who want<br /><em>depth over distraction.</em>
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#c5c3b8' }}>
            We saw too many aspiring developers and designers getting stuck in tutorial loops—watching dozens of videos without ever building the muscle to engineer systems independently.
          </p>
          <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#c5c3b8', marginTop: '15px' }}>
            UniSkill was architected from day one as an active workspace: live classrooms, code reviews, deadline-driven tasks, and clear plan milestones.
          </p>
        </div>

        {/* Timeline Cards */}
        <div style={{ display: 'grid', gap: '16px' }}>
          {milestones.map((m, idx) => (
            <div key={idx} style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px' }}>
              <span style={{ font: '12px var(--mono)', color: 'var(--lime)', fontWeight: 700 }}>{m.year}</span>
              <strong style={{ display: 'block', fontSize: '16px', color: '#F0F6FF', margin: '4px 0' }}>{m.title}</strong>
              <p style={{ fontSize: '12px', color: '#aaa89d', margin: 0, lineHeight: 1.6 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FACULTY & MENTORS SPOTLIGHT */}
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INSTRUCTORS & LEADERSHIP</p>
            <h2>Meet the mentors<br /><em>guiding your path.</em></h2>
          </div>
          <p className="section-note">Active practitioners with years of field experience in engineering and product design.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          {(dbTeachers.length > 0 ? dbTeachers : mentors).map((mentor, idx) => (
            <div key={idx} style={{ background: '#FFFFFF', border: '1px solid var(--line)', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <MediaImage
                src={mentor.photo}
                alt={mentor.name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 18 }}
                fallback={
                  <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '22px', marginBottom: '18px', background: 'var(--ink)' }}>
                    {mentor.name?.charAt(0) || 'M'}
                  </div>
                }
              />
              <h3 style={{ fontSize: '20px', margin: '0 0 4px', letterSpacing: '-0.5px' }}>{mentor.name}</h3>
              <span style={{ font: '11px var(--mono)', color: 'var(--orange)', display: 'block', marginBottom: '10px' }}>
                {mentor.role || 'Course Mentor & Faculty'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '14px' }}>
                {mentor.course_assigned ? `Assigned Course: ${mentor.course_assigned}` : `Focus: ${mentor.area || 'Full-Stack Architecture'}`}
              </span>
              <p style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: 1.7, margin: '0 0 15px', marginTop: 'auto' }}>
                {mentor.bio || `Senior instructor at UniSkill mentoring cohorts in practical engineering, code reviews, and live problem sessions.`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="content-section" style={{ background: '#F0F6FF' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUESTIONS ANSWERED</p>
            <h2>Frequently asked<br /><em>questions.</em></h2>
          </div>
        </div>

        <div style={{ maxWidth: '800px', display: 'grid', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx
            return (
              <div key={idx} style={{ background: '#FFFFFF', border: '1px solid var(--line)', padding: '22px', cursor: 'pointer' }} onClick={() => toggleFaq(idx)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '15px' }}>{faq.q}</strong>
                  <span style={{ font: '16px var(--mono)', color: 'var(--orange)', marginLeft: '15px' }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, margin: '14px 0 0', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="contact-section" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="eyebrow">TAKE THE NEXT STEP</p>
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
          Ready to begin learning<br /><em>with purpose?</em>
        </h2>
        <div style={{ marginTop: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link to="/courses" className="primary-button" style={{ background: 'var(--ink)', color: 'white' }}>
            Explore All Courses ↗
          </Link>
          {!session && (
            <button className="primary-button" onClick={() => onAuthOpen && onAuthOpen('register')} style={{ background: 'white', color: 'var(--ink)' }}>
              Create Free Account ↗
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
