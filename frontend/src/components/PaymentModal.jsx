import { useState, useEffect, useRef } from 'react'
import { request } from '../api/request'
import { useAuth } from '../context/AuthContext'

export default function PaymentModal({ course, initialPlan = 'monthly', onClose, onSuccess }) {
  const { session } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState(initialPlan) // 'monthly' or 'yearly'
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [verifyingCoupon, setVerifyingCoupon] = useState(false)
  
  // Razorpay state
  const [processingRazorpay, setProcessingRazorpay] = useState(false)
  const [verifyingSignature, setVerifyingSignature] = useState(false)
  const [razorpaySuccessData, setRazorpaySuccessData] = useState(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const hasLoggedCancel = useRef(false)

  // Ensure Razorpay SDK script is loaded
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Calculate pricing based on selected plan
  const monthlyBase = course.monthly_amount > 0 ? course.monthly_amount : (course.course_amount || 0)
  const yearlyBase = course.yearly_amount > 0 ? course.yearly_amount : (monthlyBase > 0 ? monthlyBase * 10 : 0)

  const actualAmount = selectedPlan === 'yearly' ? yearlyBase : monthlyBase
  const flashDiscount = course.discount || 0
  const flashDiscountAmount = flashDiscount > 0 ? Math.round((actualAmount * flashDiscount) / 100) : 0
  const priceAfterFlash = Math.max(0, actualAmount - flashDiscountAmount)

  let couponDiscountAmount = 0
  if (couponApplied) {
    couponDiscountAmount = Math.round((actualAmount * couponApplied.coupon_discount) / 100)
  }

  const finalPayable = Math.max(0, priceAfterFlash - couponDiscountAmount)

  // Calculated Expiry Date
  const expiryDays = selectedPlan === 'yearly' ? 365 : 30
  const estimatedExpiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const handleVerifyCoupon = async (e) => {
    e.preventDefault()
    setCouponError('')
    setVerifyingCoupon(true)
    try {
      const data = await request(`/verify-coupon/${course.course_id}`, {
        method: 'POST',
        body: JSON.stringify({ coupon_code: couponCode }),
      })
      setCouponApplied(data)
    } catch (err) {
      setCouponError(err.message)
      setCouponApplied(null)
    } finally {
      setVerifyingCoupon(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReceiptFile(file)
      setReceiptPreview(URL.createObjectURL(file))
    }
  }

  // Handle explicit cancellation or close
  const handleCancelAndClose = async () => {
    if (!isSuccess && !hasLoggedCancel.current && session?.token) {
      hasLoggedCancel.current = true
      try {
        await request('/payment/cancel-checkout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({
            course_id: course.course_id,
            plan_type: selectedPlan,
            reason: 'User cancelled payment during checkout modal',
          }),
        }).catch(() => {})
      } catch {
        // silently handle
      }
    }
    onClose()
  }

  // STEP 2: FRONTEND - RAZORPAY CHECKOUT
  const handleRazorpayPayment = async () => {
    setErrorMessage('')

    if (!session || !session.token) {
      setErrorMessage('You must be logged in to enroll in this course. Please log in first.')
      return
    }

    setProcessingRazorpay(true)

    try {
      // Step 1: Call Backend to Create Order
      const orderData = await request('/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({
          course_id: course.course_id,
          plan_type: selectedPlan,
          coupon_code: couponApplied ? couponApplied.coupon_code : undefined,
        }),
      })

      const razorpayKey =
        orderData.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID ||
        'rzp_test_TgmZfY6NUla02O'

      // Prepare Razorpay options
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'UniSkills',
        description: `${course.course_title} (${selectedPlan === 'yearly' ? 'Yearly Access' : 'Monthly Access'})`,
        image: '/logo.png',
        order_id: orderData.order_id || orderData.id,
        handler: async function (response) {
          // STEP 3: Send verification fields to Backend
          setVerifyingSignature(true)
          setErrorMessage('')
          try {
            const verifyResult = await request('/verify-payment', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                course_id: course.course_id,
                plan_type: selectedPlan,
                coupon_code: couponApplied ? couponApplied.coupon_code : undefined,
              }),
            })

            hasLoggedCancel.current = true // Prevent cancel log
            setRazorpaySuccessData({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              isInstant: true,
              data: verifyResult,
            })
            setIsSuccess(true)
            if (onSuccess) onSuccess()
          } catch (verErr) {
            setErrorMessage(verErr.message || 'Payment verification failed. Please contact support.')
          } finally {
            setVerifyingSignature(false)
          }
        },
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        notes: {
          course_id: course.course_id,
          plan_type: selectedPlan,
        },
        theme: {
          color: '#d35400',
        },
        modal: {
          ondismiss: function () {
            setProcessingRazorpay(false)
            console.log('Razorpay modal dismissed by student')
          },
        },
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.')
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (response) {
        setErrorMessage(`Payment Failed: ${response.error.description || response.error.reason || 'Transaction could not be completed'}`)
        setProcessingRazorpay(false)
      })

      rzpInstance.open()
      setProcessingRazorpay(false)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initiate Razorpay checkout')
      setProcessingRazorpay(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && handleCancelAndClose()}>
      <section className="auth-modal payment-modal-box" style={{ width: 'min(620px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
        <button className="close-button" onClick={handleCancelAndClose} aria-label="Close">×</button>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎉</div>
            <p className="eyebrow" style={{ color: razorpaySuccessData ? '#27ae60' : 'var(--orange)' }}>
              {razorpaySuccessData ? 'PAYMENT VERIFIED • ACCESS ACTIVATED' : 'PAYMENT PROOF SUBMITTED'}
            </p>
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>
              {razorpaySuccessData ? 'Enrollment Confirmed!' : 'Receipt Under Admin Review'}
            </h2>
            <div style={{ background: '#f8fdf0', border: '1px solid var(--lime)', padding: '16px', borderRadius: '4px', margin: '20px 0', textAlign: 'left', fontSize: '13px' }}>
              <p style={{ margin: '0 0 6px' }}><strong>Course:</strong> {course.course_title}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Plan Selected:</strong> {selectedPlan === 'yearly' ? 'Yearly Access (365 Days)' : 'Monthly Access (30 Days)'}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Plan Expiry:</strong> {estimatedExpiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Amount Paid:</strong> ₹{finalPayable}</p>
              {razorpaySuccessData && (
                <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: '12px', color: '#166534' }}>
                  <strong>Payment ID:</strong> {razorpaySuccessData.paymentId}
                </p>
              )}
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, marginBottom: '25px' }}>
              {razorpaySuccessData
                ? `You have instant access! Dive into ${course.course_title} and start learning right now.`
                : `Once our administrators verify your payment screenshot, ${course.course_title} will be active in your workspace.`}
            </p>
            <button className="primary-button full-width" onClick={onClose}>
              {razorpaySuccessData ? 'Open Classroom Now ↗' : 'Got it, go to My Courses ↗'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <img src="/logo.png" alt="UniSkills" style={{ height: '24px', width: 'auto' }} />
              <p className="eyebrow" style={{ color: 'var(--orange)', margin: 0 }}>SECURE ENROLLMENT CHECKOUT</p>
            </div>
            
            <h2 style={{ fontSize: '26px', letterSpacing: '-1.2px', marginBottom: '6px' }}>
              Enroll in {course.course_title}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '18px' }}>
              Select your billing plan and preferred payment method to unlock full course access.
            </p>

            {/* Plan Picker: Monthly vs Yearly */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                1. SELECT BILLING PLAN:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Monthly Plan Option */}
                <div
                  onClick={() => setSelectedPlan('monthly')}
                  style={{
                    padding: '14px',
                    border: selectedPlan === 'monthly' ? '2px solid var(--orange)' : '1px solid var(--line)',
                    background: selectedPlan === 'monthly' ? '#fff9f4' : '#FFFFFF',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px' }}>Monthly Plan</strong>
                    <span style={{ fontSize: '10px', font: 'var(--mono)', color: 'var(--muted)' }}>30 Days</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: selectedPlan === 'monthly' ? 'var(--orange)' : 'var(--ink)' }}>
                    ₹{monthlyBase} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)' }}>/mo</span>
                  </div>
                </div>

                {/* Yearly Plan Option */}
                <div
                  onClick={() => setSelectedPlan('yearly')}
                  style={{
                    padding: '14px',
                    border: selectedPlan === 'yearly' ? '2px solid var(--orange)' : '1px solid var(--line)',
                    background: selectedPlan === 'yearly' ? '#fff9f4' : '#FFFFFF',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    position: 'relative',
                  }}
                >
                  <span className="badge" style={{ top: '-10px', right: '10px', left: 'auto', background: 'var(--lime)', fontSize: '9px', padding: '3px 8px' }}>
                    BEST VALUE (12 MOS)
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px' }}>Yearly Plan</strong>
                    <span style={{ fontSize: '10px', font: 'var(--mono)', color: 'var(--muted)' }}>365 Days</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: selectedPlan === 'yearly' ? 'var(--orange)' : 'var(--ink)' }}>
                    ₹{yearlyBase} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--muted)' }}>/yr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price breakdown card */}
            <div style={{ border: '1px solid var(--line)', background: '#FFFFFF', padding: '16px', marginBottom: '16px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Selected Plan Fee ({selectedPlan.toUpperCase()})</span>
                <span>₹{actualAmount}</span>
              </div>

              {flashDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--orange)' }}>
                  <span>Flash Discount ({flashDiscount}%)</span>
                  <span>- ₹{flashDiscountAmount}</span>
                </div>
              )}

              {couponApplied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#27ae60' }}>
                  <span>Coupon Applied ({couponApplied.coupon_code} - {couponApplied.coupon_discount}%)</span>
                  <span>- ₹{couponDiscountAmount}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '8px' }}>
                <div>
                  <strong style={{ fontSize: '14px' }}>Total Payable</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)' }}>
                    Access Duration: {selectedPlan === 'yearly' ? '365 Days' : '30 Days'} (until {estimatedExpiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                  </span>
                </div>
                <strong style={{ fontSize: '24px', color: 'var(--orange)' }}>₹{finalPayable}</strong>
              </div>
            </div>

            {/* Coupon input */}
            {!couponApplied ? (
              <form onSubmit={handleVerifyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <input
                  type="text"
                  placeholder="Have a promo / coupon code?"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ flex: 1, padding: '10px', border: '1px solid var(--line)', background: '#FFFFFF', fontSize: '12px' }}
                />
                <button className="outline-button" type="submit" disabled={verifyingCoupon || !couponCode.trim()} style={{ padding: '8px 16px', fontSize: '11px' }}>
                  {verifyingCoupon ? 'Checking...' : 'Apply Coupon'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '18px', fontSize: '12px', color: '#166534' }}>
                <span>✓ Coupon <strong>{couponApplied.coupon_code}</strong> active</span>
                <button type="button" onClick={() => { setCouponApplied(null); setCouponCode('') }} style={{ background: 'none', border: 0, color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>Remove</button>
              </div>
            )}
            {couponError && <p className="form-message" style={{ margin: '-10px 0 15px' }}>{couponError}</p>}

            {errorMessage && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* PAYMENT MODE 1: RAZORPAY STANDARD WEB CHECKOUT */}
            <div style={{ padding: '18px', background: '#fcfbf8', border: '1px solid var(--line)', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <strong style={{ fontSize: '14px', display: 'block' }}>Instant Razorpay Standard Checkout</strong>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Supports Google Pay, PhonePe, Paytm, Credit/Debit Cards, NetBanking
                  </span>
                </div>
                <div style={{ fontSize: '20px' }}>🔒</div>
              </div>

              <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', color: '#166534' }}>
                ✓ <strong>Instant Activation:</strong> Once payment succeeds on Razorpay, your course will be activated immediately.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="primary-button"
                  style={{ flex: 1, padding: '14px', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  disabled={processingRazorpay || verifyingSignature}
                  onClick={handleRazorpayPayment}
                  type="button"
                >
                  {verifyingSignature ? (
                    'Verifying Payment Signature...'
                  ) : processingRazorpay ? (
                    'Opening Razorpay Modal...'
                  ) : (
                    <>
                      Pay ₹{finalPayable} via Razorpay ↗
                    </>
                  )}
                </button>

                <button
                  className="outline-button"
                  type="button"
                  onClick={handleCancelAndClose}
                  style={{ borderColor: '#c0392b', color: '#c0392b' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
