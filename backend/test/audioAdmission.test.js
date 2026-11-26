require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const { createAudioAdmission, requireMatchingAudioMeeting } = require('../src/middleware/audioAdmission');

function response() {
  const res = new EventEmitter();
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.status = status => { res.statusCode = status; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
}

function upload(userId, meetingId = randomUUID()) {
  return { auth: { userId }, get: () => meetingId };
}

test('audio access is checked before buffers are admitted and denial releases capacity', async () => {
  let reject = true;
  const guard = createAudioAdmission({ maxConcurrent: 1, verifyAccess: async () => {
    if (reject) throw Object.assign(new Error('Not a member'), { status: 403 });
  } });
  let error;
  await guard(upload('alice'), response(), failure => { error = failure; });
  assert.equal(error.status, 403);
  reject = false;
  const allowed = upload('alice');
  let admitted = false;
  await guard(allowed, response(), failure => { assert.equal(failure, undefined); admitted = true; });
  assert.equal(admitted, true);
  allowed.audioLease.release();
});

test('global and per-user admission bound simultaneous buffers and release exactly once', async () => {
  const guard = createAudioAdmission({ maxConcurrent: 2, verifyAccess: async () => {} });
  const alice = upload('alice');
  const aliceResponse = response();
  const bob = upload('bob');
  const bobResponse = response();
  await guard(alice, aliceResponse, () => {});
  const sameUser = response();
  await guard(upload('alice'), sameUser, () => assert.fail('One user cannot own two upload buffers'));
  assert.equal(sameUser.statusCode, 503);
  assert.equal(sameUser.headers['Retry-After'], '3');
  await guard(bob, bobResponse, () => {});
  const full = response();
  await guard(upload('eve'), full, () => assert.fail('Global upload capacity must be bounded'));
  assert.equal(full.statusCode, 503);
  aliceResponse.emit('finish');
  aliceResponse.emit('close');
  const eve = upload('eve');
  let admitted = false;
  await guard(eve, response(), () => { admitted = true; });
  assert.equal(admitted, true);
  const stillFull = response();
  await guard(upload('carol'), stillFull, () => assert.fail('Finish plus close must not release twice'));
  assert.equal(stillFull.statusCode, 503);
  bob.audioLease.release();
  eve.audioLease.release();
});

test('disconnecting during provider processing does not bypass the buffer limit', async () => {
  const guard = createAudioAdmission({ maxConcurrent: 1, verifyAccess: async () => {} });
  const pending = upload('alice');
  const pendingResponse = response();
  await guard(pending, pendingResponse, () => { pending.audioLease.processing = true; });
  pendingResponse.emit('close');
  const rejected = response();
  await guard(upload('bob'), rejected, () => assert.fail('A pending provider still holds its buffer'));
  assert.equal(rejected.statusCode, 503);
  pending.audioLease.release();
  const accepted = upload('bob');
  await guard(accepted, response(), error => assert.equal(error, undefined));
  accepted.audioLease.release();
});

test('audio body cannot substitute a meeting after the header was authorized', () => {
  const req = { uploadMeetingId: randomUUID(), body: { meetingId: randomUUID() }, audioLease: { processing: false } };
  let error;
  requireMatchingAudioMeeting(req, {}, failure => { error = failure; });
  assert.equal(error.status, 400);
  assert.equal(req.audioLease.processing, false);
  req.body.meetingId = req.uploadMeetingId;
  requireMatchingAudioMeeting(req, {}, failure => assert.equal(failure, undefined));
  assert.equal(req.audioLease.processing, true);
});
