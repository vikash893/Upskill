import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function LiveClassModal({ liveClass, onClose, onRecordingToggle }) {
  const { session } = useAuth()
  const [isRecording, setIsRecording] = useState(liveClass?.is_recording || false)
  const isTeacherOrAdmin = session?.role === 'TEACHER' || session?.role === 'ADMIN'

  useEffect(() => {
    // If student, log entry
    if (session?.role === 'STUDENT' && liveClass?.class_id) {
      request(`/live-class/join/${liveClass.class_id}`, {
        method: 'POST',
      }).catch((err) => {
        console.log('Join class error:', err)
      })
    }

    return () => {
      // Log exit when unmounting
      if (session?.role === 'STUDENT' && liveClass?.class_id) {
        request(`/live-class/leave/${liveClass.class_id}`, {
          method: 'POST',
        }).catch(() => {})
      }
    }
  }, [liveClass, session])

  const handleToggleRecording = async () => {
    const nextState = !isRecording
    try {
      await request(`/live-class/recording/${liveClass.class_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ is_recording: nextState }),
      })
      setIsRecording(nextState)
      if (onRecordingToggle) onRecordingToggle()
    } catch (err) {
      alert(err.message)
    }
  }

  const [selectedServer, setSelectedServer] = useState(
    (import.meta.env.VITE_JITSI_DOMAIN || 'meet.ffrn.de').replace(/^https?:\/\//, '').replace(/\/+$/, '')
  )

  const handleClose = async () => {
    if (session?.role === 'STUDENT' && liveClass?.class_id) {
      try {
        await request(`/live-class/leave/${liveClass.class_id}`, {
          method: 'POST',
        })
      } catch (err) {
        console.log(err)
      }
    }
    onClose()
  }

  const roomName = liveClass.room_name || `UniSkill_${liveClass.class_id}`
  const displayName = encodeURIComponent(session?.name || session?.email?.split('@')[0] || 'Learner')
  const jitsiDomain = selectedServer || 'meet.ffrn.de'
  const configParams = [
    `userInfo.displayName="${displayName}"`,
    'config.prejoinPageEnabled=false',
    'config.prejoinConfig.enabled=false',
    'config.enableWelcomePage=false',
    'config.disableDeepLinking=true',
    'config.requireDisplayName=false',
    'config.enableClosePage=false',
    'config.readOnlyName=true',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.SHOW_BRAND_WATERMARK=false',
    'interfaceConfig.SHOW_POWERED_BY=false',
  ].join('&')
  const jitsiUrl = `https://${jitsiDomain}/${encodeURIComponent(roomName)}#${configParams}`

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={{ background: '#0D0F12', width: 'min(1200px, 98vw)', height: '92vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '20px 20px 0 var(--lime)', border: '1px solid var(--line)' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#181a17', color: 'white', borderBottom: '1px solid #333', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge" style={{ position: 'static', background: 'red', color: 'white', fontWeight: 700 }}>
                ● LIVE CLASS
              </span>
              {isRecording && (
                <span className="badge" style={{ position: 'static', background: '#dc2626', color: 'white', fontWeight: 700 }}>
                  🔴 RECORDING ON
                </span>
              )}
              <strong style={{ fontSize: '15px' }}>{liveClass.title}</strong>
            </div>
            <p style={{ font: '10px var(--mono)', color: '#aaa', margin: '3px 0 0' }}>
              Course: {liveClass.course_title} · Instructor: {liveClass.teacher_name} · Room: {roomName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Server Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#888' }}>Server:</label>
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                style={{
                  background: '#24272b',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                }}
                title="Select live classroom media server"
              >
                <option value="meet.ffrn.de">Freifunk (Direct / No Login)</option>
                <option value="framatalk.org">Framatalk Open</option>
                <option value="meet.jit.si">Jitsi Meet Public</option>
              </select>
            </div>

            {isTeacherOrAdmin && (
              <button
                className="outline-button"
                onClick={handleToggleRecording}
                style={{
                  color: isRecording ? '#ff6b6b' : 'white',
                  borderColor: isRecording ? '#ff6b6b' : '#555',
                  fontSize: '11px',
                  padding: '6px 12px',
                  background: isRecording ? 'rgba(255,107,107,0.1)' : 'transparent',
                }}
              >
                {isRecording ? '⏹ Stop Recording' : '⏺ Record Session'}
              </button>
            )}

            <a
              href={jitsiUrl}
              target="_blank"
              rel="noreferrer"
              className="outline-button"
              style={{ color: 'white', borderColor: '#555', fontSize: '11px', padding: '6px 12px' }}
            >
              Pop Out ↗
            </a>
            <button
              className="primary-button"
              onClick={handleClose}
              style={{ background: '#0056D2', color: 'white', padding: '8px 16px', fontSize: '12px' }}
            >
              Leave Class ✕
            </button>
          </div>
        </div>

        {/* Embedded Jitsi Meeting Iframe */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <iframe
            key={jitsiUrl}
            src={jitsiUrl}
            title="UniSkill Live Classroom"
            allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-write; clipboard-read"
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        </div>
      </div>
    </div>
  )
}
