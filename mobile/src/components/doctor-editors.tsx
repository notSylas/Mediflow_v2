import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Field,
  Muted,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { colors, radius } from "@/lib/theme";
import type { ConsultNote, Medicine, Prescription } from "@/lib/types";

const SOAP_FIELDS = [
  ["subjective", "Subjective", "Patient's description of symptoms"],
  ["objective", "Objective", "Clinical observations and vitals"],
  ["assessment", "Assessment", "Diagnosis and clinical impression"],
  ["plan", "Plan", "Treatment and next steps"],
] as const;

export function SoapEditor({
  appointmentId,
  initial,
  onSaved,
}: {
  appointmentId: string;
  initial: ConsultNote | null;
  onSaved: (hasNote: boolean) => void;
}) {
  const [values, setValues] = useState({
    subjective: initial?.subjective ?? "",
    objective: initial?.objective ?? "",
    assessment: initial?.assessment ?? "",
    plan: initial?.plan ?? "",
  });
  const [state, setState] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const latest = useRef(values);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = async () => {
    setState("saving");
    try {
      await apiFetch(`/api/appointments/${appointmentId}/consult-note`, {
        method: "PUT",
        body: JSON.stringify(latest.current),
      });
      setState("saved");
      onSaved(Object.values(latest.current).some((value) => value.trim()));
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void save();
      }
    });
    return () => {
      subscription.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  });

  const change = (key: keyof typeof values, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    latest.current = next;
    setState("typing");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void save();
    }, 1200);
  };

  const statusText = {
    idle: "Autosaves as you type",
    typing: "Typing…",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved — keep typing to retry",
  }[state];

  return (
    <Card>
      <View style={styles.between}>
        <Body strong>Consultation note (SOAP)</Body>
        <Text style={[styles.status, state === "error" && { color: colors.danger }]}>
          {statusText}
        </Text>
      </View>
      {SOAP_FIELDS.map(([key, label, placeholder]) => (
        <Field
          key={key}
          label={label}
          value={values[key]}
          onChangeText={(value) => change(key, value)}
          multiline
          placeholder={placeholder}
        />
      ))}
      {state === "error" ? (
        <Button label="Retry save" tone="secondary" onPress={() => void save()} />
      ) : null}
    </Card>
  );
}

interface MedicineDraft extends Omit<Medicine, "id" | "durationDays"> {
  key: number;
  durationDaysText: string;
}

let nextMedicineKey = 1;

