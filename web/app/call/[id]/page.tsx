"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";

interface TokenResponse {
  token: string;
  url: string;
}

export default function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Camera/mic (getUserMedia) is only exposed in a secure context: HTTPS, or
  // http://localhost / 127.0.0.1. Over a plain-HTTP LAN IP the browser hides
  // navigator.mediaDevices entirely, so the call can never start. Detect this
  // up front and explain it, rather than letting PreJoin surface a generic
  // "couldn't access your camera or microphone" that looks like a denied
  // permission.
  const insecure =
    typeof window !== "undefined" &&
    (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/appointments/${id}/video-token`, { method: "POST" })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? "Couldn't join the call.");
          return;
        }
        setConnection(body);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server.");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDisconnected = useCallback(() => {
    router.push(`/`);
  }, [router]);

  if (insecure) {
    const host = typeof window !== "undefined" ? window.location.host : "";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">Video needs a secure connection</p>
        <p className="max-w-md text-muted-foreground">
          Your browser only allows camera and microphone access over HTTPS (or
          via <span className="font-mono">localhost</span>). You&apos;re on{" "}
          <span className="font-mono">{host}</span> over http://, so the call
          can&apos;t start. Open this page over <span className="font-mono">https://</span>
          {" "}— run the app with <span className="font-mono">npm run dev:https</span> — or
          visit it from this machine via <span className="font-mono">localhost</span>.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium">Can&apos;t join this call</p>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Preparing your consultation room…
      </div>
    );
  }

  if (!choices) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black" data-lk-theme="default">
        <PreJoin
          persistUserChoices
          joinLabel="Join consultation"
          onSubmit={setChoices}
          onError={() => setError("We couldn't access your camera or microphone.")}
        />
      </div>
    );
  }

  return (
    <div className="h-screen" data-lk-theme="default">
      <LiveKitRoom
        serverUrl={connection.url}
        token={connection.token}
        video={choices.videoEnabled}
        audio={choices.audioEnabled}
        onDisconnected={handleDisconnected}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
