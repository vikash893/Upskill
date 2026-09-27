import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import LiveClassModal from '../components/LiveClassModal'
import AttendanceModal from '../components/AttendanceModal'

export default function LearningRoom() {
  const { courseId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  
  const initialTab = searchParams.get('tab') || 'lectures'
  const [activeTab, setActiveTab] = useState(['lectures', 'assignments', 'live'].includes(initialTab) ? initialTab : 'lectures')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['lectures', 'assignments', 'live'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Lectures state
  const [lectures, setLectures] = useState([])
  const [selectedLecture, setSelectedLecture] = useState(null)
  const [showAddLecture, setShowAddLecture] = useState(false)
  const [videoSourceType, setVideoSourceType] = useState('url') // 'url' or 'file'
  const [lectureVideoFile, setLectureVideoFile] = useState(null)
  const [lectureForm, setLectureForm] = useState({ title: '', description: '', video_url: '', duration: '', order: 1 })
  const [notesFile, setNotesFile] = useState(null)
  const [savingLecture, setSavingLecture] = useState(false)

  // Assignments state
  const [assignments, setAssignments] = useState([])
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', due_date: '', total_points: 100 })
  const [assignmentAttachment, setAssignmentAttachment] = useState(null)
  const [submittingAssignment, setSubmittingAssignment] = useState(false)
  const [selectedAssignmentForGrading, setSelectedAssignmentForGrading] = useState(null)
  const [submissionForm, setSubmissionForm] = useState({ assignment_id: '', text: '', file: null })
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })

  // Live classes state
  const [liveClasses, setLiveClasses] = useState([])
  const [showCreateLive, setShowCreateLive] = useState(false)
  const [liveForm, setLiveForm] = useState({ title: '', topic: '', scheduled_time: '' })
  const [activeLiveModal, setActiveLiveModal] = useState(null)
  const [activeAttendanceClassId, setActiveAttendanceClassId] = useState(null)
  const [activeRecordingModal, setActiveRecordingModal] = useState(null) // class object to edit recording
  const [recordingSourceType, setRecordingSourceType] = useState('url') // 'url' or 'file'
  const [recordingForm, setRecordingForm] = useState({ recording_url: '', recording_duration: '' })
  const [recordingFile, setRecordingFile] = useState(null)
  const [savingRecording, setSavingRecording] = useState(false)
  const [selectedRecordedClass, setSelectedRecordedClass] = useState(null)

  const isTeacherOrAdmin = session?.role === 'TEACHER' || session?.role === 'ADMIN'

  const getMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `http://localhost:8000/${url.replace(/^\/+/, '')}`
  }

  // Fetch course details & data
  const fetchData = async () => {
    setLoading(true)
    const headers = { Authorization: `Bearer ${session?.token}` }
    try {
      // Get course
      const courseData = await request(`/course/${courseId}`)
      setCourse(courseData.course)

      // Get lectures
      const lecData = await request(`/lecture/course/${courseId}`, { headers })
      const lecs = lecData.lectures || []
      setLectures(lecs)
      if (lecs.length > 0) {
        setSelectedLecture((prev) => prev ? lecs.find((l) => l.lecture_id === prev.lecture_id) || lecs[0] : lecs[0])
      }

      // Get assignments
      const asgData = await request(`/assignment/course/${courseId}`, { headers })
      setAssignments(asgData.assignments || [])

      // Get live classes
      const liveData = await request(`/live-class/course/${courseId}`, { headers })
      setLiveClasses(liveData.classes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [courseId])

  // ADD LECTURE
  const handleAddLecture = async (e) => {
    e.preventDefault()
    setSavingLecture(true)
    try {
      const fd = new FormData()
      fd.append('course_id', courseId)
      fd.append('title', lectureForm.title)
      fd.append('description', lectureForm.description)
      fd.append('duration', lectureForm.duration)
      fd.append('order', lectureForm.order)

      if (videoSourceType === 'file' && lectureVideoFile) {
        fd.append('video_file', lectureVideoFile)
      } else if (videoSourceType === 'url') {
        fd.append('video_url', lectureForm.video_url)
      }

      if (notesFile) fd.append('notes', notesFile)

      await request('/lecture/add', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      setShowAddLecture(false)
      setLectureForm({ title: '', description: '', video_url: '', duration: '', order: lectures.length + 2 })
      setLectureVideoFile(null)
      setNotesFile(null)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingLecture(false)
    }
  }

  // DELETE LECTURE
  const handleDeleteLecture = async (lectureId, title) => {
    if (!window.confirm(`Are you sure you want to delete lecture "${title}"? This cannot be undone.`)) return
    try {
      await request(`/lecture/${lectureId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      alert('Lecture deleted successfully')
      if (selectedLecture?.lecture_id === lectureId) {
        setSelectedLecture(null)
      }
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // ADD ASSIGNMENT
  const handleAddAssignment = async (e) => {
    e.preventDefault()
    setSubmittingAssignment(true)
    try {
      const fd = new FormData()
      fd.append('course_id', courseId)
      fd.append('title', assignmentForm.title)
      fd.append('description', assignmentForm.description)
      fd.append('due_date', assignmentForm.due_date)
      fd.append('total_points', assignmentForm.total_points)
      if (assignmentAttachment) fd.append('attachment', assignmentAttachment)

      await request('/assignment/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      setShowAddAssignment(false)
      setAssignmentForm({ title: '', description: '', due_date: '', total_points: 100 })
      setAssignmentAttachment(null)
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmittingAssignment(false)
    }
  }

  // STUDENT SUBMIT ASSIGNMENT
  const handleSubmitAssignment = async (assignmentId) => {
    if (!submissionForm.text && !submissionForm.file) {
      alert('Please provide text or attach a file')
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

      alert('Assignment submitted successfully!')
      setSubmissionForm({ assignment_id: '', text: '', file: null })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // TEACHER GRADE SUBMISSION
  const handleGradeSubmission = async (assignmentId, studentEmail) => {
    try {
      await request(`/assignment/grade/${assignmentId}/${studentEmail}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(gradeForm),
      })

      alert('Graded successfully!')
      setGradeForm({ grade: '', feedback: '' })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // CREATE LIVE CLASS
  const handleCreateLive = async (e) => {
    e.preventDefault()
    try {
      await request('/live-class/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          course_id: courseId,
          title: liveForm.title,
          topic: liveForm.topic,
          scheduled_time: liveForm.scheduled_time,
        }),
      })

      setShowCreateLive(false)
      setLiveForm({ title: '', topic: '', scheduled_time: '' })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // TOGGLE LIVE CLASS STATUS
  const handleUpdateLiveStatus = async (classId, nextStatus) => {
    try {
      await request(`/live-class/status/${classId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ status: nextStatus }),
      })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // TOGGLE LIVE CLASS RECORDING STATE
  const handleToggleRecording = async (cls) => {
    const nextRecordingState = !cls.is_recording
    try {
      await request(`/live-class/recording/${cls.class_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ is_recording: nextRecordingState }),
      })
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  // SAVE RECORDING FILE / URL
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
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      alert('Recording attached successfully!')
      setActiveRecordingModal(null)
      setRecordingFile(null)
      setRecordingForm({ recording_url: '', recording_duration: '' })
      fetchData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingRecording(false)
    }
  }

  // DELETE LIVE CLASS / RECORDING
  const handleDeleteLiveClass = async (classId, title) => {
    if (!window.confirm(`Are you sure you want to delete live class/recording "${title}"?`)) return
    try {
      await request(`/live-class/${classId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      alert('Class & Recording deleted successfully')
      if (selectedRecordedClass?.class_id === classId) {
        setSelectedRecordedClass(null)
      }
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const recordedClasses = liveClasses.filter((c) => c.recording_url || c.is_recording)

  if (loading) return <main><div className="empty-state" style={{ margin: '80px auto', maxWidth: '500px' }}>Loading course learning room...</div></main>
  if (error) return <main><div className="empty-state" style={{ margin: '80px auto', maxWidth: '500px' }}>{error} <br/><Link to="/dashboard" className="text-button" style={{ marginTop: '10px', display: 'inline-block' }}>Back to Dashboard</Link></div></main>

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1e9' }}>
      {/* Top Learning Bar */}
      <header style={{ height: '70px', borderBottom: '1px solid var(--line)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="text-button" onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← <span>Back to Workspace</span>
          </button>
          <div style={{ height: '24px', width: '1px', background: 'var(--line)' }} />
          <div>
            <strong style={{ fontSize: '16px' }}>{course?.course_title}</strong>
            <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '10px', fontFamily: 'var(--mono)' }}>CLASSROOM</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'lectures', label: `Lectures (${lectures.length})` },
            { id: 'assignments', label: `Assignments (${assignments.length})` },
            { id: 'live', label: `Live Classes (${liveClasses.filter(c => c.status === 'live').length ? '● LIVE' : liveClasses.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className="sidebar-link"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--ink)' : 'transparent',
                background: activeTab === tab.id ? 'var(--ink)' : 'transparent',
                color: activeTab === tab.id ? 'var(--paper)' : 'var(--ink)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN LEARNING CONTENT */}
      <main style={{ padding: '30px 4vw' }}>
        {/* ========================================================= */}
        {/* TAB 1: LECTURES & STUDY MODULES */}
        {/* ========================================================= */}
        {activeTab === 'lectures' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p className="eyebrow">CURRICULUM</p>
                <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px' }}>Recorded Lectures & Notes</h2>
              </div>
              {isTeacherOrAdmin && (
                <button className="primary-button" onClick={() => setShowAddLecture(!showAddLecture)}>
                  {showAddLecture ? 'Cancel' : '+ Add Lecture'}
                </button>
              )}
            </div>

            {/* Teacher Add Lecture Form */}
            {showAddLecture && (
              <form onSubmit={handleAddLecture} style={{ padding: '25px', border: '1px solid var(--line)', background: '#fffdf8', marginBottom: '30px', display: 'grid', gap: '14px' }}>
                <p className="eyebrow">NEW LECTURE</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Lecture Title *
                    <input required value={lectureForm.title} onChange={(e) => setLectureForm({ ...lectureForm, title: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Duration (e.g. 45 mins)
                    <input value={lectureForm.duration} onChange={(e) => setLectureForm({ ...lectureForm, duration: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                </div>

                {/* Video Source Selection: Local File Upload vs Network URL */}
                <div style={{ padding: '14px', background: 'white', border: '1px solid var(--line)', display: 'grid', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>VIDEO SOURCE:</span>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input type="radio" name="vidSource" checked={videoSourceType === 'url'} onChange={() => setVideoSourceType('url')} />
                      Network Video URL (YouTube, Vimeo, or Web MP4)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input type="radio" name="vidSource" checked={videoSourceType === 'file'} onChange={() => setVideoSourceType('file')} />
                      Upload Local Video File (MP4, WebM)
                    </label>
                  </div>

                  {videoSourceType === 'url' ? (
                    <input
                      placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                      value={lectureForm.video_url}
                      onChange={(e) => setLectureForm({ ...lectureForm, video_url: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', width: '100%' }}
                    />
                  ) : (
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setLectureVideoFile(e.target.files[0])}
                      style={{ padding: '8px', border: '1px solid var(--line)', background: '#fff' }}
                    />
                  )}
                </div>

                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Description / Topic Notes
                  <textarea rows="3" value={lectureForm.description} onChange={(e) => setLectureForm({ ...lectureForm, description: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit' }} />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Study Notes / PDF Attachment (Optional)
                    <input type="file" onChange={(e) => setNotesFile(e.target.files[0])} style={{ padding: '8px', background: 'white', border: '1px solid var(--line)' }} />
                  </label>
                </div>

                <button className="primary-button" style={{ justifySelf: 'start' }} disabled={savingLecture} type="submit">
                  {savingLecture ? 'Uploading...' : 'Save & Publish Lecture'}
                </button>
              </form>
            )}

            {lectures.length === 0 ? (
              <div className="empty-state">No lectures have been uploaded for this course yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '25px', alignItems: 'start' }}>
                {/* Active Player / Content View */}
                <div style={{ background: '#fffdf8', border: '1px solid var(--line)', padding: '25px' }}>
                  {selectedLecture ? (
                    <>
                      {/* Video Player */}
                      {selectedLecture.video_url ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', background: '#000', marginBottom: '20px' }}>
                          {selectedLecture.video_url.includes('youtube.com') || selectedLecture.video_url.includes('youtu.be') ? (
                            <iframe
                              src={selectedLecture.video_url.replace('watch?v=', 'embed/')}
                              title={selectedLecture.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                            />
                          ) : (
                            <video
                              src={getMediaUrl(selectedLecture.video_url)}
                              controls
                              controlsList="nodownload"
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            />
                          )}
                        </div>
                      ) : (
                        <div style={{ height: '220px', background: '#eeeade', display: 'grid', placeContent: 'center', color: 'var(--muted)', font: '12px var(--mono)', marginBottom: '20px' }}>
                          NO VIDEO ATTACHED · STUDY NOTES BELOW
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="eyebrow" style={{ marginBottom: '6px' }}>LESSON</p>
                          <h3 style={{ fontSize: '24px', letterSpacing: '-1px', margin: '0 0 10px' }}>{selectedLecture.title}</h3>
                        </div>
                        {isTeacherOrAdmin && (
                          <button
                            className="outline-button"
                            style={{ borderColor: '#c0392b', color: '#c0392b', fontSize: '11px', padding: '6px 12px' }}
                            onClick={() => handleDeleteLecture(selectedLecture.lecture_id, selectedLecture.title)}
                          >
                            Delete Lecture 🗑
                          </button>
                        )}
                      </div>

                      <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, marginBottom: '20px' }}>
                        {selectedLecture.description || 'No additional lecture notes provided.'}
                      </p>

                      {selectedLecture.notes_file && (
                        <div style={{ padding: '15px', border: '1px solid var(--lime)', background: '#fbfef2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '13px' }}>📄 Downloadable Study Materials</strong>
                            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '2px 0 0' }}>PDF / Supplementary notes for this lesson</p>
                          </div>
                          <a
                            href={getMediaUrl(selectedLecture.notes_file)}
                            target="_blank"
                            rel="noreferrer"
                            className="primary-button"
                            style={{ fontSize: '11px', padding: '8px 14px' }}
                          >
                            Download Notes ↗
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-state">Select a lecture from the list to start watching.</div>
                  )}
                </div>

                {/* Playlist Sidebar */}
                <div style={{ background: '#fffdf8', border: '1px solid var(--line)', padding: '20px' }}>
                  <p className="eyebrow" style={{ marginBottom: '15px' }}>ALL LESSONS ({lectures.length})</p>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {lectures.map((lec, index) => (
                      <div
                        key={lec.lecture_id}
                        onClick={() => setSelectedLecture(lec)}
                        style={{
                          padding: '12px 14px',
                          border: selectedLecture?.lecture_id === lec.lecture_id ? '1px solid var(--orange)' : '1px solid var(--line)',
                          background: selectedLecture?.lecture_id === lec.lecture_id ? '#fff8f4' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>0{index + 1}</span>
                          <strong style={{ display: 'block', fontSize: '13px', margin: '2px 0 0' }}>{lec.title}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {lec.duration && (
                            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>{lec.duration}</span>
                          )}
                          {isTeacherOrAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteLecture(lec.lecture_id, lec.title)
                              }}
                              style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '13px' }}
                              title="Delete Lecture"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ASSIGNMENTS & TASKS */}
        {/* ========================================================= */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p className="eyebrow">EVALUATIONS</p>
                <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px' }}>Course Assignments</h2>
              </div>
              {isTeacherOrAdmin && (
                <button className="primary-button" onClick={() => setShowAddAssignment(!showAddAssignment)}>
                  {showAddAssignment ? 'Cancel' : '+ Create Assignment'}
                </button>
              )}
            </div>

            {/* Create Assignment Form */}
            {showAddAssignment && (
              <form onSubmit={handleAddAssignment} style={{ padding: '25px', border: '1px solid var(--line)', background: '#fffdf8', marginBottom: '30px', display: 'grid', gap: '14px' }}>
                <p className="eyebrow">NEW ASSIGNMENT</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '15px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Title *
                    <input required value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Due Date
                    <input type="datetime-local" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Total Points
                    <input type="number" value={assignmentForm.total_points} onChange={(e) => setAssignmentForm({ ...assignmentForm, total_points: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Task Instructions *
                  <textarea rows="3" required value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit' }} />
                </label>
                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Attach Problem Sheet / Reference Material
                  <input type="file" onChange={(e) => setAssignmentAttachment(e.target.files[0])} style={{ padding: '8px', background: 'white', border: '1px solid var(--line)' }} />
                </label>
                <button className="primary-button" style={{ justifySelf: 'start' }} disabled={submittingAssignment} type="submit">
                  {submittingAssignment ? 'Creating...' : 'Publish Assignment'}
                </button>
              </form>
            )}

            {assignments.length === 0 ? (
              <div className="empty-state">No assignments published for this course yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '18px' }}>
                {assignments.map((asg) => {
                  const mySub = asg.my_submission
                  const isSubmitted = !!mySub
                  const isGraded = mySub?.status === 'graded'

                  return (
                    <div key={asg.assignment_id} style={{ background: '#fffdf8', border: '1px solid var(--line)', padding: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <p className="eyebrow" style={{ marginBottom: '4px' }}>ASSIGNMENT</p>
                          <h3 style={{ fontSize: '20px', margin: 0 }}>{asg.title}</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge" style={{ position: 'static' }}>{asg.total_points} Points</span>
                          {asg.due_date && (
                            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
                              Due: {new Date(asg.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px' }}>{asg.description}</p>

                      {asg.attachment && (
                        <div style={{ marginBottom: '18px' }}>
                          <a href={getMediaUrl(asg.attachment)} target="_blank" rel="noreferrer" className="text-button">
                            📄 Download Assignment Reference File <span>↗</span>
                          </a>
                        </div>
                      )}

                      {/* STUDENT VIEW: SUBMISSION FORM & STATUS */}
                      {session?.role === 'STUDENT' && (
                        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '10px' }}>
                          {isSubmitted ? (
                            <div style={{ padding: '16px', background: isGraded ? '#f0fdf4' : '#fff8f0', border: '1px solid var(--line)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '13px' }}>
                                  {isGraded ? `✓ Graded: ${mySub.grade} / ${asg.total_points}` : '⏳ Submission Received (Pending Grade)'}
                                </strong>
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                  Submitted on {new Date(mySub.submitted_at).toLocaleDateString()}
                                </span>
                              </div>
                              {mySub.feedback && (
                                <p style={{ fontSize: '12px', color: '#166534', margin: '6px 0 0' }}>
                                  <strong>Instructor Feedback:</strong> {mySub.feedback}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gap: '10px' }}>
                              <p className="eyebrow" style={{ margin: 0 }}>YOUR SUBMISSION</p>
                              <textarea
                                rows="2"
                                placeholder="Type your answer, notes, or link here..."
                                value={submissionForm.assignment_id === asg.assignment_id ? submissionForm.text : ''}
                                onChange={(e) => setSubmissionForm({ ...submissionForm, assignment_id: asg.assignment_id, text: e.target.value })}
                                style={{ padding: '10px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit' }}
                              />
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                  type="file"
                                  onChange={(e) => setSubmissionForm({ ...submissionForm, assignment_id: asg.assignment_id, file: e.target.files[0] })}
                                  style={{ fontSize: '11px' }}
                                />
                                <button className="primary-button" onClick={() => handleSubmitAssignment(asg.assignment_id)} style={{ padding: '8px 16px', fontSize: '11px' }}>
                                  Submit Assignment
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TEACHER/ADMIN VIEW: SUBMISSIONS LIST & GRADING */}
                      {isTeacherOrAdmin && asg.submissions && (
                        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '10px' }}>
                          <p className="eyebrow" style={{ marginBottom: '10px' }}>
                            STUDENT SUBMISSIONS ({asg.submissions.length})
                          </p>
                          {asg.submissions.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>No student has submitted work for this assignment yet.</p>
                          ) : (
                            <div style={{ display: 'grid', gap: '10px' }}>
                              {asg.submissions.map((sub) => (
                                <div key={sub.student_email} style={{ padding: '12px', border: '1px solid var(--line)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong>{sub.student_name}</strong> ({sub.student_email})
                                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>{sub.submission_text || 'File submission'}</p>
                                    {sub.attachment && (
                                      <a href={getMediaUrl(sub.attachment)} target="_blank" rel="noreferrer" className="text-button" style={{ fontSize: '11px' }}>
                                        Download student attachment ↗
                                      </a>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    {sub.status === 'graded' ? (
                                      <span className="badge" style={{ position: 'static', background: 'var(--lime)' }}>
                                        {sub.grade} / {asg.total_points}
                                      </span>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                          type="text"
                                          placeholder="Grade"
                                          style={{ width: '60px', padding: '6px', border: '1px solid var(--line)', fontSize: '11px' }}
                                          value={selectedAssignmentForGrading === sub.student_email ? gradeForm.grade : ''}
                                          onChange={(e) => { setSelectedAssignmentForGrading(sub.student_email); setGradeForm({ ...gradeForm, grade: e.target.value }) }}
                                        />
                                        <input
                                          type="text"
                                          placeholder="Feedback"
                                          style={{ width: '120px', padding: '6px', border: '1px solid var(--line)', fontSize: '11px' }}
                                          value={selectedAssignmentForGrading === sub.student_email ? gradeForm.feedback : ''}
                                          onChange={(e) => { setSelectedAssignmentForGrading(sub.student_email); setGradeForm({ ...gradeForm, feedback: e.target.value }) }}
                                        />
                                        <button className="primary-button" style={{ padding: '6px 10px', fontSize: '10px' }} onClick={() => handleGradeSubmission(asg.assignment_id, sub.student_email)}>
                                          Save
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LIVE CLASSES STUDIO (JITSI MEET) & RECORDINGS */}
        {/* ========================================================= */}
        {activeTab === 'live' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p className="eyebrow">INTERACTIVE ROOM & RECORDINGS</p>
                <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px' }}>Live Video Classes & Archives</h2>
              </div>
              {isTeacherOrAdmin && (
                <button className="primary-button" onClick={() => setShowCreateLive(!showCreateLive)}>
                  {showCreateLive ? 'Cancel' : '+ Schedule / Start Live Class'}
                </button>
              )}
            </div>

            {/* Create Live Class Form */}
            {showCreateLive && (
              <form onSubmit={handleCreateLive} style={{ padding: '25px', border: '1px solid var(--line)', background: '#fffdf8', marginBottom: '30px', display: 'grid', gap: '14px' }}>
                <p className="eyebrow">SCHEDULE LIVE CLASS</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Class Title *
                    <input required value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Scheduled Date & Time
                    <input type="datetime-local" value={liveForm.scheduled_time} onChange={(e) => setLiveForm({ ...liveForm, scheduled_time: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Topic / Agenda
                  <input value={liveForm.topic} onChange={(e) => setLiveForm({ ...liveForm, topic: e.target.value })} style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }} />
                </label>
                <button className="primary-button" style={{ justifySelf: 'start' }} type="submit">
                  Publish Live Class
                </button>
              </form>
            )}

            {/* Recorded Class Watch Player if selected */}
            {selectedRecordedClass && (
              <div style={{ padding: '25px', border: '1px solid var(--orange)', background: '#fffdf8', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span className="badge" style={{ position: 'static', background: 'var(--orange)', color: 'white' }}>RECORDING PLAYBACK</span>
                    <h3 style={{ fontSize: '20px', margin: '6px 0 0' }}>{selectedRecordedClass.title}</h3>
                  </div>
                  <button className="outline-button" onClick={() => setSelectedRecordedClass(null)} style={{ fontSize: '11px', padding: '6px 12px' }}>
                    Close Player ✕
                  </button>
                </div>

                {selectedRecordedClass.recording_url ? (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', background: '#000', marginBottom: '14px' }}>
                    {selectedRecordedClass.recording_url.includes('youtube.com') || selectedRecordedClass.recording_url.includes('youtu.be') ? (
                      <iframe
                        src={selectedRecordedClass.recording_url.replace('watch?v=', 'embed/')}
                        title={selectedRecordedClass.title}
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                      />
                    ) : (
                      <video
                        src={getMediaUrl(selectedRecordedClass.recording_url)}
                        controls
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', background: '#eee', color: 'var(--muted)' }}>
                    Recording is currently being processed or recorded live.
                  </div>
                )}
              </div>
            )}

            {liveClasses.length === 0 ? (
              <div className="empty-state">No live classes scheduled for this course.</div>
            ) : (
              <div style={{ display: 'grid', gap: '18px' }}>
                {liveClasses.map((cls) => {
                  const isLiveNow = cls.status === 'live'
                  return (
                    <div
                      key={cls.class_id}
                      style={{
                        background: isLiveNow ? '#fff9f4' : '#fffdf8',
                        border: isLiveNow ? '2px solid var(--orange)' : '1px solid var(--line)',
                        padding: '25px',
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
                              background: isLiveNow ? 'red' : cls.status === 'ended' ? '#ddd' : 'var(--lime)',
                              color: isLiveNow ? 'white' : 'var(--ink)',
                              fontWeight: 700,
                            }}
                          >
                            {isLiveNow ? '● LIVE NOW' : cls.status.toUpperCase()}
                          </span>

                          {cls.is_recording && (
                            <span className="badge" style={{ position: 'static', background: '#dc2626', color: 'white', fontWeight: 700 }}>
                              🔴 RECORDING IN PROGRESS
                            </span>
                          )}

                          {cls.recording_url && (
                            <span className="badge" style={{ position: 'static', background: 'var(--ink)', color: 'white' }}>
                              📼 RECORDED ARCHIVE READY
                            </span>
                          )}

                          <strong style={{ fontSize: '18px' }}>{cls.title}</strong>
                        </div>
                        {cls.topic && <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 6px' }}>{cls.topic}</p>}
                        <p style={{ font: '11px var(--mono)', color: 'var(--muted)', margin: 0 }}>
                          Scheduled: {new Date(cls.scheduled_time).toLocaleString()} · Instructor: {cls.teacher_name}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Playback Recording if available */}
                        {cls.recording_url && (
                          <button
                            className="primary-button"
                            style={{ background: 'var(--orange)', color: 'white', padding: '8px 14px', fontSize: '11px' }}
                            onClick={() => setSelectedRecordedClass(cls)}
                          >
                            ▶ Watch Recording
                          </button>
                        )}

                        {/* Attendance Tracker Button for Teachers / Admins */}
                        {isTeacherOrAdmin && (
                          <button
                            className="outline-button"
                            style={{ fontSize: '11px', padding: '8px 14px' }}
                            onClick={() => setActiveAttendanceClassId(cls.class_id)}
                          >
                            📋 Attendance & CSV
                          </button>
                        )}

                        {/* Teacher Recording Controls */}
                        {isTeacherOrAdmin && (
                          <>
                            <button
                              className="outline-button"
                              style={{
                                fontSize: '11px',
                                padding: '8px 14px',
                                background: cls.is_recording ? '#fee2e2' : 'white',
                                borderColor: cls.is_recording ? '#dc2626' : 'var(--line)',
                                color: cls.is_recording ? '#dc2626' : 'var(--ink)',
                              }}
                              onClick={() => handleToggleRecording(cls)}
                            >
                              {cls.is_recording ? '⏹ Stop Recording' : '⏺ Record Live Class'}
                            </button>

                            <button
                              className="outline-button"
                              style={{ fontSize: '11px', padding: '8px 14px' }}
                              onClick={() => {
                                setActiveRecordingModal(cls)
                                setRecordingForm({ recording_url: cls.recording_url || '', recording_duration: cls.recording_duration || '' })
                              }}
                            >
                              📁 Attach Recording
                            </button>
                          </>
                        )}

                        {/* Teacher Live Start / End Controls */}
                        {isTeacherOrAdmin && cls.status === 'upcoming' && (
                          <button
                            className="primary-button"
                            style={{ background: 'green', color: 'white', padding: '8px 16px', fontSize: '11px' }}
                            onClick={() => handleUpdateLiveStatus(cls.class_id, 'live')}
                          >
                            Start Live Class ▶
                          </button>
                        )}
                        {isTeacherOrAdmin && cls.status === 'live' && (
                          <button
                            className="outline-button"
                            style={{ borderColor: '#c0392b', color: '#c0392b', padding: '8px 14px', fontSize: '11px' }}
                            onClick={() => handleUpdateLiveStatus(cls.class_id, 'ended')}
                          >
                            End Class ✕
                          </button>
                        )}

                        {/* Join Live Class Button */}
                        {(isLiveNow || isTeacherOrAdmin) && cls.status !== 'ended' && (
                          <button
                            className="primary-button"
                            style={{ background: isLiveNow ? 'var(--orange)' : 'var(--ink)', padding: '10px 20px', fontSize: '12px' }}
                            onClick={() => setActiveLiveModal(cls)}
                          >
                            {isTeacherOrAdmin ? 'Enter Live Room ↗' : 'Join Live Class ↗'}
                          </button>
                        )}

                        {/* Delete Class/Recording Button */}
                        {isTeacherOrAdmin && (
                          <button
                            className="outline-button"
                            style={{ borderColor: '#c0392b', color: '#c0392b', padding: '8px 12px', fontSize: '11px' }}
                            onClick={() => handleDeleteLiveClass(cls.class_id, cls.title)}
                            title="Delete this live class and its recording"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

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

      {/* Jitsi Live Class Modal */}
      {activeLiveModal && (
        <LiveClassModal liveClass={activeLiveModal} onClose={() => setActiveLiveModal(null)} onRecordingToggle={() => fetchData()} />
      )}

      {/* Attendance Modal */}
      {activeAttendanceClassId && (
        <AttendanceModal classId={activeAttendanceClassId} onClose={() => setActiveAttendanceClassId(null)} />
      )}
    </div>
  )
}
