const test = require('node:test');
const assert = require('node:assert/strict');
const liveClassRouter = require('../router/liveClass');

test('live class router exposes a route to generate a missing Google Meet session', () => {
  const routePaths = liveClassRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => Object.keys(layer.route.methods).filter(Boolean).join(':') + ' ' + layer.route.path);

  assert.ok(routePaths.includes('post /live-class/:class_id/generate-meeting'));
});
