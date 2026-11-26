require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createIceService, isTurnConfigured } = require('../src/services/iceService');

const env = { METERED_TURN_DOMAIN: 'test-app.metered.live', METERED_TURN_API_KEY: 'private-api-key' };
const payload = [
  { urls: 'stun:stun.example:3478' },
  { urls: ['turn:relay.example:80', 'turns:relay.example:443?transport=tcp'], username: 'relay-user', credential: 'relay-password', apiKey: env.METERED_TURN_API_KEY },
];

test('Metered credentials stay behind signed-session endpoint and cached results omit provider secrets', async () => {
  let requests = 0;
  let time = 0;
  const service = createIceService({env, now: () => time, fetchImpl: async (url, options) => {
    requests++;
    assert.equal(url, `https://test-app.metered.live/api/v1/turn/credentials?apiKey=${env.METERED_TURN_API_KEY}`);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return {ok: true, json: async () => payload};
  }});
  const [alice, bob] = await Promise.all([service.getIceServers('alice'), service.getIceServers('bob')]);
  assert.equal(requests, 1);
  assert.deepEqual(alice, bob);
  assert.equal(alice[1].urls[1], 'turns:relay.example:443?transport=tcp');
  assert.equal(JSON.stringify(alice).includes(env.METERED_TURN_API_KEY), false);
  await service.getIceServers('alice');
  assert.equal(requests, 1);
  time = 15001;
  await service.getIceServers('alice');
  assert.equal(requests, 2);
  assert.equal(isTurnConfigured(env), true);
});

test('provider failure redacts secret URLs and a subsequent credential request can recover', async () => {
  let attempts = 0;
  const service = createIceService({env, fetchImpl: async () => {
    if (++attempts === 1) throw Error(`Failed request with apiKey=${env.METERED_TURN_API_KEY}`);
    return {ok: true, json: async () => payload};
  }});
  await assert.rejects(service.getIceServers('alice'), error => error.status === 503 && !error.message.includes(env.METERED_TURN_API_KEY));
  assert.equal((await service.getIceServers('alice')).length, 2);
});

test('invalid provider hosts, missing credentials, and STUN-only provider responses are rejected', async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; return {ok: true, json: async () => payload}; };
  for (const domain of ['localhost', 'example.com', 'test-app.metered.live.evil.example', 'test-app.metered.live/path']) {
    await assert.rejects(createIceService({env: {...env,METERED_TURN_DOMAIN:domain},fetchImpl}).getIceServers('alice'), {status:503});
  }
  assert.equal(requests, 0);
  for (const response of [[],[{urls:'stun:stun.example:3478'}],[{urls:'turn:relay.example:443'}],[{urls:'https://example.com'}]]) {
    await assert.rejects(createIceService({env,fetchImpl: async () => ({ok:true,json:async () => response})}).getIceServers('alice'),{status:503});
  }
});
