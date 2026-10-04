const test = require('node:test');
const assert = require('node:assert/strict');
const paymentRouter = require('../router/payment');

test('payment router exposes quote, cart order, verification, webhook, admin tiers, and manual review routes', () => {
  const routes = paymentRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]),
    }));
  const contains = (method, path) => routes.some((route) => route.path === path && route.methods.includes(method));

  assert.ok(contains('post', '/quote'));
  assert.ok(contains('post', '/payment/quote'));
  assert.ok(contains('post', '/create-order'));
  assert.ok(contains('post', '/verify-payment'));
  assert.ok(contains('get', '/payment/order/:order_id'));
  assert.ok(contains('post', '/payment/webhook'));
  assert.ok(contains('get', '/admin/bulk-discounts'));
  assert.ok(contains('put', '/admin/bulk-discounts'));
  assert.ok(contains('get', '/payment/admin/bulk-discounts'));
  assert.ok(contains('put', '/payment/admin/bulk-discounts'));
  assert.ok(contains('patch', '/payment/approve/:payment_id'));
  assert.ok(contains('patch', '/payment/reject/:payment_id'));
});
