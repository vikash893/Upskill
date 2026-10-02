import { useEffect, useState, useRef } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'

const audienceNames = { students: 'All students', teachers: 'All teachers', everyone: 'Everyone' }

export default function Announcements() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const canPublish = session.role === 'ADMIN' || session.role === 'TEACHER'
  const [announcements, setAnnouncements] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showComposer, setShowComposer] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState({ title: '', message: '', target_type: 'course', course_id: '', audience: 'students' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  const loadAnnouncements = async () => {
    const data = await request('/announcements/mine', { headers })
    setAnnouncements(data.announcements || [])
  }

  useEffect(() => {
    let active = true
    const requests = [
      request('/announcements/mine', { headers: { Authorization: `Bearer ${session.token}` } }),
      session.role === 'ADMIN'
        ? request('/admin/all-courses', { headers: { Authorization: `Bearer ${session.token}` } })
        : session.role === 'TEACHER'
          ? request('/teacher/my-courses', { headers: { Authorization: `Bearer ${session.token}` } })
          : Promise.resolve({ courses: [] }),
    ]

    Promise.all(requests)
      .then(([announcementData, courseData]) => {
        if (!active) return
        setAnnouncements(announcementData.announcements || [])
        setCourses(courseData.courses || [])
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [session.token, session.role])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const markRead = async (announcement) => {
    if (announcement.is_read) return
    try {
      await request(`/announcements/${announcement._id}/read`, { method: 'POST', headers })
      setAnnouncements((current) => current.map((item) => item._id === announcement._id ? { ...item, is_read: true } : item))
    } catch (markError) {
      setError(markError.message)
    }
  }

  const handleDelete = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return
    setDeletingId(announcementId)
    setError('')
    try {
      await request(`/announcements/${announcementId}`, { method: 'DELETE', headers })
      setMessage('Announcement deleted successfully.')
      setAnnouncements((current) => current.filter((item) => item._id !== announcementId))
    } catch (delError) {
      setError(delError.message)
    } finally {
      setDeletingId(null)
    }
  }

  const publish = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('title', draft.title)
      fd.append('message', draft.message)
      fd.append('target_type', draft.target_type)
      if (draft.target_type === 'course') {
        fd.append('course_id', draft.course_id)
      } else {
        fd.append('audience', draft.audience)
      }
      if (imageFile) {
        fd.append('image', imageFile)
      }

      await request('/announcements', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      setMessage('Announcement published successfully.')
      setDraft({ title: '', message: '', target_type: 'course', course_id: '', audience: 'students' })
      handleClearImage()
      setShowComposer(false)
      await loadAnnouncements()
    } catch (publishError) {
      setError(publishError.message)
    } finally {
      setSaving(false)
    }
  }

  const unreadCount = announcements.filter((announcement) => !announcement.is_read).length

  return (
    <main className="announcements-page">
      <section className="content-section">
        <header className="announcements-heading">
          <div>
            <p className="eyebrow">UPDATES & BROADCASTS</p>
            <h1>Announcements</h1>
            <p>Course notices and platform updates for your account.</p>
          </div>
          <div className="announcements-heading-actions">
            <span className="announcements-unread-count">{unreadCount} unread</span>
            {canPublish && (
              <button
                className="primary-button announcement-compose-button"
                type="button"
                onClick={() => {
                  setShowComposer(!showComposer)
                  if (!showComposer) handleClearImage()
                }}
              >
                {showComposer ? 'Close' : '+ New Announcement'}
              </button>
            )}
          </div>
        </header>

        {message && <p className="announcement-feedback success" role="status">{message}</p>}
        {error && <p className="announcement-feedback error" role="alert">{error}</p>}

        {showComposer && canPublish && (
          <form className="announcement-composer" onSubmit={publish}>
            <div className="announcement-composer-heading">
              <p className="eyebrow">PUBLISH UPDATE</p>
              <h2>Create New Announcement</h2>
            </div>
            <label className="announcement-field">Title *
              <input value={draft.title} maxLength={140} placeholder="Announcement headline..." onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
            </label>
            <label className="announcement-field">Message *
              <textarea value={draft.message} rows={4} maxLength={6000} placeholder="Write your announcement details, instructions or links..." onChange={(event) => setDraft({ ...draft, message: event.target.value })} required />
            </label>

            {/* Image Attachment Field */}
            <div className="announcement-field">
              <span>Attach Image (Optional)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ padding: '8px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '12px' }}
                />
                {imagePreview && (
                  <button type="button" className="outline-button" onClick={handleClearImage} style={{ padding: '6px 12px', fontSize: '11px', color: '#b91c1c', borderColor: '#fca5a5' }}>
                    Remove Image ✕
                  </button>
                )}
              </div>
              {imagePreview && (
                <div style={{ marginTop: '10px', position: 'relative', width: 'max-content' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '4px', border: '1px solid var(--line)', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>

            {session.role === 'ADMIN' && (
              <fieldset className="announcement-target-options">
                <legend>Send to</legend>
                <label><input type="radio" checked={draft.target_type === 'course'} onChange={() => setDraft({ ...draft, target_type: 'course' })} /> One course</label>
                <label><input type="radio" checked={draft.target_type === 'audience'} onChange={() => setDraft({ ...draft, target_type: 'audience' })} /> Audience broadcast</label>
              </fieldset>
            )}
            {draft.target_type === 'course' ? (
              <label className="announcement-field">Course *
                <select value={draft.course_id} onChange={(event) => setDraft({ ...draft, course_id: event.target.value })} required>
                  <option value="">Select a course</option>
                  {courses.map((course) => <option key={course.course_id} value={course.course_id}>{course.course_title}</option>)}
                </select>
              </label>
            ) : (
              <label className="announcement-field">Audience *
                <select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} required>
                  <option value="students">All students</option>
                  <option value="teachers">All teachers</option>
                  <option value="everyone">Everyone</option>
                </select>
              </label>
            )}
            <div className="announcement-composer-footer">
              <span>Course posts go only to enrolled students.</span>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Publishing...' : 'Publish announcement'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="empty-state">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="announcement-empty">
            <span>ALL CAUGHT UP</span>
            <h2>No announcements yet</h2>
            <p>New course and platform updates will appear here.</p>
          </div>
        ) : (
          <div className="announcement-list">
            {announcements.map((announcement) => {
              const canDelete = session.role === 'ADMIN' || (session.role === 'TEACHER' && announcement.author_email?.toLowerCase() === session.email?.toLowerCase())
              const isDeleting = deletingId === announcement._id

              return (
                <article className={`announcement-card ${announcement.is_read ? '' : 'unread'}`} key={announcement._id}>
                  <div className="announcement-card-topline">
                    <span className={`announcement-unread-dot ${announcement.is_read ? 'read' : ''}`} aria-label={announcement.is_read ? 'Read' : 'Unread'} />
                    <span className="announcement-target-label">
                      {announcement.target_type === 'course' ? `Course: ${announcement.course_title || announcement.course_id}` : `Broadcast: ${audienceNames[announcement.audience] || announcement.audience}`}
                    </span>
                    <time dateTime={announcement.createdAt}>{new Date(announcement.createdAt).toLocaleString()}</time>
                  </div>
                  <h2>{announcement.title}</h2>
                  <p>{announcement.message}</p>

                  {/* Attached Image if present */}
                  {announcement.image && (
                    <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                      <img
                        src={mediaUrl(announcement.image)}
                        alt={announcement.title}
                        className="announcement-card-image"
                        onClick={() => window.open(mediaUrl(announcement.image), '_blank')}
                        title="Click to view full image"
                      />
                    </div>
                  )}

                  <footer className="announcement-card-footer">
                    <span>From <strong>{announcement.author_name}</strong> · {announcement.author_role === 'ADMIN' ? 'UniSkill Admin' : 'Course Teacher'}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {!announcement.is_read && (
                        <button type="button" className="text-button" onClick={() => markRead(announcement)}>
                          Mark as read ✓
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="outline-button"
                          onClick={() => handleDelete(announcement._id)}
                          disabled={isDeleting}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            color: '#b91c1c',
                            borderColor: '#fca5a5',
                            background: '#fef2f2',
                          }}
                          title="Delete this announcement"
                        >
                          {isDeleting ? 'Deleting...' : '🗑 Delete'}
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <style>{`
        .announcements-page .content-section { padding-top: 48px; }
        .announcements-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 24px; }
        .announcements-heading h1 { margin: 0; color: var(--ink); font-size: 30px; line-height: 1.2; }
        .announcements-heading p:not(.eyebrow) { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
        .announcements-heading-actions { display: flex; align-items: center; gap: 12px; }
        .announcements-unread-count { color: var(--muted); font-size: 12px; }
        .announcement-compose-button, .announcement-composer-footer .primary-button { padding: 10px 15px; font-size: 12px; border-radius: 4px; }
        .announcement-composer { display: grid; gap: 14px; margin-bottom: 20px; padding: 20px; border: 1px solid var(--line); background: var(--surface); border-radius: 6px; }
        .announcement-composer-heading .eyebrow { margin-bottom: 5px; font-size: 10px; }
        .announcement-composer-heading h2 { margin: 0; font-size: 20px; line-height: 1.3; }
        .announcement-field { display: grid; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 600; }
        .announcement-field input, .announcement-field select, .announcement-field textarea { width: 100%; min-width: 0; padding: 11px 12px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--ink); font: inherit; font-size: 14px; }
        .announcement-target-options { display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 12px; border: 1px solid var(--line); color: var(--muted); font-size: 12px; border-radius: 4px; }
        .announcement-target-options legend { padding: 0 5px; font-weight: 600; }
        .announcement-target-options label { display: flex; align-items: center; gap: 7px; }
        .announcement-target-options input { accent-color: var(--orange); }
        .announcement-composer-footer { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
        .announcement-composer-footer > span { color: var(--muted); font-size: 11px; }
        .announcement-list { display: grid; gap: 14px; }
        .announcement-card { padding: 19px 20px; border: 1px solid var(--line); background: var(--surface); border-radius: 6px; }
        .announcement-card.unread { border-left: 4px solid var(--orange); }
        .announcement-card-topline { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: 11px; }
        .announcement-target-label { font-weight: 600; color: var(--orange); }
        .announcement-card-topline time { margin-left: auto; text-align: right; }
        .announcement-unread-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: var(--orange); }
        .announcement-unread-dot.read { background: #9AA6AE; }
        .announcement-card h2 { margin: 12px 0 6px; color: var(--ink); font-size: 19px; line-height: 1.35; letter-spacing: normal; }
        .announcement-card > p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
        .announcement-card-image { max-width: 100%; max-height: 380px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); cursor: pointer; transition: opacity .15s ease; }
        .announcement-card-image:hover { opacity: 0.95; }
        .announcement-card-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; padding-top: 11px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; flex-wrap: wrap; }
        .announcement-card-footer .text-button { flex: 0 0 auto; font-size: 12px; }
        .announcement-feedback { padding: 11px 13px; border: 1px solid; font-size: 12px; border-radius: 4px; }
        .announcement-feedback.success { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
        .announcement-feedback.error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
        .announcement-empty { display: grid; min-height: 220px; place-content: center; justify-items: center; gap: 8px; border: 1px dashed var(--line); background: var(--surface); text-align: center; border-radius: 6px; }
        .announcement-empty > span { color: var(--orange); font: 10px var(--mono); }
        .announcement-empty h2 { margin: 0; font-size: 21px; line-height: 1.4; letter-spacing: normal; }
        .announcement-empty p { max-width: 36ch; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
        @media (max-width: 620px) { .announcements-page .content-section { padding: 32px 5vw; } .announcements-heading { align-items: flex-start; flex-direction: column; } .announcements-heading-actions { width: 100%; justify-content: space-between; } .announcement-composer, .announcement-card { padding: 15px; } .announcement-composer-footer { align-items: stretch; flex-direction: column; } .announcement-composer-footer .primary-button { width: 100%; } .announcement-card-topline { flex-wrap: wrap; } .announcement-card-topline time { width: 100%; margin: 2px 0 0 17px; text-align: left; } .announcement-card-footer { align-items: flex-start; flex-direction: column; } }
      `}</style>
    </main>
  )
}