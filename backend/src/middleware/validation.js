const { validateMeetingId } = require('../services/accessService');
function validateBody(req, res, next) {
  try {
    const body = req.body || {};
    const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
    if (typeof body !== 'object' || Array.isArray(body)) invalid('Expected a JSON object');
    if (body.meetingId !== undefined) validateMeetingId(body.meetingId);
    const limits = { text: 12000, transcriptId: 200, speakerName: 100, question: 2000, title: 200, goal: 2000, context: 12000, source: 40, language: 20 };
    for (const [key, max] of Object.entries(limits)) {
      if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > max)) invalid(`Invalid ${key} (maximum ${max} characters)`);
    }
    if (body.transcriptId !== undefined && !body.transcriptId.startsWith(`${req.auth.userId}-`)) invalid('Transcript identity does not match your session');
    if (body.text !== undefined && !body.text.trim()) invalid('Transcript text cannot be empty');
    if (body.timestamp !== undefined && (typeof body.timestamp !== 'string' || !Number.isFinite(Date.parse(body.timestamp)))) invalid('Invalid timestamp');
    if (body.isFinal !== undefined && typeof body.isFinal !== 'boolean') invalid('isFinal must be a boolean');
    if (body.transcripts !== undefined && (!Array.isArray(body.transcripts) || body.transcripts.length > 2000 || body.transcripts.some(item => !item || typeof item.text !== 'string' || item.text.length > 12000 || (item.speakerName !== undefined && typeof item.speakerName !== 'string')))) invalid('Invalid transcripts');
    next();
  } catch (error) { next(error); }
}
module.exports = { validateBody };
