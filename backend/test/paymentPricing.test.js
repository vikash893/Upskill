const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCartQuote, getBulkDiscountPercent } = require('../services/paymentPricing');

const tiers = [
  { minimum_courses: 2, discount_percent: 5 },
  { minimum_courses: 4, discount_percent: 12 },
];

test('selects the highest bulk-discount tier reached by distinct paid courses', () => {
  assert.equal(getBulkDiscountPercent(1, tiers), 0);
  assert.equal(getBulkDiscountPercent(3, tiers), 5);
  assert.equal(getBulkDiscountPercent(4, tiers), 12);
});

test('stacks course discount, coupon, then bulk discount and reconciles line totals', () => {
  const quote = calculateCartQuote([
    { course_id: 'course-a', base_amount: 1000, course_discount_percent: 10, coupon_discount_percent: 20 },
    { course_id: 'course-b', base_amount: 500, course_discount_percent: 10, coupon_discount_percent: 20 },
  ], [{ minimum_courses: 2, discount_percent: 10 }]);

  assert.equal(quote.subtotal_before_bulk, 1080);
  assert.equal(quote.bulk_discount_amount, 108);
  assert.equal(quote.final_amount, 972);
  assert.equal(quote.items.reduce((total, item) => total + item.final_amount, 0), quote.final_amount);
});

test('splits a bulk discount exactly to paise without losing any value', () => {
  const quote = calculateCartQuote([
    { course_id: 'course-a', base_amount: 10, course_discount_percent: 0 },
    { course_id: 'course-b', base_amount: 10, course_discount_percent: 0 },
    { course_id: 'course-c', base_amount: 10, course_discount_percent: 0 },
  ], [{ minimum_courses: 2, discount_percent: 33.33 }]);

  assert.equal(quote.bulk_discount_amount, 10);
  assert.equal(quote.items.reduce((total, item) => total + Math.round(item.final_amount * 100), 0), Math.round(quote.final_amount * 100));
});

test('rejects duplicate course lines instead of multiplying discounts by repeated IDs', () => {
  assert.throws(() => calculateCartQuote([
    { course_id: 'same', base_amount: 10 },
    { course_id: 'same', base_amount: 10 },
  ]), /unique/);
});
