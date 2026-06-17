import { useEffect } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { colors, radius } from "@/lib/theme";

// Loads the native WebRTC globals LiveKit needs. This file is imported lazily
// (only when the user joins a call), so the rest of the app — and the web
// bundle — never pulls in native WebRTC. Requires the dev build, not Expo Go.
registerGlobals();

export interface LiveKitCallProps {
  serverUrl: string;
  token: string;
  camera: boolean;
  microphone: boolean;
  onLeave: () => void;
}

export default function LiveKitCall({
  serverUrl,
  token,
  camera,
  microphone,
  onLeave,
}: LiveKitCallProps) {
  // The OS audio session must be active for the duration of the call (routes
  // audio to the speaker/earpiece and ducks other apps).
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => undefined);
    return () => {
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={microphone}
      video={camera}
      onDisconnected={onLeave}
    >
      <CallRoom />
    </LiveKitRoom>
  );
}

/**
 * The in-call surface: full-bleed remote video, a small self-view, and the
 * mic / camera / hang-up controls. Rendered inside <LiveKitRoom> so the hooks
 * have a room context.
 */
function CallRoom() {
  const insets = useSafeAreaInsets();
  const room = useRoomContext();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } =
    useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  const remote = tracks.find((t) => isTrackReference(t) && !t.participant.isLocal);
  const local = tracks.find((t) => isTrackReference(t) && t.participant.isLocal);

  return (
    <View style={styles.room}>
      {remote && isTrackReference(remote) ? (
        <VideoTrack trackRef={remote} style={StyleSheet.absoluteFillObject} objectFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.waiting]}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.waitingText}>Waiting for the other participant to join…</Text>
        </View>
      )}

      {local && isTrackReference(local) ? (
        <View style={[styles.pip, { top: insets.top + 12 }]}>
          <VideoTrack
            trackRef={local}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror
          />
        </View>
      ) : null}

      <View style={[styles.callControls, { bottom: insets.bottom + 24 }]}>
        <ControlButton
          icon={isMicrophoneEnabled ? "microphone" : "microphone-off"}
          muted={!isMicrophoneEnabled}
          label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        />
        <ControlButton
          icon={isCameraEnabled ? "video" : "video-off"}
          muted={!isCameraEnabled}
          label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          onPress={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
        />
        <ControlButton
          icon="phone-hangup"
          danger
          label="Leave call"
          onPress={() => void room.disconnect()}
        />
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  muted,
  danger,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.ctrl,
        danger && styles.ctrlDanger,
        muted && styles.ctrlMuted,
        pressed && { opacity: 0.8 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={26} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, backgroundColor: "#0b1014" },
  waiting: { alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  waitingText: { color: "rgba(255,255,255,0.85)", fontSize: 15, textAlign: "center" },
  pip: {
    position: "absolute",
    right: 16,
    width: 104,
    height: 150,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#172126",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  callControls: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
  },
  ctrl: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  ctrlMuted: { backgroundColor: "rgba(255,255,255,0.32)" },
  ctrlDanger: { backgroundColor: colors.danger },
});
