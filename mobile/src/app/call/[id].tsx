import { lazy, Suspense, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  BackHeader,
  Body,
  Button,
  Card,
  ErrorState,
  Muted,
  Screen,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { colors, radius } from "@/lib/theme";

// Lazy so native WebRTC only loads when a call actually starts — keeps the app
// (and the web bundle) free of native modules until Join is tapped. Metro
// resolves the `.web` stub for web.
const LiveKitCall = lazy(() => import("@/components/livekit-call"));

// Expo Go has no native WebRTC, so video can only run in a dev/standalone build.
const isExpoGo = Constants.executionEnvironment === "storeClient";

interface TokenResponse {
  token: string;
  url: string;
  room: string;
}

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [creds, setCreds] = useState<TokenResponse | null>(null);
  const [joined, setJoined] = useState(false);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);

  const token = useMutation({
    mutationFn: () =>
      apiFetch<TokenResponse>(`/api/appointments/${id}/video-token`, {
        method: "POST",
      }),
    onSuccess: setCreds,
  });

  if (joined && creds) {
    // Expo Go can't load native WebRTC — show a clear notice instead of crashing.
    if (isExpoGo) {
      return (
        <Screen>
          <BackHeader title="Video consultation" onBack={() => router.back()} />
          <Card>
            <Body strong>Open the MediFlow app to join</Body>
            <Muted>
              Live video uses native modules that Expo Go can&apos;t load. Install the
              MediFlow development build to join from your phone, or join this
              consultation from the web app.
            </Muted>
          </Card>
          <Button label="Go back" icon="arrow-left" onPress={() => router.back()} />
        </Screen>
      );
    }
    return (
      <Suspense
        fallback={
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        }
      >
        <LiveKitCall
          serverUrl={creds.url}
          token={creds.token}
          camera={camera}
          microphone={microphone}
          onLeave={() => router.back()}
        />
      </Suspense>
    );
  }

  return (
    <Screen>
      <BackHeader title="Video consultation" onBack={() => router.back()} />
      <View style={styles.preview}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={62} color={colors.primaryFg} />
        </View>
        <Muted>Your camera turns on when you join the room.</Muted>
      </View>

      <Card>
        <Body strong>Check your setup</Body>
        <View style={styles.controls}>
          <Button
            label={microphone ? "Microphone on" : "Microphone off"}
            icon={microphone ? "microphone" : "microphone-off"}
            tone={microphone ? "secondary" : "danger"}
            onPress={() => setMicrophone((value) => !value)}
          />
          <Button
            label={camera ? "Camera on" : "Camera off"}
            icon={camera ? "video" : "video-off"}
            tone={camera ? "secondary" : "danger"}
            onPress={() => setCamera((value) => !value)}
          />
        </View>
        <Muted>
          Find a quiet, private place and use headphones where possible. Never record a
          consultation without explicit consent.
        </Muted>
      </Card>

      {token.error ? <ErrorState message={token.error.message} /> : null}

      <Button
        label={creds ? "Join consultation" : "Check room and continue"}
        icon={creds ? "video" : "shield-check-outline"}
        loading={token.isPending}
        onPress={() => (creds ? setJoined(true) : token.mutate())}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b1014" },
  preview: {
    minHeight: 270,
    borderRadius: radius.xl,
    backgroundColor: "#172126",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { gap: 10 },
});
