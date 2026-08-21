"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/components/chat/types";

interface Incoming {
  conversationId: string;
  message: ChatMessage;
}

async function fetchToken(): Promise<{ token: string; url: string | null } | null> {
  try {
    const res = await fetch("/api/v1/realtime/token");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Connects to the self-hosted socket.io server using a short-lived token from
 * the backend, and invokes the handler for every live message. socket.io
 * reconnects automatically; we refresh the (short-lived) token on disconnect so
 * a long-running tab keeps a valid credential.
 */
export function useChatSocket(onMessage: (data: Incoming) => void) {
  // Keep the latest handler without resubscribing the socket. Assigned in an
  // effect (not during render) to satisfy the rules of hooks.
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
      const realtimeUrl =
        first.url || `${window.location.protocol}//${window.location.hostname}:4000`;

      socket = io(realtimeUrl, {
        auth: { token: first.token },
        transports: ["websocket"],
      });
      socket.on("message", (data: Incoming) => handlerRef.current(data));
      // Refresh the token so the next reconnect attempt has a valid credential.
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
