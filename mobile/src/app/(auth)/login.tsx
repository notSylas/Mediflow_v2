import { useState } from "react";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";
import { colors, fonts, space } from "@/lib/theme";
import { Card, Field, Muted, PrimaryButton } from "@/components/ui";
import { FadeInView } from "@/components/motion";

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInView style={styles.inner}>
            <View style={styles.hero}>
              <View style={styles.mark}>
                <MaterialCommunityIcons name="heart-pulse" size={33} color={colors.primaryFg} />
              </View>
              <Text style={styles.heroTitle}>Care, without the waiting room</Text>
              <Text style={styles.heroSubtitle}>
                Book your doctor, join securely, and keep prescriptions in one private place.
              </Text>
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
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: space.md },
  inner: { gap: space.md },
  hero: { paddingBottom: 6, gap: 12, alignItems: "center" },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: "center",
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  mark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.text },
  legal: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 6 },
  link: { color: colors.primary, fontSize: 13, fontFamily: fonts.bodySemibold },
  dot: { color: colors.textMuted },
});
