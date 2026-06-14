import { router } from "expo-router";
import { BackHeader, Body, Card, Muted, Screen, SectionHeader } from "@/components/ui";

export default function Privacy() {
  return (
    <Screen>
      <BackHeader title="Privacy" onBack={() => router.back()} />
      <Card tone="accent">
        <Body strong>Health information is sensitive</Body>
        <Muted>
          MediFlow limits medical information to the authenticated patient, their
          appointment doctor, and authorized service operations.
        </Muted>
      </Card>
      <SectionHeader title="Data used" />
      <Muted>
        The service processes account details, booking intake, optional reports,
        consultation notes, prescriptions, payment references, and technical logs
        needed to operate and secure the clinic.
      </Muted>
      <SectionHeader title="Device privacy" />
      <Muted>
        Notification text should remain generic. Do not use shared devices for doctor
        access, and sign out when account access may be exposed.
      </Muted>
      <SectionHeader title="Requests" />
      <Muted>
        Access, correction, deletion, and retention requests require identity
        verification and may be subject to medical-record obligations.
      </Muted>
    </Screen>
  );
}
