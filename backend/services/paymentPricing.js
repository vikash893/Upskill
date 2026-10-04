function toPaise(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('Price values must be finite and non-negative.');
  return Math.round(value * 100);
}

function fromPaise(amount) {
  return Number((amount / 100).toFixed(2));
}

function getBulkDiscountPercent(courseCount, tiers = []) {
  return tiers
    .filter((tier) => Number(tier.minimum_courses) <= courseCount)
    .sort((left, right) => Number(right.minimum_courses) - Number(left.minimum_courses))[0]?.discount_percent || 0;
}

function allocateProportionally(totalDiscount, lines, totalBeforeBulk) {
  if (!totalDiscount || !totalBeforeBulk) return lines.map(() => 0);

  const shares = lines.map((line) => {
    const exact = (line.subtotal_paise * totalDiscount) / totalBeforeBulk;
    return { amount: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let unallocated = totalDiscount - shares.reduce((sum, share) => sum + share.amount, 0);

  shares
    .map((share, index) => ({ ...share, index }))
    .sort((left, right) => right.remainder - left.remainder)
    .slice(0, unallocated)
    .forEach(({ index }) => { shares[index].amount += 1; });

  return shares.map((share) => share.amount);
}

function calculateCartQuote(items, tiers = []) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Add at least one course to the cart.');
  const courseIds = items.map((item) => String(item.course_id || ''));
  if (courseIds.some((id) => !id) || new Set(courseIds).size !== courseIds.length) {
    throw new Error('Cart courses must have unique, valid course IDs.');
  }

  const lines = items.map((item) => {
    const basePaise = toPaise(item.base_amount);
    const courseDiscountPercent = Number(item.course_discount_percent || 0);
    const couponDiscountPercent = Number(item.coupon_discount_percent || 0);
    if (courseDiscountPercent < 0 || courseDiscountPercent > 100 || couponDiscountPercent < 0 || couponDiscountPercent > 100) {
      throw new Error('Discount percentages must be between 0 and 100.');
    }

    const courseDiscountPaise = Math.round((basePaise * courseDiscountPercent) / 100);
    const afterCourseDiscount = basePaise - courseDiscountPaise;
    const couponDiscountPaise = Math.round((afterCourseDiscount * couponDiscountPercent) / 100);
    const subtotalPaise = Math.max(0, afterCourseDiscount - couponDiscountPaise);

    return {
      ...item,
      actual_amount: fromPaise(basePaise),
      course_discount_percent: courseDiscountPercent,
      course_discount_amount: fromPaise(courseDiscountPaise),
      coupon_discount_percent: couponDiscountPercent,
      coupon_discount_amount: fromPaise(couponDiscountPaise),
      bulk_discount_amount: 0,
      final_amount: fromPaise(subtotalPaise),
      subtotal_paise: subtotalPaise,
    };
  });

  const subtotalPaise = lines.reduce((sum, line) => sum + line.subtotal_paise, 0);
  const bulkDiscountPercent = getBulkDiscountPercent(lines.length, tiers);
  const bulkDiscountPaise = Math.round((subtotalPaise * bulkDiscountPercent) / 100);
  const bulkShares = allocateProportionally(bulkDiscountPaise, lines, subtotalPaise);

  const quotedLines = lines.map((line, index) => {
    const finalPaise = line.subtotal_paise - bulkShares[index];
    const { subtotal_paise: _subtotalPaise, ...publicLine } = line;
    return {
      ...publicLine,
      bulk_discount_percent: bulkDiscountPercent,
      bulk_discount_amount: fromPaise(bulkShares[index]),
      final_amount: fromPaise(finalPaise),
    };
  });

  return {
    items: quotedLines,
    course_count: lines.length,
    subtotal_before_bulk: fromPaise(subtotalPaise),
    bulk_discount_percent: bulkDiscountPercent,
    bulk_discount_amount: fromPaise(bulkDiscountPaise),
    total_discount_amount: fromPaise(lines.reduce((sum, line) => sum + line.actual_amount * 100, 0) - subtotalPaise + bulkDiscountPaise),
    final_amount: fromPaise(subtotalPaise - bulkDiscountPaise),
    currency: 'INR',
  };
}

module.exports = { toPaise, fromPaise, getBulkDiscountPercent, calculateCartQuote };
