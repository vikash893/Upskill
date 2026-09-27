import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { request } from '../api/request'
import CourseCard from '../components/CourseCard'

export default function Home({ onAuthOpen }) {
  const [courses, setCourses] = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [courseError, setCourseError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeFaq, setActiveFaq] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    request('/explore-courses')
      .then((data) => setCourses(data.courses || []))
      .catch((err) => setCourseError(err.message))

    request('/public/platform-stats')
      .then((data) => {
        if (data.stats) setPlatformStats(data.stats)
      })
      .catch(() => {})
  }, [])

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx)
  }

  const testimonials = [
    {
      name: 'Rajat Singhania',
      role: 'Frontend Engineer at Razorpay',
      quote: 'The live class environment and immediate instructor feedback on my assignments made all the difference. UniSkill feels like a real studio rather than a sterile video library.',
      course: 'Full-Stack Web Engineering',
      rating: 5,
    },
    {
      name: 'Pooja Kulkarni',
      role: 'ML Practitioner at DataLabs',
      quote: 'Choosing the yearly plan gave me access to every live cohort and recording archive. The problem sheets prepared me directly for industry technical rounds.',
      course: 'AI & Applied Machine Learning',
      rating: 5,
    },
    {
      name: 'Devansh Verma',
      role: 'Cloud Architect at Infosys',
      quote: 'The flexible monthly billing and clear plan expiry tracking allowed me to master Kubernetes and Terraform without long lock-ins. Superb platform.',
      course: 'Cloud Computing & DevOps',
      rating: 5,
    },
  ]

  const faqs = [
    {
      q: 'How do Monthly vs. Yearly course fee plans work?',
      a: 'Admin-configured courses offer both Monthly (30-day billing cycle) and Yearly (365-day access with discounted rate) options. When you purchase, your plan expiry date is recorded and shown across your classroom and receipts.'
    },
    {
      q: 'What happens if I cancel during checkout?',
      a: 'If you close the payment modal or cancel before submitting proof, your cancellation is safely logged and marked as "Cancelled" in your payment history with zero charges.'
    },
    {
      q: 'How do Live Classes and Recorded Lectures work?',
      a: 'Inside each course classroom, you will find dedicated sections for Live Classes (real-time Jitsi video sessions scheduled by your teacher), Recorded Lectures (with downloadable PDF notes and video archives), and Assignments (where you can submit work and receive grades).'
    },
    {
      q: 'Can I upload my own profile photo as a student?',
      a: 'Yes! Head to your Profile page to upload your avatar. Your photo is visible to you, your assigned course teachers, and platform administrators.'
    },
  ]

  const categories = ['all', 'Web Engineering', 'Artificial Intelligence', 'Cloud & Systems', 'Product Design']

  const filteredCourses = selectedCategory === 'all'
    ? courses
    : courses.filter((c) => c.course_title.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]))

  return (
    <main>
      {/* ========================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================= */}
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow reveal">A PLACE TO BEGIN AGAIN · COHORT 2026</p>
          <h1 className="reveal delay-one">
            Learn something<br /><em>worth keeping.</em>
          </h1>
          <p className="hero-text reveal delay-two">
            Practical masterclasses, interactive live video classrooms, and generous mentorship to engineer your next career milestone.
          </p>
          <div className="hero-actions reveal delay-two">
            <button className="primary-button" onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Catalogue <span>↗</span>
            </button>
            <button className="quiet-button" onClick={() => onAuthOpen('register')}>
              Create Student Account
            </button>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-note note-one">01 / curiosity</div>
          <div className="art-note note-two">learn in public</div>
          <div className="art-circle" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <img src="/logo.png" alt="UniSkills" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>
              Uni<span style={{ color: 'var(--orange)' }}>Skills</span>
            </span>
          </div>
          <div className="art-line"></div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. SIGNAL / STATS STRIP */}
      {/* ========================================================= */}
      <section className="signal-strip">
        <div>
          <strong>{platformStats ? `${platformStats.total_students || 0}` : '10,000+'}</strong>
          <span>Enrolled Students</span>
        </div>
        <div>
          <strong>{platformStats ? `${platformStats.total_courses || courses.length}` : '50+'}</strong>
          <span>Verified Masterclasses</span>
        </div>
        <div>
          <strong>{platformStats ? `${platformStats.total_teachers || 0}` : '30+'}</strong>
          <span>Faculty Mentors</span>
        </div>
        <div>
          <strong>{platformStats ? `${platformStats.total_live_classes || 0}` : '100+'}</strong>
          <span>Live Studio Sessions</span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. VALUE PROPOSITIONS */}
      {/* ========================================================= */}
      <section className="content-section" style={{ paddingBottom: '60px' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE UNISKILL ADVANTAGE</p>
            <h2>Engineered for outcomes,<br /><em>not passive viewing.</em></h2>
          </div>
          <p className="section-note">
            Built from scratch to deliver an authentic classroom dynamic with modern cloud tooling.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px' }}>
          <div style={{ padding: '30px', background: '#fffdf8', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '14px' }}>🔴</span>
            <h3 style={{ fontSize: '20px', margin: '0 0 8px' }}>Interactive Live Classes</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Join scheduled live video studio sessions directly in your browser. Ask questions, present work, and log automated attendance.
            </p>
          </div>

          <div style={{ padding: '30px', background: '#fffdf8', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '14px' }}>🎥</span>
            <h3 style={{ fontSize: '20px', margin: '0 0 8px' }}>Recorded Classes & Notes</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Access full HD lecture archives at your own pace with downloadable lesson problem sheets and PDF study notes.
            </p>
          </div>

          <div style={{ padding: '30px', background: '#fffdf8', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '14px' }}>📝</span>
            <h3 style={{ fontSize: '20px', margin: '0 0 8px' }}>Graded Assignments</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Submit real code repositories and project files. Receive personalized scores and written feedback from your instructor.
            </p>
          </div>

          <div style={{ padding: '30px', background: '#fffdf8', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '14px' }}>💳</span>
            <h3 style={{ fontSize: '20px', margin: '0 0 8px' }}>Flexible Monthly / Yearly Plans</h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
              Choose the billing plan that fits your schedule with transparent plan expiry dates and instant receipt invoices.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. COURSE CATALOGUE */}
      {/* ========================================================= */}
      <section className="content-section" id="courses" style={{ background: '#eeeade' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED CATALOGUE</p>
            <h2>Find your next<br /><em>useful obsession.</em></h2>
          </div>
          <Link to="/courses" className="text-button" style={{ fontSize: '13px' }}>
            View Full Catalogue (All Courses) <span>↗</span>
          </Link>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '8px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--ink)' : 'var(--line)',
                background: selectedCategory === cat ? 'var(--ink)' : '#fffdf8',
                color: selectedCategory === cat ? 'var(--paper)' : 'var(--ink)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'all' ? 'All Disciplines' : cat}
            </button>
          ))}
        </div>

        {courseError ? (
          <div className="empty-state">{courseError}. Start the backend server to load the live catalogue.</div>
        ) : filteredCourses.length ? (
          <div className="course-grid">
            {filteredCourses.slice(0, 6).map((course) => (
              <CourseCard key={course.course_id} course={course} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No courses found matching this category.</div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 5. HOW IT WORKS (4-STEP FLOW) */}
      {/* ========================================================= */}
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE METHODOLOGY</p>
            <h2>Four steps to<br /><em>skill mastery.</em></h2>
          </div>
          <p className="section-note">Clear progression from day one to career placement.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {[
            { step: '01', title: 'Pick Your Track', desc: 'Choose between Monthly and Yearly plans for any specialized course track.' },
            { step: '02', title: 'Enter Classroom', desc: 'Watch HD recorded modules, download problem sets, and join live studio lectures.' },
            { step: '03', title: 'Submit & Build', desc: 'Upload assignment files and receive direct evaluations from your instructor.' },
            { step: '04', title: 'Graduate & Advance', desc: 'Earn verified credentials and portfolio proof to showcase to employers.' },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '26px', border: '1px solid var(--line)', background: '#fffdf8', position: 'relative' }}>
              <span style={{ font: '32px var(--mono)', color: 'var(--orange)', display: 'block', marginBottom: '12px', fontWeight: 800 }}>
                {item.step}
              </span>
              <strong style={{ display: 'block', fontSize: '18px', marginBottom: '8px' }}>{item.title}</strong>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. STUDENT TESTIMONIALS */}
      {/* ========================================================= */}
      <section className="about-section" style={{ padding: '90px 9vw' }}>
        <div>
          <p className="eyebrow">STUDENT OUTCOMES</p>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 60px)', marginBottom: '20px' }}>
            Proven by learners<br /><em>in top engineering roles.</em>
          </h2>
          <p style={{ color: '#c5c3b8', fontSize: '14px', lineHeight: 1.8 }}>
            Our alumni work at hyper-growth tech companies and global enterprises. They came for practical knowledge—and stayed for the rigor.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div style={{ display: 'grid', gap: '18px' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{ padding: '24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px' }}>
              <div style={{ color: 'var(--lime)', fontSize: '14px', marginBottom: '8px' }}>
                {'★'.repeat(t.rating)}
              </div>
              <p style={{ fontSize: '13px', color: '#f4f1e9', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 14px' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#fff' }}>{t.name}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: '#aaa89d' }}>{t.role}</span>
                </div>
                <span style={{ font: '10px var(--mono)', color: 'var(--orange)' }}>{t.course}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FAQ ACCORDION */}
      {/* ========================================================= */}
      <section className="content-section" style={{ background: '#fffdf8' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUESTIONS & CLARIFICATIONS</p>
            <h2>Everything you need<br /><em>to know.</em></h2>
          </div>
          <Link to="/contact" className="outline-button" style={{ fontSize: '12px' }}>
            Have More Questions? <span>↗</span>
          </Link>
        </div>

        <div style={{ maxWidth: '850px', display: 'grid', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx
            return (
              <div key={idx} style={{ background: '#f8f6f0', border: '1px solid var(--line)', padding: '22px', cursor: 'pointer' }} onClick={() => toggleFaq(idx)}>
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

      {/* ========================================================= */}
      {/* 8. CONTACT STRIP */}
      {/* ========================================================= */}
      <section className="contact-section" id="contact">
        <p className="eyebrow">SAY HELLO</p>
        <h2>Have a question<br /><em>worth asking?</em></h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="contact-link" href="mailto:hello@uniskill.in">
            hello@uniskill.in <span>↗</span>
          </a>
          <Link to="/contact" className="contact-link" style={{ marginLeft: '10px' }}>
            Visit Campus Contact Desk <span>↗</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
