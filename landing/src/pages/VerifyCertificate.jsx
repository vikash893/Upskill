import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams()
  const [certificateId, setCertificateId] = useState(searchParams.get('id') || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-verify if ?id= is present in URL (from QR code scan)
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

  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleViewPdf(e) {
    e.preventDefault()
    if (!result?.certificate_id || pdfLoading) return

    setPdfLoading(true)
    try {
      const res = await fetch(`${API_URL}/certificates/verify/${encodeURIComponent(result.certificate_id)}/pdf`)
      if (!res.ok) throw new Error('Could not download certificate PDF')

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
    } catch (err) {
      alert('Failed to load certificate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
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
    <section className="verify-certificate-page">
      <div className="verify-container">
        <div className="verify-header">
          <div className="verify-shield-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1>Certificate Verification</h1>
          <p className="verify-subtitle">
            Verify the authenticity of a UniSkill certificate by entering the certificate ID or scanning the QR code on the certificate.
          </p>
        </div>

        <form className="verify-form" onSubmit={handleSubmit}>
          <div className="verify-input-group">
            <input
              type="text"
              placeholder="Enter Certificate ID (e.g. UNS-A1B2C3D4E5F6)"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              className="verify-input"
              autoFocus
            />
            <button
              type="submit"
              className="verify-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="verify-spinner" />
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="verify-result-card verify-error">
            <div className="verify-status-icon error">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3>Verification Failed</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="verify-result-card verify-success">
            <div className="verify-status-icon success">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="verify-badge">✓ Verified Certificate</div>
            <h3>This certificate is authentic</h3>
            <p className="verify-issued-text">
              Issued by <strong>UniSkill</strong> — verified from the official registry.
            </p>

            <div className="verify-details">
              <div className="verify-detail-row">
                <span className="verify-detail-label">Certificate ID</span>
                <span className="verify-detail-value mono">{result.certificate_id}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Student Name</span>
                <span className="verify-detail-value">{result.student_name}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Course / Program</span>
                <span className="verify-detail-value">{result.course_title}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Issue Date</span>
                <span className="verify-detail-value">{formatDate(result.issue_date)}</span>
              </div>
              <div className="verify-detail-row">
                <span className="verify-detail-label">Issuance Type</span>
                <span className="verify-detail-value" style={{ textTransform: 'capitalize' }}>
                  {result.issuance_type || '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleViewPdf}
              disabled={pdfLoading}
              className="verify-view-pdf-btn"
              style={{ border: 'none', cursor: pdfLoading ? 'wait' : 'pointer' }}
            >
              {pdfLoading ? 'Loading Certificate PDF...' : 'View Certificate PDF ↗'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
