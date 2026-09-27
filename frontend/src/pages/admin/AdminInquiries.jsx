import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'

export default function AdminInquiries() {
  const { session } = useAuth()
  const headers = { Authorization: `Bearer ${session.token}` }

  const [inquiries, setInquiries] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [statusUpdate, setStatusUpdate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      let queryUrl = `/admin/inquiries?status=${statusFilter}`
      if (search.trim()) {
        queryUrl += `&search=${encodeURIComponent(search.trim())}`
      }
      const data = await request(queryUrl, { headers })
      setInquiries(data.inquiries || [])
      setUnreadCount(data.unreadCount || 0)
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      console.error('Fetch inquiries error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInquiries()
  }, [statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchInquiries()
  }

  const openInquiryModal = async (inq) => {
    setSelectedInquiry(inq)
    setReplyText(inq.reply || '')
    setStatusUpdate(inq.status || 'unread')

    // If unread, automatically mark as read
    if (inq.status === 'unread') {
      try {
        await request(`/admin/inquiries/${inq._id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'read' }),
        })
        fetchInquiries()
      } catch (err) {
        // non-blocking
      }
    }
  }

  const handleSaveInquiry = async () => {
    if (!selectedInquiry) return
    setSaving(true)
    try {
      await request(`/admin/inquiries/${selectedInquiry._id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: statusUpdate,
          reply: replyText,
        }),
      })
      setMessage('Inquiry updated successfully.')
      setSelectedInquiry(null)
      fetchInquiries()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact query?')) return
    try {
      await request(`/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers,
      })
      setMessage('Inquiry deleted.')
      if (selectedInquiry?._id === id) setSelectedInquiry(null)
      fetchInquiries()
    } catch (err) {
      alert(err.message)
    }
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'unread':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>NEW UNREAD</span>
      case 'read':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 600 }}>READ</span>
      case 'in_progress':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 600 }}>IN PROGRESS</span>
      case 'resolved':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>RESOLVED ✓</span>
      default:
        return <span>{st}</span>
    }
  }

  return (
    <div>
      <section style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <p className="eyebrow">COMMUNICATIONS & HELPDESK</p>
            <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', letterSpacing: '-2.5px', margin: '0 0 10px' }}>
              Student & User Inquiries
            </h1>
            <p className="muted" style={{ maxWidth: '650px', fontSize: '14px' }}>
              Direct messages and questions submitted through the public Contact page by prospective students and active learners.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ padding: '12px 20px', background: unreadCount > 0 ? '#fee2e2' : '#fffdf8', border: '1px solid var(--line)', textAlign: 'center' }}>
              <span style={{ font: '10px var(--mono)', color: unreadCount > 0 ? '#b91c1c' : 'var(--muted)' }}>NEW INQUIRIES</span>
              <strong style={{ display: 'block', fontSize: '24px', color: unreadCount > 0 ? '#b91c1c' : 'var(--ink)' }}>{unreadCount}</strong>
            </div>
            <div style={{ padding: '12px 20px', background: '#fffdf8', border: '1px solid var(--line)', textAlign: 'center' }}>
              <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>TOTAL MESSAGES</span>
              <strong style={{ display: 'block', fontSize: '24px' }}>{totalCount}</strong>
            </div>
          </div>
        </div>
      </section>

      {message && <p className="form-message" style={{ marginBottom: '20px' }}>{message}</p>}

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '25px', background: '#fffdf8', border: '1px solid var(--line)', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'unread', 'read', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? 'primary-button' : 'outline-button'}
              style={{ fontSize: '11px', padding: '6px 14px', textTransform: 'capitalize' }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ marginLeft: 'auto', display: 'flex', gap: '8px', minWidth: '280px' }}>
          <input
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', background: 'white', fontSize: '12px' }}
          />
          <button type="submit" className="outline-button" style={{ fontSize: '11px', padding: '8px 12px' }}>
            Search
          </button>
        </form>
      </div>

      {/* INQUIRIES LIST */}
      {loading ? (
        <div className="empty-state">Loading user inquiries...</div>
      ) : inquiries.length === 0 ? (
        <div className="empty-state">No inquiries found matching the selected filter.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', background: '#fffdf8' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 1.5fr 1fr 1fr auto',
              gap: '12px',
              padding: '12px 18px',
              borderBottom: '1px solid var(--line)',
              font: '10px var(--mono)',
              color: 'var(--muted)',
            }}
          >
            <span>SENDER</span>
            <span>CONTACT</span>
            <span>SUBJECT & CATEGORY</span>
            <span>DATE</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>

          {inquiries.map((inq) => (
            <div
              key={inq._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.2fr 1.5fr 1fr 1fr auto',
                gap: '12px',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '1px solid var(--line)',
                fontSize: '13px',
                background: inq.status === 'unread' ? '#fffaf5' : 'transparent',
              }}
            >
              <div>
                <strong>{inq.name}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--ink)', display: 'block', fontSize: '12px' }}>{inq.email}</span>
                {inq.phone && <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{inq.phone}</span>}
              </div>

              <div>
                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '3px' }}>{inq.subject}</strong>
                <span style={{ font: '10px var(--mono)', color: 'var(--orange)', background: '#fff0e8', padding: '2px 6px', borderRadius: '4px' }}>
                  {inq.category}
                </span>
              </div>

              <div>
                <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>
                  {new Date(inq.createdAt).toLocaleDateString()}
                </span>
                <span style={{ display: 'block', font: '10px var(--mono)', color: '#999' }}>
                  {new Date(inq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div>
                {getStatusBadge(inq.status)}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="primary-button"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => openInquiryModal(inq)}
                >
                  View / Reply
                </button>
                <button
                  className="outline-button"
                  style={{ fontSize: '11px', padding: '6px 10px', borderColor: '#ef4444', color: '#ef4444' }}
                  onClick={() => handleDeleteInquiry(inq._id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL & REPLY MODAL */}
      {selectedInquiry && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelectedInquiry(null)}>
          <div className="auth-modal" style={{ width: 'min(620px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-button" onClick={() => setSelectedInquiry(null)}>×</button>

            <p className="eyebrow">{selectedInquiry.category.toUpperCase()}</p>
            <h2 style={{ fontSize: '26px', letterSpacing: '-1px', marginBottom: '8px' }}>
              {selectedInquiry.subject}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '14px', background: '#fffdf8', border: '1px solid var(--line)', marginBottom: '20px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--muted)', font: '10px var(--mono)', display: 'block' }}>FROM</span>
                <strong>{selectedInquiry.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', font: '10px var(--mono)', display: 'block' }}>EMAIL</span>
                <a href={`mailto:${selectedInquiry.email}`} style={{ color: 'var(--orange)' }}>{selectedInquiry.email}</a>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', font: '10px var(--mono)', display: 'block' }}>PHONE</span>
                <span>{selectedInquiry.phone || 'Not provided'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', font: '10px var(--mono)', display: 'block' }}>RECEIVED ON</span>
                <span>{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ font: '10px var(--mono)', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                MESSAGE CONTENT:
              </span>
              <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '16px', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                {selectedInquiry.message}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px', borderTop: '1px solid var(--line)', paddingTop: '18px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                Update Inquiry Status:
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  style={{ padding: '10px', border: '1px solid var(--line)', background: 'white', font: 'inherit' }}
                >
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                Admin Response / Resolution Notes:
                <textarea
                  rows={4}
                  placeholder="Type notes or email response draft..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ padding: '12px', border: '1px solid var(--line)', background: 'white', font: 'inherit', resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}&body=Dear ${encodeURIComponent(selectedInquiry.name)},%0D%0A%0D%0AThank you for contacting UniSkill Academy.%0D%0A%0D%0A`}
                  className="outline-button"
                  style={{ fontSize: '11px' }}
                >
                  ✉ Open in Email Client
                </a>

                <button
                  className="primary-button"
                  onClick={handleSaveInquiry}
                  disabled={saving}
                  style={{ fontSize: '12px', padding: '10px 22px' }}
                >
                  {saving ? 'Saving...' : 'Save & Update Status ↗'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
