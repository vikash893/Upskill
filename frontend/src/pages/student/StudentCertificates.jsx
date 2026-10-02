import { useEffect, useState } from 'react'
import { API_URL, request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export default function StudentCertificates() {
  const { session } = useAuth()
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    request('/certificates/mine', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => setCertificates(data.certificates || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [session.token])

  const downloadCertificate = async (certificate) => {
    setDownloading(certificate._id)
    setError('')

    try {
      const response = await fetch(`${API_URL}/certificates/${certificate._id}/download`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Could not download this certificate.')
      }

      const file = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = file
      link.download = `${certificate.certificate_id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(file), 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <main className="student-certificates-page">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MILESTONES</p>
            <h2>My certificates</h2>
          </div>
          <span className="student-certificate-total">{certificates.length} issued</span>
        </div>

        {error && <p className="student-certificate-error" role="alert">{error}</p>}
        {loading ? (
          <div className="empty-state">Loading your certificates...</div>
        ) : certificates.length === 0 ? (
          <div className="student-certificate-empty">
            <span className="student-certificate-empty-mark" aria-hidden="true">U</span>
            <h3>Your next milestone belongs here.</h3>
            <p>Certificates issued to your account will appear here for download.</p>
          </div>
        ) : (
          <div className="student-certificate-list">
            {certificates.map((certificate) => (
              <article className="student-certificate-row" key={certificate._id}>
                <div className="student-certificate-seal" aria-hidden="true">U</div>
                <div className="student-certificate-copy">
                  <p className="eyebrow">CERTIFICATE OF COMPLETION</p>
                  <h3>{certificate.course_title}</h3>
                  <p className="student-certificate-recipient">Awarded to <strong>{certificate.student_name}</strong></p>
                  <div className="student-certificate-meta">
                    <span>Distributed {formatDate(certificate.issue_date)}</span>
                    <code>{certificate.certificate_id}</code>
                  </div>
                </div>
                <button
                  className="primary-button student-certificate-download"
                  type="button"
                  disabled={downloading === certificate._id}
                  onClick={() => downloadCertificate(certificate)}
                  aria-label={`Download certificate for ${certificate.course_title}`}
                >
                  {downloading === certificate._id ? 'Preparing PDF...' : '↓  Download PDF'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .student-certificates-page .content-section { padding-top: 56px; }
        .student-certificate-total { color: var(--muted); font: 11px var(--mono); }
        .student-certificate-list { display: grid; gap: 12px; }
        .student-certificate-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto; gap: 18px; align-items: center; padding: 22px; border: 1px solid var(--line); border-left: 4px solid #c69a4a; background: #fff; }
        .student-certificate-seal, .student-certificate-empty-mark { display: grid; width: 48px; height: 48px; place-items: center; border: 2px solid #c69a4a; border-radius: 50%; background: #0c2c48; color: #e0bb69; font: bold 22px Georgia, serif; box-shadow: 0 0 0 4px #f6ebd3; }
        .student-certificate-copy { min-width: 0; }
        .student-certificate-copy .eyebrow { margin-bottom: 6px; font-size: 9px; }
        .student-certificate-copy h3 { overflow-wrap: anywhere; margin: 0; color: var(--ink); font-size: 19px; }
        .student-certificate-recipient { margin: 6px 0 10px; color: var(--muted); font-size: 12px; }
        .student-certificate-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; color: var(--muted); font-size: 10px; }
        .student-certificate-meta code { color: #38516b; font-size: 10px; }
        .student-certificate-download { white-space: nowrap; padding: 11px 16px; font-size: 12px; }
        .student-certificate-error { padding: 12px 14px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; font-size: 12px; }
        .student-certificate-empty { display: grid; min-height: 240px; place-content: center; justify-items: center; gap: 12px; border: 1px dashed var(--line); background: #fff; text-align: center; }
        .student-certificate-empty h3 { margin: 10px 0 0; font-size: 20px; }
        .student-certificate-empty p { margin: 0; color: var(--muted); font-size: 12px; }
        @media (max-width: 620px) { .student-certificates-page .content-section { padding: 36px 5vw; } .student-certificate-row { grid-template-columns: 42px minmax(0, 1fr); gap: 14px; padding: 17px; } .student-certificate-seal { width: 38px; height: 38px; font-size: 18px; } .student-certificate-copy h3 { font-size: 16px; } .student-certificate-download { grid-column: 1 / -1; width: 100%; } }
      `}</style>
    </main>
  )
}