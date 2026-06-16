export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  mode: "video" | "async";
  intakeNote: string | null;
  visitReason: string | null;
  holdExpiresAt: string | null;
  triageFlaggedAt: string | null;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amountInPaise: number;
  currency: string;
  status: string;
  orderId: string | null;
  paymentId: string | null;
}

export interface Report {
  id: string;
  filename: string;
  mimeType: string;
  createdAt?: string;
}

export interface PatientAppointmentRow {
  appointment: Appointment;
  payment: Payment | null;
  report: Report | null;
}

export interface PatientIdentity {
  id: string;
  name: string;
  email: string;
}

export interface DoctorAppointmentRow {
  appointment: Appointment;
  patient: PatientIdentity;
  prescriptionStatus: "draft" | "issued" | null;
  prescriptionIssuedAt: string | null;
}

export interface Medicine {
  id?: string;
  name: string;
  strength: string | null;
  route?: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
  durationDays: number | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  diagnosis: string | null;
  advice: string | null;
  status: "draft" | "issued";
  validUntil: string | null;
  issuedAt: string | null;
  medicines: Medicine[];
}

export interface PrescriptionRow {
  prescription: Omit<Prescription, "medicines">;
  appointment: Appointment;
  medicines: Medicine[];
}

export interface PatientProfile {
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  currentMedications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface DoctorTrust {
  photoUrl: string | null;
  qualifications: string | null;
  registrationNo: string | null;
  yearsExperience: number | null;
  languages: string | null;
}

export interface DoctorProfile extends DoctorTrust {
  id: string;
  specialty: string | null;
  bio: string | null;
  feeInPaise: number;
  slotMinutes: number;
  timezone: string;
}

export interface ConsultNote {
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
}

export interface PatientHomeData {
  appointments: PatientAppointmentRow[];
  doctor:
    | ({
        name: string;
        specialty: string | null;
        bio: string | null;
        feeInPaise: number;
        slotMinutes: number;
      } & DoctorTrust)
    | null;
  timezone: string;
  profileCompleteness: number;
  recentPrescriptions: PrescriptionRow[];
  prescriptionCount: number;
  activeMedications: ActiveMedication[];
  followUp: { id: string; dueAt: string } | null;
}

export interface ActiveMedication {
  name: string;
  strength: string | null;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  foodRelation: string | null;
}

export interface DoctorHomeData {
  appointments: DoctorAppointmentRow[];
  profile: DoctorProfile;
  revenueInPaise: number;
  earnings: { today: number; week: number; month: number; total: number };
  paymentStats: {
    paidCount: number;
    pendingCount: number;
    failedCount: number;
    refundedCount: number;
    paidAmountInPaise: number;
    pendingAmountInPaise: number;
    refundedAmountInPaise: number;
  };
  hasAvailability: boolean;
  awaitingPrescription: number;
  pendingFollowUps: number;
  pendingRefills: number;
}

export interface AvailabilityRule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityOverride {
  id: string;
  date: string;
  kind: "blocked" | "extra";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}
