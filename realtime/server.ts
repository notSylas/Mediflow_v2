// Standalone realtime server (self-hosted WebSockets via socket.io).
// Run alongside the Next.js app: `npm run realtime`.
//
// Flow: the REST API persists a message and Postgres NOTIFYs the `chat_message`
// channel. This process LISTENs, then pushes the message over WebSocket to the
// two participants' rooms. Clients authenticate with a short-lived token minted
// by /api/v1/realtime/token (cookies don't cross the origin boundary).
import { createServer } from "node:http";
import { Server } from "socket.io";
import { sql } from "../src/db";
import { CHAT_CHANNEL, type ChatEvent } from "../src/lib/messaging/realtime";
import { verifyRealtimeToken } from "../src/lib/messaging/realtime-token";

const PORT = Number(process.env.REALTIME_PORT ?? 4000);

// Browser clients must come from an allowlisted origin. Native apps send no
// Origin header and authenticate by token, so they are unaffected. Configure
// via REALTIME_ALLOWED_ORIGINS (comma-separated); defaults cover local dev.
const ALLOWED_ORIGINS = (
  process.env.REALTIME_ALLOWED_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const httpServer = createServer((_req, res) => {
  // Tiny health endpoint.
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("realtime ok");
});

const io = new Server(httpServer, {
  // Auth is via the handshake token, not cookies — so credentials stay off and
  // the origin check is a defense-in-depth allowlist for browser clients.
  cors: { origin: ALLOWED_ORIGINS },
  // Path stays default (/socket.io).
});

const room = (userId: string) => `user:${userId}`;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const claims = token ? verifyRealtimeToken(token) : null;
  if (!claims) return next(new Error("unauthorized"));
  socket.data.userId = claims.userId;
  socket.data.role = claims.role;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  socket.join(room(userId));
  socket.on("disconnect", () => {
    /* socket.io leaves rooms automatically */
  });
});

// Subscribe to Postgres NOTIFY and fan messages out to both participants.
async function start() {
  await sql.listen(CHAT_CHANNEL, (payload: string) => {
    try {
      const event = JSON.parse(payload) as ChatEvent;
      io.to(room(event.patientId)).to(room(event.doctorUserId)).emit("message", {
        conversationId: event.conversationId,
        message: event.message,
      });
    } catch {
      // ignore malformed payloads
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`[realtime] socket.io listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("[realtime] failed to start", err);
  process.exit(1);
});
