import { useState } from 'react'

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null

  const printReceipt = () => {
    window.print()
  }

  const receiptImg = receipt.receipt_photo
    ? `http://localhost:8000/${receipt.receipt_photo.replace(/\\/g, '/')}`
    : null

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal receipt-modal-box" style={{ width: 'min(580px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <div className="print-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--ink)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span className="brand">uni<span>skill</span></span>
              <p style={{ font: '10px var(--mono)', color: 'var(--muted)', margin: '4px 0 0' }}>OFFICIAL PAYMENT RECEIPT</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge" style={{ position: 'static', background: receipt.status === 'approved' ? 'var(--lime)' : receipt.status === 'rejected' ? '#ffcccc' : '#fff3cd' }}>
                {receipt.status ? receipt.status.toUpperCase() : 'PENDING'}
              </span>
              <p style={{ font: '11px var(--mono)', color: 'var(--muted)', margin: '6px 0 0' }}>{receipt.payment_id}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '12px' }}>
            <div>
              <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>BILLED TO</span>
              <p style={{ fontWeight: 700, margin: '2px 0 0' }}>{receipt.student_name}</p>
              <p style={{ color: 'var(--muted)', margin: '2px 0 0' }}>{receipt.student_email}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>DATE & TIME</span>
              <p style={{ margin: '2px 0 0' }}>{new Date(receipt.createdAt || Date.now()).toLocaleDateString()}</p>
              <p style={{ color: 'var(--muted)', margin: '2px 0 0' }}>{new Date(receipt.createdAt || Date.now()).toLocaleTimeString()}</p>
            </div>
          </div>

          <div style={{ border: '1px solid var(--line)', background: '#fffdf8', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '10px', font: '11px var(--mono)', color: 'var(--muted)' }}>
              <span>COURSE TITLE</span>
              <span>AMOUNT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '15px' }}>{receipt.course_title}</strong>
              <span>₹{receipt.actual_amount}</span>
            </div>

            {receipt.discount_applied > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--orange)', marginBottom: '4px' }}>
                <span>Flash Discount ({receipt.discount_applied}%)</span>
                <span>- ₹{Math.round((receipt.actual_amount * receipt.discount_applied) / 100)}</span>
              </div>
            )}

            {receipt.coupon_code && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#27ae60', marginBottom: '4px' }}>
                <span>Coupon ({receipt.coupon_code} - {receipt.coupon_discount}%)</span>
                <span>- ₹{Math.round((receipt.actual_amount * receipt.coupon_discount) / 100)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--line)', paddingTop: '10px', marginTop: '10px', fontSize: '16px', fontWeight: 800 }}>
              <span>TOTAL PAID</span>
              <span style={{ color: 'var(--orange)' }}>₹{receipt.final_amount}</span>
            </div>
          </div>

          {receipt.transaction_id && (
            <div style={{ fontSize: '12px', marginBottom: '15px', color: 'var(--muted)' }}>
              <strong>Transaction / UTR ID:</strong> {receipt.transaction_id}
            </div>
          )}

          {receipt.rejection_reason && (
            <div style={{ padding: '12px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#c0392b', fontSize: '12px', marginBottom: '15px' }}>
              <strong>Rejection Reason:</strong> {receipt.rejection_reason}
            </div>
          )}

          {receiptImg && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ font: '10px var(--mono)', color: 'var(--muted)', marginBottom: '6px' }}>SUBMITTED PROOF OF PAYMENT</p>
              <a href={receiptImg} target="_blank" rel="noreferrer">
                <img src={receiptImg} alt="Receipt proof" style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', border: '1px solid var(--line)' }} />
              </a>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button className="primary-button" onClick={printReceipt} style={{ flex: 1 }}>
            Download / Print Receipt <span>↗</span>
          </button>
          <button className="outline-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
