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
import { CHAT_CHANNEL, type ChatEvent } from "../src/lib/realtime";
import { verifyRealtimeToken } from "../src/lib/realtime-token";

const PORT = Number(process.env.REALTIME_PORT ?? 4000);

const httpServer = createServer((_req, res) => {
  // Tiny health endpoint.
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("realtime ok");
});

const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
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
    // eslint-disable-next-line no-console
    console.log(`[realtime] socket.io listening on :${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[realtime] failed to start", err);
  process.exit(1);
});
