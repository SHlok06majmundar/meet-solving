import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IceCandidateQueue } from '../src/services/IceCandidateQueue.js';
test('early ICE candidates survive signaling and are applied after remote description', async () => {
  const queue = new IceCandidateQueue();
  const applied = [];
  const peer = { remoteDescription: null, signalingState: 'stable', addIceCandidate: async candidate => applied.push(candidate) };
  await queue.add('alice', 'before-peer');
  await queue.add('alice', 'before-description', peer);
  assert.deepEqual(applied, []);
  peer.remoteDescription = { type: 'offer' };
  await queue.flush('alice', peer);
  await queue.add('alice', 'after-description', peer);
  assert.deepEqual(applied, ['before-peer', 'before-description', 'after-description']);
  assert.equal(queue.pending.size, 0);
});
