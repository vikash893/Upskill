const Course = require('../models/courses');
const Enrollment = require('../models/enrollment');
const BulkDiscount = require('../models/bulkDiscount');
const { calculateCartQuote } = require('./paymentPricing');

function quoteError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function buildPaymentQuote(items, studentEmail, now = new Date()) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw quoteError('The cart must contain between 1 and 20 courses.');
  }

  const normalizedItems = items.map((item) => ({
    course_id: String(item?.course_id || '').trim(),
    plan_type: item?.plan_type === 'yearly' ? 'yearly' : (item?.plan_type === 'monthly' ? 'monthly' : 'custom'),
    coupon_code: String(item?.coupon_code || '').trim().toUpperCase(),
  }));
  if (normalizedItems.some((item) => !item.course_id)) {
    throw quoteError('Each cart item needs a valid course.');
  }
  if (new Set(normalizedItems.map((item) => item.course_id)).size !== normalizedItems.length) {
    throw quoteError('A course can only appear once in the cart.');
  }

  const courseIds = normalizedItems.map((item) => item.course_id);
  const [courses, enrollments, bulkDiscount] = await Promise.all([
    Course.find({ course_id: { $in: courseIds } }).lean(),
    Enrollment.find({ student_email: studentEmail, course_id: { $in: courseIds }, status: 'active' }).lean(),
    BulkDiscount.findOne({ setting_key: 'global' }).lean(),
  ]);
  const courseById = new Map(courses.map((course) => [course.course_id, course]));
  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.course_id, enrollment]));

  const pricingItems = normalizedItems.map((cartItem) => {
    const course = courseById.get(cartItem.course_id);
    if (!course) throw quoteError(`Course ${cartItem.course_id} was not found.`, 404);
    if (course.course_type !== 'paid') throw quoteError(`${course.course_title} is free and should be enrolled without checkout.`);

    const activeEnrollment = enrollmentById.get(course.course_id);
    if (activeEnrollment && (!activeEnrollment.plan_expiry || new Date(activeEnrollment.plan_expiry) > now)) {
      throw quoteError(`You already have active enrollment in ${course.course_title}.`);
    }

    // Determine course price: prioritize course_amount, fallback to monthly_amount
    let baseAmount = Number(course.course_amount) > 0 ? Number(course.course_amount) : Number(course.monthly_amount || 0);
    // If legacy client explicitly requests yearly and course has yearly_amount:
    if (cartItem.plan_type === 'yearly' && Number(course.yearly_amount) > 0) {
      baseAmount = Number(course.yearly_amount);
    }

    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw quoteError(`${course.course_title} does not have a valid price.`);
    }

    // Calculate expiry days from months and days
    const durMonths = Math.max(0, parseInt(course.duration_months, 10) || 0);
    const durDays = Math.max(0, parseInt(course.duration_days, 10) || 0);
    let totalExpiryDays = (durMonths * 30) + durDays;
    if (totalExpiryDays <= 0) {
      // Default to 30 days if neither is set
      totalExpiryDays = cartItem.plan_type === 'yearly' ? 365 : 30;
    }

    const courseDiscountPercent = Number(course.discount) > 0 && course.discount_time && new Date(course.discount_time) > now
      ? Number(course.discount)
      : 0;

    let coupon = null;
    if (cartItem.coupon_code) {
      coupon = (course.coupons || []).find((candidate) =>
        String(candidate.code || '').trim().toUpperCase() === cartItem.coupon_code &&
        (!candidate.expires_at || new Date(candidate.expires_at) >= now)
      );
      if (!coupon) throw quoteError(`Coupon ${cartItem.coupon_code} is invalid or expired for ${course.course_title}.`);
    }

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      photo: course.photo ? course.photo.replace(/\\/g, '/') : null,
      plan_type: cartItem.plan_type || 'custom',
      duration_months: durMonths,
      duration_days: durDays,
      plan_expiry_days: totalExpiryDays,
      base_amount: baseAmount,
      course_discount_percent: courseDiscountPercent,
      coupon_code: coupon?.code || null,
      coupon_discount_percent: Number(coupon?.discount || 0),
    };
  });

  const quote = calculateCartQuote(pricingItems, bulkDiscount?.tiers || []);
  return {
    ...quote,
    items: quote.items.map((item) => ({ ...item, photo: pricingItems.find((source) => source.course_id === item.course_id)?.photo || null })),
  };
}

module.exports = { buildPaymentQuote };
