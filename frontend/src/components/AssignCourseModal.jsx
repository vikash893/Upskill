import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function AssignCourseModal({ teacher, onClose, onUpdated }) {
  const { session } = useAuth()
  const [courses, setCourses] = useState([])
  const [selectedCourses, setSelectedCourses] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Initial assigned courses
    setSelectedCourses(teacher.course_assigned || [])

    // Fetch all courses
    request('/explore-courses')
      .then((data) => setCourses(data.courses || []))
      .catch(() => {})
  }, [teacher])

  const toggleCourse = (courseTitle) => {
    if (selectedCourses.includes(courseTitle)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== courseTitle))
    } else {
      setSelectedCourses([...selectedCourses, courseTitle])
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await request(`/assign-courses/${teacher._id || teacher.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ course_assigned: selectedCourses }),
      })
      if (onUpdated) onUpdated()
      onClose()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" style={{ width: 'min(500px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>

        <p className="eyebrow">TEACHER COURSE ASSIGNMENT</p>
        <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px', marginBottom: '8px' }}>
          Assign Courses to {teacher.name}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>
          Select one or more courses this teacher is responsible for instructing and managing.
        </p>

        {message && <p className="form-message" style={{ marginBottom: '15px' }}>{message}</p>}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px', marginBottom: '20px' }}>
            {courses.length === 0 ? (
              <div className="empty-state">No courses found in catalogue.</div>
            ) : (
              courses.map((course) => {
                const isSelected = selectedCourses.includes(course.course_title) || selectedCourses.includes(course.course_id)
                return (
                  <label
                    key={course.course_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      border: isSelected ? '1px solid var(--orange)' : '1px solid var(--line)',
                      background: isSelected ? '#fff9f5' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCourse(course.course_title)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--orange)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px' }}>{course.course_title}</strong>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        {course.course_type === 'free' ? 'Free Course' : `₹${course.final_amount}`}
                      </p>
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="primary-button full-width" disabled={saving} type="submit">
              {saving ? 'Saving...' : `Save Assignments (${selectedCourses.length})`}
            </button>
            <button className="outline-button" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
