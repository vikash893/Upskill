import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import AttendanceModal from '../../components/AttendanceModal'
import Skeleton from '../../components/Skeleton'
import { generateAndOpenLiveClass } from '../../utils/openLiveClass'

export default function TeacherLiveStudio() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }
  const [courses, setCourses] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [googleStatus, setGoogleStatus] = useState({ loading: true, connected: false, account_email: null })
  const [googleNotice, setGoogleNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ course_id: '', title: '', topic: '', scheduled_time: '', duration_minutes: '60' })
  const [activeAttendanceClassId, setActiveAttendanceClassId] = useState(null)

  // Recording Modal state
  const [activeRecordingModal, setActiveRecordingModal] = useState(null)
  const [recordingSourceType, setRecordingSourceType] = useState('url')
  const [recordingForm, setRecordingForm] = useState({ recording_url: '', recording_duration: '' })
  const [recordingFile, setRecordingFile] = useState(null)
  const [savingRecording, setSavingRecording] = useState(false)
  const [selectedPlaybackClass, setSelectedPlaybackClass] = useState(null)

  const getMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `http://localhost:8000/${url.replace(/^\/+/, '')}`
  }

  const fetchLiveStudio = async () => {
    setLoading(true)
    try {
      const coursesData = await request('/teacher/my-courses', { headers })
      const myCourses = coursesData.courses || []
      setCourses(myCourses)
      if (myCourses.length > 0 && !form.course_id) {
        setForm((prev) => ({ ...prev, course_id: myCourses[0].course_id }))
      }

      const allClasses = []
      await Promise.all(
        myCourses.map(async (c) => {
          const res = await request(`/live-class/course/${c.course_id}`, { headers }).catch(() => ({ classes: [] }))
          if (res.classes) {
            res.classes.forEach((cl) => {
              allClasses.push({ ...cl, course_title: c.course_title })
            })
          }
        })
      )

      allClasses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setClasses(allClasses)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveStudio()
    if (session?.role === 'TEACHER') {
      request('/auth/google/meet/status', { headers })
        .then((status) => setGoogleStatus({ loading: false, ...status }))
        .catch(() => setGoogleStatus({ loading: false, connected: false, account_email: null, verificationError: true }))
    } else {
      setGoogleStatus({ loading: false, connected: false, account_email: null })
    }

    const callbackState = new URLSearchParams(window.location.search).get('googleMeet')
    const callbackNotices = {
      connected: 'Google account verified and connected.',
      denied: 'Google authorization was cancelled.',
      'missing-refresh-token': 'Google did not provide offline access. Reconnect and approve the requested permissions.',
      'missing-scopes': 'Google did not grant all permissions needed for Meet scheduling and account verification.',
      'unverified-account': 'Google did not verify the account email. No connection was saved.',
      error: 'Google authorization failed. Check the backend OAuth configuration and try again.',
    }
    if (callbackNotices[callbackState]) setGoogleNotice(callbackNotices[callbackState])
  }, [])

  useEffect(() => {
    const activeMeetClasses = classes.filter((cls) =>
      cls.status === 'live' && cls.meeting_provider === 'google-meet' && cls.meeting_url && !cls.meet_sync_unsupported
    )
    if (!activeMeetClasses.length || session?.role !== 'TEACHER') return undefined

    let checking = false
    const syncMeetStatus = async () => {
      if (checking) return
      checking = true
      try {
        const results = await Promise.all(activeMeetClasses.map(async (cls) => {
          const result = await request(`/live-class/${cls.class_id}/meet-status`, { headers })
          return { classId: cls.class_id, state: result.state, liveClass: result.liveClass }
        }))
        const updates = new Map()
        for (const result of results) {
          if (result.state === 'ended' && result.liveClass) updates.set(result.classId, result.liveClass)
          if (result.state === 'unsupported') updates.set(result.classId, { meet_sync_unsupported: true })
        }
        if (updates.size) {
          setClasses((current) => current.map((cls) => {
            const update = updates.get(cls.class_id)
            return update ? { ...cls, ...update } : cls
          }))
        }
      } catch {
        // Transient Google API failures are retried on the next poll.
      } finally {
        checking = false
      }
    }

    syncMeetStatus()
    const interval = window.setInterval(syncMeetStatus, 15000)
    return () => window.clearInterval(interval)
  }, [classes, session?.role, session?.token])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await request('/live-class/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          duration_minutes: Number(form.duration_minutes || 60),
        }),
      })

      setShowCreate(false)
      setForm({ course_id: courses[0]?.course_id || '', title: '', topic: '', scheduled_time: '', duration_minutes: '60' })
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleOpenClassroom = async (cls) => {
    const openMeeting = (meetingUrl) => {
      if (!meetingUrl) {
        alert('This class does not have a live session URL yet. Please generate it first.')
        return
      }

      window.open(meetingUrl, '_blank', 'noopener,noreferrer')
    }

    const meetingUrl = cls.meeting_url || cls.join_url
    if (meetingUrl) {
      openMeeting(meetingUrl)
      return
    }

    generateAndOpenLiveClass(cls.class_id, session.token)
      .then(fetchLiveStudio)
      .catch((err) => alert(err.message || 'Unable to generate the live session right now.'))
  }

  const handleConnectGoogleMeet = async () => {
    try {
      if (!session?.token) {
        alert('Please log in to connect Google Meet.')
        return
      }

      const returnOrigin = window.location.origin
      const data = await request(`/auth/google/meet?return_origin=${encodeURIComponent(returnOrigin)}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })

      if (!data?.authUrl) {
        throw new Error('Google authorization URL was not returned.')
      }

      window.location.href = data.authUrl
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStatusUpdate = async (classId, nextStatus, confirmMeetEnded = false) => {
    try {
      await request(`/live-class/status/${classId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: nextStatus, confirm_meet_ended: confirmMeetEnded }),
      })
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleRecording = async (cls) => {
    const nextRecording = !cls.is_recording
    try {
      await request(`/live-class/recording/${cls.class_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_recording: nextRecording }),
      })
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSyncRecording = async (cls) => {
    try {
      const result = await request(`/live-class/${cls.class_id}/sync-recording`, {
        method: 'POST',
        headers,
      })
      alert(result.message || 'Recording metadata synchronized successfully')
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveRecording = async (e) => {
    e.preventDefault()
    if (!activeRecordingModal) return
    setSavingRecording(true)
    try {
      const fd = new FormData()
      if (recordingSourceType === 'file' && recordingFile) {
        fd.append('recording_file', recordingFile)
      } else if (recordingSourceType === 'url') {
        fd.append('recording_url', recordingForm.recording_url)
      }
      if (recordingForm.recording_duration) {
        fd.append('recording_duration', recordingForm.recording_duration)
      }

      await request(`/live-class/recording/${activeRecordingModal.class_id}`, {
        method: 'PATCH',
        headers,
        body: fd,
      })

      alert('Recording attached successfully!')
      setActiveRecordingModal(null)
      setRecordingFile(null)
      setRecordingForm({ recording_url: '', recording_duration: '' })
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingRecording(false)
    }
  }

  const handleDeleteClass = async (classId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and its recordings?`)) return
    try {
      await request(`/live-class/${classId}`, {
        method: 'DELETE',
        headers,
      })
      alert('Live class and recording deleted successfully')
      fetchLiveStudio()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">BROADCAST STUDIO</p>
          <h2>Live Classroom & Recording Manager</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="outline-button" onClick={handleConnectGoogleMeet} disabled={googleStatus.loading}>
            {googleStatus.loading ? 'Checking Google...' : googleStatus.connected ? 'Reconnect Google Meet' : 'Connect Google Meet'}
          </button>
          <button className="primary-button" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Schedule Live Class'}
          </button>
        </div>
      </div>

      {session?.role === 'TEACHER' && (
        <p role="status" style={{ margin: '0 0 16px', color: googleStatus.connected ? '#166534' : 'var(--muted)', fontSize: '12px' }}>
          {googleStatus.connected
            ? `Google Meet connected as ${googleStatus.account_email || 'verified Google account'}.`
            : googleStatus.verificationError
              ? 'Google account status could not be verified right now. Try again shortly.'
              : googleStatus.reconnect_required
                ? 'Google authorization has expired or was revoked. Reconnect before scheduling Meet classes.'
                : 'Google Meet is not connected. Connect a verified Google account before scheduling Meet classes.'}
          {googleNotice && ` ${googleNotice}`}
        </p>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} style={{ padding: '25px', border: '1px solid var(--line)', background: '#FFFFFF', marginBottom: '30px', display: 'grid', gap: '15px' }}>
          <p className="eyebrow">SCHEDULE NEW LIVE BROADCAST</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Course *
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
              Class Title *
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Topic / Agenda
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Scheduled Date & Time
              <input type="datetime-local" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '260px' }}>
            <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
              Duration (minutes)
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                style={{ padding: '10px', border: '1px solid var(--line)' }}
              />
            </label>
          </div>

          <button className="primary-button" style={{ justifySelf: 'start' }} type="submit">
            Publish Class & Generate Meet Link
          </button>
        </form>
      )}

      {/* Recording playback modal */}
      {selectedPlaybackClass && (
        <div style={{ padding: '20px', border: '1px solid var(--orange)', background: '#FFFFFF', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <span className="badge" style={{ position: 'static', background: 'var(--orange)', color: 'white' }}>PLAYBACK ARCHIVE</span>
              <h3 style={{ fontSize: '18px', margin: '4px 0 0' }}>{selectedPlaybackClass.title}</h3>
            </div>
            <button className="outline-button" onClick={() => setSelectedPlaybackClass(null)} style={{ fontSize: '11px', padding: '4px 10px' }}>
              Close Player ✕
            </button>
          </div>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', background: '#000' }}>
            {selectedPlaybackClass.recording_url?.includes('youtube.com') || selectedPlaybackClass.recording_url?.includes('youtu.be') ? (
              <iframe
                src={selectedPlaybackClass.recording_url.replace('watch?v=', 'embed/')}
                title={selectedPlaybackClass.title}
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <video
                src={getMediaUrl(selectedPlaybackClass.recording_url)}
                controls
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton variant="class-list" count={3} label="Loading live classes" />
      ) : classes.length === 0 ? (
        <div className="empty-state">No live classes scheduled yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {classes.map((cls) => {
            const isLive = cls.status === 'live'

            return (
              <div
                key={cls.class_id}
                className="stat-card-clean"
                style={{
                  border: isLive ? '2px solid var(--orange)' : '1px solid var(--line)',
                  background: isLive ? '#fff9f4' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span
                      className="badge"
                      style={{
                        position: 'static',
                        background: isLive ? 'red' : cls.status === 'ended' ? '#ddd' : 'var(--lime)',
                        color: isLive ? 'white' : 'var(--ink)',
                        fontWeight: 700,
                      }}
                    >
                      {isLive ? '● LIVE BROADCAST' : cls.status.toUpperCase()}
                    </span>

                    {cls.is_recording && (
                      <span className="badge" style={{ position: 'static', background: '#dc2626', color: 'white', fontWeight: 700 }}>
                        🔴 RECORDING
                      </span>
                    )}

                    {cls.recording_url && (
                      <span className="badge" style={{ position: 'static', background: 'var(--ink)', color: 'white' }}>
                        📼 RECORDING ATTACHED
                      </span>
                    )}

                    <strong style={{ fontSize: '18px' }}>{cls.title}</strong>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 6px' }}>
                    Course: <strong>{cls.course_title}</strong> {cls.topic && `· Agenda: ${cls.topic}`}
                  </p>

                  <p style={{ font: '11px var(--mono)', color: 'var(--muted)', margin: 0 }}>
                    Scheduled: {new Date(cls.scheduled_time).toLocaleString()} · Room: {cls.room_name}
                  </p>
                  {cls.meet_sync_unsupported && (
                    <p style={{ color: '#9a3412', fontSize: '11px', margin: '6px 0 0' }}>
                      End this older Meet in Google Meet, then confirm the LMS class end here.
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {cls.recording_url && (
                    <button
                      className="primary-button"
                      style={{ background: 'var(--orange)', color: 'white', fontSize: '11px', padding: '8px 14px' }}
                      onClick={() => setSelectedPlaybackClass(cls)}
                    >
                      ▶ Watch
                    </button>
                  )}

                  <button
                    className="outline-button"
                    style={{ fontSize: '11px', padding: '8px 12px' }}
                    onClick={() => setActiveAttendanceClassId(cls.class_id)}
                  >
                    📋 Attendance CSV
                  </button>

                  <button
                    className="outline-button"
                    style={{
                      fontSize: '11px',
                      padding: '8px 12px',
                      background: cls.is_recording ? '#fee2e2' : 'white',
                      borderColor: cls.is_recording ? '#dc2626' : 'var(--line)',
                      color: cls.is_recording ? '#dc2626' : 'var(--ink)',
                    }}
                    onClick={() => handleToggleRecording(cls)}
                  >
                    {cls.is_recording ? '⏹ Stop Rec' : '⏺ Record'}
                  </button>

                  <button
                    className="outline-button"
                    style={{ fontSize: '11px', padding: '8px 12px' }}
                    onClick={() => handleSyncRecording(cls)}
                  >
                    🔄 Sync Meet
                  </button>

                  <button
                    className="outline-button"
                    style={{ fontSize: '11px', padding: '8px 12px' }}
                    onClick={() => {
                      setActiveRecordingModal(cls)
                      setRecordingForm({ recording_url: cls.recording_url || '', recording_duration: cls.recording_duration || '' })
                    }}
                  >
                    📁 Upload Rec
                  </button>

                  {cls.status === 'upcoming' && (
                    <button
                      className="primary-button"
                      style={{ background: 'green', color: 'white', padding: '8px 14px', fontSize: '11px' }}
                      onClick={() => handleStatusUpdate(cls.class_id, 'live')}
                    >
                      Start ▶
                    </button>
                  )}

                  {cls.status === 'live' && (
                    <button
                      className="outline-button"
                      style={{ borderColor: '#c0392b', color: '#c0392b', padding: '8px 12px', fontSize: '11px' }}
                      onClick={() => handleStatusUpdate(cls.class_id, 'ended', Boolean(cls.meet_sync_unsupported))}
                    >
                      {cls.meet_sync_unsupported ? 'Confirm Meet ended' : cls.meeting_provider === 'google-meet' ? 'End Meet for everyone ✕' : 'End Class ✕'}
                    </button>
                  )}

                  {cls.status !== 'ended' && (
                    <button
                      className="primary-button"
                      style={{ background: isLive ? 'var(--orange)' : 'var(--ink)', padding: '8px 14px', fontSize: '11px' }}
                      onClick={() => handleOpenClassroom(cls)}
                    >
                      {cls.meeting_url || cls.join_url ? 'Open Google Meet ↗' : 'Open Class ↗'}
                    </button>
                  )}

                  <button
                    className="outline-button"
                    style={{ borderColor: '#c0392b', color: '#c0392b', padding: '8px 10px', fontSize: '11px' }}
                    onClick={() => handleDeleteClass(cls.class_id, cls.title)}
                    title="Delete Live Class & Recording"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Attach / Upload Recording Modal */}
      {activeRecordingModal && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setActiveRecordingModal(null)}>
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">MEDIA ARCHIVE</p>
                <h3>Attach Recording: {activeRecordingModal.title}</h3>
              </div>
              <button className="text-button" onClick={() => setActiveRecordingModal(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveRecording} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '20px', padding: '10px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="recSource" checked={recordingSourceType === 'url'} onChange={() => setRecordingSourceType('url')} />
                  Network Recording URL (YouTube, Vimeo, Cloud MP4)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="recSource" checked={recordingSourceType === 'file'} onChange={() => setRecordingSourceType('file')} />
                  Upload Local MP4 Video File
                </label>
              </div>

              {recordingSourceType === 'url' ? (
                <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                  Recording URL / Link *
                  <input
                    placeholder="https://..."
                    value={recordingForm.recording_url}
                    onChange={(e) => setRecordingForm({ ...recordingForm, recording_url: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>
              ) : (
                <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                  Local Video File (MP4, WebM) *
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setRecordingFile(e.target.files[0])}
                    style={{ padding: '8px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>
              )}

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                Recording Duration (Optional, e.g. 52 mins)
                <input
                  value={recordingForm.recording_duration}
                  onChange={(e) => setRecordingForm({ ...recordingForm, recording_duration: e.target.value })}
                  style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="outline-button" onClick={() => setActiveRecordingModal(null)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={savingRecording}>
                  {savingRecording ? 'Saving Recording...' : 'Save Recording'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {activeAttendanceClassId && (
        <AttendanceModal classId={activeAttendanceClassId} onClose={() => setActiveAttendanceClassId(null)} />
      )}
    </div>
  )
}
