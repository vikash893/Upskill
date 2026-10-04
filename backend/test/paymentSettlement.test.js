const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyCheckoutSignature, verifyWebhookSignature } = require('../services/paymentSettlement');

test('checkout verification accepts only the matching order/payment HMAC', () => {
  const secret = 'test-secret';
  const signature = crypto.createHmac('sha256', secret).update('order_1|payment_1').digest('hex');

  assert.equal(verifyCheckoutSignature('order_1', 'payment_1', signature, secret), true);
  assert.equal(verifyCheckoutSignature('order_2', 'payment_1', signature, secret), false);
  assert.equal(verifyCheckoutSignature('order_1', 'payment_1', signature, 'wrong-secret'), false);
});

test('webhook verification hashes the exact raw request bytes and fails closed', () => {
  const secret = 'webhook-secret';
  const rawBody = Buffer.from('event:payment.captured');
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from('event:payment.failed'), signature, secret), false);
  assert.equal(verifyWebhookSignature(rawBody, null, secret), false);
  assert.equal(verifyWebhookSignature(rawBody, signature, null), false);
});