function blankMedicine(): MedicineDraft {
  return {
    key: nextMedicineKey++,
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

export function PrescriptionEditor({
  appointmentId,
  initial,
  onIssued,
}: {
  appointmentId: string;
  initial: Prescription | null;
  onIssued: () => void;
}) {
  const [issued, setIssued] = useState(initial?.status === "issued");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [medicines, setMedicines] = useState<MedicineDraft[]>(() =>
    initial?.medicines.length
      ? initial.medicines.map((medicine) => ({
          key: nextMedicineKey++,
          name: medicine.name,
          strength: medicine.strength ?? "",
          route: medicine.route ?? null,
          morning: medicine.morning,
          afternoon: medicine.afternoon,
          evening: medicine.evening,
          night: medicine.night,
          foodRelation: medicine.foodRelation ?? "",
          durationDaysText: medicine.durationDays ? String(medicine.durationDays) : "",
          instructions: medicine.instructions ?? "",
        }))
      : [blankMedicine()]
  );

  const payload = () => ({
    diagnosis: diagnosis.trim() || null,
    advice: advice.trim() || null,
    validUntil: validUntil || null,
    medicines: medicines
      .filter((medicine) => medicine.name.trim())
      .map((medicine) => ({
        name: medicine.name.trim(),
        strength: medicine.strength?.trim() || null,
        route: medicine.route?.trim() || null,
        morning: medicine.morning,
        afternoon: medicine.afternoon,
        evening: medicine.evening,
        night: medicine.night,
        foodRelation: medicine.foodRelation?.trim() || null,
        instructions: medicine.instructions?.trim() || null,
        durationDays: medicine.durationDaysText ? Number(medicine.durationDaysText) : null,
      })),
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Prescription>(`/api/appointments/${appointmentId}/prescription`, {
        method: "PUT",
        body: JSON.stringify(payload()),
      }),
  });
  const issue = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return apiFetch(`/api/appointments/${appointmentId}/prescription/issue`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      setIssued(true);
      onIssued();
    },
  });

  const updateMedicine = (key: number, patch: Partial<MedicineDraft>) =>
    setMedicines((current) =>
      current.map((medicine) => (medicine.key === key ? { ...medicine, ...patch } : medicine))
    );

  if (issued) {
    return (
      <Card tone="accent">
        <View style={styles.between}>
          <Body strong>Prescription</Body>
          <StatusBadge status="issued" />
        </View>
        {diagnosis ? <Muted>Diagnosis: {diagnosis}</Muted> : null}
        {medicines
          .filter((medicine) => medicine.name.trim())
          .map((medicine) => (
            <View key={medicine.key} style={styles.medicine}>
              <Body strong>
                {medicine.name} {medicine.strength}
              </Body>
              <Muted>
                {[
                  medicine.morning && "Morning",
                  medicine.afternoon && "Afternoon",
                  medicine.evening && "Evening",
                  medicine.night && "Night",
                  medicine.foodRelation,
                  medicine.durationDaysText && `${medicine.durationDaysText} days`,
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

  const confirmIssue = () =>
    Alert.alert(
      "Issue prescription?",
      "This permanently locks the prescription and makes it visible to the patient.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Issue and lock", onPress: () => issue.mutate() },
      ]
    );

  return (
    <Card>
      <View style={styles.between}>
        <Body strong>Prescription</Body>
        <StatusBadge status="draft" />
      </View>
      <Field
        label="Diagnosis"
        value={diagnosis}
        onChangeText={setDiagnosis}
        multiline
        placeholder="Clinical diagnosis"
      />
      <SectionHeader title="Medicines" />
      {medicines.map((medicine, index) => (
        <View key={medicine.key} style={styles.medicine}>
          <View style={styles.between}>
            <Body strong>Medicine {index + 1}</Body>
            {medicines.length > 1 ? (
              <Pressable
                onPress={() =>
                  setMedicines((current) =>
                    current.filter((item) => item.key !== medicine.key)
                  )
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Name"
                value={medicine.name}
                onChangeText={(value) => updateMedicine(medicine.key, { name: value })}
                placeholder="Medicine"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Strength"
                value={medicine.strength ?? ""}
                onChangeText={(value) => updateMedicine(medicine.key, { strength: value })}
                placeholder="500 mg"
              />
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
              <Field
                label="Food"
                value={medicine.foodRelation ?? ""}
                onChangeText={(value) => updateMedicine(medicine.key, { foodRelation: value })}
                placeholder="After food"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Days"
                value={medicine.durationDaysText}
                onChangeText={(value) =>
                  updateMedicine(medicine.key, { durationDaysText: value })
                }
                keyboardType="number-pad"
                placeholder="5"
              />
            </View>
          </View>
          <Field
            label="Instructions"
            value={medicine.instructions ?? ""}
            onChangeText={(value) => updateMedicine(medicine.key, { instructions: value })}
            placeholder="Optional instructions"
          />
        </View>
      ))}
      <Button
        label="Add another medicine"
        tone="secondary"
        onPress={() => setMedicines((current) => [...current, blankMedicine()])}
      />
      <Field
        label="Doctor's advice"
        value={advice}
        onChangeText={setAdvice}
        multiline
        placeholder="Rest, hydration, follow-up guidance…"
      />
      <Field
        label="Valid until"
        value={validUntil}
        onChangeText={setValidUntil}
        placeholder="YYYY-MM-DD"
      />
      {save.error ? <ErrorState message={save.error.message} /> : null}
      {issue.error ? <ErrorState message={issue.error.message} /> : null}
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Button
            label={save.isSuccess ? "Draft saved" : "Save draft"}
            tone="secondary"
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Issue" loading={issue.isPending} onPress={confirmIssue} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  twoCol: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  status: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  medicine: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    gap: 9,
    backgroundColor: "#fbfcfc",
  },
  remove: { color: colors.danger, fontSize: 13, fontWeight: "700" },
});
