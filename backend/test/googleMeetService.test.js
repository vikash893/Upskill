const test = require('node:test');
const assert = require('node:assert/strict');
const { isGoogleMeetConfigured, syncGoogleMeetRecordingMetadata, buildTeacherGoogleAuth } = require('../services/googleMeetService');

test('returns false when Google credentials are not configured', () => {
  assert.equal(isGoogleMeetConfigured({}), false);
});

test('returns true when Google Meet configuration is complete', () => {
  const env = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'https://example.com/oauth2callback',
    GOOGLE_MEET_ENABLED: 'true',
  };

  assert.equal(isGoogleMeetConfigured(env), true);
});

test('ignores placeholder Google credentials and keeps Meet disabled until real values are supplied', () => {
  const env = {
    GOOGLE_CLIENT_ID: 'your_google_oauth_client_id',
    GOOGLE_CLIENT_SECRET: 'your_google_oauth_client_secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8000/api/auth/google/callback',
    GOOGLE_MEET_ENABLED: 'true',
  };

  assert.equal(isGoogleMeetConfigured(env), false);
});

test('returns a safe no-config response for recording sync when no Google auth is available', async () => {
  const result = await syncGoogleMeetRecordingMetadata({ meetSpaceId: 'space-1', liveClass: { class_id: 'class-1' }, calendarEventId: null });
  assert.equal(result.configured, false);
  assert.equal(result.synced, false);
});

test('buildTeacherGoogleAuth uses the teacher-specific refresh token', () => {
  const auth = buildTeacherGoogleAuth(
    {
      google_refresh_token: 'teacher-refresh-token',
      google_access_token: 'teacher-access-token',
      google_token_expiry_date: new Date('2026-10-04T12:00:00.000Z'),
    },
    {
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8000/api/auth/google/meet/callback',
    }
  );

  assert.ok(auth);
  assert.equal(auth.credentials.refresh_token, 'teacher-refresh-token');
  assert.equal(auth.credentials.access_token, 'teacher-access-token');
  assert.ok(auth.credentials.expiry_date);
});
