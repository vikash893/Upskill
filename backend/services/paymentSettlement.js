const crypto = require('crypto');
const Enrollment = require('../models/enrollment');
const Payment = require('../models/payment');
const User = require('../models/user');

function signaturesMatch(expected, received) {
  if (typeof received !== 'string' || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyCheckoutSignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return signaturesMatch(expected, signature);
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || !secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signaturesMatch(expected, signature);
}

async function settlePaymentOrder(order, { paymentId, signature = null, paidAt = new Date() }) {
  if (order.status === 'paid') {
    return { already_paid: true, payments: await Payment.find({ razorpay_order_id: order.razorpay_order_id }).lean() };
  }
  if (!paymentId) throw new Error('A verified Razorpay payment ID is required.');

  const user = await User.findOne({ email: order.student_email });
  if (!user) throw new Error('The purchasing student account no longer exists.');

  const paymentRecords = [];
  for (const item of order.items) {
    const paymentIdForLine = `PAY-${crypto.randomUUID()}`;
    const linePayment = await Payment.findOneAndUpdate(
      { razorpay_order_id: order.razorpay_order_id, order_course_id: item.course_id },
      {
        $set: {
          student_id: user._id,
          student_name: order.student_name,
          student_email: order.student_email,
          course_id: item.course_id,
          course_title: item.course_title,
          actual_amount: item.actual_amount,
          discount_applied: item.course_discount_percent,
          course_discount_amount: item.course_discount_amount,
          coupon_code: item.coupon_code,
          coupon_discount: item.coupon_discount_percent,
          coupon_discount_amount: item.coupon_discount_amount,
          bulk_discount_applied: item.bulk_discount_percent,
          bulk_discount_amount: item.bulk_discount_amount,
          final_amount: item.final_amount,
          currency: order.currency,
          plan_type: item.plan_type,
          plan_expiry: new Date(paidAt.getTime() + item.plan_expiry_days * 24 * 60 * 60 * 1000),
          payment_gateway: 'RAZORPAY',
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          transaction_id: paymentId,
          status: 'approved',
          approved_by: 'RAZORPAY_GATEWAY',
          approved_at: paidAt,
        },
        $setOnInsert: {
          payment_id: paymentIdForLine,
          razorpay_order_id: order.razorpay_order_id,
          order_course_id: item.course_id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    paymentRecords.push(linePayment);

    await Enrollment.findOneAndUpdate(
      { student_email: order.student_email, course_id: item.course_id },
      {
        $set: {
          student_id: user._id,
          student_name: order.student_name,
          student_email: order.student_email,
          course_id: item.course_id,
          course_title: item.course_title,
          plan_type: item.plan_type,
          plan_expiry: linePayment.plan_expiry,
          status: 'active',
          payment_id: linePayment.payment_id,
          enrolled_at: paidAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  order.status = 'paid';
  order.razorpay_payment_id = paymentId;
  order.razorpay_signature = signature;
  order.paid_at = paidAt;
  await order.save();

  return { already_paid: false, payments: paymentRecords };
}

module.exports = { verifyCheckoutSignature, verifyWebhookSignature, settlePaymentOrder };
