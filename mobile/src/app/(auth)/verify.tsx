import { useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient, useSession } from "@/lib/auth";
import { colors, fonts, radius, shadowSoft, space } from "@/lib/theme";
import { Card, GhostButton, Muted, PrimaryButton, Title } from "@/components/ui";
import { FadeInView } from "@/components/motion";

const OTP_LENGTH = 6;

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { refetch: refetchSession } = useSession();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = useMemo(() => digits.join(""), [digits]);

  const focusCell = (index: number) => {
    requestAnimationFrame(() => inputRefs.current[index]?.focus());
  };

  const updateDigit = (value: string, index: number) => {
    const numeric = value.replace(/\D/g, "");
    setError(null);
    if (numeric.length > 1) {
      const next = [...digits];
      numeric
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((char, offset) => {
          next[index + offset] = char;
        });
      setDigits(next);
      focusCell(Math.min(index + numeric.length, OTP_LENGTH - 1));
      return;
    }

    const next = [...digits];
    next[index] = numeric;
    setDigits(next);
    if (numeric && index < OTP_LENGTH - 1) focusCell(index + 1);
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key !== "Backspace" || digits[index] || index === 0) return;
    const next = [...digits];
    next[index - 1] = "";
    setDigits(next);
    focusCell(index - 1);
  };

  const verify = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email ?? "",
        otp: code,
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
              <View style={styles.otpBlock}>
                <Text style={styles.otpLabel}>Verification code</Text>
                <View style={styles.otpRow}>
                  {digits.map((digit, index) => {
                    const active = focusedIndex === index;
                    return (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          inputRefs.current[index] = ref;
                        }}
                        value={digit}
                        onChangeText={(value) => updateDigit(value, index)}
                        onKeyPress={(event) => handleKeyPress(event, index)}
                        onFocus={() => setFocusedIndex(index)}
                        keyboardType="number-pad"
                        autoComplete={index === 0 ? "one-time-code" : undefined}
                        textContentType={index === 0 ? "oneTimeCode" : "none"}
                        maxLength={index === 0 ? OTP_LENGTH : 1}
                        selectTextOnFocus
                        accessibilityLabel={`Verification code digit ${index + 1}`}
                        style={[
                          styles.otpInput,
                          digit && styles.otpInputFilled,
                          active && styles.otpInputActive,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
              {error && <Text style={{ color: colors.danger, fontSize: 14 }}>{error}</Text>}
              <PrimaryButton
                label="Verify & sign in"
                onPress={verify}
                loading={loading}
                disabled={code.length < OTP_LENGTH}
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
  otpBlock: { gap: 10 },
  otpLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  otpInput: {
    flex: 1,
    maxWidth: 50,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.monoSemibold,
    fontSize: 24,
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: "#c5d3f6",
    backgroundColor: colors.card,
  },
  otpInputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
    ...shadowSoft,
  },
});
