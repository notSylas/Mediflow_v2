import { useState } from "react";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { authClient } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { Card, Field, Muted, PrimaryButton, Screen, Title } from "@/components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      if (error) {
        setError(error.message ?? "Couldn't send the code.");
        return;
      }
      router.push({ pathname: "/(auth)/verify", params: { email: email.trim() } });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <MaterialCommunityIcons name="heart-pulse" size={33} color={colors.primaryFg} />
        </View>
        <Title>Care, without the waiting room</Title>
        <Muted>
          Book your doctor, join securely, and keep prescriptions in one private place.
        </Muted>
      </View>
      <Card>
        <Text style={styles.cardTitle}>Sign in to MediFlow</Text>
        <Muted>Enter your email and we&apos;ll send a one-time code.</Muted>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {error && <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>}
        <PrimaryButton
          label="Send code"
          onPress={sendCode}
          loading={loading}
          disabled={email.trim().length < 3}
        />
      </Card>
      <View style={styles.legal}>
        <Pressable onPress={() => router.push("/terms")}>
          <Text style={styles.link}>Terms</Text>
        </Pressable>
        <Text style={styles.dot}>•</Text>
        <Pressable onPress={() => router.push("/privacy")}>
          <Text style={styles.link}>Privacy</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 42, paddingBottom: 18, gap: 12, alignItems: "flex-start" },
  mark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  legal: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 12 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  dot: { color: colors.textMuted },
});
