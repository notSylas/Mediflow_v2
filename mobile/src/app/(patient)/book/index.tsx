import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  BackHeader,
  Body,
  Button,
  Card,
  Caption,
  ChoiceChips,
  ErrorState,
  Field,
  Loading,
  Mono,
  Muted,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { SlotPicker } from "@/components/slot-picker";
import { apiFetch, apiUpload } from "@/lib/api";
import { formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { hasEmergencyRedFlag } from "@/lib/triage";
import type { Appointment, Payment } from "@/lib/types";

const REASONS = [
  { value: "new-symptoms", label: "New symptoms" },
  { value: "follow-up", label: "Follow-up" },
  { value: "prescription-refill", label: "Prescription refill" },
  { value: "lab-review", label: "Lab review" },
  { value: "general-consultation", label: "General consultation" },
];

interface SlotsResponse {
  slots: string[];
  timezone: string;
}

interface UploadedReport {
  id: string;
  filename: string;
}

interface PaymentResponse {
  provider: "mock" | "razorpay";
  appointment?: Appointment;
  orderId?: string;
  amountInPaise?: number;
  currency?: string;
}

interface AppointmentDetail {
  payment: Payment | null;
}

export default function BookingFlow() {
  const client = useQueryClient();
  const params = useLocalSearchParams<{ followUpId?: string }>();
  const followUpId = typeof params.followUpId === "string" ? params.followUpId : undefined;
  const [step, setStep] = useState(0);
  const [visitReason, setVisitReason] = useState("new-symptoms");
  const [symptoms, setSymptoms] = useState("");
  const [consent, setConsent] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [report, setReport] = useState<UploadedReport | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [paymentNeedsNative, setPaymentNeedsNative] = useState(false);

  const slots = useQuery({
    queryKey: ["slots"],
    queryFn: () => apiFetch<SlotsResponse>("/api/slots"),
    enabled: step === 1,
  });
  const appointmentDetail = useQuery({
    queryKey: ["patient", "appointment", appointment?.id],
    queryFn: () =>
      apiFetch<AppointmentDetail>(`/api/v1/patient/appointments/${appointment?.id}`),
    enabled: Boolean(appointment?.id) && step === 2,
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<Appointment>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          startsAt: selectedSlot,
          visitReason,
          symptoms: symptoms.trim(),
          reportId: report?.id,
          consent: true,
          consentSource: Platform.OS === "ios" ? "ios" : "android",
        }),
      }),
    onSuccess: (value) => {
      setAppointment(value);
      setStep(2);
    },
    onError: () => {
      void slots.refetch();
      setSelectedSlot(null);
    },
  });

  const payment = useMutation({
    mutationFn: () =>
      apiFetch<PaymentResponse>(`/api/appointments/${appointment?.id}/payment`, {
        method: "POST",
      }),
    onSuccess: (value) => {
      if (value.provider === "mock" && value.appointment) {
        setAppointment(value.appointment);
        setStep(3);
        if (followUpId) {
          void apiFetch(`/api/v1/follow-ups/${followUpId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "booked" }),
          });
        }
        void client.invalidateQueries({ queryKey: ["patient"] });
      } else {
        setPaymentNeedsNative(true);
      }
    },
  });

  const pickReport = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const body = new FormData();
    body.append(
      "file",
      {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as unknown as Blob
    );
    setReport(await apiUpload<UploadedReport>("/api/reports", body));
  };

  if (step === 0) {
    const emergency = hasEmergencyRedFlag(symptoms);
    return (
      <Screen>
        <BackHeader title="Book a consultation" subtitle="Step 1 of 3" onBack={() => router.back()} />
        <Card>
          <Body strong>What brings you in?</Body>
          <ChoiceChips options={REASONS} value={visitReason} onChange={setVisitReason} />
          <Field
            label="Symptoms and details"
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            placeholder="Describe what you are experiencing, when it started, and anything that makes it better or worse."
            maxLength={2000}
          />
          <Caption>{symptoms.length}/2000 characters</Caption>
        </Card>

        {emergency ? (
          <Card tone="danger">
            <View style={styles.row}>
              <MaterialCommunityIcons name="alert-octagon" size={24} color={colors.danger} />
              <Body strong>This may need urgent care</Body>
            </View>
            <Muted>
              This check is not a diagnosis. If you may be in immediate danger, call
              your local emergency number or go to the nearest emergency department.
            </Muted>
          </Card>
        ) : null}

        <Card>
          <SectionHeader title="Optional report" />
          <Muted>PDF, JPEG, or PNG up to 5 MB.</Muted>
          {report ? (
            <View style={styles.fileRow}>
              <MaterialCommunityIcons name="file-check-outline" size={22} color={colors.success} />
              <Text style={styles.fileName}>{report.filename}</Text>
              <Pressable onPress={() => setReport(null)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Button label="Choose a file" icon="paperclip" tone="secondary" onPress={pickReport} />
          )}
        </Card>

        <Pressable style={styles.consent} onPress={() => setConsent((value) => !value)}>
          <MaterialCommunityIcons
            name={consent ? "checkbox-marked" : "checkbox-blank-outline"}
            size={25}
            color={consent ? colors.primary : colors.textMuted}
          />
          <Text style={styles.consentText}>
            I consent to a telemedicine consultation and understand that emergencies
            require immediate in-person care.
          </Text>
        </Pressable>
        <Button
          label="Choose a time"
          icon="arrow-right"
          disabled={!symptoms.trim() || !consent}
          onPress={() => setStep(1)}
        />
      </Screen>
    );
  }

  if (step === 1) {
    if (slots.isLoading) return <Loading label="Finding available times…" />;
    return (
      <Screen refreshing={slots.isRefetching} onRefresh={() => slots.refetch()}>
        <BackHeader title="Choose a time" subtitle="Step 2 of 3" onBack={() => setStep(0)} />
        <View style={styles.availabilityRow}>
          <MaterialCommunityIcons name="circle" size={9} color={colors.success} />
          <Text style={styles.availabilityText}>
            Live availability · clinic timezone {slots.data?.timezone ?? "Asia/Kolkata"}
          </Text>
        </View>
        {slots.error ? <ErrorState message={slots.error.message} onRetry={() => slots.refetch()} /> : null}
        <SlotPicker
          slots={slots.data?.slots ?? []}
          value={selectedSlot}
          onChange={setSelectedSlot}
        />
        {create.error ? <ErrorState message={create.error.message} /> : null}
        {selectedSlot ? (
          <Card tone="accent">
            <View style={styles.summaryRow}>
              <Muted>Selected time</Muted>
              <Body strong>{formatDateTime(selectedSlot)}</Body>
            </View>
          </Card>
        ) : null}
        <Button
          label={selectedSlot ? `Reserve ${formatTime(selectedSlot)}` : "Choose a time above"}
          icon="arrow-right"
          loading={create.isPending}
          disabled={!selectedSlot}
          onPress={() => create.mutate()}
        />
      </Screen>
    );
  }

  if (step === 2 && appointment) {
    return (
      <Screen>
        <BackHeader title="Review and pay" subtitle="Step 3 of 3" onBack={() => setStep(1)} />
        <Card>
          <Body strong>Dr. consultation</Body>
          <Muted>{formatDateTime(appointment.startsAt)}</Muted>
          <View style={styles.summaryRow}>
            <Muted>Consultation fee</Muted>
            {appointmentDetail.isLoading ? (
              <Muted>Loading…</Muted>
            ) : (
              <Mono style={styles.fee}>
                {formatMoney(appointmentDetail.data?.payment?.amountInPaise)}
              </Mono>
            )}
          </View>
          <View style={styles.summaryRow}>
            <Muted>Slot hold</Muted>
            <Mono style={styles.holdValue}>10 minutes</Mono>
          </View>
        </Card>
        <Card tone="warning">
          <Body strong>Your slot is temporarily reserved</Body>
          <Muted>
            Complete payment before the hold expires. The server confirms the booking
            only after payment verification.
          </Muted>
        </Card>
        {paymentNeedsNative ? (
          <Card tone="doctor">
            <Body strong>Razorpay development build required</Body>
            <Muted>
              This server is using real Razorpay. Native checkout cannot run inside
              Expo Go; install the MediFlow development build to complete payment.
              Your held appointment remains visible in My appointments.
            </Muted>
          </Card>
        ) : null}
        {payment.error ? <ErrorState message={payment.error.message} /> : null}
        <Button
          label="Pay securely"
          icon="shield-lock-outline"
          loading={payment.isPending}
          onPress={() => payment.mutate()}
        />
        <Button
          label="View held appointment"
          tone="secondary"
          onPress={() =>
            router.replace({
              pathname: "/(patient)/appointments/[id]",
              params: { id: appointment.id },
            })
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.confirm}>
        <LinearGradient
          colors={["#16a06b", "#0c7d56", "#0a5f42"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.confirmIcon}
        >
          <MaterialCommunityIcons name="check-bold" size={36} color={colors.primaryFg} />
        </LinearGradient>
        <Text style={styles.confirmTitle}>Appointment confirmed</Text>
        <Muted>{appointment ? formatDateTime(appointment.startsAt) : ""}</Muted>
      </View>
      <Card>
        <Body strong>What happens next</Body>
        <Muted>
          Your appointment is saved. Open it from My appointments for call access,
          rescheduling, receipt, and consultation outcome.
        </Muted>
      </Card>
      <Button
        label="View appointment"
        onPress={() =>
          appointment &&
          router.replace({
            pathname: "/(patient)/appointments/[id]",
            params: { id: appointment.id },
          })
        }
      />
      <Button label="Back to home" tone="secondary" onPress={() => router.replace("/(patient)")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    padding: 12,
  },
  fileName: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fonts.bodySemibold },
  consent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  consentText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  availabilityRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  availabilityText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.textMuted },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  fee: { fontSize: 18, color: colors.primary },
  holdValue: { fontSize: 14, color: colors.text },
  confirm: { alignItems: "center", gap: 10, paddingVertical: 36 },
  confirmIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0c7d56",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 7,
  },
  confirmTitle: {
    fontSize: 26,
    fontFamily: fonts.display,
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: 4,
  },
});
