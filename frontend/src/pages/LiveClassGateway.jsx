import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function LiveClassGateway() {
  const { classId } = useParams()
  const { session } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', meetingUrl: '', classTitle: '', courseTitle: '', checkedEmail: '' })

  const headers = useMemo(() => ({ Authorization: `Bearer ${session?.token}` }), [session?.token])

  useEffect(() => {
    let cancelled = false

    async function joinClass() {
      setState({ loading: true, error: '', meetingUrl: '', classTitle: '', courseTitle: '', checkedEmail: '' })
      try {
        const result = await request(`/live-class/join/${classId}`, {
          method: 'POST',
          headers,
        })

        if (cancelled) return
        setState({
          loading: false,
          error: '',
          meetingUrl: result.meeting_url || result.join_url || '',
          classTitle: result.class_title || 'Live class',
          courseTitle: result.course_title || '',
          checkedEmail: result.checked_email || session?.email || '',
        })
      } catch (error) {
        if (cancelled) return
        setState({ loading: false, error: error.message || 'Unable to open this live class.', meetingUrl: '', classTitle: '', courseTitle: '', checkedEmail: '' })
      }
    }

    joinClass()

    return () => {
      cancelled = true
      if (session?.role === 'STUDENT') {
        request(`/live-class/leave/${classId}`, {
          method: 'POST',
          headers,
        }).catch(() => {})
      }
    }
  }, [classId, headers, session?.role])

  const openMeet = () => {
    if (!state.meetingUrl) return
    window.open(state.meetingUrl, '_blank', 'noopener,noreferrer')
  }

  if (state.loading) {
    return (
      <main style={styles.shell}>
        <style>{'@keyframes liveClassSecuritySpin { to { transform: rotate(360deg); } }'}</style>
        <section style={{ ...styles.panel, ...styles.securityPanel }}>
          <div style={styles.securityRing}>
            <div style={styles.securityDot} />
          </div>
          <p className="eyebrow" style={{ margin: 0 }}>SECURITY CHECK</p>
          <h1 style={styles.title}>Verifying class access</h1>
          <p style={styles.muted}>Checking your registered email, login token, and course enrollment.</p>
        </section>
      </main>
    )
  }

  if (state.error) {
    return (
      <main style={styles.shell}>
        <section style={styles.panel}>
          <p className="eyebrow">LIVE CLASS</p>
          <h1 style={styles.title}>Access unavailable</h1>
          <p style={styles.muted}>{state.error}</p>
          <Link className="primary-button" to="/dashboard" style={styles.action}>Back to dashboard</Link>
        </section>
      </main>
    )
  }

  return (
    <main style={styles.room}>
      <header style={styles.header}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>SECURE LIVE CLASS</p>
          <h1 style={styles.roomTitle}>{state.classTitle}</h1>
          {state.courseTitle && <p style={styles.roomMeta}>{state.courseTitle}</p>}
        </div>
        <button className="outline-button" type="button" onClick={openMeet} style={styles.action}>
          Open Meet
        </button>
      </header>

      <section style={styles.launchPad}>
        <div style={styles.launchPanel}>
          <div style={styles.verifiedRing}>
            <span style={styles.checkmark}>✓</span>
          </div>
          <p className="eyebrow" style={{ margin: 0 }}>ACCESS VERIFIED</p>
          <h2 style={styles.overlayTitle}>Your UniSkill class access is approved</h2>
          <p style={styles.overlayText}>
            {state.checkedEmail ? `${state.checkedEmail} is enrolled and invited for this class.` : 'Your registered account is enrolled and invited for this class.'}
          </p>
          <p style={styles.overlayText}>
            The meeting will not open automatically. Continue only after this security check.
          </p>
          <button className="primary-button" type="button" onClick={openMeet} style={styles.action}>
            Open Google Meet
          </button>
        </div>
      </section>
    </main>
  )
}

const styles = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#F0F6FF',
    padding: '24px',
  },
  panel: {
    width: 'min(520px, 100%)',
    padding: '28px',
    background: '#FFFFFF',
    border: '1px solid var(--line)',
    borderRadius: '8px',
  },
  securityPanel: {
    display: 'grid',
    justifyItems: 'center',
    textAlign: 'center',
    gap: '12px',
  },
  securityRing: {
    width: '86px',
    height: '86px',
    borderRadius: '50%',
    border: '4px solid rgba(0, 86, 210, 0.14)',
    borderTopColor: 'var(--orange)',
    display: 'grid',
    placeItems: 'center',
    animation: 'liveClassSecuritySpin 1s linear infinite',
  },
  securityDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: 'var(--orange)',
  },
  title: {
    margin: '10px 0',
    fontSize: '32px',
    letterSpacing: '-1px',
  },
  muted: {
    color: 'var(--muted)',
    margin: '0 0 18px',
  },
  room: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    background: '#0f172a',
  },
  header: {
    minHeight: '76px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 22px',
    background: '#FFFFFF',
    borderBottom: '1px solid var(--line)',
  },
  roomTitle: {
    margin: '4px 0',
    fontSize: '20px',
    letterSpacing: '0',
  },
  roomMeta: {
    margin: 0,
    color: 'var(--muted)',
    fontSize: '12px',
  },
  launchPad: {
    position: 'relative',
    minHeight: 0,
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
  },
  launchPanel: {
    width: 'min(560px, 100%)',
    display: 'grid',
    gap: '12px',
    justifyItems: 'center',
    padding: '28px',
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '8px',
    color: '#FFFFFF',
  },
  verifiedRing: {
    width: '92px',
    height: '92px',
    borderRadius: '50%',
    border: '4px solid rgba(132, 204, 22, 0.34)',
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 0 0 12px rgba(132, 204, 22, 0.08)',
  },
  checkmark: {
    fontSize: '38px',
    lineHeight: 1,
    color: '#bef264',
    fontWeight: 800,
  },
  overlayTitle: {
    margin: 0,
    fontSize: '24px',
    letterSpacing: '0',
  },
  overlayText: {
    maxWidth: '520px',
    margin: 0,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  action: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
  },
}
