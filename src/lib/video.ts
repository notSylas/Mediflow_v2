import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

/**
 * Identities (user ids) currently connected to a LiveKit room. Empty when
 * video is unconfigured, the room doesn't exist yet, or the query fails —
 * presence is a nice-to-have and must never break a page.
 */
export async function listRoomParticipantIdentities(room: string): Promise<string[]> {
  if (!isVideoConfigured()) return [];

  try {
    const host = process.env.LIVEKIT_URL!.replace(/^wss?:\/\//, "https://");
    const client = new RoomServiceClient(
      host,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    );
    const participants = await client.listParticipants(room);
    return participants.map((p) => p.identity);
  } catch {
    return [];
  }
}

export function isVideoConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET
  );
}

export async function createVideoToken(options: {
  room: string;
  identity: string;
  name: string;
}): Promise<string> {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: options.identity,
      name: options.name,
      ttl: "1h",
    }
  );

  token.addGrant({
    room: options.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
