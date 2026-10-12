import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function LiveClassGateway() {
  const { classId } = useParams()
  const { session } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', meetingUrl: '', classTitle: '', courseTitle: '' })

  const headers = useMemo(() => ({ Authorization: `Bearer ${session?.token}` }), [session?.token])

  useEffect(() => {
    let cancelled = false

    async function joinClass() {
      setState({ loading: true, error: '', meetingUrl: '', classTitle: '', courseTitle: '' })
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
        })
      } catch (error) {
        if (cancelled) return
        setState({ loading: false, error: error.message || 'Unable to open this live class.', meetingUrl: '', classTitle: '', courseTitle: '' })
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

  if (state.loading) {
    return (
      <main style={styles.shell}>
        <section style={styles.panel}>
          <p className="eyebrow">LIVE CLASS</p>
          <h1 style={styles.title}>Checking access...</h1>
          <p style={styles.muted}>Verifying your login and course enrollment.</p>
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
        <a className="outline-button" href={state.meetingUrl} target="_blank" rel="noreferrer" style={styles.action}>
          Open Meet
        </a>
      </header>

      <section style={styles.launchPad}>
        <div style={styles.launchPanel}>
          <p className="eyebrow" style={{ margin: 0 }}>ACCESS VERIFIED</p>
          <h2 style={styles.overlayTitle}>Your UniSkill class access is approved</h2>
          <p style={styles.overlayText}>
            Google Meet does not allow itself to be displayed inside another website. Continue from here after UniSkill has verified your login and course enrollment.
          </p>
          <a className="primary-button" href={state.meetingUrl} target="_blank" rel="noreferrer" style={styles.action}>
            Open Google Meet
          </a>
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
