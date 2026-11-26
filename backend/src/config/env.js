const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const repoEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');

// Platform environment > backend-local file > repository fallback.
for (const envPath of [backendEnvPath, repoEnvPath]) {
  if (process.env.NODE_ENV !== 'test' && fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
}

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (ALLOWED_ORIGINS.some(origin => origin.includes('*') || new URL(origin).origin !== origin)) {
  throw new Error('ALLOWED_ORIGINS must contain exact origins without wildcards or trailing slashes');
}
function validateProductionConfig() {
  if (NODE_ENV !== 'production') return;
  const required = ['ALLOWED_ORIGINS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLERK_ISSUER_URL', 'TURN_URLS', 'TURN_SHARED_SECRET'];
  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) required.push('CLERK_SECRET_KEY');
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
  if (ALLOWED_ORIGINS.some(origin => !origin.startsWith('https://'))) throw new Error('Production origins must use HTTPS');
  if (process.env.TURN_SHARED_SECRET.length < 32) throw new Error('TURN_SHARED_SECRET must contain at least 32 characters');
  if (process.env.TURN_URLS.split(',').some(url => !/^turns?:/.test(url.trim()))) throw new Error('TURN_URLS must contain turn: or turns: URLs');
}

module.exports = {
  PORT,
  NODE_ENV,
  ALLOWED_ORIGINS,
  OPENAI_TRANSCRIBE_MODEL,
  OPENAI_CHAT_MODEL,
  GEMINI_MODEL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  validateProductionConfig,
};
