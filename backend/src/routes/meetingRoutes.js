const express = require('express');
const {
  generateMeetingId,
  saveTranscriptEntry,
  getMeetingTranscripts,
  getLatestIntelligence,
} = require('../controllers/meetingController');

const router = express.Router();
const { requireMeetingAccess, joinMeeting } = require('../services/accessService');
const { asyncRoute } = require('../middleware/errors');
const { validateBody } = require('../middleware/validation');

router.get('/api/generate-meeting-id', generateMeetingId);
router.get('/api/ice-servers', asyncRoute(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ iceServers: await require('../services/iceService').getIceServers(req.auth.userId) });
}));
router.post('/api/meetings/:meetingId/join', asyncRoute(async (req, res) => {
  await joinMeeting(req.params.meetingId, req.auth.userId);
  res.json({ success: true });
}));
router.post('/api/transcripts', validateBody, requireMeetingAccess, saveTranscriptEntry);
router.get('/api/meetings/:meetingId/transcripts', requireMeetingAccess, getMeetingTranscripts);
router.get('/api/meetings/:meetingId/intelligence/latest', requireMeetingAccess, getLatestIntelligence);

module.exports = router;
