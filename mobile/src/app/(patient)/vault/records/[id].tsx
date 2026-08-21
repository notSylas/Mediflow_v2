import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuroraScreen } from "@/components/aurora-screen";
import {
  Body,
  Button,
  Card,
  ChoiceChips,
  Field,
  Muted,
  SectionHeader,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import {
  VAULT_RECORD_TYPE_OPTIONS,
  type VaultRecordDTO,
  type VaultRecordMedicine,
  type VaultRecordType,
} from "@/lib/vault-types";

interface MedicineDraft extends Omit<VaultRecordMedicine, "durationDays"> {
  key: number;
  durationDaysText: string;
}

let nextKey = 1;

function blankMedicine(): MedicineDraft {
  return {
    key: nextKey++,
    name: "",
    strength: "",
    route: null,
    morning: false,
    afternoon: false,
    evening: false,
    night: false,
    foodRelation: "",
    durationDaysText: "",
    instructions: "",
  };
}

export default function VaultRecordReview() {
  const { id, initial: initialParam } = useLocalSearchParams<{ id: string; initial?: string }>();
  const client = useQueryClient();
  const toast = useToast();
  const initial: VaultRecordDTO | null = initialParam ? JSON.parse(initialParam) : null;

  const [recordType, setRecordType] = useState<VaultRecordType>(initial?.recordType ?? "prescription");
  const [recordDate, setRecordDate] = useState(initial?.recordDate ?? "");
  const [sourceFacility, setSourceFacility] = useState(initial?.sourceFacility ?? "");
  const [sourceDoctorName, setSourceDoctorName] = useState(initial?.sourceDoctorName ?? "");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [medicines, setMedicines] = useState<MedicineDraft[]>(() =>
    initial?.medicines.length
      ? initial.medicines.map((m) => ({
          key: nextKey++,
          name: m.name,
          strength: m.strength ?? "",
          route: m.route,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night,
          foodRelation: m.foodRelation ?? "",
          durationDaysText: m.durationDays ? String(m.durationDays) : "",
          instructions: m.instructions ?? "",
        }))
      : [blankMedicine()]
  );

  const lowConfidence = initial?.extractionConfidence === "low" || !initial?.extractionConfidence;

  const updateMedicine = (key: number, patch: Partial<MedicineDraft>) =>
    setMedicines((current) => current.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/patient/vault/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          recordType,
          recordDate: recordDate.trim() || null,
          sourceFacility: sourceFacility.trim() || null,
          sourceDoctorName: sourceDoctorName.trim() || null,
          diagnosis: diagnosis.trim() || null,
          advice: advice.trim() || null,
          medicines: medicines
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name.trim(),
              strength: m.strength?.trim() || null,
              route: m.route,
              morning: m.morning,
              afternoon: m.afternoon,
              evening: m.evening,
              night: m.night,
              foodRelation: m.foodRelation?.trim() || null,
              instructions: m.instructions?.trim() || null,
              durationDays: m.durationDaysText ? Number(m.durationDaysText) : null,
            })),
        }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "vault"] });
      toast.success("Added to your vault.");
      router.replace("/(patient)/vault");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const discard = useMutation({
    mutationFn: () => apiFetch(`/api/v1/patient/vault/records/${id}`, { method: "DELETE" }),
    onSuccess: () => router.replace("/(patient)/vault"),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmDiscard = () =>
    Alert.alert("Discard this upload?", "The photo and anything you've entered will be deleted.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => discard.mutate() },
    ]);

  return (
    <AuroraScreen variant="patient" compactHeader title="Review before saving" subtitle="Confirm what's on the document">
      {lowConfidence ? (
        <Card tone="accent">
          <Muted>
            We couldn&apos;t read this document automatically — fill in the details below yourself.
            Nothing is saved until you confirm.
          </Muted>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.label}>Type of record</Text>
        <ChoiceChips
          options={VAULT_RECORD_TYPE_OPTIONS}
          value={recordType}
          onChange={(v) => setRecordType(v as VaultRecordType)}
        />
        <Field label="Date on the document" value={recordDate} onChangeText={setRecordDate} placeholder="YYYY-MM-DD" />
        <Field label="Hospital / clinic" value={sourceFacility} onChangeText={setSourceFacility} placeholder="e.g. Apollo Clinic, Koramangala" />
        <Field label="Doctor's name" value={sourceDoctorName} onChangeText={setSourceDoctorName} placeholder="Optional" />
        <Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline placeholder="What the document says was diagnosed" />
      </Card>

      <Card>
        <SectionHeader title="Medicines" />
        {medicines.map((medicine, index) => (
          <View key={medicine.key} style={styles.medicine}>
            <View style={styles.between}>
              <Body strong>Medicine {index + 1}</Body>
              {medicines.length > 1 ? (
                <Pressable onPress={() => setMedicines((c) => c.filter((m) => m.key !== medicine.key))}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Field label="Name" value={medicine.name} onChangeText={(v) => updateMedicine(medicine.key, { name: v })} placeholder="Medicine" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Strength" value={medicine.strength ?? ""} onChangeText={(v) => updateMedicine(medicine.key, { strength: v })} placeholder="500 mg" />
              </View>
            </View>
            <Body strong>Timing</Body>
            <ChoiceChips
              options={[
                { label: medicine.morning ? "✓ Morning" : "Morning", value: "morning" },
                { label: medicine.afternoon ? "✓ Afternoon" : "Afternoon", value: "afternoon" },
                { label: medicine.evening ? "✓ Evening" : "Evening", value: "evening" },
                { label: medicine.night ? "✓ Night" : "Night", value: "night" },
              ]}
              value={null}
              onChange={(value) =>
                updateMedicine(medicine.key, {
                  [value]: !medicine[value as "morning" | "afternoon" | "evening" | "night"],
                })
              }
            />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Field label="Food" value={medicine.foodRelation ?? ""} onChangeText={(v) => updateMedicine(medicine.key, { foodRelation: v })} placeholder="After food" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Days" value={medicine.durationDaysText} onChangeText={(v) => updateMedicine(medicine.key, { durationDaysText: v })} keyboardType="number-pad" placeholder="5" />
              </View>
            </View>
          </View>
        ))}
        <Button label="Add another medicine" tone="secondary" onPress={() => setMedicines((c) => [...c, blankMedicine()])} />
      </Card>

      <Card>
        <Field label="Doctor's advice" value={advice} onChangeText={setAdvice} multiline placeholder="Optional" />
      </Card>

      <Button label="Save to vault" loading={save.isPending} onPress={() => save.mutate()} />
      <Button label="Discard" tone="danger-outline" onPress={confirmDiscard} />
    </AuroraScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  between: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  medicine: { gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  twoCol: { flexDirection: "row", gap: 10 },
  remove: { color: colors.danger, fontFamily: fonts.bodySemibold, fontSize: 12.5 },
});
