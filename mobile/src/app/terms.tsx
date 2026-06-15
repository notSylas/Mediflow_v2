import { router } from "expo-router";
import { BackHeader, Body, Card, Muted, Screen, SectionHeader } from "@/components/ui";

export default function Terms() {
  return (
    <Screen>
      <BackHeader title="Terms of service" onBack={() => router.back()} />
      <Card>
        <Body strong>MediFlow telemedicine</Body>
        <Muted>
          MediFlow supports scheduled remote consultations. It is not an emergency
          service and does not replace immediate in-person care when urgent symptoms
          are present.
        </Muted>
      </Card>
      <SectionHeader title="Appointments and payments" />
      <Muted>
        Appointment availability is live and a booking is confirmed only after the
        server verifies payment. Cancellation, rescheduling, and refund eligibility
        follow the clinic policy shown during booking.
      </Muted>
      <SectionHeader title="Medical decisions" />
      <Muted>
        The treating doctor remains responsible for clinical advice. Patients must
        provide accurate information and seek emergency care when appropriate.
      </Muted>
      <SectionHeader title="Messaging" />
      <Muted>
        Messaging with your doctor unlocks after a paid consultation and is for
        non-urgent follow-up only. It is not monitored around the clock — never use it
        for emergencies.
      </Muted>
      <SectionHeader title="Governing law and contact" />
      <Muted>
        These terms are governed by the laws of India, subject to the courts at [your
        city]. Questions? Email support@mediflow.app.
      </Muted>
    </Screen>
  );
}
