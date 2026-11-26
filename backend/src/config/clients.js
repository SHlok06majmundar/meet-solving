const multer = require('multer');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./env');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 8, fieldSize: 4096 },
  fileFilter: (req, file, callback) => {
    const allowed = new Set(['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-wav', 'video/webm']);
    callback(allowed.has(file.mimetype) ? null : Object.assign(new Error('Unsupported audio format'), { status: 415 }), allowed.has(file.mimetype));
  },
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 30000 } })
  : null;

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  : null;

const keyLooksPublishable = typeof SUPABASE_SERVICE_ROLE_KEY === 'string'
  && SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_');

if (!supabaseAdmin && process.env.NODE_ENV !== 'test') {
  console.warn('Supabase admin client not initialized. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend environment.');
}

if (
  keyLooksPublishable
) {
  throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY: use a backend secret key, never a publishable key.');
}

module.exports = {
  upload,
  openai,
  gemini,
  supabaseAdmin,
};
