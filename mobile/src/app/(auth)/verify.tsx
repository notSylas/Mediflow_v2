import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient, useSession } from "@/lib/auth";
import { colors, space } from "@/lib/theme";
import { Card, Field, GhostButton, Muted, PrimaryButton, Title } from "@/components/ui";
import { FadeInView } from "@/components/motion";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { refetch: refetchSession } = useSession();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email ?? "",
        otp: code.trim(),
      });
      if (error) {
        setError(error.message ?? "Invalid code.");
        return;
      }

      // The Expo auth plugin persists the session cookie before this resolves,
      // but its reactive session refresh runs asynchronously. Wait for that
      // refresh so the route guards do not see the previous signed-out state
      // and redirect the user back to login.
      await refetchSession({ query: { disableCookieCache: true } });
      router.replace("/");
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
            <Title>Enter your code</Title>
            <Muted>We sent a 6-digit code to {email}.</Muted>
            <Card>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
              />
              {error && <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>}
              <PrimaryButton
                label="Verify & sign in"
                onPress={verify}
                loading={loading}
                disabled={code.trim().length < 6}
              />
              <GhostButton label="Use a different email" onPress={() => router.back()} />
            </Card>
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
});
