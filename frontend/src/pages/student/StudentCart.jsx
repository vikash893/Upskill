import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../api/request'
import { useAuth } from '../../context/AuthContext'
import { usePaymentCart } from '../../context/PaymentCartContext'
import Skeleton from '../../components/Skeleton'
import { loadRazorpayCheckout } from '../../utils/razorpay'

export default function StudentCart() {
  const { session } = useAuth()
  const { items, updateCourse, removeCourse } = usePaymentCart()
  const [quote, setQuote] = useState(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [couponDrafts, setCouponDrafts] = useState({})
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState(() => localStorage.getItem('uniskill_pending_payment_order') || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const updatePendingOrder = (orderId) => {
    setPendingOrderId(orderId || '')
    if (orderId) localStorage.setItem('uniskill_pending_payment_order', orderId)
    else localStorage.removeItem('uniskill_pending_payment_order')
  }

  const applyPaidOrder = (orderStatus) => {
    const result = {
      quote: {
        course_count: orderStatus.course_count,
        final_amount: orderStatus.final_amount,
        bulk_discount_percent: orderStatus.bulk_discount_percent,
        bulk_discount_amount: orderStatus.bulk_discount_amount,
      },
    }
    setSuccess({ paymentId: orderStatus.payment_id, result })
    const purchasedCourseIds = (orderStatus.items || orderStatus.payments || [])
      .map((item) => item.course_id)
      .filter(Boolean)
    purchasedCourseIds.forEach(removeCourse)
    updatePendingOrder('')
    setError('')
  }

  useEffect(() => {
    if (!items.length) {
      setQuote(null)
      setError('')
      return undefined
    }

    let active = true
    setLoadingQuote(true)
    request('/payment/quote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ items }),
    })
      .then((data) => {
        if (active) {
          setQuote(data.quote)
          setError('')
        }
      })
      .catch((quoteError) => {
        if (active) {
          setQuote(null)
          setError(quoteError.message)
        }
      })
      .finally(() => { if (active) setLoadingQuote(false) })

    return () => { active = false }
  }, [items, session.token])

  useEffect(() => {
    if (!pendingOrderId) return undefined
    let active = true
    let checking = false
    const refreshStatus = async () => {
      if (checking) return
      checking = true
      try {
        const orderStatus = await request(`/payment/order/${encodeURIComponent(pendingOrderId)}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        if (!active) return
        if (orderStatus.status === 'paid') applyPaidOrder(orderStatus)
      } catch (statusError) {
        const message = statusError.message.toLowerCase()
        if (active && (message.includes('not allowed') || message.includes('not found'))) updatePendingOrder('')
      } finally {
        checking = false
      }
    }

    refreshStatus()
    const interval = window.setInterval(refreshStatus, 15000)
    return () => { active = false; window.clearInterval(interval) }
  }, [pendingOrderId, session.token])

  const applyCoupon = (courseId) => {
    const couponCode = String(couponDrafts[courseId] || '').trim().toUpperCase()
    updateCourse(courseId, { coupon_code: couponCode })
  }

  const startCheckout = async () => {
    if (!quote || checkoutBusy || !items.length) return
    setCheckoutBusy(true)
    setError('')

    try {
      await loadRazorpayCheckout()
      const orderData = await request('/payment/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ items }),
      })
      if (!orderData.key_id || !orderData.order_id) {
        throw new Error('Razorpay checkout configuration was not returned by the server.')
      }
      updatePendingOrder(orderData.order_id)
      let hasPaymentResponse = false

      const checkout = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'UniSkill',
        description: `${orderData.quote.course_count} course cart`,
        image: '/logo.png',
        order_id: orderData.order_id,
        prefill: { name: session.name || '', email: session.email || '' },
        notes: { order_id: orderData.order_id },
        theme: { color: '#0056D2' },
        handler: async (response) => {
          hasPaymentResponse = true
          try {
            const result = await request('/payment/verify-payment', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            applyPaidOrder({
              status: 'paid',
              payment_id: response.razorpay_payment_id,
              course_count: result.quote.course_count,
              final_amount: result.quote.final_amount,
              bulk_discount_percent: result.quote.bulk_discount_percent,
              bulk_discount_amount: result.quote.bulk_discount_amount,
              payments: result.payments,
            })
          } catch (verifyError) {
            setError('Razorpay is still confirming this order. Checkout is paused to prevent a duplicate charge; this page will update automatically.')
          } finally {
            setCheckoutBusy(false)
          }
        },
        modal: { ondismiss: () => { setCheckoutBusy(false); if (!hasPaymentResponse) updatePendingOrder('') } },
      })

      checkout.on('payment.failed', (event) => {
        setError(event.error?.description || event.error?.reason || 'Payment could not be completed.')
        setCheckoutBusy(false)
        updatePendingOrder('')
      })
      checkout.open()
    } catch (checkoutError) {
      setError(checkoutError.message || 'Unable to start checkout.')
      setCheckoutBusy(false)
    }
  }

  if (success) {
    return (
      <section className="content-section">
        <div className="payment-cart-success">
          <p className="eyebrow">PAYMENT VERIFIED</p>
          <h1>All courses are ready.</h1>
          <p>Your payment was verified and access was activated for {success.result.quote.course_count} courses.</p>
          <p className="payment-cart-success-id">Payment ID: {success.paymentId}</p>
          <Link className="primary-button" to="/student/my-courses">Open My Courses</Link>
        </div>
      </section>
    )
  }

  const quotedItems = quote?.items || []

  return (
    <section className="content-section student-cart-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ONE SECURE CHECKOUT</p>
          <h1>Course cart</h1>
          <p className="section-note">Choose a plan for each course. Course offers, coupons, and the eligible cart discount are combined in the server quote.</p>
        </div>
        <Link className="text-button" to="/student/explore-courses">Continue exploring <span>↗</span></Link>
      </div>

      {!items.length ? (
        <div className="empty-state student-cart-empty">
          Your cart is empty.
          <br />
          <Link className="primary-button" to="/student/explore-courses">Explore courses</Link>
        </div>
      ) : (
        <div className="student-cart-layout">
          <div className="student-cart-items">
            {loadingQuote && !quote ? (
              <Skeleton variant="class-list" count={Math.max(2, items.length)} label="Calculating cart prices" />
            ) : items.map((cartItem) => {
              const line = quotedItems.find((item) => item.course_id === cartItem.course_id)
              return (
                <article className="student-cart-item" key={cartItem.course_id}>
                  <div className="student-cart-item-main">
                    <div className="student-cart-course-mark" aria-hidden="true">U</div>
                    <div className="student-cart-item-copy">
                      <p className="eyebrow">COURSE</p>
                      <h2>{line?.course_title || cartItem.course_id}</h2>
                      <span>{line ? `₹${line.actual_amount.toLocaleString('en-IN')} base fee` : 'Refreshing server price…'}</span>
                    </div>
                    <button className="text-button student-cart-remove" type="button" disabled={Boolean(pendingOrderId)} onClick={() => removeCourse(cartItem.course_id)} aria-label={`Remove ${line?.course_title || 'course'} from cart`}>Remove</button>
                  </div>

                  <div className="student-cart-item-controls">
                    <label>
                      Billing plan
                      <select disabled={Boolean(pendingOrderId)} value={cartItem.plan_type} onChange={(event) => updateCourse(cartItem.course_id, { plan_type: event.target.value })}>
                        <option value="monthly">Monthly · 30 days</option>
                        <option value="yearly">Yearly · 365 days</option>
                      </select>
                    </label>
                    <form className="student-cart-coupon" onSubmit={(event) => { event.preventDefault(); applyCoupon(cartItem.course_id) }}>
                      <label htmlFor={`coupon-${cartItem.course_id}`}>Course coupon</label>
                      <div>
                        <input
                          id={`coupon-${cartItem.course_id}`}
                          disabled={Boolean(pendingOrderId)}
                          value={couponDrafts[cartItem.course_id] ?? cartItem.coupon_code ?? ''}
                          onChange={(event) => setCouponDrafts((current) => ({ ...current, [cartItem.course_id]: event.target.value }))}
                          placeholder="Enter code"
                        />
                        <button className="outline-button" type="submit" disabled={Boolean(pendingOrderId)}>Apply</button>
                      </div>
                    </form>
                    <div className="student-cart-line-total">
                      <span>{loadingQuote ? 'Recalculating…' : 'Course total'}</span>
                      <strong>{line ? `₹${line.final_amount.toLocaleString('en-IN')}` : '—'}</strong>
                    </div>
                  </div>

                  {line && (line.course_discount_amount > 0 || line.coupon_discount_amount > 0 || line.bulk_discount_amount > 0) && (
                    <div className="student-cart-line-discounts">
                      {line.course_discount_amount > 0 && <span>Course offer −₹{line.course_discount_amount.toLocaleString('en-IN')}</span>}
                      {line.coupon_discount_amount > 0 && <span>Coupon {line.coupon_code} −₹{line.coupon_discount_amount.toLocaleString('en-IN')}</span>}
                      {line.bulk_discount_amount > 0 && <span>Cart discount −₹{line.bulk_discount_amount.toLocaleString('en-IN')}</span>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          <aside className="student-cart-summary">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>{items.length} {items.length === 1 ? 'course' : 'courses'}</h2>
            {quote ? (
              <>
                <div className="student-cart-summary-row"><span>Course subtotal</span><span>₹{(quote.subtotal_before_bulk + quote.bulk_discount_amount).toLocaleString('en-IN')}</span></div>
                {quote.total_discount_amount > 0 && <div className="student-cart-summary-row student-cart-savings"><span>Total savings</span><span>−₹{quote.total_discount_amount.toLocaleString('en-IN')}</span></div>}
                {quote.bulk_discount_percent > 0 && <p className="student-cart-tier-note">{quote.bulk_discount_percent}% multi-course discount applied.</p>}
                <div className="student-cart-grand-total"><span>Total due</span><strong>₹{quote.final_amount.toLocaleString('en-IN')}</strong></div>
                <button className="primary-button student-cart-pay" type="button" disabled={loadingQuote || checkoutBusy || Boolean(pendingOrderId) || Boolean(error)} onClick={startCheckout}>
                  {pendingOrderId ? 'Confirming previous payment…' : checkoutBusy ? 'Opening secure checkout…' : `Pay ₹${quote.final_amount.toLocaleString('en-IN')}`}
                </button>
                {pendingOrderId && <p className="student-cart-tier-note">Order {pendingOrderId} is being checked. Do not submit another payment.</p>}
              </>
            ) : <p className="student-cart-tier-note">{loadingQuote ? 'Calculating your cart…' : 'Resolve the cart issue before checkout.'}</p>}
            {error && <p className="student-cart-error" role="alert">{error}</p>}
            <p className="student-cart-secure-note">The final amount is recalculated and verified by UniSkill before Razorpay checkout.</p>
          </aside>
        </div>
      )}
    </section>
  )
}
