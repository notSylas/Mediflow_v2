import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  type VaultLabResult,
  type VaultLabResultFlag,
  type VaultRecordDTO,
  type VaultRecordEditSummary,
  type VaultRecordExtractionStatus,
  type VaultRecordMedicine,
  type VaultRecordType,
  type VaultRecordVitals,
  type VaultVaccineDetails,
} from "@/lib/vault-types";

interface VitalsForm {
  bpSystolic: string;
  bpDiastolic: string;
  pulseRate: string;
  temperatureCelsius: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
}

interface LabResultDraft {
  key: number;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: VaultLabResultFlag | null;
}

interface VaccineDetailsForm {
  vaccineName: string;
  doseNumber: string;
  batchNumber: string;
  route: string;
  site: string;
  nextDueDate: string;
}

function blankVitals(): VitalsForm {
  return {
    bpSystolic: "",
    bpDiastolic: "",
    pulseRate: "",
    temperatureCelsius: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
  };
}

function blankVaccineDetails(): VaccineDetailsForm {
  return { vaccineName: "", doseNumber: "", batchNumber: "", route: "", site: "", nextDueDate: "" };
}

function numOrEmpty(n: number | null): string {
  return n == null ? "" : String(n);
}

/** Non-empty chips for the entered vitals — also doubles as "is there anything to show/save". */
function vitalsChips(v: VitalsForm): string[] {
  const chips: string[] = [];
  if (v.bpSystolic.trim() || v.bpDiastolic.trim()) {
    chips.push(`BP ${v.bpSystolic.trim() || "—"}/${v.bpDiastolic.trim() || "—"} mmHg`);
  }
  if (v.pulseRate.trim()) chips.push(`Pulse ${v.pulseRate.trim()} bpm`);
  if (v.temperatureCelsius.trim()) chips.push(`Temp ${v.temperatureCelsius.trim()}°C`);
  if (v.spo2.trim()) chips.push(`SpO2 ${v.spo2.trim()}%`);
  if (v.weightKg.trim()) chips.push(`${v.weightKg.trim()} kg`);
  if (v.heightCm.trim()) chips.push(`${v.heightCm.trim()} cm`);
  return chips;
}

const FLAG_OPTIONS: Array<{ label: string; value: VaultLabResultFlag }> = [
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
  { label: "Critical", value: "critical" },
];

const FLAG_COLORS: Record<VaultLabResultFlag, { bg: string; fg: string }> = {
  normal: { bg: colors.surfaceStrong, fg: colors.textMuted },
  high: { bg: colors.warningBg, fg: colors.warning },
  low: { bg: colors.infoBg, fg: colors.info },
  critical: { bg: colors.dangerBg, fg: colors.danger },
};

interface MedicineDraft extends Omit<VaultRecordMedicine, "durationDays"> {
  key: number;
  durationDaysText: string;
}

let nextKey = 1;

function blankLabResult(): LabResultDraft {
  return { key: nextKey++, testName: "", value: "", unit: "", referenceRange: "", flag: null };
}

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

const RECORD_TYPE_LABELS: Record<VaultRecordType, string> = {
  prescription: "Prescription",
  lab: "Lab report",
  scan: "Scan",
  discharge_summary: "Discharge summary",
  vaccination: "Vaccination",
  other: "Other",
};

const FIELD_LABELS: Record<string, string> = {
  recordType: "Type",
  recordDate: "Date",
  sourceFacility: "Hospital / clinic",
  sourceDoctorName: "Doctor",
  diagnosis: "Diagnosis",
  diagnosisCode: "Diagnosis code",
  advice: "Advice",
  medicines: "Medicines",
  vitals: "Vitals",
  labResults: "Lab results",
  findings: "Findings",
  admissionDate: "Admission date",
  vaccineDetails: "Vaccine details",
};

