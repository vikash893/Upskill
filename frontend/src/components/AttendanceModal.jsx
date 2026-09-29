import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function AttendanceModal({ classId, onClose }) {
  const { session } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAttendance = () => {
    setLoading(true)
    request(`/live-class/attendance/${classId}`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAttendance()
  }, [classId])

  const downloadCsv = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/live-class/export-attendance/${classId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${classId}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      alert('Failed to download CSV: ' + err.message)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" style={{ width: 'min(780px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>

        <p className="eyebrow">ATTENDANCE REPORT</p>
        <h2 style={{ fontSize: '28px', letterSpacing: '-1.5px', marginBottom: '6px' }}>
          {data?.title || 'Live Class Attendance'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>
          Course: <strong>{data?.course_title}</strong> · Scheduled: {data?.scheduled_time ? new Date(data.scheduled_time).toLocaleString() : 'N/A'}
        </p>

        {loading ? (
          <div className="empty-state">Loading attendance records...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF', textAlign: 'center' }}>
                <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>TOTAL ENROLLED</span>
                <strong style={{ display: 'block', fontSize: '24px', margin: '4px 0 0' }}>{data.total_enrolled}</strong>
              </div>
              <div style={{ padding: '12px', border: '1px solid #bbf7d0', background: '#f0fdf4', textAlign: 'center' }}>
                <span style={{ font: '10px var(--mono)', color: '#166534' }}>PRESENT</span>
                <strong style={{ display: 'block', fontSize: '24px', color: '#166534', margin: '4px 0 0' }}>{data.total_present}</strong>
              </div>
              <div style={{ padding: '12px', border: '1px solid #fecaca', background: '#fef2f2', textAlign: 'center' }}>
                <span style={{ font: '10px var(--mono)', color: '#991b1b' }}>ABSENT</span>
                <strong style={{ display: 'block', fontSize: '24px', color: '#991b1b', margin: '4px 0 0' }}>{data.total_absent}</strong>
              </div>
            </div>

            {/* Action button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button className="primary-button" onClick={downloadCsv} style={{ padding: '8px 16px', fontSize: '11px' }}>
                Export Attendance CSV <span>↗</span>
              </button>
            </div>

            {/* Attendance Table */}
            <div style={{ border: '1px solid var(--line)', background: '#FFFFFF' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1fr 1fr 0.7fr', gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--line)', font: '10px var(--mono)', color: 'var(--muted)' }}>
                <span>NAME</span>
                <span>EMAIL</span>
                <span>STATUS</span>
                <span>ENTERED AT</span>
                <span>LEFT AT</span>
                <span>DURATION</span>
              </div>

              {data.attendance?.length === 0 ? (
                <div className="empty-state">No enrolled students found for this course.</div>
              ) : (
                data.attendance.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.2fr 0.8fr 1fr 1fr 0.7fr',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--line)',
                      fontSize: '12px',
                      background: att.status === 'Present' ? '#fff' : '#fafafa',
                    }}
                  >
                    <strong>{att.student_name}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{att.student_email}</span>
                    <span>
                      <span
                        className="badge"
                        style={{
                          position: 'static',
                          background: att.status === 'Present' ? 'var(--lime)' : '#fee2e2',
                          color: att.status === 'Present' ? 'var(--ink)' : '#991b1b',
                          padding: '4px 8px',
                          fontSize: '9px',
                        }}
                      >
                        {att.status.toUpperCase()}
                      </span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {att.entered_at ? new Date(att.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {att.left_at ? new Date(att.left_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <span style={{ font: '11px var(--mono)' }}>
                      {att.status === 'Present' ? `${att.duration_minutes || 0}m` : '0m'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
