require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const request = require('supertest');
const { createApp } = require('../src/app');

test('one account exhausting its API allowance does not block another account on the same IP', async t => {
  const app = createApp({ authenticate: (req, res, next) => {
    req.auth = { userId: req.get('X-Test-User') };
    next();
  } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (let batch = 0; batch < 12; batch++) {
    const responses = await Promise.all(Array.from({ length: 50 }, () => request(server).get('/api/missing').set('X-Test-User', 'alice')));
    assert.ok(responses.every(response => response.status === 404));
  }
  const limited = await request(server).get('/api/missing').set('X-Test-User', 'alice').expect(429);
  assert.ok(limited.headers['retry-after']);
  await request(server).get('/api/missing').set('X-Test-User', 'bob').expect(404);
});
