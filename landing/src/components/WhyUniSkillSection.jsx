import { getAppUrl, getRegisterUrl } from '../config'

export default function WhyUniSkillSection() {
  return (
    <section className="content-section" aria-labelledby="why-title">
      {/* 1. Track every step */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center', marginBottom: '80px' }}>
        <div>
          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h2 id="why-title" className="section-title">
            Track every step.<br /><em>See your progress grow.</em>
          </h2>
          <p className="section-subtitle">
            A clean, personal command center that shows your active courses, daily progress, completed assignments, video hours, and quiz scores — all in one glance.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'grid', gap: '12px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: 'var(--ink)' }}>
              <span style={{ color: 'var(--orange)', fontWeight: 800 }}>✓</span> Real-time course completion & assignment grading
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: 'var(--ink)' }}>
              <span style={{ color: 'var(--orange)', fontWeight: 800 }}>✓</span> Daily momentum metrics, streak count & 365-day heatmap
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: 'var(--ink)' }}>
              <span style={{ color: 'var(--orange)', fontWeight: 800 }}>✓</span> Direct teacher announcements and live studio broadcast links
            </li>
          </ul>

          <a href={getAppUrl()} className="primary-button">
            <span>Explore Student Dashboard</span>
            <span>↗</span>
          </a>
        </div>

        {/* Dashboard Preview Graphic */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>STUDENT WORKSPACE</span>
              <h4 style={{ margin: '2px 0 0', fontSize: '16px' }}>Active Learning Track</h4>
            </div>
            <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#166534', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
              🔥 14 Day Streak
            </span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px' }}>Full-Stack Web Engineering</strong>
                <span style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: 700 }}>82% Complete</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '82%', height: '100%', background: 'var(--orange)' }} />
              </div>
            </div>

            <div style={{ padding: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px' }}>AI & Applied Machine Learning</strong>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>Next Live Class: 6:00 PM</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Topic: Transformer Architectures & Attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Verifiable credentials */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center' }}>
        <div style={{ order: 2 }}>
          <p className="eyebrow">CERTIFIED & VERIFIABLE</p>
          <h2 className="section-title">
            Turn your learning<br /><em>into career proof.</em>
          </h2>
          <p className="section-subtitle">
            Earn verifiable completion certificates you can add to your resume and LinkedIn that reflect the actual projects you built and milestones you completed.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href={getRegisterUrl()} className="primary-button">
              <span>Start Earning Certificates</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Certificate Card Mockup */}
        <div style={{ order: 1, background: '#181B17', color: '#FFFFFF', padding: '36px', borderRadius: '16px', border: '1px solid #2E332C', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--lime)', letterSpacing: '-0.5px' }}>UniSkill</span>
            <span style={{ fontSize: '10px', padding: '3px 8px', background: 'rgba(232, 214, 255, 0.2)', color: 'var(--lime)', borderRadius: '4px', border: '1px solid var(--lime)' }}>VERIFIED CREDENTIAL</span>
          </div>

          <h4 style={{ fontSize: '19px', margin: '0 0 8px', color: '#FFFFFF' }}>Certificate of Mastery</h4>
          <p style={{ fontSize: '12.5px', color: '#9FA198', margin: '0 0 20px', lineHeight: 1.6 }}>
            Awarded for demonstrating proficiency in full-stack architecture, asynchronous queues, database optimization, and live class capstone defense.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #2E332C', paddingTop: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#9FA198', display: 'block' }}>RECIPIENT CODE</span>
              <strong style={{ fontSize: '12px', color: '#FFFFFF', letterSpacing: '1px' }}>US-2026-CERT-8849</strong>
            </div>
            <span style={{ fontSize: '24px' }}>🎖</span>
          </div>
        </div>
      </div>
    </section>
  )
}
