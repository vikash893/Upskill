import { useState } from 'react'

export default function TermsModal({ initialTab = 'terms', onClose }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          color: 'var(--ink)',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '85vh',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>LEGAL COMPLIANCE & POLICIES</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>UniSkill Platform Terms</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line)',
            background: 'var(--light)',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'terms', label: 'Terms of Service' },
            { key: 'privacy', label: 'Privacy & IP Policy' },
            { key: 'refund', label: 'Refund & Expiry' },
            { key: 'conduct', label: 'Honor Code' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: tab === t.key ? 'var(--surface)' : 'transparent',
                color: tab === t.key ? 'var(--orange)' : 'var(--muted)',
                fontWeight: tab === t.key ? 700 : 500,
                fontSize: '13px',
                borderBottom: tab === t.key ? '2px solid var(--orange)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', fontSize: '13.5px', lineHeight: 1.7, color: 'var(--muted)' }}>
          {tab === 'terms' && (
            <div>
              <h4 style={{ color: 'var(--ink)', marginTop: 0 }}>1. Acceptance of Terms</h4>
              <p>
                By accessing or using the UniSkill platform (accessible at uniskill.in and app.uniskill.in), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
              <h4 style={{ color: 'var(--ink)' }}>2. Educational Service Nature</h4>
              <p>
                UniSkill provides interactive educational live video classrooms, recorded video lecture modules, hands-on assignment evaluation, and certificates upon verified completion. Course enrollments and access permissions are tied to your registered student account.
              </p>
              <h4 style={{ color: 'var(--ink)' }}>3. Account Security</h4>
              <p>
                You are responsible for safeguarding your login credentials. You may not share, sell, or transfer your account access to third parties.
              </p>
            </div>
          )}

          {tab === 'privacy' && (
            <div>
              <h4 style={{ color: 'var(--ink)', marginTop: 0 }}>1. IP Address & Security Logging</h4>
              <p>
                To prevent credential sharing, unauthorized recording, and denial of service attacks, UniSkill logs client IP addresses, browser user-agents, and authentication session timestamps during login and live class participation.
              </p>
              <h4 style={{ color: 'var(--ink)' }}>2. Data Collection & Privacy</h4>
              <p>
                We collect your name, email address, optional contact number, uploaded profile photo, and academic progress metrics solely to provide mentorship, course delivery, and verifiable completion certificates. We never sell your personal data.
              </p>
            </div>
          )}

          {tab === 'refund' && (
            <div>
              <h4 style={{ color: 'var(--ink)', marginTop: 0 }}>1. Plan Durations & Expiry</h4>
              <p>
                Monthly plans grant 30 calendar days of active course access from the time of enrollment. Yearly plans grant 365 calendar days of full access. Your exact expiry date is displayed in your workspace.
              </p>
              <h4 style={{ color: 'var(--ink)' }}>2. Refund Policy</h4>
              <p>
                Because UniSkill unlocks immediate live class access and downloadable engineering resources, refunds are granted within 48 hours of purchase provided less than 10% of course lectures have been viewed.
              </p>
            </div>
          )}

          {tab === 'conduct' && (
            <div>
              <h4 style={{ color: 'var(--ink)', marginTop: 0 }}>1. Academic Integrity & Honor Code</h4>
              <p>
                UniSkill learners are expected to author and submit their own original code solutions for evaluated assignments. Plagiarism from peer submissions or commercial answer keys is strictly prohibited.
              </p>
              <h4 style={{ color: 'var(--ink)' }}>2. Live Classroom Etiquette</h4>
              <p>
                Students must maintain professional conduct during live video studio lectures. Harassment, disruptive behavior, or unauthorized broadcasting will result in immediate suspension.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', background: 'var(--light)' }}>
          <button className="primary-button" onClick={onClose} style={{ padding: '8px 20px', fontSize: '13px' }}>
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  )
}
