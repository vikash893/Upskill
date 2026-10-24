import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_URL } from '../api/request'

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams()
  const [certificateId, setCertificateId] = useState(searchParams.get('id') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-verify if ?id= is present in URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setCertificateId(id)
      handleVerify(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVerify(id) {
    const trimmed = (id || certificateId).trim()
    if (!trimmed) {
      setError('Please enter a certificate ID.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`${API_URL}/certificates/verify/${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (res.ok && data.verified) {
        setResult(data.certificate)
      } else {
        setError(data.error || 'Certificate not found. This certificate may be invalid.')
      }
    } catch {
      setError('Unable to connect to the verification server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleVerify()
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="verify-header" style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ margin: '0 auto 16px', width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-ghost, rgba(99,102,241,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6366f1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h2 style={{ margin: 0 }}>Verify Certificate</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>
          Enter a certificate ID to verify its authenticity.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Certificate ID (e.g. UNS-A1B2C3D4E5F6)"
          value={certificateId}
          onChange={(e) => setCertificateId(e.target.value)}
          className="input-field"
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          type="submit"
          className="primary-button"
          disabled={loading}
          style={{ whiteSpace: 'nowrap', minWidth: 100 }}
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      {error && (
        <div className="card" style={{ border: '1px solid #fca5a5', background: 'var(--card-bg)', padding: 24, textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h3 style={{ color: '#dc2626', margin: '0 0 8px' }}>Verification Failed</h3>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ border: '1px solid #86efac', background: 'var(--card-bg)', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              ✓ Verified Certificate
            </div>
            <h3 style={{ margin: '8px 0 4px' }}>This certificate is authentic</h3>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
              Issued by <strong>UniSkill</strong> — verified from the official registry.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Certificate ID', result.certificate_id],
              ['Student Name', result.student_name],
              ['Course / Program', result.course_title],
              ['Issue Date', formatDate(result.issue_date)],
              ['Issuance Type', (result.issuance_type || '—').charAt(0).toUpperCase() + (result.issuance_type || '—').slice(1)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
                <span style={{ fontWeight: 500, fontSize: 14, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
