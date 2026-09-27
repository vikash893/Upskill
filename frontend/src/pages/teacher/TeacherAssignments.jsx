import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function TeacherAssignments() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ course_id: '', title: '', description: '', due_date: '', total_points: 100 })
  const [attachment, setAttachment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [selectedSubForGrade, setSelectedSubForGrade] = useState(null)
  const [gradeInput, setGradeInput] = useState({ grade: '', feedback: '' })

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const coursesData = await request('/teacher/my-courses', { headers })
      const myCourses = coursesData.courses || []
      setCourses(myCourses)
      if (myCourses.length > 0 && !form.course_id) {
        setForm((prev) => ({ ...prev, course_id: myCourses[0].course_id }))
      }

      const allAsg = []
      await Promise.all(
        myCourses.map(async (c) => {
          const res = await request(`/assignment/course/${c.course_id}`, { headers }).catch(() => ({ assignments: [] }))
          if (res.assignments) {
            res.assignments.forEach((a) => {
              allAsg.push({ ...a, course_title: c.course_title })
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

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setActionMessage('')
    try {
      const fd = new FormData()
      fd.append('course_id', form.course_id)
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('due_date', form.due_date)
      fd.append('total_points', form.total_points)
      if (attachment) fd.append('attachment', attachment)

      await request('/assignment/create', {
        method: 'POST',
        headers,
        body: fd,
      })

      setActionMessage('Assignment published successfully!')
      setShowCreate(false)
      setForm({ course_id: courses[0]?.course_id || '', title: '', description: '', due_date: '', total_points: 100 })
      setAttachment(null)
      fetchAssignments()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGrade = async (assignmentId, studentEmail) => {
    try {
      await request(`/assignment/grade/${assignmentId}/${studentEmail}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(gradeInput),
      })

      setActionMessage('Submission graded successfully!')
      setSelectedSubForGrade(null)
      setGradeInput({ grade: '', feedback: '' })
      fetchAssignments()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">EVALUATION CENTER</p>
          <h2>Assignment Management & Grading</h2>
        </div>
        <button className="primary-button" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Create New Assignment'}
        </button>
      </div>

      {actionMessage && <p className="form-message" style={{ marginBottom: '20px' }}>{actionMessage}</p>}

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreateAssignment} style={{ padding: '25px', border: '1px solid var(--line)', background: '#fffdf8', marginBottom: '30px', display: 'grid', gap: '15px' }}>
          <p className="eyebrow">PUBLISH ASSIGNMENT</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Select Course *
              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                required
              >
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Assignment Title *
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
            Instructions & Task Description *
            <textarea rows="3" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'inherit' }} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Due Date
              <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Total Points
              <input type="number" value={form.total_points} onChange={(e) => setForm({ ...form, total_points: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Attach Task Material
              <input type="file" onChange={(e) => setAttachment(e.target.files[0])} style={{ padding: '8px' }} />
            </label>
          </div>

          <button className="primary-button" style={{ justifySelf: 'start' }} disabled={saving} type="submit">
            {saving ? 'Creating...' : 'Publish Assignment to Students'}
          </button>
        </form>
      )}

      {/* Assignment List & Submissions */}
      {loading ? (
        <div className="empty-state">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">No assignments created yet. Click above to publish your first task.</div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {assignments.map((asg) => (
            <div key={asg.assignment_id} className="stat-card-clean">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ font: '10px var(--mono)', color: 'var(--orange)' }}>{asg.course_title}</span>
                  <h3 style={{ fontSize: '18px', margin: '4px 0 0' }}>{asg.title}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ position: 'static' }}>{asg.total_points} Points</span>
                  <p style={{ font: '10px var(--mono)', color: 'var(--muted)', margin: '4px 0 0' }}>
                    Submissions: <strong>{asg.submissions?.length || 0}</strong>
                  </p>
                </div>
              </div>

              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>{asg.description}</p>

              {/* Submissions Section */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px' }}>
                <p className="eyebrow" style={{ marginBottom: '10px' }}>
                  STUDENT SUBMISSIONS ({asg.submissions?.length || 0})
                </p>

                {asg.submissions?.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>No student submissions yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {asg.submissions.map((sub) => (
                      <div
                        key={sub.student_email}
                        style={{
                          padding: '14px',
                          border: '1px solid var(--line)',
                          background: sub.status === 'graded' ? '#f0fdf4' : '#fff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '15px',
                        }}
                      >
                        <div>
                          <strong>{sub.student_name}</strong> <span style={{ color: 'var(--muted)', fontSize: '11px' }}>({sub.student_email})</span>
                          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                            {sub.submission_text || 'Submitted file'}
                          </p>
                          {sub.attachment && (
                            <a href={`http://localhost:8000/${sub.attachment}`} target="_blank" rel="noreferrer" className="text-button" style={{ fontSize: '11px' }}>
                              Download Student Attachment ↗
                            </a>
                          )}
                        </div>

                        <div>
                          {sub.status === 'graded' ? (
                            <div style={{ textAlign: 'right' }}>
                              <span className="badge" style={{ position: 'static', background: 'var(--lime)' }}>
                                Graded: {sub.grade} / {asg.total_points}
                              </span>
                              {sub.feedback && (
                                <p style={{ fontSize: '11px', color: '#166534', margin: '4px 0 0' }}>{sub.feedback}</p>
                              )}
                            </div>
                          ) : selectedSubForGrade === sub.student_email ? (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                type="text"
                                placeholder="Grade"
                                style={{ width: '70px', padding: '6px', border: '1px solid var(--line)', fontSize: '11px' }}
                                value={gradeInput.grade}
                                onChange={(e) => setGradeInput({ ...gradeInput, grade: e.target.value })}
                              />
                              <input
                                type="text"
                                placeholder="Feedback"
                                style={{ width: '140px', padding: '6px', border: '1px solid var(--line)', fontSize: '11px' }}
                                value={gradeInput.feedback}
                                onChange={(e) => setGradeInput({ ...gradeInput, feedback: e.target.value })}
                              />
                              <button
                                className="primary-button"
                                style={{ padding: '6px 12px', fontSize: '10px' }}
                                onClick={() => handleGrade(asg.assignment_id, sub.student_email)}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              className="primary-button"
                              style={{ padding: '6px 14px', fontSize: '11px' }}
                              onClick={() => {
                                setSelectedSubForGrade(sub.student_email)
                                setGradeInput({ grade: '', feedback: '' })
                              }}
                            >
                              Grade Task ↗
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
