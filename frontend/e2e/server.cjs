// Isolated local test service. Production startup never imports this file.
process.env.NODE_ENV = "test";
process.env.ALLOWED_ORIGINS = "http://127.0.0.1:5188";
for (const key of [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "TURN_URLS",
  "TURN_SHARED_SECRET",
])
  delete process.env[key];
const { createRequire } = require("node:module");
const { join } = require("node:path");
const fromBackend = createRequire(
  join(__dirname, "../../backend/package.json"),
);
const { createApp } = fromBackend("./src/app");
const { registerSocketSecurity } = fromBackend("./src/socket/security");
const { registerSocketHandlers } = fromBackend(
  "./src/socket/registerSocketHandlers",
);
const { Server } = fromBackend("socket.io");
const { createServer } = require("node:http");
const authenticate = async (token) => {
  if (!/^e2e:user_e2e_[a-z]+$/.test(token || ""))
    throw Object.assign(new Error("Invalid test identity"), { status: 401 });
  return { userId: token.slice(4), expiresAt: Date.now() + 3600000 };
};
const app = createApp({
  authenticate: async (req, res, next) => {
    try {
      req.auth = await authenticate(
        req.headers.authorization?.replace(/^Bearer /, ""),
      );
      next();
    } catch (error) {
      next(error);
    }
  },
});
const server = createServer(app);
const io = new Server(server, { cors: { origin: "http://127.0.0.1:5188" } });
registerSocketSecurity(io, authenticate);
registerSocketHandlers(io);
server.listen(5059, "127.0.0.1");
const stop = () => io.close(() => process.exit(0));
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
