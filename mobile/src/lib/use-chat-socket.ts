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

async function fetchToken(): Promise<TokenResponse | null> {
  try {
    return await apiFetch<TokenResponse>("/api/v1/realtime/token");
  } catch {
    return null;
  }
}

/**
 * Subscribes to live chat messages over socket.io. The handler is called for
 * every delivered message; callers filter by conversation. The short-lived
 * token is refreshed on disconnect so a backgrounded app reconnects cleanly.
 */
export function useChatSocket(onMessage: (event: ChatSocketEvent) => void) {
  // Latest handler without tearing down the socket. Assigned in an effect (not
  // during render) to satisfy the rules of hooks.
  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      const first = await fetchToken();
      if (!first || cancelled) return;

      socket = io(realtimeUrl(first.url), {
        auth: { token: first.token },
        transports: ["websocket"],
      });
      socket.on("message", (event: ChatSocketEvent) => handlerRef.current(event));
      socket.on("disconnect", () => {
        void fetchToken().then((next) => {
          if (next && socket) socket.auth = { token: next.token };
        });
      });
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);
}
