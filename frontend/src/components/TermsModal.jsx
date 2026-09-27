import { useEffect, useState } from 'react'
import { request } from '../api/request'

export default function TermsModal({ initialTab = 'terms', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [terms, setTerms] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request('/terms')
      .then((data) => setTerms(data.terms))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 30 }}>
      <div className="auth-modal legal-modal-container" style={{ width: 'min(760px, 95vw)', maxHeight: '88vh', overflowY: 'auto', padding: '32px' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>

        <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '6px' }}>LEGAL & REGULATORY DISCLOSURES</p>
        <h2 style={{ fontSize: '30px', letterSpacing: '-1.5px', marginBottom: '8px' }}>
          UniSkill Platform Governance
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>
          Effective Date: September 2026 · Official policies governing your access, billing, and learning at UniSkill.
        </p>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'terms', label: 'Terms of Service' },
            { id: 'privacy', label: 'Privacy & Security Policy' },
            { id: 'refund', label: 'Refund & Plan Expiry Policy' },
            { id: 'conduct', label: 'Student Code of Conduct' },
            { id: 'cookies', label: 'Cookie Policy' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: activeTab === t.id ? 'var(--ink)' : 'var(--line)',
                background: activeTab === t.id ? 'var(--ink)' : '#fffdf8',
                color: activeTab === t.id ? 'var(--paper)' : 'var(--ink)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
          {activeTab === 'terms' && (
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 10px' }}>1. Terms of Service Agreement</h3>
              <p>
                Welcome to UniSkill. By registering an account, accessing courses, or submitting assignments, you agree to be bound by these Terms of Service. UniSkill provides interactive cohort-based learning, live video studio sessions, curriculum recordings, and mentor assessments.
              </p>
              <h4 style={{ fontSize: '14px', margin: '15px 0 6px', color: 'var(--ink)' }}>1.1 Account Eligibility & Security</h4>
              <p>
                You must provide accurate and verifiable credentials. You are responsible for maintaining the confidentiality of your login tokens and password. Accounts cannot be shared or transferred between individuals.
              </p>
              <h4 style={{ fontSize: '14px', margin: '15px 0 6px', color: 'var(--ink)' }}>1.2 Intellectual Property Rights</h4>
              <p>
                All video lectures, problem sheets, downloadable course notes, live session recordings, and proprietary source materials are the exclusive intellectual property of UniSkill and its certified instructors. Unauthorized reproduction or commercial redistribution is strictly prohibited.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 10px' }}>2. Privacy & Data Protection Policy</h3>
              {terms?.ip_logging_notice && (
                <div style={{ padding: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', marginBottom: '16px', color: '#92400e', fontSize: '12px' }}>
                  <strong>🔒 Audit & IP Compliance:</strong> {terms.ip_logging_notice}
                </div>
              )}
              <p>
                UniSkill respects student privacy and implements industry-standard encryption protocols. We collect profile details (name, email, phone, optional avatar photo) solely for academic management, attendance auditing, and instructor communication.
              </p>
              <h4 style={{ fontSize: '14px', margin: '15px 0 6px', color: 'var(--ink)' }}>2.1 Information Sharing</h4>
              <p>
                Your personal details and submissions are only shared with faculty members assigned to your registered courses. We never sell, rent, or monetize your personal data to third-party advertisers.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 10px' }}>3. Course Fee, Plan Expiry & Cancellation Policy</h3>
              <p>
                UniSkill offers flexible billing structures for students including <strong>Monthly Plans</strong> (30-day billing cycle) and <strong>Yearly Plans</strong> (365-day billing cycle with upfront savings).
              </p>
              <h4 style={{ fontSize: '14px', margin: '15px 0 6px', color: 'var(--ink)' }}>3.1 Plan Validity & Expiry</h4>
              <p>
                When you purchase a course on a Monthly or Yearly subscription, your access is active until the designated <strong>Plan Expiry Date</strong>. Students can renew or upgrade their plan at any time through the Student Workspace.
              </p>
              <h4 style={{ fontSize: '14px', margin: '15px 0 6px', color: 'var(--ink)' }}>3.2 Cancellation & Refund Terms</h4>
              <p>
                If you cancel your payment intent during checkout, the transaction is marked as <em>Cancelled</em> in your billing history with no charges incurred. For approved purchases, refund requests can be submitted to admissions within 7 days of enrollment if course progress is below 20%.
              </p>
            </div>
          )}

          {activeTab === 'conduct' && (
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 10px' }}>4. Student Honor Code & Academic Integrity</h3>
              <p>
                UniSkill is built upon mutual respect, genuine effort, and practical collaboration. All students agree to adhere to our Honor Code:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                <li>Submit authentic, original work for all assignments and project evaluations.</li>
                <li>Maintain respectful and professional conduct in all live video sessions and discussions.</li>
                <li>Respect peer privacy and refrain from recording or capturing screenshots of fellow learners.</li>
                <li>Honor attendance commitments during scheduled live lectures.</li>
              </ul>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div>
              <h3 style={{ fontSize: '18px', color: 'var(--ink)', margin: '0 0 10px' }}>5. Cookie & Storage Policy</h3>
              <p>
                We use strictly necessary browser cookies and local storage tokens to maintain your verified session, remember your UI preferences, and provide seamless access to the learning classroom. We do not employ third-party tracking cookies.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', font: 'var(--mono)' }}>
            UniSkill Education Foundation · All rights reserved
          </span>
          <button className="primary-button" onClick={onClose} style={{ fontSize: '12px', padding: '10px 22px' }}>
            Close Policy Viewer
          </button>
        </div>
      </div>
    </div>
  )
}
