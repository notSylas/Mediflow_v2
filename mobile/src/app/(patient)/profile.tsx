import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Body,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Field,
  Loading,
  Muted,
  PageHeader,
  Screen,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
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

export default function MedicalProfile() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["patient", "profile"],
    queryFn: () => apiFetch<PatientProfile | null>("/api/patient/profile"),
  });
  const [edits, setEdits] = useState<Partial<PatientProfile>>({});
  const [saved, setSaved] = useState(false);
  const form: PatientProfile = { ...EMPTY, ...(query.data ?? {}), ...edits };

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
    },
  });

  if (query.isLoading) return <Loading />;
  const update = (key: keyof PatientProfile, value: string | null) => {
    setSaved(false);
    setEdits((current) => ({ ...current, [key]: value || null }));
  };

  return (
    <Screen>
      <PageHeader
        title="Medical profile"
        subtitle="Private to you and your doctor. All fields are optional."
      />
      {query.error ? <ErrorState message={query.error.message} /> : null}
      <Card tone="accent">
        <Body strong>Why this matters</Body>
        <Muted>Your doctor reviews this information before each consultation.</Muted>
      </Card>
      <Card>
        <Field
          label="Date of birth"
          value={form.dateOfBirth ?? ""}
          onChangeText={(value) => update("dateOfBirth", value)}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <Body strong>Gender</Body>
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
        <Body strong>Blood group</Body>
        <ChoiceChips
          options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({
            label: value,
            value,
          }))}
          value={form.bloodGroup}
          onChange={(value) => update("bloodGroup", value)}
        />
        <Field
          label="Allergies"
          value={form.allergies ?? ""}
          onChangeText={(value) => update("allergies", value)}
          placeholder="Medicine, food, or other allergies"
          multiline
        />
        <Field
          label="Chronic conditions"
          value={form.chronicConditions ?? ""}
          onChangeText={(value) => update("chronicConditions", value)}
          placeholder="Diabetes, hypertension, asthma…"
          multiline
        />
        <Field
          label="Current medications"
          value={form.currentMedications ?? ""}
          onChangeText={(value) => update("currentMedications", value)}
          placeholder="Name, strength, and frequency"
          multiline
        />
        <Field
          label="Emergency contact name"
          value={form.emergencyContactName ?? ""}
          onChangeText={(value) => update("emergencyContactName", value)}
          placeholder="Full name"
        />
        <Field
          label="Emergency contact phone"
          value={form.emergencyContactPhone ?? ""}
          onChangeText={(value) => update("emergencyContactPhone", value)}
          placeholder="+91…"
          keyboardType="phone-pad"
        />
        {mutation.error ? <ErrorState message={mutation.error.message} /> : null}
        {saved ? <Muted>Your medical profile is saved.</Muted> : null}
        <Button label="Save profile" loading={mutation.isPending} onPress={() => mutation.mutate()} />
      </Card>
    </Screen>
  );
}