function formatPreviousValue(field: string, value: unknown): string {
  if (field === "recordType") {
    return RECORD_TYPE_LABELS[value as VaultRecordType] ?? String(value ?? "—");
  }
  if (field === "medicines") {
    const meds = (value as VaultRecordMedicine[] | null) ?? [];
    return meds.length ? meds.map((m) => m.name).join(", ") : "(none)";
  }
  if (field === "labResults") {
    const results = (value as VaultLabResult[] | null) ?? [];
    return results.length ? results.map((r) => r.testName).join(", ") : "(none)";
  }
  if (field === "vitals") {
    const v = value as VaultRecordVitals | null;
    if (!v) return "(none)";
    const chips = vitalsChips({
      bpSystolic: numOrEmpty(v.bpSystolic),
      bpDiastolic: numOrEmpty(v.bpDiastolic),
      pulseRate: numOrEmpty(v.pulseRate),
      temperatureCelsius: numOrEmpty(v.temperatureCelsius),
      spo2: numOrEmpty(v.spo2),
      weightKg: numOrEmpty(v.weightKg),
      heightCm: numOrEmpty(v.heightCm),
    });
    return chips.length ? chips.join(", ") : "(none)";
  }
  if (field === "vaccineDetails") {
    const vd = value as VaultVaccineDetails | null;
    return vd?.vaccineName || "(none)";
  }
  return typeof value === "string" && value ? value : "(empty)";
}

