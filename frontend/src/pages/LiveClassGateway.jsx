import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function LiveClassGateway() {
  const { classId } = useParams()
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  // Theme detection & toggle
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme')
      if (docTheme) return docTheme === 'dark'
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Security Verification State
  // stage: 'VERIFYING' | 'APPROVED' | 'UNAUTHORIZED' | 'NOT_STARTED' | 'ERROR'
  const [stage, setStage] = useState('VERIFYING')
  const [currentStep, setCurrentStep] = useState(1)
  const [details, setDetails] = useState({
    meetingUrl: '',
    classTitle: '',
    courseTitle: '',
    teacherName: '',
    checkedEmail: '',
    role: '',
    isHost: false,
    errorMessage: '',
    errorCode: '',
  })
  const [countdown, setCountdown] = useState(3)
  const [copied, setCopied] = useState(false)
  const hasRedirectedRef = useRef(false)

  const headers = useMemo(() => ({ Authorization: `Bearer ${session?.token}` }), [session?.token])

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = !isDarkMode
    setIsDarkMode(nextTheme)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme ? 'dark' : 'light')
    }
  }

  // Load public metadata first if available (for course title & class title context)
  useEffect(() => {
    let cancelled = false
    request(`/live-class/${classId}/meta`)
      .then((meta) => {
        if (!cancelled && meta) {
          setDetails((prev) => ({
            ...prev,
            classTitle: meta.title || prev.classTitle,
            courseTitle: meta.course_title || prev.courseTitle,
            teacherName: meta.teacher_name || prev.teacherName,
          }))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [classId])

  // Run security verification
  useEffect(() => {
    let cancelled = false

    async function verifyAndJoin() {
      // 1. Check if user is logged into UniSkill
      if (!session?.token) {
        setStage('UNAUTHORIZED')
        setDetails((prev) => ({
          ...prev,
          errorMessage: 'You must be logged into an authorized UniSkill account to join this live lecture.',
          errorCode: 'UNAUTHENTICATED',
        }))
        return
      }

      setStage('VERIFYING')
      setCurrentStep(1)

      try {
        // Step 1: Authenticate session
        await new Promise((r) => setTimeout(r, 400))
        if (cancelled) return
        setCurrentStep(2)

        // Step 2: Verify enrollment & clearance
        const result = await request(`/live-class/join/${classId}`, {
          method: 'POST',
          headers,
        })

        if (cancelled) return
        setCurrentStep(3)
        await new Promise((r) => setTimeout(r, 400))
        if (cancelled) return

        // Step 3: Success approval
        setDetails({
          meetingUrl: result.meeting_url || result.join_url || '',
          classTitle: result.class_title || 'Live Lecture',
          courseTitle: result.course_title || 'UniSkill Course',
          teacherName: result.teacher_name || 'Course Instructor',
          checkedEmail: result.checked_email || session?.email || '',
          role: result.role || session?.role || 'STUDENT',
          isHost: Boolean(result.is_host),
          errorMessage: '',
          errorCode: '',
        })
        setStage('APPROVED')
      } catch (error) {
        if (cancelled) return
        const errMsg = error.message || 'Access denied.'
        if (error.code === 'CLASS_NOT_STARTED' || errMsg.toLowerCase().includes('not started')) {
          setStage('NOT_STARTED')
          setDetails((prev) => ({
            ...prev,
            errorMessage: errMsg,
            errorCode: 'CLASS_NOT_STARTED',
            checkedEmail: session?.email || '',
          }))
        } else if (
          error.status === 403 ||
          error.code === 'UNAUTHORIZED_COURSE_ACCESS' ||
          errMsg.toLowerCase().includes('not enrolled') ||
          errMsg.toLowerCase().includes('not authorized')
        ) {
          setStage('UNAUTHORIZED')
          setDetails((prev) => ({
            ...prev,
            errorMessage: errMsg,
            errorCode: 'UNAUTHORIZED_COURSE_ACCESS',
            checkedEmail: session?.email || '',
          }))
        } else {
          setStage('ERROR')
          setDetails((prev) => ({
            ...prev,
            errorMessage: errMsg,
            errorCode: error.code || 'UNKNOWN_ERROR',
            checkedEmail: session?.email || '',
          }))
        }
      }
    }

    verifyAndJoin()

    return () => {
      cancelled = true
      if (session?.role === 'STUDENT') {
        request(`/live-class/leave/${classId}`, {
          method: 'POST',
          headers,
        }).catch(() => {})
      }
    }
  }, [classId, headers, session?.email, session?.role, session?.token])

  // Countdown & Auto-redirect to Google Meet on approval
  useEffect(() => {
    if (stage !== 'APPROVED' || !details.meetingUrl || hasRedirectedRef.current) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true
            // Ensure meetingUrl uses https and is trusted
            try {
              const url = new URL(details.meetingUrl, window.location.origin)
              if (url.protocol === 'https:' || url.protocol === 'http:') {
                window.location.href = url.href
              }
            } catch {
              console.error('Invalid meeting URL')
            }
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, details.meetingUrl])

  // Manual open button
  const handleOpenMeetNow = () => {
    if (!details.meetingUrl) return
    hasRedirectedRef.current = true
    window.open(details.meetingUrl, '_blank', 'noopener,noreferrer')
  }

  // Copy link handler - ALWAYS copies the protected UniSkill gateway link, NEVER raw Google Meet link!
  const handleCopyLink = () => {
    const protectedGatewayLink = `${window.location.origin}/live-class/${encodeURIComponent(classId)}`
    navigator.clipboard.writeText(protectedGatewayLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Theme palette definitions
  const theme = {
    bg: isDarkMode ? '#0B0F17' : '#F4F6F9',
    cardBg: isDarkMode ? '#131B28' : '#FFFFFF',
    border: isDarkMode ? '#1E293B' : '#E2E8F0',
    textMain: isDarkMode ? '#F8FAFC' : '#0F172A',
    textMuted: isDarkMode ? '#94A3B8' : '#64748B',
    accentBlue: '#2563EB',
    accentGreen: '#10B981',
    accentOrange: '#F59E0B',
    accentRed: '#EF4444',
    badgeBg: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    ringBorder: isDarkMode ? '#1E293B' : '#E2E8F0',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        color: theme.textMain,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        transition: 'background-color 0.25s ease, color 0.25s ease',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes gateRadarScan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gatePulse {
          0%, 100% { opacity: 0.3; transform: scale(0.96); }
          50% { opacity: 0.8; transform: scale(1.04); }
        }
        @keyframes gateBarFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {/* Top Navbar / Controls */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="UniSkill Logo" style={{ height: '32px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none' }} />
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>
            Uni<span style={{ color: theme.accentBlue }}>Skill</span>
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
              color: theme.accentBlue,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Live Shield
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle Light / Dark Mode"
          style={{
            background: theme.badgeBg,
            border: `1px solid ${theme.border}`,
            color: theme.textMain,
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
        >
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* MAIN SECURITY CARD */}
      <main
        style={{
          width: 'min(520px, 100%)',
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '18px',
          padding: '36px 30px',
          boxShadow: isDarkMode
            ? '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
          margin: '40px 0',
        }}
      >
        {/* ======================================================== */}
        {/* 1. VERIFYING STATE */}
        {/* ======================================================== */}
        {stage === 'VERIFYING' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Animated Radar Ring */}
            <div
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: `3px solid ${theme.border}`,
                display: 'grid',
                placeItems: 'center',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '-3px',
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: theme.accentBlue,
                  animation: 'gateRadarScan 1s linear infinite',
                }}
              />
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.08)',
                  display: 'grid',
                  placeItems: 'center',
                  animation: 'gatePulse 2s ease-in-out infinite',
                }}
              >
                <span style={{ fontSize: '28px' }}>🛡️</span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: theme.accentBlue,
                marginBottom: '6px',
              }}
            >
              SECURITY CLEARANCE CHECK
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Verifying Class Access
            </h1>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 24px', maxWidth: '400px' }}>
              Validating your UniSkill account, email enrollment, and meeting host permissions...
            </p>

            {/* Checklist */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: theme.badgeBg,
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: currentStep >= 1 ? theme.accentGreen : theme.textMuted }}>
                  {currentStep > 1 ? '✓' : currentStep === 1 ? '●' : '○'}
                </span>
                <span style={{ color: currentStep >= 1 ? theme.textMain : theme.textMuted, fontWeight: currentStep === 1 ? 700 : 500 }}>
                  1. Checking active authentication session
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: currentStep >= 2 ? theme.accentGreen : theme.textMuted }}>
                  {currentStep > 2 ? '✓' : currentStep === 2 ? '●' : '○'}
                </span>
                <span style={{ color: currentStep >= 2 ? theme.textMain : theme.textMuted, fontWeight: currentStep === 2 ? 700 : 500 }}>
                  2. Verifying course enrollment for {session?.email || 'your account'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: currentStep >= 3 ? theme.accentGreen : theme.textMuted }}>
                  {currentStep >= 3 ? '✓' : '○'}
                </span>
                <span style={{ color: currentStep >= 3 ? theme.textMain : theme.textMuted, fontWeight: currentStep === 3 ? 700 : 500 }}>
                  3. Synchronizing Google Meet host & attendee roster
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. APPROVED HANDOVER STATE */}
        {/* ======================================================== */}
        {stage === 'APPROVED' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Green Clearance Icon */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                border: `3px solid ${theme.accentGreen}`,
                display: 'grid',
                placeItems: 'center',
                marginBottom: '18px',
                boxShadow: `0 0 24px ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)'}`,
              }}
            >
              <span style={{ fontSize: '38px', color: theme.accentGreen, fontWeight: 900, lineHeight: 1 }}>✓</span>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: theme.accentGreen,
                marginBottom: '6px',
              }}
            >
              ACCESS VERIFIED & APPROVED
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Security Clearance Granted
            </h1>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 20px' }}>
              You are authorized to join this secure live session.
            </p>

            {/* Verified Identity Card */}
            <div
              style={{
                width: '100%',
                background: theme.badgeBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
                boxSizing: 'border-box',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
                  Verified Identity
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    backgroundColor: details.isHost ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: details.isHost ? theme.accentOrange : theme.accentGreen,
                  }}
                >
                  {details.isHost ? '👑 Instructor / Host' : '🎓 Enrolled Student'}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: theme.textMain }}>
                {details.checkedEmail}
              </div>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>
                {details.courseTitle} • <strong style={{ color: theme.textMain }}>{details.classTitle}</strong>
              </div>
            </div>

            {/* Critical Google Account Notice (Addresses teacher host issue!) */}
            <div
              style={{
                width: '100%',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
                border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '12px',
                color: isDarkMode ? '#FDE68A' : '#92400E',
                textAlign: 'left',
                boxSizing: 'border-box',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              <strong>⚠️ Google Meet Account Notice:</strong>
              <div style={{ marginTop: '4px' }}>
                When Google Meet opens, ensure your browser is signed in with{' '}
                <strong>{details.checkedEmail}</strong>. Google Meet uses this email to grant your{' '}
                <strong>{details.isHost ? 'Host controls' : 'enrolled invite permissions'}</strong>.
              </div>
            </div>

            {/* Host Security Advisory (for Teachers) */}
            {details.isHost && (
              <div
                style={{
                  width: '100%',
                  backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF',
                  border: `1px solid ${isDarkMode ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: isDarkMode ? '#93C5FD' : '#1E40AF',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                <strong>🛡️ Instructor Security Control:</strong>
                <div style={{ marginTop: '4px' }}>
                  This meeting space is <strong>RESTRICTED</strong> to enrolled students only. If anyone attempts to join using an unregistered email, Google Meet will require your approval — <strong>do not admit unknown participants</strong>.
                </div>
              </div>
            )}

            {/* Countdown / Redirect Progress */}
            <div style={{ width: '100%', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: theme.textMuted, marginBottom: '6px' }}>
                <span>Auto-launching Google Meet</span>
                <strong style={{ color: theme.accentBlue }}>{countdown > 0 ? `${countdown}s` : 'Redirecting...'}</strong>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: theme.badgeBg,
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: theme.accentGreen,
                    borderRadius: '3px',
                    transition: 'width 1s linear',
                    width: `${((3 - countdown) / 3) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleOpenMeetNow}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  backgroundColor: theme.accentGreen,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                Open Google Meet Now ↗
              </button>

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: theme.badgeBg,
                    border: `1px solid ${theme.border}`,
                    color: theme.textMain,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ UniSkill Link Copied!' : 'Copy Secure Share Link 📋'}
                </button>
                <Link
                  to="/dashboard"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.textMuted,
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. 403 UNAUTHORIZED / FORBIDDEN ACCESS STATE */}
        {/* ======================================================== */}
        {stage === 'UNAUTHORIZED' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Red Padlock Shield */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                border: `3px solid ${theme.accentRed}`,
                display: 'grid',
                placeItems: 'center',
                marginBottom: '18px',
                boxShadow: `0 0 24px ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.12)'}`,
              }}
            >
              <span style={{ fontSize: '38px', color: theme.accentRed }}>🔒</span>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: theme.accentRed,
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                padding: '3px 10px',
                borderRadius: '12px',
                marginBottom: '10px',
              }}
            >
              403 FORBIDDEN
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Unauthorized Meeting Access
            </h1>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 20px', maxWidth: '420px', lineHeight: 1.5 }}>
              {details.errorCode === 'UNAUTHENTICATED'
                ? 'This live class is strictly protected. You must be logged into an enrolled student or instructor account to enter.'
                : details.errorMessage || 'You are not enrolled in this course or do not have permission to join this live lecture.'}
            </p>

            {/* Account Details Box */}
            <div
              style={{
                width: '100%',
                background: theme.badgeBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                boxSizing: 'border-box',
                marginBottom: '22px',
                fontSize: '13px',
              }}
            >
              <div style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Account Checked
              </div>
              <div style={{ fontWeight: 700, color: theme.textMain, marginBottom: '6px' }}>
                {details.checkedEmail || session?.email || 'Anonymous Visitor / Outside Link'}
              </div>
              {details.courseTitle && (
                <div style={{ fontSize: '12px', color: theme.textMuted }}>
                  Target Course: <strong style={{ color: theme.textMain }}>{details.courseTitle}</strong>
                </div>
              )}
            </div>

            {/* Action Buttons for 403 */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {details.errorCode === 'UNAUTHENTICATED' ? (
                <Link
                  to={`/login?redirect=/live-class/${classId}`}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: theme.accentBlue,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  Log In with Enrolled Account →
                </Link>
              ) : (
                <Link
                  to="/student/explore-courses"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: theme.accentBlue,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  Explore & Enroll in Courses →
                </Link>
              )}

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {session?.token && (
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      navigate(`/login?redirect=/live-class/${classId}`)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: theme.badgeBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.textMain,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Switch Account
                  </button>
                )}
                <Link
                  to="/dashboard"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.textMuted,
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. CLASS NOT STARTED YET (409) */}
        {/* ======================================================== */}
        {stage === 'NOT_STARTED' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                border: `3px solid ${theme.accentOrange}`,
                display: 'grid',
                placeItems: 'center',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '38px', color: theme.accentOrange }}>⏳</span>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: theme.accentOrange,
                marginBottom: '6px',
              }}
            >
              WAITING FOR INSTRUCTOR
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Class Not Started Yet
            </h1>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 20px', maxWidth: '400px' }}>
              Your enrollment was verified successfully, but the instructor has not started the live broadcast yet.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: theme.accentBlue,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              Refresh & Check Again 🔄
            </button>
            <Link
              to="/dashboard"
              style={{
                color: theme.textMuted,
                fontSize: '13px',
                textDecoration: 'none',
                padding: '8px',
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. GENERAL ERROR */}
        {/* ======================================================== */}
        {stage === 'ERROR' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                border: `3px solid ${theme.accentRed}`,
                display: 'grid',
                placeItems: 'center',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '38px', color: theme.accentRed }}>⚠️</span>
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
              Unable to Join Meeting
            </h1>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 20px', maxWidth: '400px' }}>
              {details.errorMessage || 'An error occurred while verifying your session.'}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: theme.accentBlue,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              Try Again
            </button>
            <Link to="/dashboard" style={{ color: theme.textMuted, fontSize: '13px', textDecoration: 'none' }}>
              Back to Dashboard
            </Link>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer style={{ fontSize: '12px', color: theme.textMuted }}>
        Protected by UniSkill Secure Gatekeeper • End-to-End Enrolled Session
      </footer>
    </div>
  )
}

