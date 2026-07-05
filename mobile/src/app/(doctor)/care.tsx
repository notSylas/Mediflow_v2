import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { ListSkeleton } from "@/components/skeleton";
import { Body, Button, Card, EmptyState, ErrorState, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";

interface Subscriber {
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  active: boolean;
  followUpCreditsUsed: number;
  followUpAvailable: boolean;
  currentPeriodEnd: string | null;
}

interface CareMembersResponse {
  subscribers: Subscriber[];
  activeCount: number;
  totalCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  manual_trial: "Trial",
  inactive: "Inactive",
  cancelled: "Cancelled",
};

export default function DoctorCare() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["doctor", "care-members"],
    queryFn: () => apiFetch<CareMembersResponse>("/api/v1/doctor/care-subscriptions"),
  });

  const toggle = useMutation({
    mutationFn: (args: { patientId: string; action: string }) =>
      apiFetch(`/api/v1/doctor/care-subscriptions/${args.patientId}`, {
        method: "POST",
        body: JSON.stringify({ action: args.action }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["doctor", "care-members"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;

  return (
    <AuroraScreen
      variant="doctor"
      title="Care members"
      subtitle="Manage MediFlow Care subscriptions"
      leading={
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={auroraHeaderStyles.headerAction}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.doctor} />
        </Pressable>
      }
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.isLoading ? <ListSkeleton /> : null}
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      {data ? (
        <>
          <Card tone="doctor">
            <View style={styles.statsRow}>
              <Stat value={data.activeCount} label="Active members" />
              <View style={styles.statDivider} />
              <Stat value={data.totalCount} label="Total records" />
            </View>
            <Muted>v1 billing is a manual toggle — no recurring charge yet.</Muted>
          </Card>

          {data.subscribers.length === 0 ? (
            <EmptyState
              icon="hand-heart-outline"
              title="No care members yet"
              message="Activate the care plan for a patient from their detail screen, and they'll appear here."
            />
          ) : (
            data.subscribers.map((sub) => (
              <Card key={sub.patientId}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(doctor)/patients/[id]",
                      params: { id: sub.patientId },
                    })
                  }
                >
                  <View style={styles.memberHead}>
                    <View style={{ flex: 1 }}>
                      <Body strong>{sub.patientName || sub.patientEmail}</Body>
                      <Muted>
                        {sub.active && sub.currentPeriodEnd
                          ? `Renews ${formatDate(sub.currentPeriodEnd)} · `
                          : ""}
                        {sub.followUpAvailable ? "follow-up available" : "follow-up used"}
                      </Muted>
                    </View>
                    <View style={[styles.badge, sub.active ? styles.badgeOn : styles.badgeOff]}>
                      <Text style={[styles.badgeText, sub.active ? styles.badgeTextOn : styles.badgeTextOff]}>
                        {STATUS_LABEL[sub.status] ?? sub.status}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  {sub.active ? (
                    <>
                      <View style={styles.actionGrow}>
                        <Button
                          label="Reset credit"
                          tone="secondary"
                          compact
                          onPress={() =>
                            toggle.mutate({ patientId: sub.patientId, action: "reset-credit" })
                          }
                        />
                      </View>
                      <View style={styles.actionGrow}>
                        <Button
                          label="Deactivate"
                          tone="danger-outline"
                          compact
                          onPress={() =>
                            toggle.mutate({ patientId: sub.patientId, action: "deactivate" })
                          }
                        />
                      </View>
                    </>
                  ) : (
                    <View style={styles.actionGrow}>
                      <Button
                        label="Reactivate"
                        compact
                        onPress={() =>
                          toggle.mutate({ patientId: sub.patientId, action: "activate" })
                        }
                      />
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}
    </AuroraScreen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 26 },
  statLabel: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  memberHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeOn: { backgroundColor: colors.doctorBg },
  badgeOff: { backgroundColor: colors.surfaceStrong },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 10.5 },
  badgeTextOn: { color: colors.doctor },
  badgeTextOff: { color: colors.textMuted },
  actions: { flexDirection: "row", gap: 9 },
  actionGrow: { flex: 1 },
});
