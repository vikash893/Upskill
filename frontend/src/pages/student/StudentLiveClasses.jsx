import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import LiveClassModal from '../../components/LiveClassModal'

export default function StudentLiveClasses() {
  const { session } = useAuth()
  const [liveClasses, setLiveClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeLiveModal, setActiveLiveModal] = useState(null)
  const [selectedPlaybackClass, setSelectedPlaybackClass] = useState(null)
  const [filterTab, setFilterTab] = useState('all') // 'all', 'live', 'recorded'

  const getMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `http://localhost:8000/${url.replace(/^\/+/, '')}`
  }

  const fetchLiveClasses = async () => {
    setLoading(true)
    const headers = { Authorization: `Bearer ${session.token}` }

    try {
      const myCoursesData = await request('/my-courses', { headers })
      const courses = myCoursesData.courses || []

      const allClasses = []
      await Promise.all(
        courses.map(async (c) => {
          const res = await request(`/live-class/course/${c.course_id}`, { headers }).catch(() => ({ classes: [] }))
          if (res.classes) {
            res.classes.forEach((cl) => {
              // Check if student attended
              const att = cl.attendance?.find((a) => a.student_email?.toLowerCase() === session.email?.toLowerCase())
              allClasses.push({
                ...cl,
                course_title: c.course_title,
                my_attendance: att || null,
              })
            })
          }
        })
      )

      allClasses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setLiveClasses(allClasses)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveClasses()
  }, [])

  const filteredClasses = liveClasses.filter((cls) => {
    if (filterTab === 'live') return cls.status === 'live' || cls.status === 'upcoming'
    if (filterTab === 'recorded') return !!cls.recording_url
    return true
  })

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">INTERACTIVE BROADCASTS & ARCHIVES</p>
          <h2>Live Classes, Recordings & Attendance</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: `All (${liveClasses.length})` },
            { id: 'live', label: `Live / Upcoming (${liveClasses.filter((c) => c.status !== 'ended').length})` },
            { id: 'recorded', label: `Recorded Archives (${liveClasses.filter((c) => c.recording_url).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className="sidebar-link"
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: filterTab === tab.id ? 'var(--ink)' : 'var(--line)',
                background: filterTab === tab.id ? 'var(--ink)' : 'white',
                color: filterTab === tab.id ? 'var(--paper)' : 'var(--ink)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recording Player if selected */}
      {selectedPlaybackClass && (
        <div style={{ padding: '25px', border: '1px solid var(--orange)', background: '#FFFFFF', marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <span className="badge" style={{ position: 'static', background: 'var(--orange)', color: 'white' }}>RECORDING PLAYBACK</span>
              <h3 style={{ fontSize: '20px', margin: '6px 0 0' }}>{selectedPlaybackClass.title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Course: {selectedPlaybackClass.course_title} · Instructor: {selectedPlaybackClass.teacher_name}
              </p>
            </div>
            <button className="outline-button" onClick={() => setSelectedPlaybackClass(null)} style={{ fontSize: '11px', padding: '6px 12px' }}>
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
        <div className="empty-state">Loading live schedule & recordings...</div>
      ) : filteredClasses.length === 0 ? (
        <div className="empty-state">No live classes or recordings found for this category.</div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredClasses.map((cls) => {
            const isLiveNow = cls.status === 'live'
            const att = cls.my_attendance
            const isPresent = att?.status === 'present'

            return (
              <div
                key={cls.class_id}
                className="stat-card-clean"
                style={{
                  border: isLiveNow ? '2px solid var(--orange)' : '1px solid var(--line)',
                  background: isLiveNow ? '#fff9f4' : '#FFFFFF',
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
                      {isLiveNow ? '● LIVE RIGHT NOW' : cls.status.toUpperCase()}
                    </span>

                    {cls.recording_url && (
                      <span className="badge" style={{ position: 'static', background: 'var(--ink)', color: 'white' }}>
                        📼 RECORDED CLASS
                      </span>
                    )}

                    <strong style={{ fontSize: '18px' }}>{cls.title}</strong>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 6px' }}>
                    Course: <strong>{cls.course_title}</strong> {cls.topic && `· Topic: ${cls.topic}`}
                  </p>

                  <p style={{ font: '11px var(--mono)', color: 'var(--muted)', margin: 0 }}>
                    Scheduled: {new Date(cls.scheduled_time).toLocaleString()} · Instructor: {cls.teacher_name}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Attendance status */}
                  {cls.status === 'ended' && (
                    <span
                      className="badge"
                      style={{
                        position: 'static',
                        background: isPresent ? 'var(--lime)' : '#fee2e2',
                        color: isPresent ? 'var(--ink)' : '#991b1b',
                        padding: '6px 12px',
                      }}
                    >
                      {isPresent ? `✓ Present (${att.duration_minutes || 0}m)` : '✗ Absent'}
                    </span>
                  )}

                  {/* Playback recording */}
                  {cls.recording_url && (
                    <button
                      className="primary-button"
                      style={{ background: 'var(--orange)', color: 'white', padding: '9px 18px', fontSize: '12px' }}
                      onClick={() => setSelectedPlaybackClass(cls)}
                    >
                      ▶ Watch Recording
                    </button>
                  )}

                  {/* Join Button */}
                  {cls.status !== 'ended' && (
                    <button
                      className="primary-button"
                      style={{
                        background: isLiveNow ? 'var(--orange)' : 'var(--ink)',
                        padding: '9px 18px',
                        fontSize: '12px',
                      }}
                      onClick={() => setActiveLiveModal(cls)}
                    >
                      {isLiveNow ? 'Join Live Room ↗' : 'Enter Studio ↗'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live Class Modal */}
      {activeLiveModal && (
        <LiveClassModal liveClass={activeLiveModal} onClose={() => setActiveLiveModal(null)} />
      )}
    </div>
  )
}
