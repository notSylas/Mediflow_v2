import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuroraScreen } from "@/components/aurora-screen";
import { ListSkeleton } from "@/components/skeleton";
import { FadeInView } from "@/components/motion";
import { Body, Button, Card, EmptyState, ErrorState, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { VaultShareSummary, VaultTimelineItem } from "@/lib/vault-types";

export default function PatientVault() {
  const client = useQueryClient();
  const toast = useToast();

  const timelineQuery = useQuery({
    queryKey: ["patient", "vault"],
    queryFn: () => apiFetch<{ items: VaultTimelineItem[] }>("/api/v1/patient/vault"),
  });
  const sharesQuery = useQuery({
    queryKey: ["patient", "vault", "shares"],
    queryFn: () => apiFetch<{ grants: VaultShareSummary[] }>("/api/v1/patient/vault/share"),
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/patient/vault/share/${id}/revoke`, { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "vault", "shares"] });
      toast.success("Share revoked. The link no longer works.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (timelineQuery.isLoading) {
    return (
      <AuroraScreen variant="patient" compactHeader title="Health Vault" subtitle="Your record, ready to share">
        <ListSkeleton />
      </AuroraScreen>
    );
  }

  const items = timelineQuery.data?.items ?? [];
  const grants = sharesQuery.data?.grants ?? [];
  const activeShare = grants.find((g) => g.status === "active");
  const pastShares = grants.filter((g) => g.status !== "active");

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Health Vault"
      subtitle="Your prescriptions and notes, ready to share with any doctor"
      refreshing={timelineQuery.isRefetching}
      onRefresh={() => {
        timelineQuery.refetch();
        sharesQuery.refetch();
      }}
    >
      {timelineQuery.error ? (
        <ErrorState message={timelineQuery.error.message} onRetry={() => timelineQuery.refetch()} />
      ) : null}

      {activeShare ? (
        <Card tone="accent">
          <View style={styles.activeHeader}>
            <View style={styles.activeIcon}>
              <MaterialCommunityIcons name="qrcode-scan" size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Body strong>Currently shared</Body>
              <Muted>Expires {formatDateTime(activeShare.expiresAt)}</Muted>
            </View>
          </View>
          <Muted>
            {activeShare.viewCount > 0
              ? `Viewed by a doctor · last on ${formatDateTime(activeShare.lastViewedAt!)}`
              : "Not viewed yet"}
          </Muted>
          <Button
            label="Revoke now"
            tone="danger-outline"
            icon="close-circle-outline"
            loading={revoke.isPending}
            onPress={() => revoke.mutate(activeShare.id)}
          />
        </Card>
      ) : (
        <Button
          label="Share my vault"
          icon="share-variant-outline"
          onPress={() => router.push("/(patient)/vault/share")}
        />
      )}

      <Button
        label="Add an old record"
        tone="secondary"
        icon="file-plus-outline"
        onPress={() => router.push("/(patient)/vault/add")}
      />

      {items.length === 0 ? (
        <EmptyState
          compact
          icon="folder-heart-outline"
          title="Your vault is empty"
          message="It fills automatically after every MediFlow visit."
        />
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <FadeInView key={item.id} index={index}>
              <Card>
                <View style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <MaterialCommunityIcons
                      name={item.type === "prescription" ? "pill" : "notebook-outline"}
                      size={18}
                      color={colors.doctor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTitleRow}>
                      <Body strong>{item.summary}</Body>
                      {item.source === "added" ? (
                        <View style={styles.addedTag}>
                          <Text style={styles.addedTagText}>Added by you</Text>
                        </View>
                      ) : null}
                    </View>
                    <Muted>
                      {item.doctorName} · {formatDate(item.date)}
                    </Muted>
                  </View>
                </View>
              </Card>
            </FadeInView>
          ))}
        </View>
      )}

      {pastShares.length > 0 ? (
        <View style={styles.pastSection}>
          <Text style={styles.pastHeading}>Share history</Text>
          {pastShares.map((g) => (
            <View key={g.id} style={styles.pastRow}>
              <MaterialCommunityIcons
                name={g.status === "revoked" ? "cancel" : "clock-outline"}
                size={15}
                color={colors.textFaint}
              />
              <Text style={styles.pastText}>
                {g.status === "revoked" ? "Revoked" : "Expired"} · created {formatDate(g.createdAt)}
                {g.viewCount > 0 ? ` · viewed ${g.viewCount}×` : " · never viewed"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  addedTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
  },
  addedTagText: { color: colors.info, fontFamily: fonts.bodySemibold, fontSize: 10 },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  activeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  activeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pastSection: { marginTop: 6, gap: 8 },
  pastHeading: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pastRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pastText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12.5 },
});
