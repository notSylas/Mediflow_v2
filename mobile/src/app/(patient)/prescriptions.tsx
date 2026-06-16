import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuroraScreen } from "@/components/aurora-screen";
import { MedicineCard } from "@/components/clinical";
import { ListSkeleton } from "@/components/skeleton";
import { FadeInView, PressableScale } from "@/components/motion";
import {
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Muted,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { sharePrescriptionPdf, type PrescriptionDoctor } from "@/lib/prescription-pdf";
import { useToast } from "@/components/toast";
import { colors, fonts, radius } from "@/lib/theme";
import type { PrescriptionRow } from "@/lib/types";

interface Response {
  prescriptions: PrescriptionRow[];
  doctor: PrescriptionDoctor | null;
  timezone: string;
}

export default function PatientPrescriptions() {
  const { data: session } = useSession();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["patient", "prescriptions"],
    queryFn: () => apiFetch<Response>("/api/v1/patient/prescriptions"),
  });
  const shareRx = async (row: PrescriptionRow) => {
    try {
      await sharePrescriptionPdf(row, query.data?.doctor ?? null, session?.user.name ?? "");
    } catch {
      toast.error("Couldn't generate the PDF. Please try again.");
    }
  };
  const requestRefill = async (prescriptionId: string) => {
    try {
      await apiFetch("/api/v1/patient/refill-requests", {
        method: "POST",
        body: JSON.stringify({ prescriptionId }),
      });
      toast.success("Refill requested — your doctor will review it.");
    } catch {
      toast.error("Couldn't send the refill request. Please try again.");
    }
  };
  if (query.isLoading) {
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Prescriptions"
        subtitle="Medication instructions from your doctor"
      >
        <ListSkeleton />
      </AuroraScreen>
    );
  }

  const prescriptions = query.data?.prescriptions ?? [];

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Prescriptions"
      subtitle="Medication instructions from your doctor"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : null}

      {prescriptions.length === 0 ? (
        <>
          <EmptyState
            compact
            icon="file-document-outline"
            title="No prescriptions yet"
            message="A prescription will appear here when your doctor issues one after a consultation."
            action={
              <Button
                label="Book a consultation"
                icon="calendar-plus"
                compact
                onPress={() => router.push("/(patient)/book")}
              />
            }
          />
          <Card>
            <Body strong>What you’ll find here</Body>
            <RecordRow
              icon="pill"
              title="Medicine and strength"
              message="The exact medicine recorded by your doctor."
            />
            <View style={styles.divider} />
            <RecordRow
              icon="clock-outline"
              title="Dose schedule"
              message="When to take it, food instructions, and duration."
            />
            <View style={styles.divider} />
            <RecordRow
              icon="calendar-check-outline"
              title="Visit context"
              message="The diagnosis, advice, and related consultation."
            />
          </Card>
        </>
      ) : (
        <>
          <Card tone="doctor">
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons
                  name="file-document-check-outline"
                  size={22}
                  color={colors.doctor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryValue}>{prescriptions.length}</Text>
                <Muted>
                  issued prescription{prescriptions.length === 1 ? "" : "s"} in your record
                </Muted>
              </View>
            </View>
          </Card>

          <View style={styles.list}>
            {prescriptions.map(({ prescription, appointment, medicines }, index) => (
              <FadeInView key={prescription.id} index={index}>
                <PressableScale
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(patient)/appointments/[id]",
                      params: { id: appointment.id },
                    })
                  }
                >
                  <Card>
                    <View style={styles.between}>
                      <View style={styles.prescriptionTitle}>
                        <View style={styles.rxIcon}>
                          <MaterialCommunityIcons name="pill" size={20} color={colors.doctor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Body strong>{prescription.diagnosis || "Consultation"}</Body>
                          <Muted>
                            {prescription.issuedAt
                              ? `Issued ${formatDate(prescription.issuedAt)}`
                              : "Issued prescription"}
                          </Muted>
                        </View>
                      </View>
                      <StatusBadge status="issued" audience="patient" />
                    </View>
                    <Text style={styles.medicineCount}>
                      {medicines.length} medicine{medicines.length === 1 ? "" : "s"}
                    </Text>
                    {medicines.map((medicine, medicineIndex) => (
                      <MedicineCard
                        key={medicine.id ?? `${prescription.id}-${medicineIndex}`}
                        medicine={medicine}
                      />
                    ))}
                    {prescription.advice ? (
                      <View style={styles.advice}>
                        <MaterialCommunityIcons
                          name="lightbulb-outline"
                          size={18}
                          color={colors.primary}
                        />
                        <Muted>{prescription.advice}</Muted>
                      </View>
                    ) : null}
                    <View style={styles.rxActions}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Share PDF"
                          icon="file-download-outline"
                          tone="secondary"
                          onPress={() => shareRx({ prescription, appointment, medicines })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Request refill"
                          icon="refresh"
                          tone="secondary"
                          onPress={() => requestRefill(prescription.id)}
                        />
                      </View>
                    </View>
                    <View style={styles.openRow}>
                      <Text style={styles.openText}>Open consultation</Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                  </Card>
                </PressableScale>
              </FadeInView>
            ))}
          </View>
        </>
      )}
    </AuroraScreen>
  );
}

function RecordRow({
  icon,
  title,
  message,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.recordRow}>
      <View style={styles.recordIcon}>
        <MaterialCommunityIcons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Body strong>{title}</Body>
        <Muted>{message}</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  rxActions: { flexDirection: "row", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { color: colors.text, fontFamily: fonts.display, fontSize: 23 },
  prescriptionTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  rxIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineCount: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  advice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    padding: 11,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 11,
  },
  openText: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13 },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  recordIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 49 },
});
