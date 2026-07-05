import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { Body, Button, Card, Mono, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import {
  CARE_BENEFITS,
  CARE_MESSAGING_DISCLAIMER,
  CARE_PLAN_NAME,
  CARE_PLAN_PRICE_PAISE,
  CARE_REPLY_EXPECTATION,
  type CareStatus,
} from "@/lib/care-types";

export default function CareCheckout() {
  const client = useQueryClient();
  const toast = useToast();

  const careQuery = useQuery({
    queryKey: ["patient", "care"],
    queryFn: () => apiFetch<{ care: CareStatus }>("/api/v1/patient/care"),
    retry: false,
  });
  const priceInPaise = careQuery.data?.care.priceInPaise ?? CARE_PLAN_PRICE_PAISE;
  const PRICE = `₹${Math.round(priceInPaise / 100)}`;

  const pay = useMutation({
    mutationFn: () => apiFetch("/api/v1/patient/care", { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "care"] });
      client.invalidateQueries({ queryKey: ["patient", "conversation"] });
      toast.success("MediFlow Care is now active.");
      router.replace("/(patient)/settings");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Start care plan"
      subtitle="MediFlow Care · monthly"
      leading={
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
      }
    >
      <Card tone="accent">
        <View style={styles.header}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="hand-heart" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Body strong>{CARE_PLAN_NAME}</Body>
            <Muted>Stay connected between visits.</Muted>
          </View>
        </View>
        <View style={styles.benefits}>
          {CARE_BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <MaterialCommunityIcons name="check" size={15} color={colors.primary} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.priceRow}>
          <Body strong>Due today</Body>
          <View style={styles.priceValue}>
            <Mono style={styles.price}>{PRICE}</Mono>
            <Text style={styles.per}>/ month</Text>
          </View>
        </View>
        <View style={styles.note}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.primary} />
          <Muted>Cancel anytime from settings.</Muted>
        </View>
        <Button
          label={`Pay ${PRICE} & activate`}
          icon="lock"
          loading={pay.isPending}
          onPress={() => pay.mutate()}
        />
        <Text style={styles.testNote}>
          Test mode — no card is charged. Recurring billing is not yet enabled.
        </Text>
      </Card>

      <Text style={styles.disclaimer}>
        {CARE_MESSAGING_DISCLAIMER} {CARE_REPLY_EXPECTATION} This plan does not replace
        paid video consultations.
      </Text>
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  benefits: { gap: 8, marginTop: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceValue: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  price: { color: colors.text, fontFamily: fonts.monoSemibold, fontSize: 26 },
  per: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  note: { flexDirection: "row", alignItems: "center", gap: 8 },
  testNote: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11.5, textAlign: "center" },
  disclaimer: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16 },
});
