import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Body, Card, Caption, Muted, StatusBadge } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import type {
  DoctorAppointmentRow,
  Medicine,
  PatientAppointmentRow,
} from "@/lib/types";

export function PatientAppointmentCard({
  row,
  onPress,
}: {
  row: PatientAppointmentRow;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.between}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="calendar-heart" size={21} color={colors.primary} />
          </View>
          <StatusBadge status={row.appointment.status} audience="patient" />
        </View>
        <Body strong>{formatDateTime(row.appointment.startsAt)}</Body>
        {row.appointment.intakeNote ? (
          <Muted>{row.appointment.intakeNote.split("\n")[0]}</Muted>
        ) : null}
        <View style={styles.between}>
          <Caption>
            {row.payment ? `${formatMoney(row.payment.amountInPaise)} · ${row.payment.status}` : ""}
          </Caption>
          <Text style={styles.link}>View details</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function DoctorAppointmentCard({
  row,
  onPress,
}: {
  row: DoctorAppointmentRow;
  onPress: () => void;
}) {
  const patientName = row.patient.name || row.patient.email;
  const needsRx =
    row.appointment.status === "completed" && row.prescriptionStatus !== "issued";
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.row}>
          <Avatar name={patientName} doctor />
          <View style={{ flex: 1, gap: 3 }}>
            <Body strong>{patientName}</Body>
            <Muted>{formatDateTime(row.appointment.startsAt)}</Muted>
          </View>
          <StatusBadge status={row.appointment.status} />
        </View>
        {row.appointment.intakeNote ? (
          <Caption>{row.appointment.intakeNote.split("\n")[0]}</Caption>
        ) : null}
        <View style={styles.tagRow}>
          <MiniTag
            icon={row.appointment.mode === "async" ? "file-document-edit-outline" : "video-outline"}
            label={row.appointment.mode === "async" ? "Async consult" : "Video visit"}
            tone={row.appointment.mode === "async" ? "doctor" : "info"}
          />
          {row.appointment.triageFlaggedAt ? (
            <MiniTag icon="alert-octagon-outline" label="Triage flag" tone="danger" />
          ) : null}
          {needsRx ? (
            <MiniTag
              icon="file-document-edit-outline"
              label={row.prescriptionStatus === "draft" ? "Draft Rx" : "Needs Rx"}
              tone="warning"
            />
          ) : row.prescriptionStatus === "issued" ? (
            <MiniTag icon="file-document-check-outline" label="Rx issued" tone="success" />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

export function MedicineCard({ medicine }: { medicine: Medicine }) {
  const timing = [
    medicine.morning && "Morning",
    medicine.afternoon && "Afternoon",
    medicine.evening && "Evening",
    medicine.night && "Night",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.medicine}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="pill" size={20} color={colors.doctor} />
        <View style={{ flex: 1 }}>
          <Body strong>
            {medicine.name}
            {medicine.strength ? ` ${medicine.strength}` : ""}
          </Body>
          <Caption>
            {[timing, medicine.foodRelation, medicine.durationDays && `${medicine.durationDays} days`]
              .filter(Boolean)
              .join(" · ") || "As directed"}
          </Caption>
        </View>
      </View>
      {medicine.instructions ? <Muted>{medicine.instructions}</Muted> : null}
    </View>
  );
}

function MiniTag({
  icon,
  label,
  tone,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  tone: "doctor" | "info" | "warning" | "danger" | "success";
}) {
  const palette = {
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    info: { bg: colors.infoBg, fg: colors.info },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    success: { bg: colors.successBg, fg: colors.success },
  }[tone];
  return (
    <View style={[styles.miniTag, { backgroundColor: palette.bg }]}>
      <MaterialCommunityIcons name={icon} size={13} color={palette.fg} />
      <Text style={[styles.miniTagText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  miniTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  miniTagText: { fontSize: 11, fontWeight: "700" },
  medicine: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfcfc",
    padding: 12,
    gap: 7,
  },
});
