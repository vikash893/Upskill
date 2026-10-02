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
    <main className="home-main public-page">
      {/* ========================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================= */}
      <section className="coursera-hero-wrapper">
        <div className="coursera-hero-content">
          <div className="coursera-hero-text">
            <h1 className="hero-title">UniSkill</h1>
            <h2 className="hero-subtitle">
              Start in minutes today.<br />
              Build skills this week.
            </h2>
            <p className="hero-description">
              "The expert in anything was once a beginner who refused to give up."
              <br />
              <span className="quote-author">— Tushar Sharma</span>
            </p>
            <div className="hero-cta-group">
              <button className="hero-primary-cta" onClick={() => onAuthOpen('register')}>
                Start 7-day free trial
              </button>
            </div>
          </div>
          
          <div className="coursera-hero-image-area">
            <div className="hero-shape-circle"></div>
            <div className="hero-shape-arc"></div>
            <img 
              src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Student learning on UniSkills" 
              className="hero-student-img"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. LEARNING PATH DASHBOARD (animated mockup) */}
      {/* ========================================================= */}
      <section className="dashboard-section">
        <div className="dashboard-grid">
          {/* Left: Text */}
          <div className="dashboard-text">
            <p className="eyebrow">YOUR LEARNING DASHBOARD</p>
            <h2>Track every step.<br /><em>See your progress grow.</em></h2>
            <p className="dashboard-desc">
              A clean, personal command center that shows your active courses, daily progress,
              completed readings, video hours, and quiz scores — all in one glance.
            </p>
            <ul className="dashboard-features">
              <li><span className="check-dot" /> Real-time course completion tracking</li>
              <li><span className="check-dot" /> Daily momentum metrics & streaks</li>
              <li><span className="check-dot" /> Instant quiz scores & reading counts</li>
            </ul>
          </div>

          {/* Right: Animated Dashboard Mockup */}
          <div className="dashboard-visual">
            {/* Back panel */}
            <div className="dash-back-panel"></div>

            {/* Course list card */}
            <div className="dash-course-card">
              <div className="dash-course-header">My learning path</div>
              <ul className="dash-course-list">
                <li>Digital marketing</li>
                <li>Machine learning</li>
                <li className="active">
                  <span className="dash-radio-check" />
                  Cybersecurity
                </li>
                <li>Software engineering</li>
                <li>Data analytics</li>
                <li>Project management</li>
              </ul>
            </div>

            {/* Floating progress banner */}
            <div className="dash-progress-banner">
              <div className="dash-banner-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 17 9 11 13 15 21 7" />
                  <polyline points="14 7 21 7 21 14" />
                </svg>
              </div>
              <div>
                <strong>10% Progress made today!</strong>
                <span>65% of course complete</span>
              </div>
            </div>

            {/* Floating stat tiles */}
            <div className="dash-stats">
              <div className="dash-stat-tile">
                <span className="stat-icon">📖</span>
                <div>
                  <strong>5</strong>
                  <span>readings</span>
                </div>
              </div>
              <div className="dash-stat-tile">
                <span className="stat-icon">▶️</span>
                <div>
                  <strong>4</strong>
                  <span>videos</span>
                </div>
              </div>
              <div className="dash-stat-tile">
                <span className="stat-icon">🕐</span>
                <div>
                  <strong>1 hr</strong>
                  <span>content</span>
                </div>
              </div>
              <div className="dash-stat-tile">
                <span className="stat-icon">📊</span>
                <div>
                  <strong>100%</strong>
                  <span>highest quiz score</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CERTIFICATE PROOF SECTION (animated certs) */}
      {/* ========================================================= */}
      <section className="certs-section">
        <div className="certs-grid">
          {/* Left: Text */}
          <div className="certs-text">
            <p className="eyebrow">CERTIFIED & VERIFIABLE</p>
            <h2>Turn your learning<br /><em>into proof.</em></h2>
            <p className="certs-desc">
              Earn credentials and certificates you can add to your resume and LinkedIn
              that reflect the skills you practiced, the tools you learned, and the work you created.
            </p>
            <div className="certs-actions">
              <button className="cert-primary-btn" onClick={() => onAuthOpen('register')}>
                Start earning certificates <span>↗</span>
              </button>
            </div>
          </div>

          {/* Right: Stacked certificate cards */}
          <div className="certs-visual">
            {/* Certificate 1 */}
            <div className="cert-card cert-card-1">
              <div className="cert-logo-row">
                <span className="cert-brand-badge">UniSkill</span>
              </div>
              <div className="cert-title">Google AI Essentials</div>
              <div className="cert-signature"></div>
              <div className="cert-ribbon">
                <span className="ribbon-inner">C</span>
              </div>
            </div>

            {/* Certificate 2 */}
            <div className="cert-card cert-card-2">
              <div className="cert-logo-row">
                <span className="cert-brand-badge">UniSkill</span>
              </div>
              <div className="cert-title">Back-End Development</div>
              <div className="cert-signature"></div>
              <div className="cert-ribbon">
                <span className="ribbon-inner">C</span>
              </div>
            </div>

            {/* Certificate 3 */}
            <div className="cert-card cert-card-3">
              <div className="cert-logo-row">
                <span className="cert-brand-badge">UniSkill</span>
              </div>
              <div className="cert-title">Python for Everybody</div>
              <div className="cert-signature"></div>
              <div className="cert-ribbon">
                <span className="ribbon-inner">C</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SIGNAL / STATS STRIP */}
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
      {/* 5. VALUE PROPOSITIONS */}
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

        <div className="value-grid">
          <div className="value-card">
            <span className="value-icon">🔴</span>
            <h3>Interactive Live Classes</h3>
            <p>Join scheduled live video studio sessions directly in your browser. Ask questions, present work, and log automated attendance.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🎥</span>
            <h3>Recorded Classes & Notes</h3>
            <p>Access full HD lecture archives at your own pace with downloadable lesson problem sheets and PDF study notes.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">📝</span>
            <h3>Graded Assignments</h3>
            <p>Submit real code repositories and project files. Receive personalized scores and written feedback from your instructor.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">💳</span>
            <h3>Flexible Monthly / Yearly Plans</h3>
            <p>Choose the billing plan that fits your schedule with transparent plan expiry dates and instant receipt invoices.</p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. COURSE CATALOGUE */}
      {/* ========================================================= */}
      <section className="content-section" id="courses" style={{ background: '#F0F6FF' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED CATALOGUE</p>
            <h2>Find your next<br /><em>useful obsession.</em></h2>
          </div>
          <Link to="/courses" className="text-button" style={{ fontSize: '13px' }}>
            View Full Catalogue (All Courses) <span>↗</span>
          </Link>
        </div>

        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
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
      {/* 7. HOW IT WORKS (4-STEP FLOW) */}
      {/* ========================================================= */}
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE METHODOLOGY</p>
            <h2>Four steps to<br /><em>skill mastery.</em></h2>
          </div>
          <p className="section-note">Clear progression from day one to career placement.</p>
        </div>

        <div className="steps-grid">
          {[
            { step: '01', title: 'Pick Your Track', desc: 'Choose between Monthly and Yearly plans for any specialized course track.' },
            { step: '02', title: 'Enter Classroom', desc: 'Watch HD recorded modules, download problem sets, and join live studio lectures.' },
            { step: '03', title: 'Submit & Build', desc: 'Upload assignment files and receive direct evaluations from your instructor.' },
            { step: '04', title: 'Graduate & Advance', desc: 'Earn verified credentials and portfolio proof to showcase to employers.' },
          ].map((item, idx) => (
            <div key={idx} className="step-card">
              <span className="step-number">{item.step}</span>
              <strong className="step-title">{item.title}</strong>
              <p className="step-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. STUDENT TESTIMONIALS */}
      {/* ========================================================= */}
      <section className="about-section">
        <div>
          <p className="eyebrow">STUDENT OUTCOMES</p>
          <h2 className="about-heading">
            Proven by learners<br /><em>in top engineering roles.</em>
          </h2>
          <p className="about-text">
            Our alumni work at hyper-growth tech companies and global enterprises. They came for practical knowledge—and stayed for the rigor.
          </p>
        </div>

        <div className="testimonial-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="testimonial-card">
              <div className="testimonial-rating">{'★'.repeat(t.rating)}</div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-footer">
                <div>
                  <strong className="testimonial-name">{t.name}</strong>
                  <span className="testimonial-role">{t.role}</span>
                </div>
                <span className="testimonial-course">{t.course}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. FAQ ACCORDION */}
      {/* ========================================================= */}
      <section className="content-section" style={{ background: '#FFFFFF' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUESTIONS & CLARIFICATIONS</p>
            <h2>Everything you need<br /><em>to know.</em></h2>
          </div>
          <Link to="/contact" className="outline-button" style={{ fontSize: '12px' }}>
            Have More Questions? <span>↗</span>
          </Link>
        </div>

        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx
            return (
              <div key={idx} className="faq-item" onClick={() => toggleFaq(idx)}>
                <div className="faq-question">
                  <strong>{faq.q}</strong>
                  <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && <p className="faq-answer">{faq.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. CONTACT STRIP */}
      {/* ========================================================= */}
      <section className="contact-section" id="contact">
        <p className="eyebrow">SAY HELLO</p>
        <h2>Have a question<br /><em>worth asking?</em></h2>
        <div className="contact-actions">
          <a className="contact-link" href="mailto:hello@uniskill.in">
            hello@uniskill.in <span>↗</span>
          </a>
          <Link to="/contact" className="contact-link">
            Visit Campus Contact Desk <span>↗</span>
          </Link>
        </div>
      </section>

      {/* ========================================================= */}
      {/* STYLES */}
      {/* ========================================================= */}
      <style>{`
        .home-main {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 16px;
        }

        /* --- HERO --- */
        .coursera-hero-wrapper {
          background-color: #0056D2;
          color: #FFFFFF;
          border-radius: 20px;
          margin: 20px 0;
          overflow: hidden;
          position: relative;
          box-shadow: 0 10px 40px rgba(0, 86, 210, 0.15);
        }
        .coursera-hero-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 60px 80px;
          min-height: 480px;
        }
        .coursera-hero-text { flex: 1; max-width: 550px; z-index: 2; }
        .hero-title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0 0 8px 0; }
        .hero-subtitle { font-size: 48px; font-weight: 700; line-height: 1.1; margin: 0 0 24px 0; letter-spacing: -1px; }
        .hero-description { font-size: 16px; line-height: 1.6; color: #E0E8FF; margin: 0 0 32px 0; font-style: italic; }
        .quote-author { display: block; font-size: 14px; color: #A5C8FF; font-style: normal; font-weight: 600; margin-top: 8px; letter-spacing: 0.5px; }
        .hero-cta-group { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
        .hero-primary-cta {
          background: #FFFFFF; color: #0056D2; border: none;
          padding: 14px 28px; border-radius: 4px; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .hero-primary-cta:hover { background: #F0F0F0; transform: translateY(-1px); }

        .coursera-hero-image-area {
          position: relative; width: 500px; height: 450px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .hero-student-img {
          width: 380px; height: 440px; object-fit: cover;
          border-radius: 200px 200px 0 0; position: relative; z-index: 2;
          border: 4px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .hero-shape-circle {
          position: absolute; width: 320px; height: 320px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.08); top: 10%; left: 5%; z-index: 1;
        }
        .hero-shape-arc {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          border: 40px solid rgba(255, 255, 255, 0.1); top: -20px; right: -60px; z-index: 1;
        }

        /* ================================================ */
        /* --- DASHBOARD SECTION (My Learning Path) --- */
        /* ================================================ */
        .dashboard-section {
          padding: 80px 40px;
          border-radius: 20px;
          margin: 20px 0;
          background: #FFFFFF;
          border: 1px solid var(--line);
          overflow: hidden;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 60px;
          align-items: center;
        }

        .dashboard-text h2 {
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1.1;
          letter-spacing: -1px;
          margin: 0 0 20px 0;
        }
        .dashboard-text h2 em {
          font-style: italic;
          color: #0056D2;
          font-family: Georgia, serif;
        }
        .dashboard-desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.7;
          margin: 0 0 24px 0;
        }
        .dashboard-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }
        .dashboard-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--ink);
          font-weight: 500;
        }
        .check-dot {
          width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, #0056D2, #3B82F6);
          display: inline-block;
          position: relative;
          flex-shrink: 0;
        }
        .check-dot::after {
          content: '';
          position: absolute;
          left: 6px; top: 4px;
          width: 4px; height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        /* --- Animated Visual --- */
        .dashboard-visual {
          position: relative;
          height: 500px;
          perspective: 1200px;
        }

        .dash-back-panel {
          position: absolute;
          left: 10px;
          top: 40px;
          width: 280px;
          height: 380px;
          background: #E8EFFC;
          border-radius: 16px;
          border: 2px solid #D6E2F8;
          animation: dashFloat 6s ease-in-out infinite alternate;
        }

        .dash-course-card {
          position: absolute;
          left: 30px;
          top: 80px;
          width: 280px;
          background: #FFFFFF;
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(30, 90, 180, 0.18), 0 6px 18px rgba(0,0,0,0.06);
          overflow: hidden;
          animation: dashFloat 6s ease-in-out infinite alternate;
          animation-delay: -1s;
          z-index: 3;
        }

        .dash-course-header {
          background: linear-gradient(135deg, #DDE8FB, #C7DAF9);
          padding: 14px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #1E3A8A;
          letter-spacing: 0.2px;
        }

        .dash-course-list {
          list-style: none;
          padding: 12px 8px;
          margin: 0;
        }
        .dash-course-list li {
          padding: 11px 14px;
          font-size: 13px;
          color: #9AA5B5;
          border-radius: 8px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.2s;
        }
        .dash-course-list li.active {
          color: #1E3A8A;
          font-weight: 700;
          background: #EAF1FE;
        }
        .dash-radio-check {
          width: 16px; height: 16px; border-radius: 50%;
          background: #0056D2;
          display: inline-block;
          position: relative;
          flex-shrink: 0;
        }
        .dash-radio-check::after {
          content: '';
          position: absolute;
          left: 5px; top: 3px;
          width: 4px; height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        /* --- Floating progress banner --- */
        .dash-progress-banner {
          position: absolute;
          top: 30px;
          right: 20px;
          background: #E4F7EE;
          border: 1px solid #B8EBD6;
          padding: 16px 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 16px 40px rgba(20, 120, 80, 0.15), 0 4px 12px rgba(0,0,0,0.05);
          animation: bannerFloat 5s ease-in-out infinite alternate;
          animation-delay: -2s;
          z-index: 5;
        }
        .dash-banner-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: #0F9D58;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dash-banner-icon svg { width: 22px; height: 22px; }
        .dash-progress-banner strong {
          display: block;
          font-size: 14px;
          color: #0F5132;
          font-weight: 800;
          letter-spacing: -0.2px;
        }
        .dash-progress-banner span {
          font-size: 11.5px;
          color: #4C8A6E;
          font-weight: 500;
        }

        /* --- Floating stat tiles --- */
        .dash-stats {
          position: absolute;
          right: 0;
          bottom: 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 300px;
          z-index: 4;
        }
        .dash-stat-tile {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 14px 36px rgba(30, 90, 180, 0.13), 0 3px 10px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          gap: 10px;
          animation: tileFloat 5s ease-in-out infinite alternate;
        }
        .dash-stat-tile:nth-child(1) { animation-delay: -0.5s; }
        .dash-stat-tile:nth-child(2) { animation-delay: -1.5s; }
        .dash-stat-tile:nth-child(3) { animation-delay: -2.5s; }
        .dash-stat-tile:nth-child(4) { animation-delay: -3.5s; }

        .stat-icon {
          font-size: 18px;
          width: 36px; height: 36px;
          background: #F0F6FF;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dash-stat-tile strong {
          display: block;
          font-size: 18px;
          font-weight: 800;
          color: #1F2937;
          letter-spacing: -0.4px;
          line-height: 1;
        }
        .dash-stat-tile span {
          display: block;
          font-size: 10.5px;
          color: #6B7280;
          font-weight: 500;
          margin-top: 3px;
        }

        /* ================================================ */
        /* --- CERTIFICATES SECTION --- */
        /* ================================================ */
        .certs-section {
          padding: 90px 40px;
          border-radius: 20px;
          margin: 20px 0;
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%);
          border: 1px solid var(--line);
          overflow: hidden;
        }

        .certs-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 60px;
          align-items: center;
        }

        .certs-text h2 {
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1.1;
          letter-spacing: -1px;
          margin: 0 0 20px 0;
          color: #1F2937;
        }
        .certs-text h2 em {
          font-style: italic;
          color: #0056D2;
          font-family: Georgia, serif;
        }
        .certs-desc {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.7;
          margin: 0 0 28px 0;
        }
        .cert-primary-btn {
          background: #0056D2;
          color: #FFFFFF;
          border: none;
          padding: 14px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cert-primary-btn:hover {
          background: #0044A8;
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 86, 210, 0.3);
        }
        .cert-primary-btn span { font-size: 16px; }

        /* --- Certificates visual --- */
        .certs-visual {
          position: relative;
          height: 460px;
        }

        .cert-card {
          position: absolute;
          background: #FFFFFF;
          border-radius: 10px;
          border: 1px solid #E3EBF7;
          padding: 22px 22px 18px;
          box-shadow: 0 20px 50px rgba(30, 90, 180, 0.13), 0 6px 16px rgba(0,0,0,0.05);
          width: 280px;
          height: 180px;
          overflow: hidden;
          transition: transform 0.4s ease;
        }

        .cert-card:hover {
          transform: translateY(-8px) scale(1.03) !important;
          box-shadow: 0 30px 70px rgba(30, 90, 180, 0.22);
          z-index: 10 !important;
        }

        .cert-card-1 {
          top: 0;
          right: 10px;
          animation: certFloat1 6s ease-in-out infinite alternate;
          z-index: 3;
        }
        .cert-card-2 {
          top: 130px;
          left: 0;
          animation: certFloat2 6.5s ease-in-out infinite alternate;
          z-index: 2;
        }
        .cert-card-3 {
          top: 280px;
          right: 20px;
          animation: certFloat3 7s ease-in-out infinite alternate;
          z-index: 1;
        }

        .cert-logo-row {
          display: flex;
          align-items: center;
          margin-bottom: 14px;
        }
        .cert-brand-badge {
          font-size: 13px;
          font-weight: 800;
          color: #0056D2;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cert-brand-badge::before {
          content: '';
          width: 18px;
          height: 18px;
          background: #0056D2;
          border-radius: 50%;
          display: inline-block;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z'/></svg>");
          background-size: 12px;
          background-position: center;
          background-repeat: no-repeat;
        }

        .cert-title {
          font-size: 20px;
          font-weight: 700;
          color: #1F2937;
          line-height: 1.25;
          letter-spacing: -0.4px;
          max-width: 160px;
        }

        .cert-signature {
          position: absolute;
          bottom: 18px;
          left: 22px;
          width: 100px;
          height: 1px;
          border-top: 1px dashed #B8C4D8;
        }

        .cert-ribbon {
          position: absolute;
          top: 0;
          right: 20px;
          width: 46px;
          height: 90px;
          background: #0056D2;
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%);
          box-shadow: 0 4px 12px rgba(0, 86, 210, 0.3);
        }
        .ribbon-inner {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #FFFFFF;
          color: #0056D2;
          font-size: 14px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
          box-shadow: 0 0 0 2px #0056D2;
        }

        /* --- Animations --- */
        @keyframes dashFloat {
          0% { transform: translateY(0px) rotate(-0.5deg); }
          100% { transform: translateY(-14px) rotate(0.5deg); }
        }
        @keyframes bannerFloat {
          0% { transform: translateY(0) rotate(-0.5deg); }
          100% { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes tileFloat {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }
        @keyframes certFloat1 {
          0% { transform: translateY(0) rotate(-1.5deg); }
          100% { transform: translateY(-12px) rotate(0deg); }
        }
        @keyframes certFloat2 {
          0% { transform: translateY(0) rotate(1deg); }
          100% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes certFloat3 {
          0% { transform: translateY(0) rotate(-0.5deg); }
          100% { transform: translateY(-14px) rotate(1.5deg); }
        }

        /* --- Signal Strip --- */
        .signal-strip {
          display: flex;
          justify-content: space-around;
          padding: 40px 40px;
          background: #F8F9FA;
          border-bottom: 1px solid #E0E0E0;
          border-radius: 20px;
          margin: 20px 0;
          flex-wrap: wrap;
          gap: 20px;
        }
        .signal-strip div { text-align: center; flex: 1 1 150px; }
        .signal-strip strong { display: block; font-size: 32px; font-weight: 800; color: #0056D2; }
        .signal-strip span { font-size: 14px; color: #666; font-weight: 500; }

        /* --- Content Sections --- */
        .content-section { padding: 80px 40px; border-radius: 20px; margin: 20px 0; }
        .section-heading {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 40px; flex-wrap: wrap; gap: 20px;
        }
        .section-heading h2 {
          font-size: clamp(28px, 4vw, 42px); line-height: 1.1;
          margin: 0; letter-spacing: -1px;
        }
        .section-heading h2 em { font-style: italic; color: #0056D2; font-family: Georgia, serif; }
        .section-note { color: var(--muted); font-size: 14px; max-width: 300px; margin: 0; }
        .eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          color: #0056D2; margin: 0 0 12px 0; text-transform: uppercase;
        }

        /* --- Value Grid --- */
        .value-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 22px;
        }
        .value-card {
          padding: 30px; background: #FFFFFF; border: 1px solid var(--line);
          border-radius: 12px; transition: transform 0.2s, box-shadow 0.2s;
        }
        .value-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
        .value-icon { font-size: 24px; display: block; margin-bottom: 14px; }
        .value-card h3 { font-size: 20px; margin: 0 0 8px; }
        .value-card p { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0; }

        /* --- Category Pills --- */
        .category-pills {
          display: flex; gap: 8px; margin-bottom: 30px;
          overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;
        }
        .category-pills::-webkit-scrollbar { display: none; }
        .category-pill {
          padding: 8px 16px; border-radius: 99px;
          border: 1px solid var(--line); background: #FFFFFF;
          color: var(--ink); font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
        }
        .category-pill.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .category-pill:hover { border-color: #0056D2; color: #0056D2; }
        .category-pill.active:hover { color: var(--paper); }

        /* --- Steps Grid --- */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .step-card {
          padding: 26px; border: 1px solid var(--line);
          background: #FFFFFF; border-radius: 12px; position: relative;
        }
        .step-number { font: 32px var(--mono); color: #0056D2; display: block; margin-bottom: 12px; font-weight: 800; }
        .step-title { display: block; font-size: 18px; margin-bottom: 8px; }
        .step-desc { color: var(--muted); font-size: 13px; line-height: 1.6; margin: 0; }

        /* --- About / Testimonials --- */
        .about-section {
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
          padding: 90px 40px; background: var(--ink); color: var(--paper);
          border-radius: 20px; margin: 20px 0;
        }
        .about-heading {
          font-size: clamp(32px, 4.5vw, 56px);
          margin-bottom: 20px; line-height: 1.1; letter-spacing: -1px;
        }
        .about-heading em { font-style: italic; color: #60A5FA; font-family: Georgia, serif; }
        .about-text { color: #c5c3b8; font-size: 14px; line-height: 1.8; }
        .testimonial-grid { display: grid; gap: 18px; }
        .testimonial-card {
          padding: 24px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
        }
        .testimonial-rating { color: #60A5FA; font-size: 14px; margin-bottom: 8px; }
        .testimonial-quote { font-size: 13px; color: #F0F6FF; line-height: 1.6; font-style: italic; margin: 0 0 14px; }
        .testimonial-footer { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 10px; }
        .testimonial-name { font-size: 14px; color: #fff; display: block; }
        .testimonial-role { display: block; font-size: 11px; color: #aaa89d; }
        .testimonial-course { font: 10px var(--mono); color: #60A5FA; }

        /* --- FAQ --- */
        .faq-list { max-width: 850px; display: grid; gap: 14px; }
        .faq-item {
          background: #f8f6f0; border: 1px solid var(--line);
          padding: 22px; cursor: pointer; border-radius: 12px; transition: background 0.2s;
        }
        .faq-item:hover { background: #f0ede5; }
        .faq-question { display: flex; justify-content: space-between; align-items: center; }
        .faq-question strong { font-size: 15px; }
        .faq-toggle { font: 16px var(--mono); color: #0056D2; margin-left: 15px; }
        .faq-answer {
          color: var(--muted); font-size: 13px; line-height: 1.7;
          margin: 14px 0 0; border-top: 1px solid var(--line); padding-top: 12px;
        }

        /* --- Contact --- */
        .contact-section {
          text-align: center; padding: 100px 40px;
          background: #0056D2; color: #fff;
          border-radius: 20px; margin: 20px 0;
        }
        .contact-section h2 {
          font-size: clamp(32px, 5vw, 56px); margin: 20px 0 40px;
          line-height: 1.1; letter-spacing: -1px;
        }
        .contact-section h2 em { font-style: italic; color: #A5C8FF; font-family: Georgia, serif; }
        .contact-section .eyebrow { color: #A5C8FF; }
        .contact-actions { display: flex; gap: 20px; flex-wrap: wrap; align-items: center; justify-content: center; }
        .contact-link {
          color: #fff; font-size: 18px; text-decoration: none; font-weight: 600;
          border-bottom: 2px solid transparent; transition: border-color 0.2s;
        }
        .contact-link:hover { border-bottom-color: #A5C8FF; }
        .contact-link span { color: #A5C8FF; }

        /* --- Responsive --- */
        @media (max-width: 1024px) {
          .coursera-hero-content { padding: 40px; flex-direction: column; text-align: center; gap: 30px; }
          .coursera-hero-text { max-width: 100%; }
          .hero-cta-group { align-items: center; }
          .coursera-hero-image-area { width: 100%; height: 380px; }
          .hero-student-img { width: 300px; height: 360px; }
          .about-section { grid-template-columns: 1fr; gap: 40px; padding: 60px 30px; }
          .dashboard-grid { grid-template-columns: 1fr; gap: 40px; }
          .dashboard-visual { height: 460px; max-width: 480px; margin: 0 auto; width: 100%; }
          .certs-grid { grid-template-columns: 1fr; gap: 40px; }
          .certs-visual { height: 400px; max-width: 480px; margin: 0 auto; width: 100%; }
        }

        @media (max-width: 768px) {
          .home-main { padding: 0 12px; }
          .content-section, .dashboard-section, .certs-section { padding: 50px 24px; }
          .signal-strip { padding: 30px 20px; }
          .signal-strip strong { font-size: 24px; }
          .hero-subtitle { font-size: 34px; }
          .coursera-hero-content { padding: 30px 20px; min-height: auto; }
          .coursera-hero-image-area { height: 320px; }
          .hero-student-img { width: 240px; height: 300px; }
          .hero-shape-circle { width: 220px; height: 220px; }
          .hero-shape-arc { width: 280px; height: 280px; border-width: 30px; }
          .section-heading { flex-direction: column; align-items: flex-start; }
          .section-heading h2 { font-size: 28px; }
          .contact-section { padding: 60px 20px; }
          .contact-link { font-size: 15px; }
          .dashboard-visual { height: 400px; }
          .dash-course-card { width: 240px; left: 10px; }
          .dash-back-panel { width: 240px; left: 0; }
          .dash-stats { width: 260px; right: 0; }
          .dash-progress-banner { padding: 12px 14px; right: 0; }
          .dash-progress-banner strong { font-size: 12.5px; }
          .dash-progress-banner span { font-size: 10.5px; }
          .certs-visual { height: 380px; }
          .cert-card { width: 240px; height: 155px; padding: 18px; }
          .cert-title { font-size: 17px; }
        }

        @media (max-width: 480px) {
          .home-main { padding: 0 8px; }
          .coursera-hero-wrapper { border-radius: 16px; margin: 12px 0; }
          .coursera-hero-content { padding: 24px 16px; }
          .hero-title { font-size: 16px; }
          .hero-subtitle { font-size: 28px; letter-spacing: -0.5px; }
          .hero-description { font-size: 14px; }
          .hero-primary-cta { padding: 12px 20px; font-size: 14px; width: 100%; }
          .coursera-hero-image-area { height: 260px; }
          .hero-student-img { width: 180px; height: 230px; border-width: 3px; }
          .hero-shape-circle { width: 160px; height: 160px; }
          .hero-shape-arc { width: 200px; height: 200px; border-width: 20px; right: -30px; }
          .content-section, .dashboard-section, .certs-section { padding: 40px 16px; border-radius: 16px; margin: 12px 0; }
          .signal-strip { padding: 24px 16px; border-radius: 16px; margin: 12px 0; }
          .signal-strip div { flex: 1 1 40%; }
          .signal-strip strong { font-size: 22px; }
          .signal-strip span { font-size: 12px; }
          .about-section { padding: 40px 16px; border-radius: 16px; margin: 12px 0; }
          .about-heading { font-size: 26px; }
          .contact-section { padding: 50px 16px; border-radius: 16px; margin: 12px 0; }
          .contact-section h2 { font-size: 26px; }
          .contact-actions { flex-direction: column; gap: 14px; }
          .value-card, .step-card { padding: 20px; }
          .testimonial-card { padding: 18px; }
          .faq-item { padding: 16px; }
          .faq-question strong { font-size: 14px; }

          /* Dashboard mobile tweaks */
          .dashboard-visual { height: 380px; }
          .dash-course-card { width: 200px; left: 0; top: 60px; }
          .dash-back-panel { width: 200px; left: -10px; top: 20px; height: 340px; }
          .dash-course-header { font-size: 12px; padding: 12px 16px; }
          .dash-course-list li { padding: 9px 12px; font-size: 12px; }
          .dash-progress-banner { top: 10px; right: -6px; padding: 10px 12px; gap: 8px; }
          .dash-banner-icon { width: 32px; height: 32px; }
          .dash-banner-icon svg { width: 18px; height: 18px; }
          .dash-progress-banner strong { font-size: 11px; }
          .dash-progress-banner span { font-size: 9.5px; }
          .dash-stats { width: 200px; bottom: 20px; right: -10px; gap: 8px; }
          .dash-stat-tile { padding: 10px; gap: 8px; }
          .stat-icon { width: 30px; height: 30px; font-size: 15px; }
          .dash-stat-tile strong { font-size: 15px; }
          .dash-stat-tile span { font-size: 9.5px; }

          /* Certs mobile tweaks */
          .certs-visual { height: 340px; }
          .cert-card { width: 200px; height: 140px; padding: 16px; }
          .cert-brand-badge { font-size: 11.5px; }
          .cert-brand-badge::before { width: 16px; height: 16px; background-size: 10px; }
          .cert-title { font-size: 15px; max-width: 120px; }
          .cert-ribbon { width: 38px; height: 76px; right: 14px; }
          .ribbon-inner { width: 22px; height: 22px; font-size: 12px; }
          .cert-card-1 { right: 0; }
          .cert-card-2 { top: 110px; left: 0; }
          .cert-card-3 { top: 220px; right: 0; }
        }
      `}</style>
    </main>
  )
}