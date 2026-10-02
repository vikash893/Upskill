import { useEffect, useState } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'
import ReceiptModal from '../components/ReceiptModal'
import { mediaUrl } from '../utils/mediaUrl'

export default function AdminPayments() {
  const { session } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [rejectingPayment, setRejectingPayment] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const fetchPayments = () => {
    setLoading(true)
    const query = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
    request(`/payment/all${query}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => setPayments(data.payments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  const handleApprove = async (paymentId) => {
    if (!window.confirm('Approve this payment and enroll student in the course with corresponding plan duration?')) return
    try {
      await request(`/payment/approve/${paymentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setActionMessage('Payment approved and student enrolled successfully with active plan duration!')
      fetchPayments()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    try {
      await request(`/payment/reject/${rejectingPayment.payment_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      setActionMessage('Payment rejected.')
      setRejectingPayment(null)
      setRejectionReason('')
      fetchPayments()
    } catch (err) {
      alert(err.message)
    }
  }

  const pendingCount = payments.filter((p) => p.status === 'pending').length
  const totalApprovedAmount = payments.filter((p) => p.status === 'approved').reduce((acc, curr) => acc + (curr.final_amount || 0), 0)

  return (
    <main>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADMIN PORTAL</p>
            <h2>Payment & Enrollment Approvals</h2>
          </div>
          <p className="section-note">Verify student receipts, approve course access, and manage transactions.</p>
        </div>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div style={{ padding: '20px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>TOTAL REVENUE</span>
            <strong style={{ display: 'block', fontSize: '32px', color: 'var(--orange)', margin: '8px 0 0' }}>₹{totalApprovedAmount}</strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>from approved payments</small>
          </div>
          <div style={{ padding: '20px', border: '1px solid #fed7aa', background: '#fff7ed' }}>
            <span style={{ font: '10px var(--mono)', color: '#c2410c' }}>PENDING REVIEW</span>
            <strong style={{ display: 'block', fontSize: '32px', color: '#c2410c', margin: '8px 0 0' }}>{pendingCount}</strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>awaiting receipt verification</small>
          </div>
          <div style={{ padding: '20px', border: '1px solid var(--line)', background: '#FFFFFF' }}>
            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>TOTAL RECORDS</span>
            <strong style={{ display: 'block', fontSize: '32px', margin: '8px 0 0' }}>{payments.length}</strong>
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>including cancelled checkouts</small>
          </div>
        </div>

        {actionMessage && <p className="form-message" style={{ marginBottom: '20px' }}>{actionMessage}</p>}

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '6px' }}>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
            <button
              key={st}
              className={statusFilter === st ? 'sidebar-link active' : 'sidebar-link'}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--ink)' : 'var(--line)',
                background: statusFilter === st ? 'var(--ink)' : '#FFFFFF',
                color: statusFilter === st ? 'var(--paper)' : 'var(--ink)',
                fontSize: '11px',
                textTransform: 'capitalize',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {st} {st === 'cancelled' && '🚫'}
            </button>
          ))}
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="empty-state">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="empty-state">No payment records found for this status.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {payments.map((p) => {
              const receiptImg = mediaUrl(p.receipt_photo)
              const isCancelled = p.status === 'cancelled'
              const planType = p.plan_type || 'monthly'

              return (
                <div
                  key={p.payment_id}
                  style={{
                    background: isCancelled ? '#f9f9f9' : '#FFFFFF',
                    border: p.status === 'pending' ? '2px solid var(--orange)' : '1px solid var(--line)',
                    padding: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '20px',
                    alignItems: 'center',
                  }}
                >
                  {/* Receipt thumbnail */}
                  <div style={{ width: '80px', height: '80px' }}>
                    {receiptImg ? (
                      <a href={receiptImg} target="_blank" rel="noreferrer" title="Click to view full receipt">
                        <img src={receiptImg} alt="Receipt" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid var(--line)', borderRadius: '4px' }} />
                      </a>
                    ) : (
                      <div style={{ width: '80px', height: '80px', background: '#F0F6FF', display: 'grid', placeContent: 'center', fontSize: '9px', font: 'var(--mono)', textAlign: 'center' }}>
                        {isCancelled ? 'CANCELLED' : 'NO RECEIPT'}
                      </div>
                    )}
                  </div>

                  {/* Student & Course info */}
                  <div>
                    <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>{p.payment_id}</span>
                    <strong style={{ display: 'block', fontSize: '15px', margin: '3px 0' }}>{p.course_title}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                      Student: <strong>{p.student_name}</strong> ({p.student_email})
                    </p>
                    <span className="badge" style={{ position: 'static', background: planType === 'yearly' ? '#dbeafe' : '#f3f4f6', color: planType === 'yearly' ? '#1e40af' : '#374151', fontSize: '9px', padding: '2px 6px', marginTop: '4px', display: 'inline-block' }}>
                      {planType.toUpperCase()} PLAN
                    </span>
                    {p.transaction_id && !isCancelled && (
                      <p style={{ fontSize: '11px', color: 'var(--orange)', fontFamily: 'var(--mono)', margin: '4px 0 0' }}>
                        UTR: {p.transaction_id}
                      </p>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>Original:</span> <span>₹{p.actual_amount}</span>
                    </div>
                    {p.discount_applied > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--orange)', fontSize: '11px' }}>
                        <span>Discount:</span> <span>-{p.discount_applied}%</span>
                      </div>
                    )}
                    {p.coupon_code && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontSize: '11px' }}>
                        <span>Coupon ({p.coupon_code}):</span> <span>-{p.coupon_discount}%</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '4px', borderTop: '1px solid var(--line)', paddingTop: '4px' }}>
                      <span>Final:</span> <span style={{ color: 'var(--orange)' }}>₹{p.final_amount}</span>
                    </div>
                  </div>

                  {/* Status & Expiry */}
                  <div>
                    <span
                      className="badge"
                      style={{
                        position: 'static',
                        background: p.status === 'approved' ? 'var(--lime)' : p.status === 'rejected' ? '#fee2e2' : p.status === 'cancelled' ? '#e5e7eb' : '#fef3c7',
                        color: p.status === 'approved' ? 'var(--ink)' : p.status === 'rejected' ? '#991b1b' : p.status === 'cancelled' ? '#4b5563' : '#92400e',
                        padding: '5px 10px',
                        fontWeight: 700,
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                    <p style={{ fontSize: '10px', color: 'var(--muted)', margin: '6px 0 0' }}>
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {p.plan_expiry && (
                      <p style={{ fontSize: '10px', color: 'var(--muted)', margin: '2px 0 0' }}>
                        Plan Expiry: <strong>{new Date(p.plan_expiry).toLocaleDateString()}</strong>
                      </p>
                    )}
                    {p.cancellation_reason && (
                      <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0' }}>
                        Reason: {p.cancellation_reason}
                      </p>
                    )}
                    {p.rejection_reason && (
                      <p style={{ fontSize: '10px', color: '#c0392b', margin: '4px 0 0' }}>
                        Reason: {p.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {p.status === 'pending' && (
                      <>
                        <button
                          className="primary-button"
                          style={{ background: '#16a34a', color: 'white', padding: '7px 12px', fontSize: '11px' }}
                          onClick={() => handleApprove(p.payment_id)}
                        >
                          Approve ✓
                        </button>
                        <button
                          className="outline-button"
                          style={{ borderColor: '#c0392b', color: '#c0392b', padding: '7px 12px', fontSize: '11px' }}
                          onClick={() => setRejectingPayment(p)}
                        >
                          Reject ✕
                        </button>
                      </>
                    )}

                    {!isCancelled && (
                      <button
                        className="outline-button"
                        style={{ padding: '6px 12px', fontSize: '10px' }}
                        onClick={() => setSelectedReceipt(p)}
                      >
                        View Receipt ↗
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingPayment && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setRejectingPayment(null)}>
            <div className="auth-modal" style={{ width: 'min(450px, 95vw)' }}>
              <button className="close-button" onClick={() => setRejectingPayment(null)}>×</button>
              <p className="eyebrow" style={{ color: '#c0392b' }}>REJECT PAYMENT</p>
              <h2 style={{ fontSize: '24px', letterSpacing: '-1px', marginBottom: '10px' }}>
                Decline Receipt
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '15px' }}>
                Payment for <strong>{rejectingPayment.course_title}</strong> by <strong>{rejectingPayment.student_email}</strong>.
              </p>
              <form onSubmit={handleReject} style={{ display: 'grid', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                  Reason for Rejection *
                  <textarea
                    rows="3"
                    required
                    placeholder="e.g. Transaction ID not found in bank statement, amount mismatch..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ padding: '10px', border: '1px solid var(--line)', fontFamily: 'inherit' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="primary-button" style={{ background: '#c0392b' }} type="submit">
                    Confirm Rejection
                  </button>
                  <button className="outline-button" type="button" onClick={() => setRejectingPayment(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Digital Receipt Modal */}
        {selectedReceipt && (
          <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        )}
      </section>
    </main>
  )
}
