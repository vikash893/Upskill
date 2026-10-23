import { useEffect, useState } from 'react'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import ReceiptModal from '../../components/ReceiptModal'
import Skeleton from '../../components/Skeleton'
import Pagination from '../../components/Pagination'

export default function StudentPayments() {
  const { session } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const fetchPayments = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    request(`/payment/student-history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((data) => {
        setPayments(data.payments || [])
        if (data.pagination) {
          setPagination(data.pagination)
        } else {
          const tot = data.total || (data.payments ? data.payments.length : 0)
          setPagination({
            currentPage: page,
            pageSize: limit,
            totalRecords: tot,
            totalPages: Math.ceil(tot / limit) || 1,
            hasNextPage: page * limit < tot,
            hasPreviousPage: page > 1,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayments()
  }, [page, limit])

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">BILLING & INVOICES</p>
          <h2>Payment History & Plan Subscriptions</h2>
        </div>
        <span style={{ font: '11px var(--mono)', color: 'var(--muted)' }}>{pagination.totalRecords} total records</span>
      </div>

      {loading ? (
        <Skeleton variant="table" count={5} label="Loading payment history" />
      ) : payments.length === 0 ? (
        <div className="empty-state">No payment records found on your account.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', background: '#FFFFFF', overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(130px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(100px, 1fr) auto',
              gap: '12px',
              padding: '12px 18px',
              borderBottom: '1px solid var(--line)',
              font: '10px var(--mono)',
              color: 'var(--muted)',
              minWidth: '700px',
            }}
          >
            <span>COURSE</span>
            <span>PLAN & EXPIRY</span>
            <span>AMOUNT</span>
            <span>STATUS</span>
            <span>DATE</span>
            <span>INVOICE</span>
          </div>

          {payments.map((p) => {
            const isCancelled = p.status === 'cancelled'
            const isApproved = p.status === 'approved'
            const isRejected = p.status === 'rejected'
            const planType = p.plan_type || 'monthly'

            return (
              <div
                key={p.payment_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(130px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(100px, 1fr) auto',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '16px 18px',
                  borderBottom: '1px solid var(--line)',
                  fontSize: '13px',
                  minWidth: '700px',
                  background: isCancelled ? '#fafafa' : '#FFFFFF',
                }}
              >
                {/* Course & ID */}
                <div>
                  <strong>{p.course_title}</strong>
                  <p style={{ font: '10px var(--mono)', color: 'var(--muted)', margin: '2px 0 0' }}>{p.payment_id}</p>
                  {p.transaction_id && !isCancelled && (
                    <p style={{ font: '10px var(--mono)', color: 'var(--orange)', margin: '2px 0 0' }}>
                      UTR: {p.transaction_id}
                    </p>
                  )}
                </div>

                {/* Plan & Expiry */}
                <div>
                  <span className="badge" style={{ position: 'static', background: planType === 'yearly' ? '#dbeafe' : '#f3f4f6', color: planType === 'yearly' ? '#1e40af' : '#374151', fontSize: '10px', padding: '3px 8px' }}>
                    {planType.toUpperCase()} PLAN
                  </span>
                  {p.plan_expiry && (
                    <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0' }}>
                      Exp: {new Date(p.plan_expiry).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Amount & Discounts */}
                <div>
                  <strong style={{ fontSize: '15px' }}>₹{p.final_amount}</strong>
                  {p.discount_applied > 0 && (
                    <span style={{ display: 'block', font: '10px var(--mono)', color: 'var(--orange)' }}>
                      Course discount −₹{p.course_discount_amount ?? 0}
                    </span>
                  )}
                  {p.coupon_code && (
                    <span style={{ display: 'block', font: '10px var(--mono)', color: '#166534' }}>
                      Coupon {p.coupon_code} −₹{p.coupon_discount_amount ?? 0}
                    </span>
                  )}
                  {p.bulk_discount_amount > 0 && <span style={{ display: 'block', font: '10px var(--mono)', color: '#167253' }}>Cart discount −₹{p.bulk_discount_amount}</span>}
                </div>

                {/* Status Badge & Notes */}
                <div>
                  <span
                    className="badge"
                    style={{
                      position: 'static',
                      background: isApproved ? 'var(--lime)' : isRejected ? '#fee2e2' : isCancelled ? '#e5e7eb' : '#fef3c7',
                      color: isApproved ? 'var(--ink)' : isRejected ? '#991b1b' : isCancelled ? '#4b5563' : '#92400e',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {p.status.toUpperCase()}
                  </span>
                  {p.cancellation_reason && (
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0' }}>
                      {p.cancellation_reason}
                    </p>
                  )}
                  {p.rejection_reason && (
                    <p style={{ fontSize: '10px', color: '#c0392b', margin: '4px 0 0' }}>
                      Reason: {p.rejection_reason}
                    </p>
                  )}
                </div>

                {/* Date */}
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>

                {/* Action button */}
                <div>
                  {!isCancelled ? (
                    <button
                      className="primary-button"
                      style={{ fontSize: '11px', padding: '6px 14px' }}
                      onClick={() => setSelectedReceipt(p)}
                    >
                      Receipt ↗
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--muted)', font: 'var(--mono)' }}>
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize)
          setPage(1)
        }}
        itemName="payments"
        loading={loading}
      />

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  )
}
