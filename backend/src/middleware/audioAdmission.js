const { assertMeetingAccess, validateMeetingId } = require('../services/accessService');

function createAudioAdmission({ maxConcurrent = 3, maxPerUser = 1, verifyAccess = assertMeetingAccess } = {}) {
  let active = 0;
  const users = new Map();
  return async function admitAudio(req, res, next) {
    try {
      const meetingId = req.get('X-Meeting-ID');
      validateMeetingId(meetingId);
      const userId = req.auth.userId;
      if (active >= maxConcurrent || (users.get(userId) || 0) >= maxPerUser) {
        res.setHeader('Retry-After', '3');
        return res.status(503).json({ error: 'Audio processing is busy. Please retry shortly.' });
      }

      active++;
      users.set(userId, (users.get(userId) || 0) + 1);
      let released = false;
      const lease = {
        processing: false,
        release() {
          if (released) return;
          released = true;
          active--;
          const remaining = (users.get(userId) || 1) - 1;
          if (remaining) users.set(userId, remaining);
          else users.delete(userId);
        },
      };
      req.audioLease = lease;
      req.uploadMeetingId = meetingId;
      res.once('finish', lease.release);
      res.once('close', () => {
        // An aborted provider request still owns its buffer until its handler settles.
        if (!lease.processing) lease.release();
      });

      // Verify the header before Multer allocates any upload buffers.
      await verifyAccess(meetingId, userId);
      if (res.destroyed || res.writableEnded) { lease.release(); return; }
      next();
    } catch (error) {
      req.audioLease?.release();
      next(error);
    }
  };
}

function requireMatchingAudioMeeting(req, res, next) {
  if (req.body?.meetingId !== req.uploadMeetingId) {
    return next(Object.assign(new Error('Audio meeting ID does not match the authorized upload.'), { status: 400 }));
  }
  req.audioLease.processing = true;
  next();
}

const admitAudio = createAudioAdmission();
module.exports = { createAudioAdmission, admitAudio, requireMatchingAudioMeeting };
