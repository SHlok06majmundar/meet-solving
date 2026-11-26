const { authenticateToken } = require('../middleware/auth');
const { assertMeetingAccess } = require('../services/accessService');
const { userActivity } = require('./state');

function registerSocketSecurity(io, authenticate = authenticateToken) {
  io.use(async (socket, next) => {
    try {
      socket.auth = await authenticate(socket.handshake.auth?.token);
      next();
    } catch { next(new Error('Sign in to connect to the meeting.')); }
  });
  io.on('connection', socket => {
    let windowStarted = Date.now();
    let events = 0;
    const membership = new Map();
    let pendingJoin = null;
    socket.use(async ([event, payload], next) => {
      const previousJoin = pendingJoin;
      let finishJoin = null;
      if (event === 'join-room') {
        let release;
        const completion = new Promise(resolve => { release = resolve; });
        pendingJoin = completion;
        finishJoin = () => {
          release();
          if (pendingJoin === completion) pendingJoin = null;
        };
      }
      try {
        // Socket.IO does not await async packet middleware before dispatching the next packet.
        // Preserve join ordering so immediately following media/signaling updates see membership.
        if (previousJoin) await previousJoin;
        if (Date.now() - windowStarted > 10000) { windowStarted = Date.now(); events = 0; }
        if (++events > 250) throw new Error('Too many requests. Please slow down.');
        if (event === 'authenticate') return next();
        if (socket.auth.expiresAt <= Date.now()) throw new Error('Session expired. Reconnect to continue.');
        socket.lastActivity = Date.now();
        if (userActivity.has(socket.id)) userActivity.get(socket.id).lastActivity = Date.now();
        if (event === 'heartbeat') return next();
        if (event === 'join-room' || event === 'get-room-status') {
          const id = event === 'join-room' ? payload?.meetingId : payload;
          if (!membership.has(id) || Date.now() - membership.get(id) > 30000) {
            await assertMeetingAccess(id, socket.auth.userId);
            membership.set(id, Date.now());
            if (membership.size > 10) membership.delete(membership.keys().next().value);
          }
          if (event === 'join-room' && (typeof payload.username !== 'string' || payload.username.length > 100)) throw new Error('Invalid display name');
          if (event === 'join-room') {
            if (['hasAudio', 'hasVideo'].some(key => payload[key] !== undefined && typeof payload[key] !== 'boolean')) throw new Error('Invalid initial media preferences');
            socket.finishRoomJoin = finishJoin;
          }
          return next();
        }
        if (!socket.meetingId) throw new Error('Join a meeting first');
        const roomId = typeof payload === 'string' ? payload : payload?.meetingId || payload?.roomId;
        if (roomId && roomId !== socket.meetingId) throw new Error('This event belongs to another meeting');
        const targetId = payload?.targetId || payload?.peerId;
        if (targetId) {
          const target = io.sockets.sockets.get(targetId);
          if (!target || target.meetingId !== socket.meetingId) throw new Error('Peer is not in this meeting');
        }
        if (event === 'room-message' && payload?.messageId !== undefined && (typeof payload.messageId !== 'string' || payload.messageId.length > 200 || !payload.messageId.startsWith(`${socket.id}-`))) throw new Error('Invalid message identity');
        if (event === 'room-message' && (typeof payload?.text !== 'string' || payload.text.length > 2000)) throw new Error('Invalid chat message');
        if (event === 'transcription-data' && payload?.id !== undefined && (typeof payload.id !== 'string' || !payload.id.startsWith(`${socket.auth.userId}-`))) throw new Error('Transcript identity does not match your session');
        if (event === 'transcription-data' && (typeof payload?.text !== 'string' || payload.text.length > 12000 || (payload.id !== undefined && (typeof payload.id !== 'string' || payload.id.length > 200)))) throw new Error('Invalid transcript');
        if (event === 'message-read') {
          const { roomMessages } = require('./state');
          if (!(roomMessages.get(socket.meetingId) || []).some(message => message.messageId === payload?.messageId)) throw new Error('Message not found in this meeting');
        }
        next();
      } catch (error) {
        finishJoin?.();
        socket.emit('error', { message: error.status >= 500 ? 'Meeting service unavailable' : error.message });
      }
    });
    socket.on('authenticate', async (token, acknowledge) => {
      try {
        const identity = await authenticate(token);
        if (identity.userId !== socket.auth.userId) throw new Error('Session changed');
        socket.auth = identity;
        if (typeof acknowledge === 'function') acknowledge({ success: true });
      } catch { socket.disconnect(true); }
    });
  });
}
module.exports = { registerSocketSecurity };
