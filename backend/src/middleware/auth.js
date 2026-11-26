const { verifyToken } = require('@clerk/backend');
const { ALLOWED_ORIGINS } = require('../config/env');

async function authenticateToken(token) {
  if (!token || typeof token !== 'string' || token.length > 8192) {
    throw Object.assign(new Error('Sign in to continue'), { status: 401 });
  }
  try {
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: process.env.CLERK_ISSUER_URL || undefined,
      jwtKey: process.env.CLERK_JWT_KEY?.replace(/\\n/g, '\n'),
      authorizedParties: ALLOWED_ORIGINS,
    });
    if (!ALLOWED_ORIGINS.includes(claims.azp) || typeof claims.sub !== 'string' || typeof claims.sid !== 'string' || !Number.isFinite(claims.exp) || (claims.sts && claims.sts !== 'active')) throw new Error('Invalid session');
    return { userId: claims.sub, sessionId: claims.sid, expiresAt: claims.exp * 1000 };
  } catch {
    throw Object.assign(new Error('Your session is invalid or expired. Sign in again.'), { status: 401 });
  }
}

async function requireAuth(req, res, next) {
  try {
    const match = req.headers.authorization?.match(/^Bearer (.+)$/);
    req.auth = await authenticateToken(match?.[1]);
    next();
  } catch (error) { next(error); }
}

module.exports = { authenticateToken, requireAuth };
