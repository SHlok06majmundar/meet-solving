import { test } from 'node:test';
import assert from 'node:assert/strict';
import TranscriptionService from '../src/services/TranscriptionService.js';
import { TranscriptWriter } from '../src/services/TranscriptWriter.js';

test('stopping transcription finalizes interim captions and cleans up without a recognition instance', () => {
  globalThis.window = {};
  const service = new TranscriptionService();
  service.isTranscribing = true;
  service.restartCount = 3;
  service.restartTimer = setTimeout(() => assert.fail('Restart timer must be cancelled'), 100);
  service.transcripts = [{ id: 'a', text: 'In progress', isFinal: false }];
  service.remoteAudioSources = { peer: {} };
  service.activeSpeaker = 'peer';
  let finalized;
  service.onTranscriptCallback = rows => { finalized = rows; };
  service.stopTranscription();
  assert.equal(service.isTranscribing, false);
  assert.equal(service.restartCount, 0);
  assert.equal(service.restartTimer, null);
  assert.equal(finalized[0].isFinal, true);
  assert.ok(finalized[0].endTime);
  assert.deepEqual(service.remoteAudioSources, {});
  assert.equal(service.activeSpeaker, null);
});

test('recognition starting state is stopped and repeated cleanup is safe', () => {
  globalThis.window = {};
  const service = new TranscriptionService();
  let stops = 0;
  service.recognition = { stop() { stops++; } };
  service.isRecognitionStarting = true;
  service.stopTranscription();
  service.stopTranscription();
  assert.equal(stops, 1);
  assert.equal(service.isRecognitionStarting, false);
});

test('transcript writes serialize and retain the newest update during an in-flight request', async () => {
  const writes = [];
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const writer = new TranscriptWriter(async item => {
    writes.push(item);
    if (writes.length === 1) await barrier;
  });
  writer.enqueue({ id: 'one', text: 'interim', isFinal: false });
  writer.enqueue({ id: 'one', text: 'newer interim', isFinal: false });
  writer.enqueue({ id: 'one', text: 'final', isFinal: true });
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes.map(item => item.text), ['interim', 'final']);
  writer.enqueue({ id: 'one', text: 'final', isFinal: true });
  await writer.flush();
  assert.equal(writes.length, 2);
  writer.close();
});

test('failed writes stay pending and can be retried without claiming success', async () => {
  let fail = true;
  let errors = 0;
  const writer = new TranscriptWriter(async () => { if (fail) throw new Error('offline'); }, () => { errors++; });
  writer.enqueue({ id: 'one', text: 'Final', isFinal: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writer.pending.size, 1);
  assert.equal(writer.saved.size, 0);
  assert.equal(errors, 1);
  clearTimeout(writer.retryTimer);
  writer.retryTimer = null;
  fail = false;
  await writer.flush();
  assert.equal(writer.pending.size, 0);
  assert.equal(writer.saved.size, 1);
  writer.close();
});
