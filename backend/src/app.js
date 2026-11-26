const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { ALLOWED_ORIGINS } = require('./config/env');
const { requireAuth } = require('./middleware/auth');
const { requestContext, errorHandler } = require('./middleware/errors');
const routes = require('./routes');

function createApp({ authenticate = requireAuth } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || false);
  app.use(requestContext, helmet());
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.vary('Origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'Origin is not allowed' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Meeting-ID');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(rateLimit({ windowMs: 60000, limit: 6000, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(express.json({ limit: '256kb' }));
  const userLimit = rateLimit({ windowMs: 60000, limit: 600, keyGenerator: req => req.auth.userId, standardHeaders: 'draft-8', legacyHeaders: false });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (['/status', '/ready'].includes(req.path) && req.method === 'GET') return next();
    return authenticate(req, res, error => error ? next(error) : userLimit(req, res, next));
  });
  app.use('/', routes);
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found', requestId: req.id }));
  app.use(errorHandler);
  return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
