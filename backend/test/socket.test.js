require('./setup');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { registerSocketSecurity } = require('../src/socket/security');
const { registerSocketHandlers } = require('../src/socket/registerSocketHandlers');
const { createMeeting, joinMeeting } = require('../src/services/accessService');
const { activeRooms, roomMessages } = require('../src/socket/state');

test('sockets authenticate, isolate meetings, and derive sender identity server-side', async t => {
  const server = createServer();
  const io = new Server(server);
  registerSocketSecurity(io, async token => {
    if (!['alice', 'bob', 'eve'].includes(token)) throw new Error('Unauthorized');
    return { userId: token, expiresAt: Date.now() + 60000 };
  });
  registerSocketHandlers(io);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  t.after(async () => {
    clients.forEach(client => client.disconnect());
    await new Promise(resolve => io.close(resolve));
  });
  const client = async identity => {
    const socket = connect(url, { auth: { token: identity }, transports: ['websocket'], reconnection: false });
    clients.push(socket);
    await once(socket, 'connect');
    return socket;
  };
  const invalid = connect(url, { transports: ['websocket'], reconnection: false });
  clients.push(invalid);
  await once(invalid, 'connect_error');
  assert.equal(invalid.connected, false);
  const room = await createMeeting('alice');
  await joinMeeting(room, 'bob');
  const otherRoom = await createMeeting('eve');
  const alice = await client('alice');
  const bob = await client('bob');
  const eve = await client('eve');
  async function join(socket, meetingId, username) {
    const joined = once(socket, 'joined-room');
    socket.emit('join-room', { meetingId, username });
    await joined;
  }
  // Packet middleware must finish the asynchronous join before processing its next packet.
  const joinedMuted = once(alice, 'joined-room');
  const mediaChanged = once(alice, 'user-media-status-changed');
  alice.emit('join-room', { meetingId: room, username: 'Alice', hasAudio: false, hasVideo: false });
  alice.emit('media-status-changed', { meetingId: room, hasAudio: false, hasVideo: false });
  await Promise.all([joinedMuted, mediaChanged]);
  assert.equal(activeRooms.get(room).get(alice.id).hasAudio, false);
  assert.equal(activeRooms.get(room).get(alice.id).hasVideo, false);
  await join(bob, room, 'Bob');
  await join(eve, otherRoom, 'Eve');

  // A cross-room answer used to be forwarded without checking membership.
  const rejected = once(eve, 'error');
  eve.emit('answer', { targetId: alice.id, answer: { type: 'answer', sdp: 'test' }, answererId: bob.id });
  assert.match((await rejected)[0].message, /not in this meeting/);

  const offered = once(bob, 'offer');
  alice.emit('offer', { targetId: bob.id, offer: { type: 'offer', sdp: 'test' }, offererId: eve.id, offererUsername: 'Eve' });
  const [offer] = await offered;
  assert.equal(offer.offererId, alice.id);
  assert.equal(offer.offererUsername, 'Alice');

  const shareRejected = once(eve, 'error');
  eve.emit('screen-share-started', { roomId: room, userId: alice.id });
  assert.match((await shareRejected)[0].message, /another meeting/);

  const chunk = once(bob, 'transcription-data');
  alice.emit('transcription-data', { meetingId: room, id: 'alice-one', speakerId: 'eve', speakerName: 'Eve', text: 'Hello', isFinal: true });
  const [transcript] = await chunk;
  assert.equal(transcript.speakerId, 'alice');
  assert.equal(transcript.speakerName, 'Alice');

  const messageId = `${alice.id}-retry-test`;
  const received = once(bob, 'room-message');
  alice.emit('room-message', { meetingId: room, messageId, text: 'One message' });
  await received;
  const retried = once(alice, `room-message-confirm-${messageId}`);
  alice.emit('room-message', { meetingId: room, messageId, text: 'One message' });
  await retried;
  assert.equal(roomMessages.get(room).filter(message => message.messageId === messageId).length, 1);

  const unauthorized = once(eve, 'error');
  eve.emit('join-room', { meetingId: room, username: 'Eve' });
  assert.match((await unauthorized)[0].message, /Join the meeting/);
});
