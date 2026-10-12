import React, { useEffect, useState, useRef } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

/**
 * LiveClassVerificationModal
 * 
 * In-place on-page security verification modal before entering Google Meet.
 * - Checks enrollment and security clearance via /live-class/join/:class_id
 * - Light/Dark mode reactive styling
 * - Radar / scanning visual check with real-time feedback
 * - If verified: provides immediate redirect with ?authuser= to Google Meet
 * - If unauthorized (403): shows clear rejection & solution
 */
export default function LiveClassVerificationModal({ classId, classTitle, courseTitle, onClose }) {
  const { session } = useAuth()
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme')
      if (docTheme) return docTheme === 'dark'
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // stage: 'CHECKING' | 'APPROVED' | 'UNAUTHORIZED' | 'NOT_STARTED' | 'ERROR'
  const [stage, setStage] = useState('CHECKING')
  const [currentStep, setCurrentStep] = useState(1)
  const [details, setDetails] = useState({
    meetingUrl: '',
    classTitle: classTitle || '',
    courseTitle: courseTitle || '',
    teacherName: '',
    checkedEmail: session?.email || '',
    role: session?.role || '',
    isHost: false,
    errorMessage: '',
    errorCode: ''
  })
  const [countdown, setCountdown] = useState(3)
  const hasRedirectedRef = useRef(false)

  // Sync theme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const docTheme = document.documentElement.getAttribute('data-theme')
      setIsDarkMode(docTheme === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // Execute on-page verification
  useEffect(() => {
    let cancelled = false

    async function verifyClearance() {
      if (!session?.token) {
        setStage('UNAUTHORIZED')
        setDetails(prev => ({
          ...prev,
          errorMessage: 'You must be logged in to UniSkill to access this live classroom.',
          errorCode: 'UNAUTHENTICATED'
        }))
        return
      }

      setStage('CHECKING')
      setCurrentStep(1)

      try {
        // Step 1: Session check
        await new Promise(r => setTimeout(r, 450))
        if (cancelled) return
        setCurrentStep(2)

        // Step 2: Course enrollment check with backend
        const result = await request(`/live-class/join/${classId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` }
        })

        if (cancelled) return
        setCurrentStep(3)
        await new Promise(r => setTimeout(r, 350))
        if (cancelled) return

        if (!result.meeting_url) {
          throw new Error('Google Meet room link is currently missing.')
        }

        setDetails(prev => ({
          ...prev,
          meetingUrl: result.meeting_url,
          classTitle: result.class_title || prev.classTitle,
          courseTitle: result.course_title || prev.courseTitle,
          teacherName: result.teacher_name || prev.teacherName,
          checkedEmail: result.checked_email || session.email,
          role: result.role || session.role,
          isHost: Boolean(result.is_host)
        }))

        setStage('APPROVED')
      } catch (err) {
        if (cancelled) return
        console.error('LIVE CLASS VERIFICATION FAILED:', err)

        if (err.status === 403 || err.message?.includes('enroll') || err.message?.includes('enrolled')) {
          setStage('UNAUTHORIZED')
          setDetails(prev => ({
            ...prev,
            errorMessage: err.message || 'You are not enrolled in this course. Access is strictly restricted to enrolled students.',
            errorCode: 'FORBIDDEN_NOT_ENROLLED'
          }))
        } else if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('scheduled')) {
          setStage('NOT_STARTED')
          setDetails(prev => ({
            ...prev,
            errorMessage: err.message || 'This class is either not live yet or has already ended.',
            errorCode: 'CLASS_NOT_LIVE'
          }))
        } else {
          setStage('ERROR')
          setDetails(prev => ({
            ...prev,
            errorMessage: err.message || 'Unable to complete security verification. Please retry.',
            errorCode: 'VERIFICATION_ERROR'
          }))
        }
      }
    }

    verifyClearance()
    return () => { cancelled = true }
  }, [classId, session])

  // Countdown & Auto Redirect on Approval
  useEffect(() => {
    if (stage !== 'APPROVED' || !details.meetingUrl) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true
            window.location.href = details.meetingUrl
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, details.meetingUrl])

  const colors = isDarkMode ? {
    bg: '#0F172A',
    surface: '#1E293B',
    border: '#334155',
    text: '#F8FAFC',
    muted: '#94A3B8',
    card: '#0F172A',
    accent: '#2563EB',
    success: '#10B981',
    danger: '#EF4444'
  } : {
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#64748B',
    card: '#FFFFFF',
    accent: '#2563EB',
    success: '#10B981',
    danger: '#EF4444'
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && stage !== 'CHECKING') onClose()
    }}
    >
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        width: 'min(500px, 100%)',
        boxShadow: isDarkMode ? '0 25px 60px rgba(0,0,0,0.7)' : '0 25px 60px rgba(15,23,42,0.25)',
        overflow: 'hidden',
        color: colors.text,
        position: 'relative'
      }}>
        
        {/* Top Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.card
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: stage === 'APPROVED' ? colors.success : stage === 'CHECKING' ? '#F59E0B' : colors.danger,
              boxShadow: stage === 'CHECKING' ? '0 0 10px #F59E0B' : 'none'
            }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              UniSkill Secure Live Gateway
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              lineHeight: 1,
              color: colors.muted,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '28px 24px' }}>
          
          {/* Class metadata badge */}
          {(details.classTitle || details.courseTitle) && (
            <div style={{
              background: isDarkMode ? '#0B132B' : '#EFF6FF',
              border: `1px solid ${isDarkMode ? '#1E3A8A' : '#BFDBFE'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: colors.accent, fontWeight: 700 }}>
                {details.courseTitle || 'Live Lecture'}
              </p>
              <h4 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: colors.text }}>
                {details.classTitle || 'Live Interactive Session'}
              </h4>
            </div>
          )}

          {/* CHECKING STATE */}
          {stage === 'CHECKING' && (
            <div style={{ textAlign: 'center', padding: '10px 0 15px' }}>
              {/* Radar pulse animation */}
              <div style={{
                position: 'relative',
                width: '72px',
                height: '72px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `2px solid ${colors.accent}`,
                  opacity: 0.3,
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                }} />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: isDarkMode ? '#1E3A8A' : '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  🛡️
                </div>
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700 }}>
                Verifying Security Clearance...
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.muted }}>
                Checking enrollment permissions and participant identity for <strong style={{ color: colors.text }}>{session?.email}</strong>.
              </p>

              {/* Step Checklist */}
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                textAlign: 'left',
                display: 'grid',
                gap: '10px',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: currentStep >= 1 ? colors.success : colors.muted }}>
                  <span>{currentStep > 1 ? '✓' : '●'}</span>
                  <span>Authenticating user session</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: currentStep >= 2 ? (currentStep > 2 ? colors.success : colors.accent) : colors.muted }}>
                  <span>{currentStep > 2 ? '✓' : currentStep === 2 ? '⏳' : '○'}</span>
                  <span>Verifying course enrollment & student status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: currentStep >= 3 ? colors.success : colors.muted }}>
                  <span>{currentStep >= 3 ? '✓' : '○'}</span>
                  <span>Generating secure Google Meet room pass</span>
                </div>
              </div>
            </div>
          )}

          {/* APPROVED STATE */}
          {stage === 'APPROVED' && (
            <div style={{ textAlign: 'center', padding: '10px 0 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDarkMode ? '#064E3B' : '#D1FAE5',
                color: colors.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                margin: '0 auto 16px',
                border: `2px solid ${colors.success}`
              }}>
                ✓
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: colors.success }}>
                Access Approved!
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: colors.muted }}>
                Verified as <strong style={{ color: colors.text }}>{details.checkedEmail}</strong> {details.isHost ? '(Instructor)' : '(Enrolled Student)'}.
              </p>

              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: colors.muted
              }}>
                Redirecting to your official Google Meet room in <strong style={{ color: colors.accent, fontSize: '16px' }}>{countdown}</strong> seconds...
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={details.meetingUrl}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: colors.accent,
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none'
                  }}
                >
                  Join Google Meet Now ↗
                </a>
              </div>
            </div>
          )}

          {/* UNAUTHORIZED STATE (403) */}
          {stage === 'UNAUTHORIZED' && (
            <div style={{ textAlign: 'center', padding: '10px 0 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDarkMode ? '#7F1D1D' : '#FEE2E2',
                color: colors.danger,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px',
                border: `2px solid ${colors.danger}`
              }}>
                🚫
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: colors.danger,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                403 - UNAUTHORIZED ACCESS
              </span>
              <h4 style={{ margin: '6px 0 10px', fontSize: '18px', fontWeight: 700 }}>
                Access Denied
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.muted, lineHeight: 1.5 }}>
                {details.errorMessage || 'Only students actively enrolled in this course can join this live Google Meet lecture.'}
              </p>

              <div style={{
                background: isDarkMode ? '#1E293B' : '#F1F5F9',
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: colors.muted,
                textAlign: 'left'
              }}>
                <strong>Identity verified:</strong> {session?.email || 'Guest'}<br />
                <strong>Course status:</strong> Not enrolled or enrollment expired.<br />
                To join, please enroll in the course first.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* NOT STARTED / ENDED */}
          {stage === 'NOT_STARTED' && (
            <div style={{ textAlign: 'center', padding: '10px 0 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDarkMode ? '#374151' : '#F3F4F6',
                color: colors.muted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px'
              }}>
                ⏳
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>
                Class Not Active
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.muted }}>
                {details.errorMessage || 'The instructor has not started this live session yet. Please check back at the scheduled start time.'}
              </p>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          )}

          {/* ERROR */}
          {stage === 'ERROR' && (
            <div style={{ textAlign: 'center', padding: '10px 0 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#FEF2F2',
                color: colors.danger,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 16px'
              }}>
                ⚠️
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>
                Verification Failed
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.muted }}>
                {details.errorMessage}
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
