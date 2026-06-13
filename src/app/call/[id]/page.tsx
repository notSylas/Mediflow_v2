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
