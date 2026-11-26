const express = require('express');
const { upload } = require('../config/clients');
const {
	transcribeWhisper,
	getAiInsights,
	getAiChatAnswer,
	getMeetingBrief,
} = require('../controllers/aiController');

const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const { validateBody } = require('../middleware/validation');
const { requireMeetingAccess } = require('../services/accessService');
const { admitAudio, requireMatchingAudioMeeting } = require('../middleware/audioAdmission');
const aiLimit = rateLimit({ windowMs: 60000, limit: 20, keyGenerator: req => req.auth.userId, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/api/transcribe-whisper', aiLimit, admitAudio, upload.single('audio'), validateBody, requireMatchingAudioMeeting, (req, res, next) => {
  Promise.resolve(transcribeWhisper(req, res, next)).catch(next).finally(() => req.audioLease.release());
});
router.post('/api/ai-insights', aiLimit, validateBody, requireMeetingAccess, getAiInsights);
router.post('/api/ai-chat', aiLimit, validateBody, requireMeetingAccess, getAiChatAnswer);
router.post('/api/ai-brief', aiLimit, validateBody, getMeetingBrief);

module.exports = router;
