const { createMeeting } = require('../services/accessService');
const {
  saveTranscript,
  getMeetingTranscripts: fetchMeetingTranscripts,
  getLatestMeetingInsight,
} = require('../services/meetingService');

async function generateMeetingId(req, res, next) {
  try {
    const meetingId = await createMeeting(req.auth.userId);
    return res.json({ meetingId });
  } catch (error) { next(error); }
}

async function saveTranscriptEntry(req, res, next) {
  try {
    const {
      meetingId,
      transcriptId,
      speakerName,
      text,
      source,
      timestamp,
      isFinal,
    } = req.body || {};

    if (!meetingId || !text) {
      return res.status(400).json({ error: 'meetingId and text are required' });
    }

    const storage = await saveTranscript({
      meetingId,
      transcriptId,
      userId: req.auth.userId,
      speakerName,
      text,
      source: source || 'browser-stt',
      createdAt: timestamp || new Date().toISOString(),
      isFinal: Boolean(isFinal),
    });

    if (!storage.saved) {
      return res.status(500).json({
        success: false,
        error: storage.reason || 'failed-to-save-transcript',
        storage,
      });
    }


    return res.json({ success: true, storage });
  } catch (error) {
    return next(error);
  }
}

async function getMeetingTranscripts(req, res, next) {
  try {
    const { meetingId } = req.params;
    const { since, limit } = req.query;

    const parsedLimit = Number(limit);
    const options = {
      since: typeof since === 'string' && since ? since : null,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 500)
        : 200,
    };

    const result = await fetchMeetingTranscripts(meetingId, options);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to fetch transcripts' });
    }

    return res.json({
      success: true,
      transcripts: result.transcripts,
      latestCursor: result.latestCursor,
      source: result.source,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return next(error);
  }
}

async function getLatestIntelligence(req, res, next) {
  try {
    const meetingId = req.params.meetingId;
    const result = await getLatestMeetingInsight(meetingId);

    if (result.error) {
      const message = result.error === 'No insights found for this meeting' || result.error === 'meetingId is required'
        ? result.error
        : 'Failed to fetch latest insights';
      return res.status(result.status).json({ error: message, details: message === result.error ? undefined : result.error });
    }

    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateMeetingId,
  saveTranscriptEntry,
  getMeetingTranscripts,
  getLatestIntelligence,
};
