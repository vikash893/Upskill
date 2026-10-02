import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../api/request'
import { getAppUrl, getRegisterUrl } from '../config'
import StatsSection from '../components/StatsSection'
import CtaBanner from '../components/CtaBanner'

export default function About() {
  const [stats, setStats] = useState(null)
  const [teachers, setTeachers] = useState([])

  useEffect(() => {
    request('/public/platform-stats')
      .then((data) => {
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})

    request('/get-all-teachers')
      .then((data) => {
        if (data.teachers) setTeachers(data.teachers)
      })
      .catch(() => {})
  }, [])

  const milestones = [
    {
      year: '2024',
      title: 'The Foundation',
      desc: 'UniSkill was founded to eliminate passive, outdated video tutorials and replace them with high-rigor, mentor-led engineering studio masterclasses.',
    },
    {
      year: '2025',
      title: 'Browser-Native Live Classrooms',
      desc: 'Engineered zero-login interactive live video studios with automated presence tracking, evaluated assignment submission pipelines, and instant feedback.',
    },
    {
      year: '2026',
      title: 'Ecosystem & Placement Hub',
      desc: 'Expanded into verified certificate credentials, daily GitHub-style activity heatmaps, and a dedicated BCA, BBA, B.Tech career portal.',
    },
  ]

  const pillars = [
    {
      icon: '🎯',
      title: 'Practitioner-Led Pedagogy',
      desc: 'All courses are designed and taught by engineers and architects who actively build production systems, not full-time theoretical lecturers.',
    },
    {
      icon: '⚡',
      title: 'Interactive Production Feedback',
      desc: 'Every assignment is evaluated with personalized feedback and scores so learners identify edge-cases and write production-grade code.',
    },
    {
      icon: '🤝',
      title: 'Career Placement & Internships',
      desc: 'Beyond lectures, we curate vetted job and internship opportunities from top companies, matching students by degree track.',
    },
  ]

  return (
    <div className="landing-container">
      {/* Hero Header */}
      <section className="hero-wrapper" style={{ minHeight: 'auto', padding: '60px 40px', textAlign: 'center' }}>
        <p className="eyebrow" style={{ color: '#E8D6FF', margin: '0 0 12px' }}>OUR STORY & MISSION</p>
        <h1 className="hero-title" style={{ fontSize: 'clamp(34px, 5vw, 54px)', maxWidth: '800px', margin: '0 auto 20px' }}>
          Knowledge built for the real world,<br />engineered for real outcomes.
        </h1>
        <p className="hero-lead" style={{ maxWidth: '640px', margin: '0 auto 30px' }}>
          Education should be practical, respectful of your time, and led by mentors who have actually built what they teach.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link to="/courses" className="hero-primary-btn">
            Explore Masterclasses ↗
          </Link>
          <a href={getRegisterUrl()} className="hero-secondary-btn">
            Join Free ↗
          </a>
        </div>
      </section>

      {/* Stats */}
      <StatsSection stats={stats} />

      {/* Vision & Problem Statement */}
      <section className="content-section" style={{ background: 'var(--surface)', padding: '60px 40px', borderRadius: '16px', border: '1px solid var(--line)', margin: '40px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center' }}>
          <div>
            <p className="eyebrow">THE PROBLEM WE SOLVE</p>
            <h2 className="section-title">
              Why traditional online<br /><em>learning is broken.</em>
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '16px' }}>
              Thousands of students spend hundreds of hours watching pre-recorded videos on YouTube and MOOC platforms without ever writing production code or receiving critical code reviews.
            </p>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.8 }}>
              When technical interviews arrive, they struggle to answer real-world system architecture, debugging, and deployment questions. UniSkill was designed from day one to flip this model.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '36px', borderRadius: '12px' }}>
            <p className="eyebrow" style={{ color: 'var(--orange)' }}>OUR CORE MISSION</p>
            <h3 style={{ fontSize: '22px', margin: '0 0 14px', color: 'var(--ink)' }}>
              Transform aspiring students into confident software builders.
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Through structured cohorts, live video studios, evaluated assignments, verifiable certificates, and direct industry mentorship, we empower students to graduate with verified portfolios and career momentum.
            </p>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="content-section">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p className="eyebrow">OUR VALUES</p>
          <h2 className="section-title">
            The principles that guide<br /><em>every UniSkill course.</em>
          </h2>
        </div>

        <div className="feature-grid">
          {pillars.map((p, i) => (
            <div key={i} className="feature-card">
              <span className="feature-icon">{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Milestones / Timeline */}
      <section className="content-section" style={{ background: 'var(--surface)', padding: '60px 40px', borderRadius: '16px', border: '1px solid var(--line)', margin: '40px 0' }}>
        <div style={{ marginBottom: '36px' }}>
          <p className="eyebrow">OUR JOURNEY</p>
          <h2 className="section-title">Milestones & growth</h2>
        </div>

        <div className="steps-grid">
          {milestones.map((m, idx) => (
            <div key={idx} className="step-card">
              <span className="step-number" style={{ fontSize: '24px' }}>{m.year}</span>
              <strong>{m.title}</strong>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership & Faculty */}
      <section className="content-section">
        <div style={{ marginBottom: '36px' }}>
          <p className="eyebrow">ACADEMIC LEADERSHIP</p>
          <h2 className="section-title">
            Mentors dedicated to<br /><em>your practical growth.</em>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '30px', borderRadius: '14px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--orange)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
              TS
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '20px' }}>Tushar Sharma</h3>
            <span style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
              Co-Founder & Head of Academics
            </span>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              System Architect & Lead Mentor. Passionate about demystifying distributed systems, cloud architecture, and outcome-oriented software engineering.
            </p>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '30px', borderRadius: '14px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#166534', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
              VB
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '20px' }}>Vikash Bhardwaj</h3>
            <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
              Lead Platform Architect
            </span>
            <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Full-Stack Platform Engineer specializing in high-concurrency microservices, real-time classroom pipelines, and scalable ed-tech architecture.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaBanner />
    </div>
  )
}
