import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { auroraHeaderStyles } from "@/components/aurora-header";
import { AuroraScreen } from "@/components/aurora-screen";
import { ListSkeleton } from "@/components/skeleton";
import { FadeInView } from "@/components/motion";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Muted,
} from "@/components/ui";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { formatRelativeDay } from "@/lib/format-chat";
import { colors } from "@/lib/theme";

interface RefillRequest {
  id: string;
  createdAt: string;
  prescriptionId: string;
  patientId: string;
  patientName: string | null;
  patientEmail: string;
  diagnosis: string | null;
}

export default function RefillRequests() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["doctor", "refill-requests"],
    queryFn: () => apiFetch<{ requests: RefillRequest[] }>("/api/v1/doctor/refill-requests"),
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ["doctor", "refill-requests"] });
    void client.invalidateQueries({ queryKey: ["doctor", "home"] });
  };

  const fulfill = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ appointmentId: string }>(`/api/v1/doctor/refill-requests/${id}/fulfill`, {
        method: "POST",
      }),
    onSuccess: ({ appointmentId }) => {
      invalidate();
      router.push({ pathname: "/(doctor)/prescribe/[id]", params: { id: appointmentId } });
    },
    onError: () => toast.error("Couldn't open the prescription. Please try again."),
  });

  const decline = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/doctor/refill-requests/${id}/decline`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.info("Refill request declined.");
    },
  });

  if (query.isLoading) {
    return (
      <AuroraScreen variant="doctor" title="Refill requests" subtitle="Review and prescribe">
        <ListSkeleton />
      </AuroraScreen>
    );
  }

  const requests = query.data?.requests ?? [];

  return (
    <AuroraScreen
      variant="doctor"
      title="Refill requests"
      subtitle="Review and prescribe"
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
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="pill"
          title="No refill requests"
          message="When a patient requests a refill, it appears here for review."
        />
      ) : (
        <View style={styles.list}>
          {requests.map((req, i) => (
            <FadeInView key={req.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <Avatar name={req.patientName || req.patientEmail} doctor />
                  <View style={{ flex: 1 }}>
                    <Body strong>{req.patientName || req.patientEmail}</Body>
                    <Muted>
                      {req.diagnosis || "Previous prescription"} ·{" "}
                      {formatRelativeDay(req.createdAt)}
                    </Muted>
                  </View>
                </View>
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Decline"
                      tone="secondary"
                      loading={decline.isPending && decline.variables === req.id}
                      onPress={() => decline.mutate(req.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Prescribe"
                      icon="file-document-edit-outline"
                      loading={fulfill.isPending && fulfill.variables === req.id}
                      onPress={() => fulfill.mutate(req.id)}
                    />
                  </View>
                </View>
              </Card>
            </FadeInView>
          ))}
        </View>
      )}
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  actions: { flexDirection: "row", gap: 10 },
});
