import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicineNameField } from "@/components/medicine-autocomplete";
import { PressableScale } from "@/components/motion";
import {
  Body,
  Button,
  Card,
  ErrorState,
  Field,
  IconButton,
  Loading,
  Mono,
  Muted,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { colors, fonts, radius, shadowSoft, space } from "@/lib/theme";
import type { FormularyEntry } from "@/lib/formulary";
import type {
  Appointment,
  ConsultNote,
  PatientIdentity,
  PatientProfile,
  Prescription,
} from "@/lib/types";

interface EncounterResponse {
  encounter: {
    appointment: Appointment;
    patient: PatientIdentity;
    note: ConsultNote | null;
    prescription: Prescription | null;
  };
  patientProfile: PatientProfile | null;
}

interface MedicineDraft {
  key: number;
  name: string;
  strength: string;
  strengths: string[];
  route: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string;
  durationDaysText: string;
  instructions: string;
}

let nextKey = 1;
const blank = (): MedicineDraft => ({
  key: nextKey++,
  name: "",
  strength: "",
  strengths: [],
  route: null,
  morning: false,
  afternoon: false,
  evening: false,
  night: false,
  foodRelation: "",
  durationDaysText: "",
  instructions: "",
});

const TIMING = [
  { key: "morning", label: "Morning", icon: "weather-sunset-up" },
  { key: "afternoon", label: "Afternoon", icon: "weather-sunny" },
  { key: "evening", label: "Evening", icon: "weather-sunset-down" },
  { key: "night", label: "Night", icon: "weather-night" },
] as const;

const FOOD = ["Before food", "After food", "With food", "Empty stomach"];

const TEMPLATES = [
  {
    label: "Fever / cold",
    icon: "thermometer",
    diagnosis: "Acute viral upper respiratory symptoms",
    advice: "Fluids, rest, steam inhalation, and review if fever persists or breathing worsens.",
    meds: [
      { name: "Paracetamol", strength: "500 mg", t: ["morning", "afternoon", "evening"], food: "After food", days: "3" },
      { name: "Cetirizine", strength: "10 mg", t: ["night"], food: "After food", days: "3" },
    ],
  },
  {
    label: "Acidity",
    icon: "stomach",
    diagnosis: "Acidity / dyspepsia",
    advice: "Avoid spicy and late meals; review if pain is severe or recurrent.",
    meds: [{ name: "Pantoprazole", strength: "40 mg", t: ["morning"], food: "Before food", days: "5" }],
  },
  {
    label: "Allergy",
    icon: "flower-pollen",
    diagnosis: "Allergic symptoms",
    advice: "Avoid known triggers; seek urgent care for breathing difficulty or facial swelling.",
    meds: [{ name: "Levocetirizine", strength: "5 mg", t: ["night"], food: "After food", days: "5" }],
  },
] as const;

export default function PrescribePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["doctor", "encounter", id],
    queryFn: () => apiFetch<EncounterResponse>(`/api/v1/doctor/encounters/${id}`),
    enabled: Boolean(id),
  });

  const initial = query.data?.encounter.prescription ?? null;
  const [seeded, setSeeded] = useState(false);
  const [issued, setIssued] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [medicines, setMedicines] = useState<MedicineDraft[]>([blank()]);

  // Seed once when the prescription data arrives.
  if (query.data && !seeded) {
    setSeeded(true);
    setIssued(initial?.status === "issued");
    setDiagnosis(initial?.diagnosis ?? "");
    setAdvice(initial?.advice ?? "");
    setValidUntil(initial?.validUntil ?? "");
    if (initial?.medicines.length) {
      setMedicines(
        initial.medicines.map((m) => ({
          key: nextKey++,
          name: m.name,
          strength: m.strength ?? "",
          strengths: [],
          route: m.route ?? null,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation ?? "",
          durationDaysText: m.durationDays ? String(m.durationDays) : "",
          instructions: m.instructions ?? "",
        }))
      );
    }
  }

  const payload = () => ({
    diagnosis: diagnosis.trim() || null,
    advice: advice.trim() || null,
    validUntil: validUntil || null,
    medicines: medicines
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        strength: m.strength.trim() || null,
        route: m.route?.trim() || null,
        morning: m.morning,
        afternoon: m.afternoon,
        evening: m.evening,
        night: m.night,
        foodRelation: m.foodRelation.trim() || null,
        instructions: m.instructions.trim() || null,
        durationDays: m.durationDaysText ? Number(m.durationDaysText) : null,
      })),
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Prescription>(`/api/appointments/${id}/prescription`, {
        method: "PUT",
        body: JSON.stringify(payload()),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["doctor"] });
      toast.success("Draft saved");
    },
    onError: () => toast.error("Couldn't save the draft."),
  });

  const issue = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return apiFetch(`/api/appointments/${id}/prescription/issue`, { method: "POST" });
    },
    onSuccess: () => {
      setIssued(true);
      void client.invalidateQueries({ queryKey: ["doctor"] });
      toast.success("Prescription issued");
    },
    onError: () => toast.error("Couldn't issue the prescription."),
  });

  const update = (key: number, patch: Partial<MedicineDraft>) =>
    setMedicines((cur) => cur.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const onSelectMedicine = (key: number, entry: FormularyEntry) =>
    update(key, {
      name: entry.name,
      strength: entry.strengths[0] ?? "",
      strengths: entry.strengths,
      route: entry.route,
    });

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const go = () => {
      setDiagnosis(t.diagnosis);
      setAdvice(t.advice);
      setMedicines(
        t.meds.map((m) => {
          const slots = m.t as readonly string[];
          return {
            ...blank(),
            name: m.name,
            strength: m.strength,
            foodRelation: m.food,
            durationDaysText: m.days,
            morning: slots.includes("morning"),
            afternoon: slots.includes("afternoon"),
            evening: slots.includes("evening"),
            night: slots.includes("night"),
            route: "oral",
          };
        })
      );
    };
    const hasDraft = diagnosis.trim() || advice.trim() || medicines.some((m) => m.name.trim());
    if (hasDraft) {
      Alert.alert("Apply template?", "This replaces the current draft.", [
        { text: "Cancel", style: "cancel" },
        { text: "Apply", onPress: go },
      ]);
    } else go();
  };

  const confirmIssue = () => {
    const hasMed = medicines.some((m) => m.name.trim());
    if (!hasMed) {
      Alert.alert("No medicines added", "Add at least one medicine before issuing.");
      return;
    }
    Alert.alert(
      "Issue prescription?",
      "This permanently locks it and makes it visible to the patient.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Issue & lock", onPress: () => issue.mutate() },
      ]
    );
  };

  if (query.isLoading) return <Loading label="Opening prescription…" />;
  if (!query.data) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <Header onBack={() => router.back()} subtitle="" />
        <View style={{ padding: space.md }}>
          <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const { patient } = query.data.encounter;
  const allergies = query.data.patientProfile?.allergies;
  const patientName = patient.name || patient.email;
  const medCount = medicines.filter((m) => m.name.trim()).length;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Header onBack={() => router.back()} subtitle={patientName} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Patient context */}
          <Card tone="doctor">
            <View style={styles.row}>
              <View style={styles.patientIcon}>
                <MaterialCommunityIcons name="account" size={22} color={colors.doctor} />
              </View>
              <View style={{ flex: 1 }}>
                <Body strong>{patientName}</Body>
                <Muted>{formatDateTime(query.data.encounter.appointment.startsAt)}</Muted>
              </View>
              <StatusBadge status={issued ? "issued" : "draft"} />
            </View>
            {allergies ? (
              <View style={styles.allergy}>
                <MaterialCommunityIcons name="alert-circle" size={17} color={colors.danger} />
                <Text style={styles.allergyText}>Allergies: {allergies}</Text>
              </View>
            ) : null}
          </Card>

          {issued ? (
            <IssuedSummary diagnosis={diagnosis} advice={advice} medicines={medicines} />
          ) : (
            <>
              {/* Smart starter cards */}
              <Text style={styles.label}>QUICK-START PRESCRIPTIONS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateStrip}
              >
                {TEMPLATES.map((t) => (
                  <PressableScale
                    key={t.label}
                    haptic="light"
                    scaleTo={0.97}
                    onPress={() => applyTemplate(t)}
                    style={styles.templateCard}
                  >
                    <View style={styles.templateIcon}>
                      <MaterialCommunityIcons name={t.icon} size={20} color={colors.doctor} />
                    </View>
                    <Text style={styles.templateCardTitle}>{t.label}</Text>
                    <Text style={styles.templateCardMeds} numberOfLines={2}>
                      {t.meds.map((m) => m.name).join(", ")}
                    </Text>
                    <View style={styles.templateCardFoot}>
                      <Text style={styles.templateCardCount}>
                        {t.meds.length} medicine{t.meds.length === 1 ? "" : "s"}
                      </Text>
                      <MaterialCommunityIcons name="arrow-right" size={15} color={colors.doctor} />
                    </View>
                  </PressableScale>
                ))}
              </ScrollView>

              <Field
                label="Diagnosis"
                value={diagnosis}
                onChangeText={setDiagnosis}
                multiline
                placeholder="Clinical diagnosis / impression"
              />

              <View style={styles.medsHead}>
                <Text style={styles.sectionTitle}>Medicines</Text>
                <Text style={styles.count}>
                  {medCount} added
                </Text>
              </View>

              {medicines.map((m, index) => (
                <View key={m.key} style={styles.medCard}>
                  <View style={styles.medHeader}>
                    <View style={styles.medNum}>
                      <Mono style={styles.medNumText}>{index + 1}</Mono>
                    </View>
                    <Text style={styles.medCardTitle} numberOfLines={1}>
                      {m.name.trim() || "New medicine"}
                    </Text>
                    {medicines.length > 1 ? (
                      <Pressable
                        accessibilityLabel="Remove medicine"
                        hitSlop={8}
                        onPress={() => setMedicines((cur) => cur.filter((x) => x.key !== m.key))}
                        style={styles.medRemove}
                      >
                        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>

                  <MedicineNameField
                    value={m.name}
                    onChangeText={(v) => update(m.key, { name: v })}
                    onSelect={(entry) => onSelectMedicine(m.key, entry)}
                  />

                  <View style={styles.twoCol}>
                    <View style={{ flex: 2 }}>
                      <Field
                        label="Strength"
                        value={m.strength}
                        onChangeText={(v) => update(m.key, { strength: v })}
                        placeholder="500 mg"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Days"
                        value={m.durationDaysText}
                        onChangeText={(v) => update(m.key, { durationDaysText: v })}
                        keyboardType="number-pad"
                        placeholder="5"
                      />
                    </View>
                  </View>
                  {m.strengths.length > 1 ? (
                    <View style={styles.chipRow}>
                      {m.strengths.map((s) => (
                        <MiniChip
                          key={s}
                          label={s}
                          active={m.strength === s}
                          onPress={() => update(m.key, { strength: s })}
                        />
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.miniLabel}>DOSE TIMING</Text>
                  <View style={styles.timingRow}>
                    {TIMING.map((slot) => {
                      const active = m[slot.key];
                      return (
                        <PressableScale
                          key={slot.key}
                          haptic="light"
                          scaleTo={0.94}
                          onPress={() => update(m.key, { [slot.key]: !active })}
                          style={[styles.timing, active && styles.timingActive]}
                        >
                          <MaterialCommunityIcons
                            name={slot.icon}
                            size={19}
                            color={active ? "#fff" : colors.doctor}
                          />
                          <Text
                            numberOfLines={1}
                            style={[styles.timingText, active && { color: "#fff" }]}
                          >
                            {slot.label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>

                  <Text style={styles.miniLabel}>WITH FOOD</Text>
                  <View style={styles.chipRow}>
                    {FOOD.map((f) => (
                      <MiniChip
                        key={f}
                        label={f}
                        active={m.foodRelation === f}
                        onPress={() =>
                          update(m.key, { foodRelation: m.foodRelation === f ? "" : f })
                        }
                      />
                    ))}
                  </View>

                  <Field
                    label="Instructions (optional)"
                    value={m.instructions}
                    onChangeText={(v) => update(m.key, { instructions: v })}
                    placeholder="e.g. Take with plenty of water"
                  />
                </View>
              ))}

              <Button
                label="Add another medicine"
                tone="secondary"
                icon="plus"
                onPress={() => setMedicines((cur) => [...cur, blank()])}
              />

              <Field
                label="Doctor's advice"
                value={advice}
                onChangeText={setAdvice}
                multiline
                placeholder="Rest, hydration, follow-up guidance…"
              />
              <Field
                label="Valid until (optional)"
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="YYYY-MM-DD"
              />

              {save.error ? <ErrorState message={save.error.message} /> : null}
              {issue.error ? <ErrorState message={issue.error.message} /> : null}
            </>
          )}
        </ScrollView>

        {!issued ? (
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Button
                label="Save draft"
                tone="secondary"
                loading={save.isPending}
                onPress={() => save.mutate()}
              />
            </View>
            <View style={{ flex: 1.3 }}>
              <Button
                label="Issue prescription"
                icon="check"
                loading={issue.isPending}
                onPress={confirmIssue}
              />
            </View>
          </View>
        ) : (
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Button label="Done" icon="check" onPress={() => router.back()} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Header({ onBack, subtitle }: { onBack: () => void; subtitle: string }) {
  return (
    <View style={styles.header}>
      <IconButton icon="chevron-left" label="Go back" onPress={onBack} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Write prescription</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MiniChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      haptic="light"
      scaleTo={0.95}
      onPress={onPress}
      style={[styles.miniChip, active && styles.miniChipActive]}
    >
      <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>{label}</Text>
    </PressableScale>
  );
}

function IssuedSummary({
  diagnosis,
  advice,
  medicines,
}: {
  diagnosis: string;
  advice: string;
  medicines: MedicineDraft[];
}) {
  return (
    <Card tone="accent">
      <Body strong>Issued prescription</Body>
      {diagnosis ? <Muted>Diagnosis: {diagnosis}</Muted> : null}
      {medicines
        .filter((m) => m.name.trim())
        .map((m) => (
          <View key={m.key} style={styles.issuedMed}>
            <Body strong>
              {m.name} {m.strength}
            </Body>
            <Muted>
              {[
                m.morning && "Morning",
                m.afternoon && "Afternoon",
                m.evening && "Evening",
                m.night && "Night",
                m.foodRelation,
                m.durationDaysText && `${m.durationDaysText} days`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Muted>
          </View>
        ))}
      {advice ? <Muted>Advice: {advice}</Muted> : null}
      <Muted>Issued prescriptions are locked and visible to the patient.</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.md,
    paddingTop: 6,
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.5, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  scroll: { paddingHorizontal: space.md, paddingBottom: 28, gap: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  patientIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  allergy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  allergyText: { flex: 1, color: colors.danger, fontFamily: fonts.bodySemibold, fontSize: 13 },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginTop: 2,
  },
  templateStrip: { gap: 10, paddingRight: 4 },
  templateCard: {
    width: 168,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#ddd2f6",
    padding: 14,
    gap: 7,
    ...shadowSoft,
  },
  templateIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  templateCardTitle: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2, color: colors.text, marginTop: 2 },
  templateCardMeds: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textMuted, minHeight: 32 },
  templateCardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 8,
  },
  templateCardCount: { fontFamily: fonts.bodySemibold, fontSize: 11.5, color: colors.doctor },
  medsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 17, letterSpacing: -0.3, color: colors.text },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.textMuted },
  medCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 15,
    gap: 10,
    ...shadowSoft,
  },
  medHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  medNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  medNumText: { color: colors.doctor, fontSize: 13 },
  medCardTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  medRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  miniLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginTop: 2,
  },
  timingRow: { flexDirection: "row", gap: 7 },
  timing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timingActive: { backgroundColor: colors.doctor, borderColor: colors.doctor, ...shadowSoft, shadowColor: colors.doctor },
  timingText: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.textMuted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  miniChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniChipActive: { backgroundColor: colors.doctorBg, borderColor: colors.doctor },
  miniChipText: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: colors.textMuted },
  miniChipTextActive: { color: colors.doctorDark },
  issuedMed: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    gap: 2,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
