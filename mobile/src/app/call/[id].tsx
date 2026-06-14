import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
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

interface TokenResponse {
  token: string;
  url: string;
  room: string;
}

export default function CallPreJoin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [ready, setReady] = useState<TokenResponse | null>(null);
  const token = useMutation({
    mutationFn: () =>
      apiFetch<TokenResponse>(`/api/appointments/${id}/video-token`, {
        method: "POST",
      }),
    onSuccess: setReady,
  });

  return (
    <Screen>
      <BackHeader title="Video consultation" onBack={() => router.back()} />
      <View style={styles.preview}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={62} color={colors.primaryFg} />
        </View>
        <Muted>Camera preview is available in the MediFlow development build.</Muted>
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
          Find a quiet, private place and use headphones where possible. Never record
          a consultation without explicit consent.
        </Muted>
      </Card>

      {ready ? (
        <Card tone="doctor">
          <Body strong>Room authorization succeeded</Body>
          <Muted>
            The server issued a secure LiveKit token for room {ready.room}. Rendering
            native audio/video requires the MediFlow development build with LiveKit
            native modules; Expo Go cannot load WebRTC.
          </Muted>
        </Card>
      ) : null}
      {token.error ? <ErrorState message={token.error.message} /> : null}
      <Button
        label={ready ? "Authorized for consultation" : "Check room and continue"}
        icon="shield-check-outline"
        loading={token.isPending}
        disabled={Boolean(ready)}
        onPress={() => token.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
