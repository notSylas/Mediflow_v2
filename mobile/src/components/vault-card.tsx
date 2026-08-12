import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Body, Button, Card, Muted } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { colors, radius } from "@/lib/theme";
import type { VaultTimelineItem } from "@/lib/vault-types";

/**
 * Health Vault entry card for the patient home — same quiet-surface pattern
 * as CareCard (not a sales banner, sits below the visit hero).
 */
export function VaultCard() {
  const query = useQuery({
    queryKey: ["patient", "vault"],
    queryFn: () => apiFetch<{ items: VaultTimelineItem[] }>("/api/v1/patient/vault"),
    retry: false,
  });

  // Stay quiet while loading or unavailable — same rule CareCard follows.
  if (query.isLoading || !query.data) return null;
  const count = query.data.items.length;

  return (
    <Card tone="accent">
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="folder-heart-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <Body strong>Health Vault</Body>
          <Muted>
            {count > 0
              ? `${count} record${count === 1 ? "" : "s"} — share with any doctor, anywhere`
              : "Fills automatically after every visit"}
          </Muted>
        </View>
      </View>
      <Button
        label="Open vault"
        tone="secondary"
        icon="arrow-right"
        onPress={() => router.push("/(patient)/vault")}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  grow: { flex: 1, gap: 2 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
