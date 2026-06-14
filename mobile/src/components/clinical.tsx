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
  medicine: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfcfc",
    padding: 12,
    gap: 7,
  },
});
