import { StyleSheet, Text, View } from "react-native";

export interface LiveKitCallProps {
  serverUrl: string;
  token: string;
  camera: boolean;
  microphone: boolean;
  onLeave: () => void;
}

// Web stub: LiveKit's React Native SDK has no web implementation, and this
// app's web target is dev-only. Metro resolves this file for web, keeping
// native WebRTC out of the web bundle. The product web video lives in the
// Next.js app.
export default function LiveKitCall() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Video consultations run in the MediFlow mobile app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0b1014",
  },
  text: { color: "#ffffff", textAlign: "center", fontSize: 15 },
});
