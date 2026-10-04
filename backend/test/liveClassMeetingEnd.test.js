const test = require('node:test');
const assert = require('node:assert/strict');
const liveClassRouter = require('../router/liveClass');
const { getMeetSpaceResourceName, getGoogleMeetConferenceStatus, endGoogleMeetConference } = require('../services/googleMeetService');

test('live class router exposes a Meet status sync route', () => {
  const routePaths = liveClassRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).filter(Boolean).join(':')} ${layer.route.path}`);

  assert.ok(routePaths.includes('get /live-class/:class_id/meet-status'));
});

test('Google Meet service supports external end detection and end-for-everyone', () => {
  assert.equal(typeof getGoogleMeetConferenceStatus, 'function');
  assert.equal(typeof endGoogleMeetConference, 'function');
  assert.equal(getMeetSpaceResourceName(null, 'https://meet.google.com/abc-defg-hij'), 'spaces/abc-defg-hij');
  assert.equal(getMeetSpaceResourceName('spaces/space-id', null), 'spaces/space-id');
});
