const assert = require('node:assert/strict');
const authRouter = require('../router/auth');
const { getGoogleOAuthConfig } = require('../config/google');

const routes = authRouter.stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    methods: Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]),
    path: layer.route.path
  }));

const routePaths = routes.map((route) => `${route.methods.join(',').toUpperCase()} ${route.path}`);

assert(routePaths.includes('GET /google/meet'), 'Missing GET /api/auth/google/meet route');
assert(routePaths.includes('GET /google/meet/callback'), 'Missing GET /api/auth/google/meet/callback route');
assert(routePaths.includes('POST /google'), 'Missing POST /api/auth/google route');
assert(routePaths.includes('GET /google/meet/status'), 'Missing GET /api/auth/google/meet/status route');

const productionOAuth = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REDIRECT_URI: 'https://app.uniskill.com/api/auth/google/meet/callback'
};
assert.ok(getGoogleOAuthConfig(productionOAuth), 'Expected valid HTTPS OAuth callback configuration');
assert.equal(getGoogleOAuthConfig({ ...productionOAuth, GOOGLE_REDIRECT_URI: 'https://app.uniskill.com/api/auth/google/callback' }), null);
assert.equal(getGoogleOAuthConfig({ ...productionOAuth, GOOGLE_REDIRECT_URI: 'http://app.uniskill.com/api/auth/google/meet/callback' }), null);
assert.equal(getGoogleOAuthConfig({ ...productionOAuth, GOOGLE_CLIENT_SECRET: 'your_google_oauth_client_secret' }), null);

console.log('Google auth routes validated:', routePaths.filter((route) => route.includes('/google')));
