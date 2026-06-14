import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { ChatSocketEvent } from "@/lib/chat-types";

const REALTIME_PORT = 4000;

interface TokenResponse {
  token: string;
  url: string | null;
}

/**
 * Derives the realtime URL. Production sets it explicitly via the token
 * endpoint; in dev we reuse the same host the backend is on, swapping the
 * port to the socket server's.
 */
function realtimeUrl(explicit: string | null): string {
  if (explicit) return explicit;
  return API_URL.replace(/:\d+$/, `:${REALTIME_PORT}`);
}

/**
 * Subscribes to live chat messages over socket.io. The handler is called for
 * every delivered message; callers filter by conversation. Reconnects are
 * handled by socket.io. The handler ref keeps the latest closure without
 * tearing down the socket on every render.
 */
export function useChatSocket(onMessage: (event: ChatSocketEvent) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { token, url } = await apiFetch<TokenResponse>(
          "/api/v1/realtime/token"
        );
        if (cancelled) return;

        socket = io(realtimeUrl(url), {
          auth: { token },
          transports: ["websocket"],
        });
        socket.on("message", (event: ChatSocketEvent) =>
          handlerRef.current(event)
        );
      } catch {
        // No live transport (server down / no token). Messages still load and
        // send over REST; the thread just won't update without a refresh.
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);
}
