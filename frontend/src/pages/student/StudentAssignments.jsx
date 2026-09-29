import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function StudentAssignments() {
  const { session } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'graded'
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [submissionForm, setSubmissionForm] = useState({ text: '', file: null })
  const [actionMessage, setActionMessage] = useState('')

  const fetchAssignments = async () => {
    setLoading(true)
    const headers = { Authorization: `Bearer ${session.token}` }

    try {
      const myCoursesData = await request('/my-courses', { headers })
      const courses = myCoursesData.courses || []

      const allAsg = []
      await Promise.all(
        courses.map(async (c) => {
          const res = await request(`/assignment/course/${c.course_id}`, { headers }).catch(() => ({ assignments: [] }))
          if (res.assignments) {
            res.assignments.forEach((a) => {
              allAsg.push({
                ...a,
                course_title: c.course_title,
              })
            })
          }
        })
      )

      setAssignments(allAsg)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  const handleSubmit = async (assignmentId) => {
    if (!submissionForm.text && !submissionForm.file) {
      alert('Please enter your response text or attach a file')
      return
    }

    try {
      const fd = new FormData()
      fd.append('submission_text', submissionForm.text)
      if (submissionForm.file) fd.append('attachment', submissionForm.file)

      await request(`/assignment/submit/${assignmentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      setActionMessage('Assignment submitted successfully!')
      setSubmittingId(null)
      setSubmissionForm({ text: '', file: null })
      fetchAssignments()
    } catch (err) {
      alert(err.message)
    }
  }

  const filtered = assignments.filter((a) => {
    if (filter === 'pending') return !a.my_submission
    if (filter === 'graded') return a.my_submission?.status === 'graded'
    return true
  })

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">COURSE EVALUATIONS</p>
          <h2>My Assignments & Tasks</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'graded'].map((f) => (
            <button
              key={f}
              className={filter === f ? 'sidebar-link active' : 'sidebar-link'}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: filter === f ? 'var(--ink)' : 'var(--line)',
                background: filter === f ? 'var(--ink)' : '#FFFFFF',
                color: filter === f ? 'var(--paper)' : 'var(--ink)',
                fontSize: '11px',
                textTransform: 'capitalize',
                fontWeight: 600,
              }}
            >
              {f === 'all' ? 'All Tasks' : f === 'pending' ? 'Pending' : 'Graded'}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && <p className="form-message" style={{ marginBottom: '20px' }}>{actionMessage}</p>}

      {loading ? (
        <div className="empty-state">Loading your assignments...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No assignments found for this filter.</div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {filtered.map((asg) => {
            const mySub = asg.my_submission
            const isSubmitted = !!mySub
            const isGraded = mySub?.status === 'graded'

            return (
              <div key={asg.assignment_id} className="stat-card-clean">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ font: '10px var(--mono)', color: 'var(--orange)' }}>{asg.course_title}</span>
                    <h3 style={{ fontSize: '18px', margin: '4px 0 0' }}>{asg.title}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge" style={{ position: 'static' }}>{asg.total_points} Points</span>
                    {asg.due_date && (
                      <p style={{ font: '10px var(--mono)', color: 'var(--muted)', margin: '4px 0 0' }}>
                        Due: {new Date(asg.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                  {asg.description}
                </p>

                {asg.attachment && (
                  <div style={{ marginBottom: '16px' }}>
                    <a href={`http://localhost:8000/${asg.attachment}`} target="_blank" rel="noreferrer" className="text-button">
                      📄 Download Attached Task File <span>↗</span>
                    </a>
                  </div>
                )}

                {/* Submission State */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                  {isSubmitted ? (
                    <div style={{ padding: '14px', background: isGraded ? '#f0fdf4' : '#fff9f4', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px' }}>
                          {isGraded ? `✓ Graded: ${mySub.grade} / ${asg.total_points}` : '⏳ Submission Received (Pending Grading)'}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Submitted: {new Date(mySub.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      {mySub.submission_text && (
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '6px 0 0' }}>
                          Your response: "{mySub.submission_text}"
                        </p>
                      )}
                      {mySub.feedback && (
                        <p style={{ fontSize: '12px', color: '#166534', margin: '6px 0 0', fontWeight: 600 }}>
                          Instructor Feedback: {mySub.feedback}
                        </p>
                      )}
                    </div>
                  ) : submittingId === asg.assignment_id ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <p className="eyebrow" style={{ margin: 0 }}>SUBMIT YOUR WORK</p>
                      <textarea
                        rows="3"
                        placeholder="Type your answer, notes, or solution link here..."
                        value={submissionForm.text}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, text: e.target.value })}
                        style={{ padding: '10px', border: '1px solid var(--line)', background: '#FFFFFF', fontFamily: 'inherit' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          onChange={(e) => setSubmissionForm({ ...submissionForm, file: e.target.files[0] })}
                          style={{ fontSize: '11px' }}
                        />
                        <button className="primary-button" onClick={() => handleSubmit(asg.assignment_id)} style={{ padding: '8px 16px', fontSize: '11px' }}>
                          Submit Now
                        </button>
                        <button className="outline-button" onClick={() => setSubmittingId(null)} style={{ padding: '8px 14px', fontSize: '11px' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="primary-button"
                      style={{ fontSize: '11px', padding: '8px 16px' }}
                      onClick={() => setSubmittingId(asg.assignment_id)}
                    >
                      Submit Assignment ↗
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
