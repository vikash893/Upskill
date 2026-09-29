import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { session, logout, login } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Admin QR settings
  const [qrSettings, setQrSettings] = useState({ upi_id: '', account_name: '', qr_code: null })
  const [qrFile, setQrFile] = useState(null)
  const [savingQr, setSavingQr] = useState(false)
  const [qrMessage, setQrMessage] = useState('')

  // Admin Terms & Conditions
  const [termsForm, setTermsForm] = useState({ title: '', ip_logging_notice: '', content: '' })
  const [savingTerms, setSavingTerms] = useState(false)
  const [termsMessage, setTermsMessage] = useState('')

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
      request('/payment/qr')
        .then((data) => {
          setQrSettings({
            upi_id: data.upi_id || '',
            account_name: data.account_name || '',
            qr_code: data.qr_code || null,
          })
        })
        .catch(() => {})

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
      if (session) {
        const updatedSession = { ...session, name: data.user.name, photo: data.user.photo }
        sessionStorage.setItem('uniskill_auth', JSON.stringify(updatedSession))
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQrSettings = async (e) => {
    e.preventDefault()
    setSavingQr(true)
    setQrMessage('')
    try {
      const fd = new FormData()
      fd.append('upi_id', qrSettings.upi_id)
      fd.append('account_name', qrSettings.account_name)
      if (qrFile) fd.append('qr_code', qrFile)

      const data = await request('/admin/payment-settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: fd,
      })

      setQrSettings({
        upi_id: data.upi_id,
        account_name: data.account_name,
        qr_code: data.qr_code,
      })
      setQrFile(null)
      setQrMessage('Payment settings & QR code updated successfully!')
    } catch (err) {
      setQrMessage(err.message)
    } finally {
      setSavingQr(false)
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

  if (loading) {
    return (
      <main>
        <section className="content-section">
          <div className="empty-state">Loading profile...</div>
        </section>
      </main>
    )
  }

  const userAvatar = photoPreview || (profile?.photo ? (profile.photo.startsWith('http') ? profile.photo : `http://localhost:8000/${profile.photo.replace(/\\/g, '/')}`) : null)

  return (
    <main>
      <section className="content-section">
        <p className="eyebrow">USER PROFILE & IDENTITY</p>
        <h2 style={{ fontSize: '36px', letterSpacing: '-2px', marginBottom: '30px' }}>
          {profile?.name || session.email}
        </h2>

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
              <>
              <div style={{ padding: '30px', border: '2px solid var(--orange)', background: '#fff9f4' }}>
                <p className="eyebrow" style={{ color: 'var(--orange)', marginBottom: '8px' }}>PAYMENT QR & UPI CONFIG</p>
                <h3 style={{ fontSize: '20px', margin: '0 0 10px' }}>Student Payment Scanner</h3>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                  Upload your UPI QR code image and specify your UPI ID. This QR code will appear to students when they purchase paid courses.
                </p>

                {qrSettings.qr_code && (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', font: 'var(--mono)', color: 'var(--muted)', marginBottom: '6px' }}>CURRENT ACTIVE QR CODE</p>
                    <img
                      src={`http://localhost:8000/${qrSettings.qr_code.replace(/\\/g, '/')}`}
                      alt="Active QR"
                      style={{ width: '150px', height: '150px', objectFit: 'contain', border: '1px solid var(--line)', background: 'white', padding: '6px' }}
                    />
                  </div>
                )}

                <form onSubmit={handleSaveQrSettings} style={{ display: 'grid', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    UPI ID / VPA *
                    <input
                      required
                      placeholder="e.g. uniskill@upi"
                      value={qrSettings.upi_id}
                      onChange={(e) => setQrSettings({ ...qrSettings, upi_id: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Account Holder / Business Name
                    <input
                      placeholder="e.g. UniSkill Education Pvt Ltd"
                      value={qrSettings.account_name}
                      onChange={(e) => setQrSettings({ ...qrSettings, account_name: e.target.value })}
                      style={{ padding: '10px', border: '1px solid var(--line)', background: 'white' }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                    Upload QR Code Photo (PNG / JPG)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setQrFile(e.target.files[0])}
                      style={{ padding: '8px', background: 'white', border: '1px solid var(--line)' }}
                    />
                  </label>

                  {qrMessage && <p className="form-message" style={{ margin: 0 }}>{qrMessage}</p>}

                  <button className="primary-button full-width" disabled={savingQr} type="submit" style={{ marginTop: '6px' }}>
                    {savingQr ? 'Saving Settings...' : 'Update QR & Payment Settings'}
                  </button>
                </form>
              </div>

              {/* ADMIN ONLY: Terms & Conditions and Privacy Policy Editor */}
              <div style={{ padding: '30px', border: '1px solid var(--line)', background: '#FFFFFF', marginTop: '25px' }}>
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
              </>
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
          </div>
        </div>
      </section>
    </main>
  )
}
