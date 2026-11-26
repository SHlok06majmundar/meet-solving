process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLERK_SECRET_KEY']) delete process.env[key];
for (const key of ['METERED_TURN_DOMAIN', 'METERED_TURN_API_KEY']) delete process.env[key];
