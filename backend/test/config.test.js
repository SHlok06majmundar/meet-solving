const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

function validate(overrides = {}) {
  return spawnSync(process.execPath, ['-e', "require('./src/config/env').validateProductionConfig()"], {
    cwd: join(__dirname, '..'), encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://app.example',
      SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      CLERK_ISSUER_URL: 'https://clerk.example', CLERK_SECRET_KEY: 'test-clerk-key', CLERK_JWT_KEY: '',
      TURN_URLS: '', TURN_SHARED_SECRET: '', METERED_TURN_DOMAIN: '', METERED_TURN_API_KEY: '', ...overrides },
  });
}

test('production supports direct connections while enforcing security and valid optional relay configuration', () => {
  assert.equal(validate().status, 0);
  assert.equal(validate({ TURN_URLS: 'turn:relay.example:3478', TURN_SHARED_SECRET: 'x'.repeat(32) }).status, 0);
  assert.equal(validate({ METERED_TURN_DOMAIN: 'test-app.metered.live', METERED_TURN_API_KEY: 'test-key' }).status, 0);
  for (const overrides of [
    { CLERK_SECRET_KEY: '' }, { CLERK_ISSUER_URL: '' }, { SUPABASE_SERVICE_ROLE_KEY: '' },
    { ALLOWED_ORIGINS: 'http://app.example' },
    { TURN_URLS: 'turn:relay.example:3478' }, { TURN_SHARED_SECRET: 'x'.repeat(32) },
    { TURN_URLS: 'turn:relay.example:3478', TURN_SHARED_SECRET: 'too-short' },
    { TURN_URLS: 'https://relay.example', TURN_SHARED_SECRET: 'x'.repeat(32) },
    { METERED_TURN_DOMAIN: 'test-app.metered.live' },
    { METERED_TURN_DOMAIN: 'untrusted.example', METERED_TURN_API_KEY: 'test-key' },
    { METERED_TURN_DOMAIN: 'test-app.metered.live', METERED_TURN_API_KEY: 'test-key', TURN_URLS: 'turn:relay.example', TURN_SHARED_SECRET: 'x'.repeat(32) },
  ]) {
    const result = validate(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing production configuration|Production origins|TURN/);
  }
});
