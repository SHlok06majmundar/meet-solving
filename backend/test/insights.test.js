const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeInsights } = require('../src/utils/insights');
const { getIceServers } = require('../src/services/iceService');
const { createHmac } = require('node:crypto');

test('malformed provider output cannot become unexpected UI values', () => {
  assert.equal(normalizeInsights([]), null);
  const result = normalizeInsights({
    summaryBullets: [{ unexpected: true }, 'Summary'], decisions: 'not-an-array',
    actionItems: [null, { task: 'Ship', assignee: { name: 'bad' } }], score: 999,
  });
  assert.deepEqual(result.summaryBullets, ['Summary']);
  assert.deepEqual(result.decisions, []);
  assert.equal(result.actionItems[0].assignee, null);
  assert.equal(result.score, 100);
});

test('TURN credentials are temporary and signed; the shared secret never leaves the server', () => {
  process.env.TURN_URLS = 'turn:relay.example:3478,turns:relay.example:5349';
  process.env.TURN_SHARED_SECRET = 'a-test-secret-that-is-long-enough-for-coturn';
  const servers = getIceServers('alice');
  const relay = servers[1];
  assert.equal(relay.urls.length, 2);
  const expiry = Number(relay.username.split(':')[0]);
  assert.ok(expiry > Date.now() / 1000 && expiry < Date.now() / 1000 + 3601);
  assert.equal(relay.credential, createHmac('sha1', process.env.TURN_SHARED_SECRET).update(relay.username).digest('base64'));
  assert.ok(!JSON.stringify(servers).includes(process.env.TURN_SHARED_SECRET));
  delete process.env.TURN_URLS;
  delete process.env.TURN_SHARED_SECRET;
});
