"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/components/chat/types";

interface Incoming {
  conversationId: string;
  message: ChatMessage;
}

/**
 * Connects to the self-hosted socket.io server using a short-lived token from
 * the backend, and invokes the handler for every live message. Reconnects are
 * handled by socket.io; the token is fetched fresh on each (re)mount.
 */
export function useChatSocket(onMessage: (data: Incoming) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/v1/realtime/token");
        if (!res.ok || cancelled) return;
        const { token, url } = await res.json();
        const realtimeUrl =
          url || `${window.location.protocol}//${window.location.hostname}:4000`;

        socket = io(realtimeUrl, {
          auth: { token },
          transports: ["websocket"],
        });
        socket.on("message", (data: Incoming) => handlerRef.current(data));
      } catch {
        // Realtime is best-effort; history still loads over REST.
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);
}
