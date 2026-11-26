const fs = require('fs');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const app = require('./app');
const { registerSocketSecurity } = require('./socket/security');
const { validateProductionConfig } = require('./config/env');
validateProductionConfig();
const { PORT, NODE_ENV, ALLOWED_ORIGINS } = require('./config/env');
const { registerSocketHandlers, startInactiveUserCleanup } = require('./socket/registerSocketHandlers');

console.log(`Starting server in ${NODE_ENV} mode on port ${PORT}`);
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
if (!require('./services/iceService').isTurnConfigured()) {
  console.warn('TURN relay is not configured. Calls use direct connections; restrictive networks may not connect.');
}

let server;
if (NODE_ENV === 'production' && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  try {
    const sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };

    server = https.createServer(sslOptions, app);
    console.log('HTTPS server created');
  } catch (error) {
    throw new Error(`Failed to load TLS certificates: ${error.message}`, { cause: error });
  }
} else {
  server = http.createServer(app);
  console.log('HTTP server created');
}

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 256 * 1024,
  allowRequest: (req, callback) => callback(null, !req.headers.origin || ALLOWED_ORIGINS.includes(req.headers.origin)),
});

registerSocketSecurity(io);
registerSocketHandlers(io);
const cleanupTimer = startInactiveUserCleanup(io);

function shutdown() {
  clearInterval(cleanupTimer);
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
