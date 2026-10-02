import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function AdminCertificates() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [mode, setMode] = useState('course')
  const [courses, setCourses] = useState([])
  const [certificates, setCertificates] = useState([])
  const [courseId, setCourseId] = useState('')
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [studentName, setStudentName] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [adminSignature, setAdminSignature] = useState(null)
  const [teacherSignature, setTeacherSignature] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchCertificates = async () => {
    const data = await request('/certificates/admin', { headers })
    setCertificates(data.certificates || [])
  }

  useEffect(() => {
    const requestHeaders = { Authorization: `Bearer ${session.token}` }
    Promise.all([
      request('/admin/all-courses', { headers: requestHeaders }),
      request('/certificates/admin', { headers: requestHeaders }),
    ])
      .then(([courseData, certificateData]) => {
        setCourses(courseData.courses || [])
        setCertificates(certificateData.certificates || [])
      })
      .catch((err) => setError(err.message))
  }, [session.token])

  const loadRoster = async (selectedCourseId) => {
    setCourseId(selectedCourseId)
    setRoster([])
    if (!selectedCourseId) return

    setRosterLoading(true)
    setError('')
    try {
      const data = await request(`/certificates/admin/course/${encodeURIComponent(selectedCourseId)}/roster`, { headers })
      setRoster(data.students || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setRosterLoading(false)
    }
  }

  const submitIssue = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setSaving(true)
    setError('')
    setMessage('')

    const body = new FormData()
    body.append('admin_signature', adminSignature)
    body.append('teacher_signature', teacherSignature)

    try {
      if (mode === 'manual') {
        body.append('student_email', studentEmail)
        body.append('student_name', studentName)
        body.append('course_title', courseTitle)
        const data = await request('/certificates/admin/manual', {
          method: 'POST',
          headers,
          body,
        })
        setMessage(data.message)
        setStudentEmail('')
        setStudentName('')
        setCourseTitle('')
      } else {
        const data = await request(`/certificates/admin/course/${encodeURIComponent(courseId)}`, {
          method: 'POST',
          headers,
          body,
        })
        setMessage(`${data.message}${data.skipped_count ? ` ${data.skipped_count} previously issued.` : ''}`)
        await loadRoster(courseId)
      }

      setAdminSignature(null)
      setTeacherSignature(null)
      formElement.reset()
      await fetchCertificates()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const availableStudents = roster.filter((student) => !student.already_issued)

  return (
    <main className="admin-certificates-page">
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACADEMIC RECORDS</p>
            <h2>Certificates</h2>
          </div>
          <p className="section-note">Issue completion certificates individually or to a course roster.</p>
        </div>

        <div className="certificate-admin-grid">
          <section className="certificate-issue-panel">
            <div className="certificate-panel-heading">
              <div>
                <p className="eyebrow">DISTRIBUTION</p>
                <h3>Issue a certificate</h3>
              </div>
              <span className="certificate-count">{certificates.length} issued</span>
            </div>

            <div className="certificate-mode-tabs" role="tablist" aria-label="Certificate issue mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'course'}
                className={mode === 'course' ? 'active' : ''}
                onClick={() => setMode('course')}
              >
                Entire course
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'manual'}
                className={mode === 'manual' ? 'active' : ''}
                onClick={() => setMode('manual')}
              >
                Individual student
              </button>
            </div>

            {message && <p className="certificate-feedback success" role="status">{message}</p>}
            {error && <p className="certificate-feedback error" role="alert">{error}</p>}

            <form className="certificate-issue-form" onSubmit={submitIssue}>
              {mode === 'manual' ? (
                <div className="certificate-form-grid">
                  <label>
                    Student account email
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(event) => setStudentEmail(event.target.value)}
                      placeholder="student@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label>
                    Student name on certificate
                    <input
                      value={studentName}
                      onChange={(event) => setStudentName(event.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </label>
                  <label className="certificate-form-wide">
                    Course title
                    <input
                      value={courseTitle}
                      onChange={(event) => setCourseTitle(event.target.value)}
                      placeholder="Course or program completed"
                      required
                    />
                  </label>
                </div>
              ) : (
                <div className="certificate-form-grid">
                  <label className="certificate-form-wide">
                    Course
                    <select value={courseId} onChange={(event) => loadRoster(event.target.value)} required>
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option value={course.course_id} key={course.course_id}>{course.course_title}</option>
                      ))}
                    </select>
                  </label>

                  {courseId && (
                    <div className="certificate-roster certificate-form-wide" aria-live="polite">
                      <div className="certificate-roster-heading">
                        <strong>Active students</strong>
                        <span>{availableStudents.length} to receive · {roster.filter((student) => student.already_issued).length} already issued</span>
                      </div>
                      {rosterLoading ? (
                        <p className="certificate-roster-empty">Loading course students...</p>
                      ) : roster.length ? (
                        <div className="certificate-roster-list">
                          {roster.map((student) => (
                            <div className="certificate-roster-row" key={student.email}>
                              <span className="certificate-roster-mark" aria-hidden="true">{student.name?.charAt(0)?.toUpperCase() || 'S'}</span>
                              <span className="certificate-roster-person">
                                <strong>{student.name}</strong>
                                <small>{student.email}</small>
                              </span>
                              <span className={student.already_issued ? 'certificate-issued-tag' : 'certificate-ready-tag'}>
                                {student.already_issued ? 'Issued' : 'Ready'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="certificate-roster-empty">No active students are enrolled in this course.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="certificate-signatures">
                <label>
                  Admin signature
                  <input type="file" accept="image/*" onChange={(event) => setAdminSignature(event.target.files?.[0] || null)} required />
                </label>
                <label>
                  Teacher signature
                  <input type="file" accept="image/*" onChange={(event) => setTeacherSignature(event.target.files?.[0] || null)} required />
                </label>
              </div>

              <div className="certificate-form-footer">
                <span>Distribution date is recorded automatically when issued.</span>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving || (mode === 'course' && (!courseId || rosterLoading || availableStudents.length === 0))}
                >
                  {saving ? 'Issuing...' : mode === 'course' ? `Issue to ${availableStudents.length} students` : 'Issue certificate'}
                </button>
              </div>
            </form>
          </section>

          <aside className="certificate-reference-panel" aria-label="Certificate style">
            <div className="certificate-reference-frame">
              <span className="certificate-reference-brand">U</span>
              <p className="certificate-reference-wordmark">UniSkill</p>
              <span className="certificate-reference-rule" />
              <span className="certificate-reference-kicker">LEARN · BUILD · GROW</span>
              <strong>CERTIFICATE</strong>
              <span className="certificate-reference-subtitle">OF COMPLETION</span>
              <span className="certificate-reference-rule short" />
              <small>AWARDED WITH PRIDE AND PURPOSE</small>
              <span className="certificate-reference-seal">U</span>
              <span className="certificate-reference-bottom">SIGNATURES · ISSUE DATE · UNIQUE ID</span>
            </div>
          </aside>
        </div>

        <section className="certificate-history">
          <div className="certificate-panel-heading">
            <div>
              <p className="eyebrow">DISTRIBUTION LOG</p>
              <h3>Recently issued</h3>
            </div>
          </div>
          {certificates.length === 0 ? (
            <div className="empty-state">No certificates have been issued yet.</div>
          ) : (
            <div className="certificate-history-list">
              {certificates.map((certificate) => (
                <article className="certificate-history-row" key={certificate._id}>
                  <div className="certificate-history-mark" aria-hidden="true">{certificate.student_name?.charAt(0)?.toUpperCase() || 'S'}</div>
                  <div className="certificate-history-person">
                    <strong>{certificate.student_name}</strong>
                    <span>{certificate.student_email}</span>
                  </div>
                  <div className="certificate-history-course">
                    <strong>{certificate.course_title}</strong>
                    <span>{certificate.issuance_type === 'course' ? 'Course group' : 'Individual issue'}</span>
                  </div>
                  <span className="certificate-history-date">{formatDate(certificate.issue_date)}</span>
                  <code>{certificate.certificate_id}</code>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <style>{`
        .admin-certificates-page .content-section { padding-top: 56px; }
        .certificate-admin-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(260px, .8fr); gap: 22px; align-items: stretch; }
        .certificate-issue-panel, .certificate-history { border: 1px solid var(--line); background: #fff; padding: 24px; }
        .certificate-panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .certificate-panel-heading .eyebrow { margin-bottom: 7px; }
        .certificate-panel-heading h3 { font-size: 21px; margin: 0; }
        .certificate-count { font: 11px var(--mono); color: var(--muted); white-space: nowrap; }
        .certificate-mode-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; margin: 22px 0; background: #f2f4f7; border: 1px solid var(--line); border-radius: 6px; }
        .certificate-mode-tabs button { min-height: 40px; border: 0; border-radius: 4px; background: transparent; color: var(--muted); font: 600 12px var(--mono); cursor: pointer; }
        .certificate-mode-tabs button.active { color: var(--navy, #092c4c); background: #fff; box-shadow: 0 1px 4px #102b4618; }
        .certificate-feedback { margin: 0 0 16px; padding: 11px 13px; font-size: 12px; border: 1px solid; }
        .certificate-feedback.success { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
        .certificate-feedback.error { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
        .certificate-issue-form { display: grid; gap: 18px; }
        .certificate-form-grid, .certificate-signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .certificate-issue-form label { display: grid; gap: 7px; color: var(--muted); font-size: 11px; font-weight: 600; }
        .certificate-issue-form input:not([type=file]), .certificate-issue-form select { width: 100%; min-width: 0; border: 1px solid var(--line); background: #fff; padding: 11px 12px; border-radius: 4px; color: var(--ink); font: inherit; font-size: 13px; }
        .certificate-issue-form input[type=file] { width: 100%; min-width: 0; padding: 10px; border: 1px dashed var(--line); background: #fbfcfe; border-radius: 4px; color: var(--muted); font-size: 11px; }
        .certificate-form-wide { grid-column: 1 / -1; }
        .certificate-roster { border: 1px solid var(--line); background: #fbfcfe; }
        .certificate-roster-heading { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid var(--line); font-size: 11px; }
        .certificate-roster-heading span { color: var(--muted); text-align: right; }
        .certificate-roster-list { max-height: 208px; overflow-y: auto; }
        .certificate-roster-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid #edf0f4; }
        .certificate-roster-row:last-child { border-bottom: 0; }
        .certificate-roster-mark, .certificate-history-mark { display: grid; place-items: center; flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%; background: #eaf1f7; color: #183b58; font-size: 11px; font-weight: 700; }
        .certificate-roster-person { display: grid; flex: 1; min-width: 0; gap: 3px; }
        .certificate-roster-person strong { color: var(--ink); font-size: 11px; }
        .certificate-roster-person small { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; }
        .certificate-issued-tag, .certificate-ready-tag { font: 10px var(--mono); white-space: nowrap; }
        .certificate-issued-tag { color: #7c5b22; }
        .certificate-ready-tag { color: #166534; }
        .certificate-roster-empty { margin: 0; padding: 18px 12px; color: var(--muted); font-size: 11px; }
        .certificate-form-footer { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-top: 1px solid var(--line); padding-top: 16px; }
        .certificate-form-footer > span { color: var(--muted); font-size: 10px; line-height: 1.5; }
        .certificate-form-footer .primary-button { flex: 0 0 auto; padding: 11px 17px; font-size: 12px; }
        .certificate-reference-panel { display: grid; place-items: center; padding: 20px; background: #f1f3f5; border: 1px solid var(--line); }
        .certificate-reference-frame { position: relative; display: flex; width: 100%; min-height: 310px; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #bf9449; outline: 5px solid #0c2c48; outline-offset: -10px; background: #fffefa; color: #0c2c48; text-align: center; }
        .certificate-reference-frame:before, .certificate-reference-frame:after { position: absolute; width: 90px; height: 90px; border: 12px solid #c69a4a; content: ''; opacity: .75; transform: rotate(45deg); }
        .certificate-reference-frame:before { top: -64px; left: -64px; }
        .certificate-reference-frame:after { right: -64px; bottom: -64px; }
        .certificate-reference-brand { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #0c2c48; color: #d2a653; font: bold 18px Georgia, serif; }
        .certificate-reference-wordmark { margin: 3px 0 0; font-size: 11px; font-weight: 700; }
        .certificate-reference-rule { width: 70px; height: 1px; margin: 9px 0; background: #c69a4a; }
        .certificate-reference-kicker, .certificate-reference-frame small, .certificate-reference-bottom { color: #778091; font: 7px var(--mono); letter-spacing: 1px; }
        .certificate-reference-frame > strong { margin-top: 11px; font: bold 26px Georgia, serif; letter-spacing: 1px; }
        .certificate-reference-subtitle { margin-top: 1px; color: #b48b49; font: 11px Georgia, serif; letter-spacing: 3px; }
        .certificate-reference-rule.short { width: 40px; margin: 12px 0; }
        .certificate-reference-seal { position: absolute; right: 16px; top: 110px; display: grid; width: 48px; height: 48px; place-items: center; border: 2px solid #bd9146; border-radius: 50%; background: #0c2c48; color: #ddb65c; font: bold 24px Georgia, serif; box-shadow: 0 0 0 4px #f5ebd5, 0 0 0 5px #bd9146; }
        .certificate-reference-bottom { position: absolute; bottom: 26px; }
        .certificate-history { margin-top: 24px; }
        .certificate-history-list { display: grid; margin-top: 16px; border-top: 1px solid var(--line); }
        .certificate-history-row { display: grid; grid-template-columns: 34px minmax(130px, 1fr) minmax(130px, 1fr) 95px auto; align-items: center; gap: 12px; padding: 12px 2px; border-bottom: 1px solid #edf0f4; }
        .certificate-history-person, .certificate-history-course { display: grid; min-width: 0; gap: 4px; }
        .certificate-history-person strong, .certificate-history-course strong { overflow: hidden; color: var(--ink); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .certificate-history-person span, .certificate-history-course span, .certificate-history-date { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
        .certificate-history-row code { color: #34516c; font-size: 9px; white-space: nowrap; }
        @media (max-width: 900px) { .certificate-admin-grid { grid-template-columns: 1fr; } .certificate-reference-panel { min-height: 280px; } .certificate-reference-frame { max-width: 480px; } }
        @media (max-width: 620px) { .admin-certificates-page .content-section { padding: 36px 5vw; } .certificate-issue-panel, .certificate-history { padding: 17px; } .certificate-form-grid, .certificate-signatures { grid-template-columns: 1fr; } .certificate-form-wide { grid-column: auto; } .certificate-form-footer { align-items: stretch; flex-direction: column; } .certificate-form-footer .primary-button { width: 100%; } .certificate-history-row { grid-template-columns: 30px 1fr auto; gap: 8px; } .certificate-history-course { grid-column: 2; } .certificate-history-date { grid-column: 3; grid-row: 1; } .certificate-history-row code { grid-column: 2 / -1; } .certificate-roster-heading { align-items: flex-start; flex-direction: column; } .certificate-roster-heading span { text-align: left; } }
      `}</style>
    </main>
  )
}