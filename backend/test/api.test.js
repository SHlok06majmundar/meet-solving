require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.CLERK_JWT_KEY = publicKey.export({ type: 'spki', format: 'pem' });
const app = require('../src/app');
const { authenticateToken } = require('../src/middleware/auth');
const token = (userId = 'user_owner', claims = {}) => jwt.sign({ sub: userId, sid: 'sess_test', azp: 'http://localhost:5173', nbf: Math.floor(Date.now() / 1000) - 1, ...claims }, privateKey, { algorithm: 'RS256', expiresIn: '5m', header: { cat: 'cl_B7d4PD111AAA', kid: 'test-key' } });
const auth = token();
const asUser = (method, path, identity = auth) => request(app)[method](path).set('Authorization', `Bearer ${identity}`);

test('public health works; private endpoints reject missing or forged sessions', async () => {
  await request(app).get('/api/status').expect(200);
  await request(app).get('/api/ready').expect(200);
  await request(app).get('/api/ice-servers').expect(401);
  const ice = await asUser('get', '/api/ice-servers').expect(200);
  assert.equal(ice.headers['cache-control'], 'no-store');
  assert.ok(Array.isArray(ice.body.iceServers));
  for (const path of ['/api/generate-meeting-id', '/api/stream-token', `/api/meetings/${randomUUID()}/transcripts`]) {
    await request(app).get(path).expect(401);
    await asUser('get', path, 'forged.token.value').expect(401);
  }
});

test('session signature, expiration, authorized party and active status are verified', async () => {
  assert.equal((await authenticateToken(auth)).userId, 'user_owner');
  await assert.rejects(authenticateToken(token('user_owner', { azp: 'https://untrusted.example' })), { status: 401 });
  await assert.rejects(authenticateToken(token('user_owner', { sts: 'pending' })), { status: 401 });
  const expired = jwt.sign({ sub: 'user_owner', sid: 'sess_test', azp: 'http://localhost:5173', exp: 1 }, privateKey, { algorithm: 'RS256', header: { cat: 'cl_B7d4PD111AAA', kid: 'test-key' } });
  await assert.rejects(authenticateToken(expired), { status: 401 });
});

test('only members can read or write; joining a valid invitation grants access', async () => {
  const created = await asUser('get', '/api/generate-meeting-id').expect(200);
  const id = created.body.meetingId;
  assert.match(id, /^[a-f0-9-]{36}$/);
  const other = token('user_other');
  await asUser('get', `/api/meetings/${id}/transcripts`, other).expect(403);
  await asUser('post', '/api/transcripts', other).send({ meetingId: id, text: 'unauthorized' }).expect(403);
  await asUser('post', `/api/meetings/${randomUUID()}/join`, other).expect(404);
  await asUser('post', `/api/meetings/${id}/join`, other).expect(200);
  await asUser('get', `/api/meetings/${id}/transcripts`, other).expect(200);
});

test('transcripts use verified authors, reject impersonation and validate content', async () => {
  const { body: { meetingId } } = await asUser('get', '/api/generate-meeting-id');
  await asUser('post', '/api/transcripts').send({ meetingId, transcriptId: 'user_owner-one', userId: 'victim', text: 'Original', isFinal: true }).expect(200);
  const other = token('user_other');
  await asUser('post', `/api/meetings/${meetingId}/join`, other).expect(200);
  await asUser('post', '/api/transcripts', other).send({ meetingId, transcriptId: 'user_owner-one', text: 'Overwrite' }).expect(400);
  const { body } = await asUser('get', `/api/meetings/${meetingId}/transcripts`);
  assert.equal(body.transcripts.length, 1);
  assert.equal(body.transcripts[0].speakerId, 'user_owner');
  assert.equal(body.transcripts[0].text, 'Original');
  for (const text of [' ', 12, 'x'.repeat(12001)]) {
    await asUser('post', '/api/transcripts').send({ meetingId, text }).expect(400);
  }
  await asUser('get', `/api/meetings/${meetingId}/transcripts?since=invalid`).expect(400);
});

test('pagination advances across equal timestamps without missing or repeating chunks', async () => {
  const { body: { meetingId } } = await asUser('get', '/api/generate-meeting-id');
  for (let i = 0; i < 5; i++) await asUser('post', '/api/transcripts').send({ meetingId, transcriptId: `user_owner-${i}`, text: `Chunk ${i}` }).expect(200);
  let cursor = '';
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const { body } = await asUser('get', `/api/meetings/${meetingId}/transcripts?limit=2${cursor ? `&since=${cursor}` : ''}`).expect(200);
    ids.push(...body.transcripts.map(row => row.id));
    cursor = body.latestCursor;
    if (!body.hasMore) break;
  }
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
});

test('token endpoint cannot mint another user identity', async () => {
  process.env.STREAM_API_KEY = 'test-key';
  process.env.STREAM_API_SECRET = 'test-secret';
  const { body } = await asUser('get', '/api/stream-token?userId=victim').expect(200);
  assert.equal(jwt.verify(body.token, 'test-secret').user_id, 'user_owner');
});

test('audio rejects unauthorized headers before parsing and requires the body meeting to match', async () => {
  const { body: { meetingId } } = await asUser('get', '/api/generate-meeting-id');
  const other = token('user_no_audio_access');
  const missing = await asUser('post', '/api/transcribe-whisper')
    .set('Content-Type', 'multipart/form-data; boundary=broken').send('malformed multipart').expect(400);
  assert.match(missing.body.error, /Invalid meeting ID/);
  const forbidden = await asUser('post', '/api/transcribe-whisper', other)
    .set('X-Meeting-ID', meetingId).set('Content-Type', 'multipart/form-data; boundary=broken')
    .send('malformed multipart').expect(403);
  assert.match(forbidden.body.error, /Join the meeting/);
  const mismatch = await asUser('post', '/api/transcribe-whisper').set('X-Meeting-ID', meetingId)
    .field('meetingId', randomUUID()).attach('audio', Buffer.from('test-audio'), { filename: 'test.webm', contentType: 'audio/webm' }).expect(400);
  assert.match(mismatch.body.error, /does not match/);
  await asUser('post', '/api/transcribe-whisper').set('X-Meeting-ID', meetingId)
    .field('meetingId', meetingId).attach('audio', Buffer.from('test-audio'), { filename: 'test.txt', contentType: 'text/plain' }).expect(415);
});

test('CORS, safe errors and request limits are enforced', async () => {
  await request(app).get('/api/status').set('Origin', 'https://evil.example').expect(403);
  const allowed = await request(app).options('/api/transcripts').set('Origin', 'http://localhost:5173').expect(204);
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(allowed.headers['access-control-allow-headers'], /X-Meeting-ID/);
  const malformed = await asUser('post', '/api/transcripts').set('Content-Type', 'application/json').send('{broken').expect(400);
  assert.ok(malformed.body.requestId);
  await asUser('post', '/api/transcripts').send({ text: 'x'.repeat(300000) }).expect(413);
  const limitedUser = token('user_limited');
  for (let i = 0; i < 20; i++) await asUser('post', '/api/ai-brief', limitedUser).send({ title: 'Planning' }).expect(200);
  await asUser('post', '/api/ai-brief', limitedUser).send({ title: 'Planning' }).expect(429);
});
