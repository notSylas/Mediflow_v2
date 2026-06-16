import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView } from "@/components/motion";
import { useToast } from "@/components/toast";
import {
  Body,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Field,
  Loading,
  Muted,
  ProgressBar,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { PatientProfile } from "@/lib/types";

const EMPTY: PatientProfile = {
  dateOfBirth: null,
  gender: null,
  bloodGroup: null,
  allergies: null,
  chronicConditions: null,
  currentMedications: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
};

const COMPLETION_FIELDS: Array<keyof PatientProfile> = [
  "dateOfBirth",
  "gender",
  "bloodGroup",
  "allergies",
  "chronicConditions",
  "currentMedications",
  "emergencyContactName",
  "emergencyContactPhone",
];

const FIELD_LABELS: Record<string, string> = {
  dateOfBirth: "date of birth",
  gender: "gender",
  bloodGroup: "blood group",
  allergies: "allergies",
  chronicConditions: "chronic conditions",
  currentMedications: "current medications",
  emergencyContactName: "emergency contact",
  emergencyContactPhone: "emergency contact number",
};

export default function MedicalProfile() {
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["patient", "profile"],
    queryFn: () => apiFetch<PatientProfile | null>("/api/patient/profile"),
  });
  const [edits, setEdits] = useState<Partial<PatientProfile>>({});
  const [saved, setSaved] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const form: PatientProfile = { ...EMPTY, ...(query.data ?? {}), ...edits };
  const dirty = Object.keys(edits).length > 0;
  const completion = Math.round(
    (COMPLETION_FIELDS.filter((key) => Boolean(form[key]?.trim())).length /
      COMPLETION_FIELDS.length) *
      100
  );
  const nextField = COMPLETION_FIELDS.find((key) => !form[key]?.trim());
  const nextStep = nextField ? FIELD_LABELS[nextField] : null;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PatientProfile>("/api/patient/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      }),
    onSuccess: (value) => {
      setSaved(true);
      setEdits({});
      client.setQueryData(["patient", "profile"], value);
      void client.invalidateQueries({ queryKey: ["patient", "home"] });
      toast.success("Medical profile saved");
    },
    onError: () => toast.error("Couldn't save your profile. Please try again."),
  });

  if (query.isLoading) return <Loading />;

  const update = (key: keyof PatientProfile, value: string | null) => {
    setSaved(false);
    setEdits((current) => ({ ...current, [key]: value?.trim() || null }));
  };

  const onDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && value) update("dateOfBirth", toDateOnly(value));
  };

  return (
    <AuroraScreen
      variant="patient"
      compactHeader
      title="Medical profile"
      subtitle="Private health information shared with your doctor"
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerCopy}>
            <Text
              style={[
                styles.footerStatus,
                dirty && styles.unsavedStatus,
                saved && styles.savedStatus,
              ]}
            >
              {mutation.isPending
                ? "Saving securely…"
                : dirty
                  ? "You have unsaved changes"
                  : saved
                    ? "Profile saved"
                    : "Your changes are up to date"}
            </Text>
          </View>
          <Button
            label="Save"
            loading={mutation.isPending}
            disabled={!dirty}
            onPress={() => mutation.mutate()}
          />
        </View>
      }
    >
      {query.error ? <ErrorState message={query.error.message} /> : null}

      <FadeInView index={0}>
        <Card tone="accent">
          <View style={styles.completionRow}>
            <View style={styles.completionIcon}>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Body strong>
                {completion === 100 ? "Profile complete" : "Complete your profile"}
              </Body>
              <Muted>
                {nextStep
                  ? `Next: add your ${nextStep}.`
                  : "Your doctor has everything they need before your visit."}
              </Muted>
            </View>
            <Text style={styles.completionValue}>{completion}%</Text>
          </View>
          <ProgressBar value={completion} />
        </Card>
      </FadeInView>

      <FadeInView index={1}>
        <SectionTitle
          icon="account-outline"
          title="Personal details"
          subtitle="Basic information used during clinical review"
        />
        <Card>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date of birth</Text>
            <Pressable
              accessibilityLabel="Choose date of birth"
              accessibilityRole="button"
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => [styles.dateField, pressed && { opacity: 0.68 }]}
            >
              <Text style={form.dateOfBirth ? styles.dateValue : styles.datePlaceholder}>
                {form.dateOfBirth ? formatDate(parseDateOnly(form.dateOfBirth)) : "Choose date"}
              </Text>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={21}
                color={colors.primary}
              />
            </Pressable>
            {showDatePicker ? (
              <View>
                <DateTimePicker
                  value={parseDateOnly(form.dateOfBirth) ?? defaultBirthDate()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={onDateChange}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowDatePicker(false)}
                    style={styles.dateDone}
                  >
                    <Text style={styles.dateDoneText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>
            <ChoiceChips
              options={[
                { label: "Female", value: "female" },
                { label: "Male", value: "male" },
                { label: "Other", value: "other" },
                { label: "Prefer not to say", value: "prefer_not_to_say" },
              ]}
              value={form.gender}
              onChange={(value) => update("gender", value)}
            />
          </View>

          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Blood group</Text>
            <ChoiceChips
              options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (value) => ({ label: value, value })
              )}
              value={form.bloodGroup}
              onChange={(value) => update("bloodGroup", value)}
            />
          </View>
        </Card>
      </FadeInView>

      <FadeInView index={2}>
        <SectionTitle
          icon="clipboard-pulse-outline"
          title="Clinical history"
          subtitle="Use “None known” when a category does not apply"
        />
        <Card>
          <ChipInput
            label="Allergies"
            recommended
            value={form.allergies}
            placeholder="Add an allergy, e.g. Penicillin"
            onChange={(value) => update("allergies", value)}
          />
          <View style={styles.divider} />
          <ChipInput
            label="Chronic conditions"
            recommended
            value={form.chronicConditions}
            placeholder="Add a condition, e.g. Asthma"
            onChange={(value) => update("chronicConditions", value)}
          />
          <View style={styles.divider} />
          <ChipInput
            label="Current medications"
            value={form.currentMedications}
            placeholder="Add a medicine, e.g. Metformin 500mg"
            onChange={(value) => update("currentMedications", value)}
          />
        </Card>
      </FadeInView>

      <FadeInView index={3}>
        <SectionTitle
          icon="phone-alert-outline"
          title="Emergency contact"
          subtitle="Someone the clinic can contact if necessary"
        />
        <Card>
          <Field
            label="Contact name"
            value={form.emergencyContactName ?? ""}
            onChangeText={(value) => update("emergencyContactName", value)}
            placeholder="Full name"
            autoComplete="name"
          />
          <Field
            label="Phone number"
            value={form.emergencyContactPhone ?? ""}
            onChangeText={(value) => update("emergencyContactPhone", value)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </Card>
      </FadeInView>

      <Card>
        <View style={styles.privacyRow}>
          <MaterialCommunityIcons name="lock-outline" size={19} color={colors.textMuted} />
          <Muted>
            This information is visible only to authenticated clinic participants involved
            in your care.
          </Muted>
        </View>
      </Card>

      {mutation.error ? <ErrorState message={mutation.error.message} /> : null}
    </AuroraScreen>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionHeading}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

/** Tokenized add/remove chip input backed by a comma-separated string. */
function ChipInput({
  label,
  value,
  placeholder,
  recommended,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  recommended?: boolean;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const items =
    value
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    if (!items.some((i) => i.toLowerCase() === text.toLowerCase())) {
      onChange([...items, text].join(", "));
    }
    setDraft("");
  };
  const remove = (item: string) =>
    onChange(items.filter((i) => i !== item).join(", "));

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <View style={styles.labelWithTag}>
          <Text style={styles.label}>{label}</Text>
          <FieldTag recommended={recommended} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange("None known")}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.noneKnown}>None known</Text>
        </Pressable>
      </View>
      {items.length > 0 ? (
        <View style={styles.chipWrap}>
          {items.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
              onPress={() => remove(item)}
              style={({ pressed }) => [styles.inputChip, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.inputChipText}>{item}</Text>
              <MaterialCommunityIcons name="close" size={14} color={colors.primaryDark} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.chipInputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={add}
          returnKeyType="done"
          style={styles.chipTextInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
          onPress={add}
          disabled={!draft.trim()}
          style={({ pressed }) => [
            styles.chipAddBtn,
            !draft.trim() && { opacity: 0.4 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialCommunityIcons name="plus" size={20} color={colors.primaryFg} />
        </Pressable>
      </View>
    </View>
  );
}

function FieldTag({ recommended }: { recommended?: boolean }) {
  return (
    <View style={[styles.fieldTag, recommended && styles.fieldTagRecommended]}>
      <Text style={[styles.fieldTagText, recommended && styles.fieldTagTextRecommended]}>
        {recommended ? "Recommended" : "Optional"}
      </Text>
    </View>
  );
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 30);
  return date;
}

const styles = StyleSheet.create({
  completionRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  completionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  completionValue: { color: colors.primaryDark, fontFamily: fonts.heading, fontSize: 16 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: { color: colors.text, fontFamily: fonts.heading, fontSize: 17 },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
  },
  fieldGroup: { gap: 8 },
  label: { color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 13 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noneKnown: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 12 },
  labelWithTag: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  fieldTagRecommended: { backgroundColor: colors.accent, borderColor: "#c8e9e4" },
  fieldTagText: { color: colors.textMuted, fontFamily: fonts.bodySemibold, fontSize: 9.5 },
  fieldTagTextRecommended: { color: colors.primaryDark },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inputChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: "#c8e9e4",
    paddingLeft: 12,
    paddingRight: 9,
    paddingVertical: 7,
  },
  inputChipText: { color: colors.primaryDark, fontFamily: fonts.bodySemibold, fontSize: 13 },
  chipInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chipTextInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.card,
  },
  chipAddBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dateField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateValue: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  datePlaceholder: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 15 },
  dateDone: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 },
  dateDoneText: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  privacyRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerCopy: { flex: 1 },
  footerStatus: { color: colors.textMuted, fontFamily: fonts.bodySemibold, fontSize: 11 },
  unsavedStatus: { color: colors.warning },
  savedStatus: { color: colors.success },
});
