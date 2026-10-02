import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'
import { useActivity } from '../context/activityContextStore'

export default function Profile() {
  const { session, logout, login } = useAuth()
  const activity = useActivity()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Admin Terms & Conditions
  const [termsForm, setTermsForm] = useState({ title: '', ip_logging_notice: '', content: '' })
  const [savingTerms, setSavingTerms] = useState(false)
  const [termsMessage, setTermsMessage] = useState('')

  // Change Password
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!session) return
    setLoading(true)
    const headers = { Authorization: `Bearer ${session.token}` }

    if (session.role === 'TEACHER') {
      request('/teacher/profile', { headers })
        .then((d) => {
          setProfile(d.teacher)
          setForm({ name: d.teacher?.name || '', phone: d.teacher?.phone || '' })
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (session.role === 'ADMIN') {
      request('/terms')
        .then((data) => {
          if (data.terms) {
            setTermsForm({
              title: data.terms.title || '',
              ip_logging_notice: data.terms.ip_logging_notice || '',
              content: data.terms.content || '',
            })
          }
        })
        .catch(() => {})

      setProfile({ email: session.email, name: session.name || 'Admin', role: 'ADMIN' })
      setLoading(false)
    } else {
      request('/get/user/id', { headers })
        .then((d) => {
          setProfile(d.user)
          setForm({ name: d.user?.name || '', phone: d.user?.phone || '' })
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [session])

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const headers = { Authorization: `Bearer ${session.token}` }
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('phone', form.phone)
      if (photoFile) fd.append('photo', photoFile)

      const data = await request('/get/updateProfile', {
        method: 'PATCH',
        headers,
        body: fd,
      })

      setProfile(data.user)
      setEditing(false)
      setPhotoFile(null)
      setPhotoPreview(null)
      setMessage('Profile and photo updated successfully!')

      // Sync session storage
      login({ ...session, name: data.user.name, photo: data.user.photo })
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTerms = async (e) => {
    e.preventDefault()
    setSavingTerms(true)
    setTermsMessage('')
    try {
      await request('/admin/terms', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(termsForm),
      })
      setTermsMessage('Terms & Privacy Policy updated successfully!')
    } catch (err) {
      setTermsMessage(err.message)
    } finally {
      setSavingTerms(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) return
    try {
      const headers = { Authorization: `Bearer ${session.token}` }
      await request('/get/deleteUser', { method: 'DELETE', headers })
      logout()
    } catch (err) {
      setMessage(err.message)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/
    if (!regex.test(passwordForm.new_password)) {
      setPasswordError('Password must be at least 8 characters long, contain at least 1 uppercase letter and 1 special symbol (!@#$%^&*).')
      return
    }

    setPasswordSaving(true)
    try {
      const data = await request('/auth/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify(passwordForm),
      })
      setPasswordMessage(data.message || 'Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <main>
        <section className="content-section">
          <div className="empty-state">Loading profile...</div>
        </section>
      </main>
    )
  }

  const userAvatar = photoPreview || mediaUrl(profile?.photo)
  const activityCells = activity.heatmap.length
    ? [
        ...Array(new Date(`${activity.heatmap[0].date}T00:00:00Z`).getUTCDay()).fill(null),
        ...activity.heatmap,
      ]
    : []

  return (
    <main>
      <section className="content-section">
        <p className="eyebrow">USER PROFILE & IDENTITY</p>
        <h2 style={{ fontSize: '36px', letterSpacing: '-2px', marginBottom: '30px' }}>
          {profile?.name || session.email}
        </h2>

        <section className="profile-activity-panel" aria-labelledby="profile-activity-title">
          <div className="profile-activity-heading">
            <div>
              <p className="eyebrow">DAILY ACTIVITY</p>
              <h3 id="profile-activity-title">Your learning streak</h3>
              <p>One check-in per day keeps your streak growing.</p>
            </div>
            <div className="profile-streak-stats">
              <span><strong>{activity.current_streak || 0}</strong><small>Current</small></span>
              <span><strong>{activity.longest_streak || 0}</strong><small>Best</small></span>
              <span><strong>{activity.active_days || 0}</strong><small>Active days</small></span>
            </div>
          </div>
          <div className="profile-heatmap-scroll" role="img" aria-label="Daily activity heatmap for the past year">
            <div className="profile-heatmap-grid">
              {activityCells.map((day, index) => day ? (
                <span
                  className={`profile-heatmap-day ${day.active ? 'active' : ''}`}
                  key={day.date}
                  title={`${day.date}: ${day.active ? 'active' : 'no activity'}`}
                  aria-hidden="true"
                />
              ) : <span className="profile-heatmap-day spacer" key={`spacer-${index}`} aria-hidden="true" />)}
            </div>
          </div>
          <div className="profile-heatmap-legend"><span>Less</span><i className="profile-heatmap-day" /><i className="profile-heatmap-day active" /><span>More</span><span className="profile-activity-timezone">India time</span></div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
          {/* Left Column: Profile Info & Form */}
          <div>
            <div style={{ padding: '30px', border: '1px solid var(--line)', background: '#FFFFFF', marginBottom: '25px' }}>
              
              {/* Avatar Showcase */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--line)' }}>
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={profile?.name || 'Profile'}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--orange)' }}
                  />
                ) : (
                  <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                    {(profile?.name || session.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '20px' }}>{profile?.name || 'Student Account'}</h3>
                  <span style={{ font: '11px var(--mono)', color: 'var(--orange)', textTransform: 'uppercase' }}>
                    {session.role} LEVEL VERIFIED
                  </span>
                </div>
              </div>

              {!editing ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Full Name</span>
                    <p style={{ margin: '3px 0 0', fontWeight: 600 }}>{profile?.name || '—'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Email Address</span>
                    <p style={{ margin: '3px 0 0', fontWeight: 600 }}>{profile?.email || session.email}</p>
                  </div>
                  {session.role === 'STUDENT' && (
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Phone</span>
                      <p style={{ margin: '3px 0 0', fontWeight: 600 }}>{profile?.phone || '—'}</p>
                    </div>
                  )}
                  {session.role === 'TEACHER' && profile?.course_assigned && (
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Assigned Courses ({profile.course_assigned.length})</span>
                      <p style={{ margin: '3px 0 0', fontWeight: 600, color: 'var(--orange)' }}>
                        {profile.course_assigned.join(', ') || 'No courses assigned yet'}
                      </p>
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Portal Role</span>
                    <p style={{ margin: '3px 0 0', fontWeight: 600 }}>{session.role}</p>
                  </div>
                  {session.role === 'STUDENT' && (
                    <button className="primary-button" style={{ justifySelf: 'start', marginTop: '10px' }} onClick={() => setEditing(true)}>
                      Edit Profile & Photo
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '15px' }}>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Full Name *
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Phone Number *
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{ padding: '12px', border: '1px solid var(--line)', background: '#FFFFFF' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                    Upload / Change Profile Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ padding: '8px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className="primary-button" disabled={saving} type="submit">
                      {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                    <button className="outline-button" type="button" onClick={() => { setEditing(false); setPhotoPreview(null); setPhotoFile(null); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {message && <p className="form-message" style={{ marginTop: '15px' }}>{message}</p>}
            </div>

            {/* DANGER ZONE FOR STUDENTS */}
            {session.role === 'STUDENT' && (
              <div style={{ padding: '25px', border: '1px solid #fecaca', background: '#fef2f2' }}>
                <p className="eyebrow" style={{ color: '#991b1b', marginBottom: '10px' }}>DANGER ZONE</p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '15px' }}>
                  Permanently delete your student account and all enrolled course history.
                </p>
                <button
                  className="outline-button"
                  style={{ borderColor: '#c0392b', color: '#c0392b' }}
                  onClick={handleDelete}
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Role specific tools */}
          <div>
            {/* ADMIN ONLY: QR Code & Payment Setup */}
            {session.role === 'ADMIN' ? (
              <div style={{ padding: '30px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
                <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '8px' }}>LEGAL & AUDIT POLICY</p>
                <h3 style={{ fontSize: '20px', margin: '0 0 10px' }}>Terms & Privacy Policy Editor</h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                  Update terms, IP address logging disclosure notices, and student privacy statements.
                </p>

                <form onSubmit={handleSaveTerms} style={{ display: 'grid', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Policy Title
                    <input
                      required
                      value={termsForm.title}
                      onChange={(e) => setTermsForm({ ...termsForm, title: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    IP & Security Logging Notice
                    <input
                      required
                      value={termsForm.ip_logging_notice}
                      onChange={(e) => setTermsForm({ ...termsForm, ip_logging_notice: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Full Terms & Privacy Content
                    <textarea
                      rows="5"
                      required
                      value={termsForm.content}
                      onChange={(e) => setTermsForm({ ...termsForm, content: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', background: 'white', fontFamily: 'inherit', fontSize: '12px' }}
                    />
                  </label>

                  {termsMessage && <p className="form-message" style={{ margin: 0 }}>{termsMessage}</p>}

                  <button className="primary-button full-width" disabled={savingTerms} type="submit" style={{ marginTop: '6px' }}>
                    {savingTerms ? 'Publishing Policy...' : 'Save & Publish Terms'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ padding: '30px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
                <p className="eyebrow" style={{ marginBottom: '15px' }}>ACADEMIC STATUS</p>
                <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
                  <div style={{ padding: '12px', background: '#f8f6f0', border: '1px solid var(--line)' }}>
                    <strong>Student ID Verification:</strong>
                    <span style={{ display: 'block', color: 'var(--muted)', font: '11px var(--mono)', marginTop: '2px' }}>
                      {profile?.id || profile?._id || 'STU-VERIFIED'}
                    </span>
                  </div>
                  <div style={{ padding: '12px', background: '#f8f6f0', border: '1px solid var(--line)' }}>
                    <strong>Account Standing:</strong>
                    <span style={{ display: 'block', color: '#166534', fontWeight: 600, marginTop: '2px' }}>
                      ✓ Active & Good Standing
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Card for all roles (STUDENT, TEACHER, ADMIN) */}
            <div style={{ padding: '30px', border: '1px solid var(--line)', background: '#FFFFFF', marginTop: '25px' }}>
              <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '8px' }}>SECURITY & ACCESS</p>
              <h3 style={{ fontSize: '20px', margin: '0 0 10px' }}>Change Password</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                Ensure your account is using a secure password. Minimum 8 characters with at least one uppercase letter and one special symbol.
              </p>

              <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Current Password *
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  New Password *
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 8 chars, 1 uppercase, 1 symbol"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Confirm New Password *
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm new password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show passwords
                </label>

                {passwordError && (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px', borderRadius: '4px' }}>
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', borderRadius: '4px' }}>
                    ✓ {passwordMessage}
                  </div>
                )}

                <button className="primary-button full-width" disabled={passwordSaving} type="submit" style={{ marginTop: '6px' }}>
                  {passwordSaving ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <style>{`
          .profile-activity-panel { margin: 0 0 28px; padding: 22px; border: 1px solid var(--line); background: var(--surface); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .profile-activity-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
          .profile-activity-heading .eyebrow { margin-bottom: 5px; font-size: 10px; }
          .profile-activity-heading h3 { margin: 0; color: var(--ink); font-size: 18px; }
          .profile-activity-heading p:not(.eyebrow) { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
          .profile-streak-stats { display: flex; gap: 22px; }
          .profile-streak-stats span { display: grid; justify-items: end; gap: 2px; }
          .profile-streak-stats strong { color: var(--ink); font-size: 20px; }
          .profile-streak-stats small { color: var(--muted); font-size: 10px; }
          .profile-heatmap-scroll { overflow-x: auto; padding: 6px 0 12px; }
          .profile-heatmap-grid { display: grid; width: max-content; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 4px; }
          .profile-heatmap-day { display: block; width: 12px; height: 12px; border: 1px solid var(--line); border-radius: 50%; background: #e5e7eb; transition: transform 0.15s ease, background-color 0.2s ease; cursor: pointer; }
          .profile-heatmap-day:hover { transform: scale(1.4); z-index: 2; }
          .profile-heatmap-day.active { border-color: #16a34a; background: #22c55e; box-shadow: 0 0 4px rgba(34, 197, 94, 0.4); }
          .profile-heatmap-day.spacer { visibility: hidden; border-color: transparent; background: transparent; cursor: default; }
          .profile-heatmap-legend { display: flex; justify-content: flex-end; align-items: center; gap: 6px; color: var(--muted); font-size: 11px; margin-top: 6px; }
          .profile-heatmap-legend .profile-heatmap-day { width: 10px; height: 10px; cursor: default; }
          .profile-activity-timezone { margin-left: 12px; font-size: 10px; }
          @media (max-width: 620px) { .profile-activity-panel { padding: 15px; } .profile-activity-heading { flex-direction: column; } .profile-streak-stats { width: 100%; justify-content: space-between; gap: 8px; } .profile-streak-stats span { justify-items: start; } }
        `}</style>
      </section>
    </main>
  )
}