function doseSummary(m: MedicineDraft): string {
  const slots = (["morning", "afternoon", "evening", "night"] as const).filter((s) => m[s]);
  const parts = [
    m.strength,
    slots.length ? slots.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ") : null,
    m.durationDaysText ? `${m.durationDaysText} day(s)` : null,
    m.foodRelation,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** How long the review screen keeps polling before offering a manual retry instead. */
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 3000;

export default function VaultRecordReview() {
  const { id, initial: initialParam } = useLocalSearchParams<{ id: string; initial?: string }>();
  const client = useQueryClient();
  const toast = useToast();
  const initial: VaultRecordDTO | null = initialParam ? JSON.parse(initialParam) : null;

  // Coming from "add a record" always carries `initial` (freshly uploaded).
  // Coming from tapping an item in the vault list carries no param at all —
  // fetch it below once on mount in that case.
  const [loading, setLoading] = useState(!initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">(initial?.patientConfirmed ? "view" : "edit");
  const [wasAlreadyConfirmed, setWasAlreadyConfirmed] = useState(initial?.patientConfirmed ?? false);
  const [edits, setEdits] = useState<VaultRecordEditSummary[]>(initial?.edits ?? []);
  const [showHistory, setShowHistory] = useState(false);

  const [recordType, setRecordType] = useState<VaultRecordType>(initial?.recordType ?? "prescription");
  const [recordDate, setRecordDate] = useState(initial?.recordDate ?? "");
  const [sourceFacility, setSourceFacility] = useState(initial?.sourceFacility ?? "");
  const [sourceDoctorName, setSourceDoctorName] = useState(initial?.sourceDoctorName ?? "");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [diagnosisCode, setDiagnosisCode] = useState(initial?.diagnosisCode ?? "");
  const [advice, setAdvice] = useState(initial?.advice ?? "");
  const [findings, setFindings] = useState(initial?.findings ?? "");
  const [admissionDate, setAdmissionDate] = useState(initial?.admissionDate ?? "");
  const [vitals, setVitals] = useState<VitalsForm>(() =>
    initial?.vitals
      ? {
          bpSystolic: numOrEmpty(initial.vitals.bpSystolic),
          bpDiastolic: numOrEmpty(initial.vitals.bpDiastolic),
          pulseRate: numOrEmpty(initial.vitals.pulseRate),
          temperatureCelsius: numOrEmpty(initial.vitals.temperatureCelsius),
          spo2: numOrEmpty(initial.vitals.spo2),
          weightKg: numOrEmpty(initial.vitals.weightKg),
          heightCm: numOrEmpty(initial.vitals.heightCm),
        }
      : blankVitals()
  );
  const [labResults, setLabResults] = useState<LabResultDraft[]>(() =>
    initial?.labResults.length
      ? initial.labResults.map((r) => ({
          key: nextKey++,
          testName: r.testName,
          value: r.value,
          unit: r.unit ?? "",
          referenceRange: r.referenceRange ?? "",
          flag: r.flag,
        }))
      : [blankLabResult()]
  );
  const [vaccineDetails, setVaccineDetails] = useState<VaccineDetailsForm>(() =>
    initial?.vaccineDetails
      ? {
          vaccineName: initial.vaccineDetails.vaccineName ?? "",
          doseNumber: initial.vaccineDetails.doseNumber ?? "",
          batchNumber: initial.vaccineDetails.batchNumber ?? "",
          route: initial.vaccineDetails.route ?? "",
          site: initial.vaccineDetails.site ?? "",
          nextDueDate: initial.vaccineDetails.nextDueDate ?? "",
        }
      : blankVaccineDetails()
  );
  const [extractionStatus, setExtractionStatus] = useState<VaultRecordExtractionStatus>(
    initial?.extractionStatus ?? "stub"
  );
  const [pollElapsedMs, setPollElapsedMs] = useState(0);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
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

  const applyRecord = (record: VaultRecordDTO) => {
    setRecordType(record.recordType);
    setRecordDate(record.recordDate ?? "");
    setSourceFacility(record.sourceFacility ?? "");
    setSourceDoctorName(record.sourceDoctorName ?? "");
    setDiagnosis(record.diagnosis ?? "");
    setDiagnosisCode(record.diagnosisCode ?? "");
    setAdvice(record.advice ?? "");
    setFindings(record.findings ?? "");
    setAdmissionDate(record.admissionDate ?? "");
    setExtractionStatus(record.extractionStatus);
    setEdits(record.edits ?? []);
    setVitals(
      record.vitals
        ? {
            bpSystolic: numOrEmpty(record.vitals.bpSystolic),
            bpDiastolic: numOrEmpty(record.vitals.bpDiastolic),
            pulseRate: numOrEmpty(record.vitals.pulseRate),
            temperatureCelsius: numOrEmpty(record.vitals.temperatureCelsius),
            spo2: numOrEmpty(record.vitals.spo2),
            weightKg: numOrEmpty(record.vitals.weightKg),
            heightCm: numOrEmpty(record.vitals.heightCm),
          }
        : blankVitals()
    );
    setLabResults(
      record.labResults.length
        ? record.labResults.map((r) => ({
            key: nextKey++,
            testName: r.testName,
            value: r.value,
            unit: r.unit ?? "",
            referenceRange: r.referenceRange ?? "",
            flag: r.flag,
          }))
        : [blankLabResult()]
    );
    setVaccineDetails(
      record.vaccineDetails
        ? {
            vaccineName: record.vaccineDetails.vaccineName ?? "",
            doseNumber: record.vaccineDetails.doseNumber ?? "",
            batchNumber: record.vaccineDetails.batchNumber ?? "",
            route: record.vaccineDetails.route ?? "",
            site: record.vaccineDetails.site ?? "",
            nextDueDate: record.vaccineDetails.nextDueDate ?? "",
          }
        : blankVaccineDetails()
    );
    if (record.medicines.length) {
      setMedicines(
        record.medicines.map((m) => ({
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
      );
    }
  };

  // Fetched-by-tap entry point: no `initial` param, so load the record fresh.
  useEffect(() => {
    if (initial) return;
    (async () => {
      try {
        const data = await apiFetch<{ record: VaultRecordDTO }>(`/api/v1/patient/vault/records/${id}`);
        applyRecord(data.record);
        setWasAlreadyConfirmed(data.record.patientConfirmed);
        setMode(data.record.patientConfirmed ? "view" : "edit");
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // While a background analysis is still running, poll for the write-back —
  // capped so an unconfigured/stuck analyzer doesn't spin forever.
  useEffect(() => {
    if (extractionStatus !== "processing" || pollElapsedMs >= POLL_TIMEOUT_MS) return;
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ record: VaultRecordDTO }>(`/api/v1/patient/vault/records/${id}`);
        applyRecord(data.record);
      } catch {
        // Transient network blip; the next tick retries.
      }
      setPollElapsedMs((ms) => ms + POLL_INTERVAL_MS);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [extractionStatus, pollElapsedMs, id]);

  const checkAgain = async () => {
    setPollElapsedMs(0);
    try {
      const data = await apiFetch<{ record: VaultRecordDTO }>(`/api/v1/patient/vault/records/${id}`);
      applyRecord(data.record);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const lowConfidence =
    extractionStatus !== "processing" &&
    !wasAlreadyConfirmed &&
    (initial?.extractionConfidence === "low" || !initial?.extractionConfidence);

  const updateMedicine = (key: number, patch: Partial<MedicineDraft>) =>
    setMedicines((current) => current.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const updateLabResult = (key: number, patch: Partial<LabResultDraft>) =>
    setLabResults((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const namedLabResults = labResults.filter((r) => r.testName.trim());
  const hasVaccineName = Boolean(vaccineDetails.vaccineName.trim());

  // Mirrors backend/vault/vault-validation.ts.
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!recordDate.trim()) errors.push("Add the date on the document.");
    if (!sourceFacility.trim() && !sourceDoctorName.trim()) {
      errors.push("Add the hospital/clinic or the doctor's name.");
    }
    const named = medicines.filter((m) => m.name.trim());
    const hasTypeSpecificContent =
      (recordType === "lab" && namedLabResults.length > 0) ||
      (recordType === "vaccination" && hasVaccineName) ||
      (["scan", "discharge_summary", "other"].includes(recordType) && findings.trim().length > 0);
    if (!diagnosis.trim() && !advice.trim() && named.length === 0 && !hasTypeSpecificContent) {
      errors.push("Add a diagnosis, advice, or at least one medicine.");
    }
    return errors;
  }, [
    recordDate,
    sourceFacility,
    sourceDoctorName,
    diagnosis,
    advice,
    medicines,
    recordType,
    namedLabResults.length,
    hasVaccineName,
    findings,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      try {
        const chips = vitalsChips(vitals);
        const parseNum = (s: string) => (s.trim() ? Number(s.trim()) : null);
        return await apiFetch<{ record: VaultRecordDTO }>(`/api/v1/patient/vault/records/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            recordType,
            recordDate: recordDate.trim() || null,
            sourceFacility: sourceFacility.trim() || null,
            sourceDoctorName: sourceDoctorName.trim() || null,
            diagnosis: diagnosis.trim() || null,
            diagnosisCode: diagnosisCode.trim() || null,
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
            vitals: chips.length
              ? {
                  bpSystolic: parseNum(vitals.bpSystolic),
                  bpDiastolic: parseNum(vitals.bpDiastolic),
                  pulseRate: parseNum(vitals.pulseRate),
                  temperatureCelsius: parseNum(vitals.temperatureCelsius),
                  spo2: parseNum(vitals.spo2),
                  weightKg: parseNum(vitals.weightKg),
                  heightCm: parseNum(vitals.heightCm),
                }
              : null,
            labResults: namedLabResults.map((r) => ({
              testName: r.testName.trim(),
              value: r.value.trim(),
              unit: r.unit.trim() || null,
              referenceRange: r.referenceRange.trim() || null,
              flag: r.flag,
            })),
            findings: findings.trim() || null,
            admissionDate: admissionDate.trim() || null,
            vaccineDetails: hasVaccineName
              ? {
                  vaccineName: vaccineDetails.vaccineName.trim() || null,
                  doseNumber: vaccineDetails.doseNumber.trim() || null,
                  batchNumber: vaccineDetails.batchNumber.trim() || null,
                  route: vaccineDetails.route.trim() || null,
                  site: vaccineDetails.site.trim() || null,
                  nextDueDate: vaccineDetails.nextDueDate.trim() || null,
                }
              : null,
          }),
        });
      } catch (e) {
        setServerErrors([]);
        throw e;
      }
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ["patient", "vault"] });
      applyRecord(data.record);
      if (wasAlreadyConfirmed) {
        toast.success("Saved.");
        setMode("view");
      } else {
        toast.success("Added to your vault.");
        router.replace("/(patient)/vault");
      }
      setWasAlreadyConfirmed(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const discard = useMutation({
    mutationFn: () => apiFetch(`/api/v1/patient/vault/records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["patient", "vault"] });
      router.replace("/(patient)/vault");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmDiscard = () =>
    wasAlreadyConfirmed
      ? Alert.alert("Delete this record?", "This can't be undone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => discard.mutate() },
        ])
      : Alert.alert("Discard this upload?", "The photo and anything you've entered will be deleted.", [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => discard.mutate() },
        ]);

  if (loading) {
    return (
      <AuroraScreen variant="patient" compactHeader title="Loading…">
        <ActivityIndicator size="small" color={colors.primary} />
      </AuroraScreen>
    );
  }

  if (loadError) {
    return (
      <AuroraScreen variant="patient" compactHeader title="Record">
        <Muted>{loadError}</Muted>
      </AuroraScreen>
    );
  }

  if (mode === "view") {
    const namedMedicines = medicines.filter((m) => m.name.trim());
    const chips = vitalsChips(vitals);
    const shownLabResults = labResults.filter((r) => r.testName.trim());
    const hasFindings = findings.trim().length > 0;
    const hasVaccine = Boolean(vaccineDetails.vaccineName.trim());
    return (
      <AuroraScreen
        variant="patient"
        compactHeader
        title={diagnosis || RECORD_TYPE_LABELS[recordType]}
        subtitle={
          [sourceDoctorName, sourceFacility].filter(Boolean).join(" · ") ||
          RECORD_TYPE_LABELS[recordType]
        }
      >
        <Card>
          {diagnosis ? (
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>Diagnosis</Text>
              <Body>{diagnosis}</Body>
              {diagnosisCode ? <Muted>{diagnosisCode}</Muted> : null}
            </View>
          ) : null}

          {chips.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Vitals</Text>
              <View style={styles.chipRow}>
                {chips.map((chip) => (
                  <View key={chip} style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {shownLabResults.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Lab results</Text>
              {shownLabResults.map((r) => (
                <View key={r.key} style={styles.labRow}>
                  <View style={{ flex: 1 }}>
                    <Body strong>{r.testName}</Body>
                    <Muted>
                      {[r.value, r.unit].filter(Boolean).join(" ")}
                      {r.referenceRange ? ` · Ref: ${r.referenceRange}` : ""}
                    </Muted>
                  </View>
                  {r.flag ? (
                    <View style={[styles.badge, { backgroundColor: FLAG_COLORS[r.flag].bg }]}>
                      <Text style={[styles.badgeText, { color: FLAG_COLORS[r.flag].fg }]}>
                        {r.flag}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {namedMedicines.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Medicines</Text>
              {namedMedicines.map((m) => (
                <View key={m.key} style={styles.viewMedicine}>
                  <Body strong>{m.name}</Body>
                  {doseSummary(m) ? <Muted>{doseSummary(m)}</Muted> : null}
                  {m.instructions ? <Muted>{m.instructions}</Muted> : null}
                </View>
              ))}
            </View>
          ) : null}

          {hasVaccine ? (
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>Vaccine details</Text>
              {[
                ["Vaccine", vaccineDetails.vaccineName],
                ["Dose", vaccineDetails.doseNumber],
                ["Batch", vaccineDetails.batchNumber],
                ["Route", vaccineDetails.route],
                ["Site", vaccineDetails.site],
                ["Next due", vaccineDetails.nextDueDate],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <Muted key={label}>
                    {label}: {value}
                  </Muted>
                ))}
            </View>
          ) : null}

          {hasFindings ? (
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>
                {recordType === "discharge_summary" ? "Course in hospital" : "Findings"}
              </Text>
              <Body>{findings}</Body>
            </View>
          ) : null}

          {advice ? (
            <View style={{ gap: 3 }}>
              <Text style={styles.label}>Advice</Text>
              <Body>{advice}</Body>
            </View>
          ) : null}

          {!diagnosis &&
          namedMedicines.length === 0 &&
          !advice &&
          chips.length === 0 &&
          shownLabResults.length === 0 &&
          !hasVaccine &&
          !hasFindings ? (
            <Muted>No additional details recorded.</Muted>
          ) : null}
        </Card>

        <Card>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowHistory((v) => !v)}
            style={styles.historyToggle}
          >
            <MaterialCommunityIcons name="history" size={16} color={colors.textMuted} />
            <Muted>
              {edits.length === 0
                ? "Confirmed by you — never edited"
                : `Confirmed by you · edited ${edits.length} time${edits.length === 1 ? "" : "s"}`}
            </Muted>
          </Pressable>
          {showHistory && edits.length > 0 ? (
            <View style={styles.historyList}>
              {edits.map((edit, i) => (
                <View key={i} style={styles.historyEntry}>
                  <Body strong>
                    Edit {i + 1} · {new Date(edit.editedAt).toLocaleString()}
                  </Body>
                  {edit.changedFields.map((field) => (
                    <Muted key={field}>
                      {FIELD_LABELS[field] ?? field} was: {formatPreviousValue(field, edit.previousValues[field])}
                    </Muted>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <Button label="Edit" icon="pencil-outline" onPress={() => setMode("edit")} />
        <Button label="Delete this record" tone="danger-outline" onPress={confirmDiscard} />
      </AuroraScreen>
    );
  }

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title={wasAlreadyConfirmed ? "Edit record" : "Review before saving"}
      subtitle={
        wasAlreadyConfirmed
          ? "Changes are recorded — what you had before stays visible in the record's history."
          : "Confirm what's on the document"
      }
    >
      {extractionStatus === "processing" ? (
        <Card tone="accent">
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Body strong>Reading your document…</Body>
          </View>
          <Muted>This can take up to a minute.</Muted>
          {pollElapsedMs >= POLL_TIMEOUT_MS ? (
            <Button label="Check again" tone="secondary" onPress={checkAgain} />
          ) : null}
        </Card>
      ) : lowConfidence ? (
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
        <Field
          label={recordType === "discharge_summary" ? "Discharge date" : "Date on the document"}
          value={recordDate}
          onChangeText={setRecordDate}
          placeholder="YYYY-MM-DD"
        />
        {recordType === "discharge_summary" ? (
          <Field
            label="Admission date"
            value={admissionDate}
            onChangeText={setAdmissionDate}
            placeholder="YYYY-MM-DD"
          />
        ) : null}
        <Field label="Hospital / clinic" value={sourceFacility} onChangeText={setSourceFacility} placeholder="e.g. Apollo Clinic, Koramangala" />
        <Field label="Doctor's name" value={sourceDoctorName} onChangeText={setSourceDoctorName} placeholder="Optional if hospital/clinic is filled in" />
        <Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline placeholder="What the document says was diagnosed" />
        <Field
          label="Diagnosis code"
          value={diagnosisCode}
          onChangeText={setDiagnosisCode}
          placeholder="e.g. ICD-10 (optional)"
        />
      </Card>

      {recordType === "prescription" || recordType === "discharge_summary" ? (
        <Card>
          <SectionHeader title="Vitals" />
          <Muted>Optional — leave blank if not recorded.</Muted>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="BP systolic"
                value={vitals.bpSystolic}
                onChangeText={(v) => setVitals((s) => ({ ...s, bpSystolic: v }))}
                keyboardType="number-pad"
                placeholder="120"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="BP diastolic"
                value={vitals.bpDiastolic}
                onChangeText={(v) => setVitals((s) => ({ ...s, bpDiastolic: v }))}
                keyboardType="number-pad"
                placeholder="80"
              />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Pulse (bpm)"
                value={vitals.pulseRate}
                onChangeText={(v) => setVitals((s) => ({ ...s, pulseRate: v }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Temperature (°C)"
                value={vitals.temperatureCelsius}
                onChangeText={(v) => setVitals((s) => ({ ...s, temperatureCelsius: v }))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="SpO2 (%)"
                value={vitals.spo2}
                onChangeText={(v) => setVitals((s) => ({ ...s, spo2: v }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Weight (kg)"
                value={vitals.weightKg}
                onChangeText={(v) => setVitals((s) => ({ ...s, weightKg: v }))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Field
            label="Height (cm)"
            value={vitals.heightCm}
            onChangeText={(v) => setVitals((s) => ({ ...s, heightCm: v }))}
            keyboardType="decimal-pad"
          />
        </Card>
      ) : null}

      {recordType === "lab" ? (
        <Card>
          <SectionHeader title="Lab results" />
          {labResults.map((result, index) => (
            <View key={result.key} style={styles.medicine}>
              <View style={styles.between}>
                <Body strong>Test {index + 1}</Body>
                {labResults.length > 1 ? (
                  <Pressable onPress={() => setLabResults((c) => c.filter((r) => r.key !== result.key))}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <Field
                label="Test name"
                value={result.testName}
                onChangeText={(v) => updateLabResult(result.key, { testName: v })}
                placeholder="e.g. Hemoglobin"
              />
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Value"
                    value={result.value}
                    onChangeText={(v) => updateLabResult(result.key, { value: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Unit"
                    value={result.unit}
                    onChangeText={(v) => updateLabResult(result.key, { unit: v })}
                    placeholder="g/dL"
                  />
                </View>
              </View>
              <Field
                label="Reference range"
                value={result.referenceRange}
                onChangeText={(v) => updateLabResult(result.key, { referenceRange: v })}
                placeholder="13.0–17.0"
              />
              <ChoiceChips
                options={FLAG_OPTIONS}
                value={result.flag}
                onChange={(v) =>
                  updateLabResult(result.key, {
                    flag: result.flag === v ? null : (v as VaultLabResultFlag),
                  })
                }
              />
            </View>
          ))}
          <Button
            label="Add another test"
            tone="secondary"
            onPress={() => setLabResults((c) => [...c, blankLabResult()])}
          />
        </Card>
      ) : null}

      {recordType === "vaccination" ? (
        <Card>
          <SectionHeader title="Vaccine details" />
          <Field
            label="Vaccine name"
            value={vaccineDetails.vaccineName}
            onChangeText={(v) => setVaccineDetails((s) => ({ ...s, vaccineName: v }))}
          />
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Dose number"
                value={vaccineDetails.doseNumber}
                onChangeText={(v) => setVaccineDetails((s) => ({ ...s, doseNumber: v }))}
                placeholder="2 of 2"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Batch / lot number"
                value={vaccineDetails.batchNumber}
                onChangeText={(v) => setVaccineDetails((s) => ({ ...s, batchNumber: v }))}
              />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Route"
                value={vaccineDetails.route}
                onChangeText={(v) => setVaccineDetails((s) => ({ ...s, route: v }))}
                placeholder="Intramuscular"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Site"
                value={vaccineDetails.site}
                onChangeText={(v) => setVaccineDetails((s) => ({ ...s, site: v }))}
                placeholder="Left arm"
              />
            </View>
          </View>
          <Field
            label="Next dose due"
            value={vaccineDetails.nextDueDate}
            onChangeText={(v) => setVaccineDetails((s) => ({ ...s, nextDueDate: v }))}
            placeholder="YYYY-MM-DD"
          />
        </Card>
      ) : null}

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

      {["lab", "scan", "discharge_summary", "other"].includes(recordType) ? (
        <Card>
          <Field
            label={recordType === "discharge_summary" ? "Course in hospital" : "Findings"}
            value={findings}
            onChangeText={setFindings}
            multiline
            placeholder="What the document reports"
          />
        </Card>
      ) : null}

      <Card>
        <Field label="Doctor's advice" value={advice} onChangeText={setAdvice} multiline placeholder="Optional" />
      </Card>

      {(serverErrors.length > 0 ? serverErrors : validationErrors).length > 0 ? (
        <Card tone="accent">
          {(serverErrors.length > 0 ? serverErrors : validationErrors).map((e) => (
            <Muted key={e}>• {e}</Muted>
          ))}
        </Card>
      ) : null}

      <Button
        label={wasAlreadyConfirmed ? "Save changes" : "Save to vault"}
        loading={save.isPending}
        disabled={validationErrors.length > 0}
        onPress={() => save.mutate()}
      />
      {wasAlreadyConfirmed ? (
        <Button label="Cancel" tone="secondary" onPress={() => setMode("view")} />
      ) : null}
      <Button
        label={wasAlreadyConfirmed ? "Delete this record" : "Discard"}
        tone="danger-outline"
        onPress={confirmDiscard}
      />
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
  processingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewMedicine: { gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  historyToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyList: { marginTop: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  historyEntry: { gap: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 12 },
  labRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 10.5, textTransform: "capitalize" },
});
