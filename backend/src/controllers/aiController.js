const {
  transcribeAudioChunk,
  generateInsights,
  answerQuestion,
  generateMeetingBrief,
} = require('../services/aiService');

async function transcribeWhisper(req, res, next) {
  try {
    const result = await transcribeAudioChunk(req);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return next(error);
  }
}

async function getAiInsights(req, res, next) {
  try {
    const result = await generateInsights(req.body || {});
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return next(error);
  }
}

async function getAiChatAnswer(req, res, next) {
  try {
    const result = await answerQuestion(req.body || {});
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return next(error);
  }
}

async function getMeetingBrief(req, res, next) {
  try {
    const result = await generateMeetingBrief(req.body || {});
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  transcribeWhisper,
  getAiInsights,
  getAiChatAnswer,
  getMeetingBrief,
};
