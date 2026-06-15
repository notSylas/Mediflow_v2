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
} from "@/components/ui";
import { AuroraScreen } from "@/components/aurora-screen";
import { FadeInView } from "@/components/motion";
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
    <AuroraScreen
      variant="patient"
      title="Medical profile"
      subtitle="Private to you and your doctor. All fields optional."
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
    >
      {query.error ? <ErrorState message={query.error.message} /> : null}
      <FadeInView index={0}>
        <Card tone="accent">
          <Body strong>Why this matters</Body>
          <Muted>Your doctor reviews this information before each consultation.</Muted>
        </Card>
      </FadeInView>
      <FadeInView index={1}>
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
      </FadeInView>
    </AuroraScreen>
  );
}
