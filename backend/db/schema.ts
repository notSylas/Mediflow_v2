import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ---------------------------------------------------------------------------
// Auth tables (shape required by Better Auth's drizzle adapter)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("patient"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export const appointmentStatus = pgEnum("appointment_status", [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

// video = scheduled paid video consult; async = doctor-initiated / refill
// follow-up handled over text (no live call).
export const appointmentMode = pgEnum("appointment_mode", ["video", "async"]);

export const paymentStatus = pgEnum("payment_status", [
  "created",
  "paid",
  "failed",
  "refunded",
]);

export const overrideKind = pgEnum("override_kind", ["blocked", "extra"]);

// System of medicine the doctor practises. Gates the marketplace search filter
// and, later, prescription authority (AYUSH vs allopathy boundaries).
export const systemOfMedicine = pgEnum("system_of_medicine", [
  "allopathy",
  "homeopathy",
  "ayurveda",
]);

// Marketplace verification lifecycle. A profile is only publicly listed once
// it reaches "verified" (and isListed is true).
export const doctorVerificationStatus = pgEnum("doctor_verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);

export const doctorProfiles = pgTable("doctor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  bio: text("bio"),
  // Trust / identity details shown to patients.
  photoUrl: text("photo_url"),
  qualifications: text("qualifications"), // e.g. "MBBS, MD (Internal Medicine)"
  registrationNo: text("registration_no"), // medical council registration
  // RMP verification fields (see doctor_verification_documents below).
  // Cross-checked manually by an admin against NMC's public Indian Medical
  // Register — no automated lookup, see backend/people/doctor-verification.ts.
  stateMedicalCouncil: text("state_medical_council"),
  yearOfRegistration: integer("year_of_registration"),
  // ABDM Healthcare Professionals Registry ID, if the doctor has one — a
  // stronger complementary credential (Aadhaar-OTP-verified, covers all
  // systems of medicine unlike NMC). String only, no API check.
  hprId: text("hpr_id"),
  yearsExperience: integer("years_experience"),
  languages: text("languages"), // comma-separated, e.g. "English, Hindi"
  // Signature image shown on issued prescriptions (backend/patient/
  // PrescriptionDocument.tsx). One per doctor — same cardinality as
  // photoUrl above, so it's a column here rather than a separate bytea
  // table like medical_reports (which is genuinely many-per-patient).
  // Uploading a new one replaces the old, there's no history kept.
  signatureMimeType: text("signature_mime_type"),
  signatureData: bytea("signature_data"),
  // --- Marketplace fields (Phase 1) ---
  // System of medicine — drives the search filter and (later) prescription scope.
  systemOfMedicine: systemOfMedicine("system_of_medicine").notNull().default("allopathy"),
  hospital: text("hospital"), // for search-by-hospital + profile display
  city: text("city"),
  // Verification (marketplace trust). Discovery only lists profiles that are
  // BOTH verified AND isListed — enforced in the query, not just the UI.
  verificationStatus: doctorVerificationStatus("verification_status")
    .notNull()
    .default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedByUserId: text("verified_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  verificationNotes: text("verification_notes"),
  isListed: boolean("is_listed").notNull().default(false),
  // Denormalized rating aggregate (avg = ratingSum / ratingCount at render);
  // updated when a review is published.
  ratingCount: integer("rating_count").notNull().default(0),
  ratingSum: integer("rating_sum").notNull().default(0),
  // Non-authoritative discovery-sort hint (eng review ARCH 4). Real bookable
  // slots are still computed at query time on the profile/booking page.
  nextAvailableAt: timestamp("next_available_at", { withTimezone: true }),
  feeInPaise: integer("fee_in_paise").notNull(),
  // Monthly price of the MediFlow Care subscription, set by the doctor.
  carePlanPriceInPaise: integer("care_plan_price_in_paise").notNull().default(49900),
  slotMinutes: integer("slot_minutes").notNull().default(20),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Recurring weekly template. weekday: 0 = Sunday … 6 = Saturday.
export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Date-specific exceptions: block a holiday, or add a one-off extra session.
export const availabilityOverrides = pgTable("availability_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  kind: overrideKind("kind").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  reason: text("reason"),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("pending_payment"),
    mode: appointmentMode("mode").notNull().default("video"),
    intakeNote: text("intake_note"),
    // Structured intake (kept alongside intakeNote for display compatibility).
    visitReason: text("visit_reason"),
    // Auditable telemedicine consent captured at booking. Version + source +
    // timestamp are recorded server-side so the exact terms accepted are known.
    consentVersion: text("consent_version"),
    consentedAt: timestamp("consented_at", { withTimezone: true }),
    consentSource: text("consent_source"), // web | ios | android
    // Set when the server's deterministic red-flag check matched at booking.
    // Not a diagnosis — an audit signal that an emergency warning was warranted.
    triageFlaggedAt: timestamp("triage_flagged_at", { withTimezone: true }),
    videoRoom: text("video_room"),
    // pending_payment rows hold the slot only until this expires; the slot
    // query and booking flow treat expired holds as free.
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    // Set once the pre-consult reminder email has gone out, so the cron job
    // never double-sends.
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The database, not application code, is what prevents double-booking.
    uniqueIndex("uq_appointments_doctor_slot")
      .on(t.doctorId, t.startsAt)
      .where(sql`${t.status} <> 'cancelled'`),
  ],
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("razorpay"),
  orderId: text("order_id"),
  paymentId: text("payment_id"),
  amountInPaise: integer("amount_in_paise").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: paymentStatus("status").notNull().default("created"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One medical profile per patient. Surfaced to the doctor before/at every
// consult so they're never working blind. All fields optional — the patient
// fills what they can, nudged on their home screen.
export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  currentMedications: text("current_medications"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// SOAP-structured consult note, one per appointment. The section split matches
// v1's encounter page and defines the output format for the planned AI scribe.
export const consultNotes = pgTable("consult_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prescriptionStatus = pgEnum("prescription_status", [
  "draft",
  "issued",
]);

// One prescription per appointment. A prescription is editable while draft and
// locked once issued — corrections after issue require a new appointment's
// prescription, which keeps the issued record audit-safe.
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id),
  diagnosis: text("diagnosis"),
  advice: text("advice"),
  status: prescriptionStatus("status").notNull().default("draft"),
  validUntil: date("valid_until"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medicineTimings = ["morning", "afternoon", "evening", "night"] as const;

export const prescriptionMedicines = pgTable("prescription_medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  strength: text("strength"),
  route: text("route"),
  morning: boolean("morning").notNull().default(false),
  afternoon: boolean("afternoon").notNull().default(false),
  evening: boolean("evening").notNull().default(false),
  night: boolean("night").notNull().default(false),
  foodRelation: text("food_relation"),
  durationDays: integer("duration_days"),
  instructions: text("instructions"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// A patient-uploaded file (lab report, prescription scan, etc.) attached at
// booking. Stored inline as bytea — file sizes are small (pdf/jpg/png, capped
// in src/lib/reports.ts) and a single-doctor app doesn't need object storage.
export const medicalReports = pgTable("medical_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Messaging — one conversation per patient↔doctor pair. Chat is gated to
// patients who have a booking (enforced in the API). Messages are medical
// data: access-controlled, never logged.
// ---------------------------------------------------------------------------

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    // Unread counts per side, kept denormalized so list views are cheap.
    patientUnread: integer("patient_unread").notNull().default(0),
    doctorUnread: integer("doctor_unread").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_conversation_pair").on(t.patientId, t.doctorId)]
);

export const messageSenderRole = pgEnum("message_sender_role", [
  "patient",
  "doctor",
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  senderRole: messageSenderRole("sender_role").notNull(),
  body: text("body"),
  // Optional inline attachment (image/pdf) stored like medical reports.
  attachmentId: uuid("attachment_id").references(() => chatAttachments.id, {
    onDelete: "set null",
  }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Files sent inside a chat. Stored inline as bytea (small images/pdfs), same
// approach as medical_reports; swap to object storage before real scale.
export const chatAttachments = pgTable("chat_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The conversation this file was uploaded into. An attachment can only be
  // sent in this conversation, by its uploader — enforced at message send.
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "cascade",
  }),
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Doctor-recommended follow-up visits. v1 is doctor-created only (no auto-rules).
export const followUpStatus = pgEnum("follow_up_status", [
  "pending",
  "booked",
  "dismissed",
]);

export const followUps = pgTable("follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  sourceAppointmentId: uuid("source_appointment_id").references(
    () => appointments.id,
    { onDelete: "set null" }
  ),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  status: followUpStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Patient-initiated refill requests on an issued prescription. The doctor
// fulfils by starting an async consult and prescribing, or declines.
export const refillRequestStatus = pgEnum("refill_request_status", [
  "pending",
  "fulfilled",
  "declined",
]);

export const refillRequests = pgTable("refill_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  status: refillRequestStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// MediFlow Care — subscription that unlocks ongoing-care features (messaging
// without a prior booking, a monthly async follow-up credit, reminders) between
// paid video consults. v1 billing is a doctor/admin toggle — no Razorpay
// recurring billing yet; the currentPeriod* columns are shaped so a real
// subscription webhook can populate them later without a migration.
// One row per patient↔doctor pair, mirroring the conversations table so
// multi-doctor stays an insert, not a migration.
// ---------------------------------------------------------------------------

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "inactive",
  "cancelled",
  "manual_trial",
]);

export const careSubscriptions = pgTable(
  "care_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    status: subscriptionStatus("status").notNull().default("inactive"),
    // Current care/billing period. In v1 these are set by the admin toggle;
    // later they come from the Razorpay subscription webhook.
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // Monthly follow-up credit accounting, reset each period.
    followUpCreditsUsed: integer("follow_up_credits_used").notNull().default(0),
    // Patient-controlled preferences (also surfaced on the profile screen).
    digestEnabled: boolean("digest_enabled").notNull().default(true),
    medicineRemindersEnabled: boolean("medicine_reminders_enabled")
      .notNull()
      .default(true),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_care_subscription_pair").on(t.patientId, t.doctorId)]
);

// Patient-initiated monthly async check-in, distinct from doctor-recommended
// follow_ups (which are doctor-created). One allowed per active period; the
// doctor services it by starting an async consult.
export const careFollowUpRequests = pgTable("care_followup_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => careSubscriptions.id, { onDelete: "cascade" }),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  // The async appointment created to service this request, once the doctor acts.
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  note: text("note"),
  status: followUpStatus("status").notNull().default("pending"),
  // The subscription period this request was made in — used to enforce the
  // one-per-period rule even after a period roll.
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Medicine formulary — server-backed source for the prescription autocomplete.
// Editable without an app release (via DB / re-seed); the mobile app keeps a
// bundled copy as an offline fallback.
// ---------------------------------------------------------------------------
export const medicines = pgTable("medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  strengths: text("strengths").array().notNull().default(sql`'{}'::text[]`),
  route: text("route").notNull().default("oral"),
  category: text("category"),
  // Real-catalog fields (see scripts/import-medicines-dataset.ts) — null for
  // any row that only ever came from the old hand-picked seed list.
  manufacturer: text("manufacturer"),
  composition: text("composition"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Multi-doctor marketplace (Phase 1) — specialty taxonomy, per-doctor
// specialties, patient reviews, and doctor verification documents.
// ---------------------------------------------------------------------------

// Practo-style two-level grouping. general_care = GP, women's health, skin,
// child, dental, eye, ENT, mental health; advanced_care = bones/joints,
// brain/nerve, urinary, lungs, heart, stomach, diabetes, cancer, etc.
export const specialtyGroup = pgEnum("specialty_group", [
  "general_care",
  "advanced_care",
]);

// Specialty taxonomy as DATA (not an enum) so it grows without a migration.
export const specialties = pgTable("specialties", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // e.g. "cardiologist"
  name: text("name").notNull(), // e.g. "Heart specialist"
  group: specialtyGroup("group").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A doctor practises one or more specialties. doctor_profiles.specialty stays
// the primary display label; this table drives structured search + triage
// matching.
export const doctorSpecialties = pgTable(
  "doctor_specialties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    specialtyId: uuid("specialty_id")
      .notNull()
      .references(() => specialties.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("uq_doctor_specialty").on(t.doctorId, t.specialtyId)]
);

export const reviewStatus = pgEnum("review_status", [
  "published",
  "flagged",
  "removed",
]);

// One patient review per completed appointment (rating 1-5). The doctor's
// ratingCount/ratingSum aggregate is updated when a review is published.
export const doctorReviews = pgTable(
  "doctor_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // One review per appointment — enforced by the unique index below.
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1..5, validated in the API
    body: text("body"),
    status: reviewStatus("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_review_per_appointment").on(t.appointmentId)]
);

// Documents a doctor submits for RMP verification (identity, degree,
// registration, hpr). Stored inline as bytea for now (same as
// medical_reports); swap to object storage in Phase 2. "degree" is reserved
// for a future degree-certificate upload — the current verification flow
// only requires identity + registration, hpr is optional.
export const verificationDocKind = pgEnum("verification_doc_kind", [
  "identity",
  "degree",
  "registration",
  "hpr",
]);

export const doctorVerificationDocuments = pgTable("doctor_verification_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  kind: verificationDocKind("kind").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Vault Share — a patient shares a scoped, read-only slice of their MediFlow
// record (prescriptions + consult notes) with any doctor, anywhere, via a
// short code. No receiving-side account. See docs/designs/vault-share-trd.md.
// Flow A only (Flow B / doctor-requested grants are deferred — see TRD §4.2 —
// so there is no `origin` column here).
//
// No time-based expiry (removed 2026-08-23, along with the "expired" status
// below and the expires_at column) — a share stays valid indefinitely until
// the patient either revokes it or creates a new one, which auto-revokes any
// currently-active grant (see createShare() in vault-share.ts: "at most one
// active share per patient, replaced on regenerate").
// ---------------------------------------------------------------------------

// No "pending_otp_confirmation" state — a grant is created already-active,
// see createShare() in vault-share.ts. Historical: this app briefly had an
// OTP-confirm step between "create" and "active", removed 2026-08-23 in
// favor of a longer, higher-entropy share code (see vault-share-policy.ts).
export const vaultShareGrantStatus = pgEnum("vault_share_grant_status", [
  "active",
  "revoked",
]);

export const vaultShareAccessOutcome = pgEnum("vault_share_access_outcome", [
  "viewed",
  "invalid_code",
  "expired_attempt",
]);

export const vaultShareGrants = pgTable(
  "vault_share_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: vaultShareGrantStatus("status").notNull().default("active"),
    // Bundle scope, resolved to concrete timestamps at creation time (not
    // re-interpreted later) — null scopeFrom means "everything up to scopeTo".
    scopeFrom: timestamp("scope_from", { withTimezone: true }),
    scopeTo: timestamp("scope_to", { withTimezone: true }).notNull(),
    // The human-facing share code — only its hash is ever stored. At 13
    // Crockford-Base32 characters (~65 bits) the code space is astronomically
    // large, looked up by exact hash match — this is now the *sole* defense
    // against guessing (no OTP-confirm step anymore), not one layer of one.
    shareCodeHash: text("share_code_hash"),
    // Envelope encryption (TRD §5): wrappedDek is the KMS-wrapped data key,
    // bundleCiphertext is the AES-256-GCM output — both set at creation now,
    // never null (nothing defers this to a later confirm step anymore).
    wrappedDek: bytea("wrapped_dek"),
    bundleCiphertext: bytea("bundle_ciphertext"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("uq_vault_share_code_hash").on(t.shareCodeHash)]
);

// Append-only. Powers the patient-visible "viewed by a doctor on <date>"
// audit line and the DPDP access trail — never stores raw IP, only a hash.
export const vaultShareAccessLog = pgTable("vault_share_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  grantId: uuid("grant_id")
    .notNull()
    .references(() => vaultShareGrants.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  outcome: vaultShareAccessOutcome("outcome").notNull(),
  viewerIpHash: text("viewer_ip_hash"),
  viewerUserAgentCoarse: text("viewer_user_agent_coarse"),
});

// One row per patient, recorded once: standing, code-free read access for
// *this* MediFlow doctor (not Flow A's any-doctor code share, which is
// untouched). Shown only once the patient has a real relationship with the
// doctor (see listDoctorPatients) — permanent once given, no opt-out UI yet.
export const vaultDoctorConsents = pgTable("vault_doctor_consents", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  consentVersion: text("consent_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  consentSource: text("consent_source").notNull(), // web | ios | android
});

// ---------------------------------------------------------------------------
// Vault Tier 2 — a patient uploads a record from *any* doctor, not just
// MediFlow's own (a photo/PDF of an old prescription, lab report, etc.).
// Extraction ("read the document into structured fields") is a swappable
// stub for now — src/lib/vault/vault-extraction.ts — so this table and
// everything around it works today with manual entry, and gains real
// extraction later as a pure implementation swap, no schema change.
// Kept separate from `medical_reports`: that table is booking-intake
// uploads tied to an appointment; this is standalone, vault-native, and
// carries normalized fields ("MediFlow format") for uniform timeline/share
// display alongside real prescriptions.
// ---------------------------------------------------------------------------

export const vaultRecordType = pgEnum("vault_record_type", [
  "prescription",
  "lab",
  "scan",
  "discharge_summary",
  "vaccination",
  "other",
]);

export const vaultRecordConfidence = pgEnum("vault_record_confidence", [
  "high",
  "medium",
  "low",
]);

// Tracks whether a real Prescription Analyzer pass is upgrading this record's
// fields in the background: "stub" (the permanent low-confidence extractor,
// or the analyzer isn't configured), "processing" (a linked
// prescription_analyses job is running), "synced" (that job's result has been
// written into the fields below), "failed" (the job errored — falls back to
// the same manual-entry path as "stub").
export const vaultRecordExtractionStatus = pgEnum("vault_record_extraction_status", [
  "stub",
  "processing",
  "synced",
  "failed",
]);

export const vaultRecords = pgTable("vault_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  recordType: vaultRecordType("record_type").notNull().default("prescription"),
  // Nullable: unknown at upload time until extraction or the patient fills
  // it in on the review screen — never guessed, never defaulted to "today".
  recordDate: date("record_date"),
  // Deliberately free text, not a foreign key to any hospital/doctor entity
  // — this table exists specifically to be generic, any source, no chain.
  sourceFacility: text("source_facility"),
  sourceDoctorName: text("source_doctor_name"),
  diagnosis: text("diagnosis"),
  // Optional coded diagnosis (e.g. ICD-10) — free text, not validated against
  // a terminology server. Mirrors FHIR Condition.code.coding; diagnosis above
  // is Condition.code.text. Used by prescription/discharge_summary.
  diagnosisCode: text("diagnosis_code"),
  advice: text("advice"),
  // Array of {name, strength, route, morning/afternoon/evening/night,
  // foodRelation, durationDays, instructions} — same shape as
  // prescription_medicines rows ("MediFlow format"), stored as JSON rather
  // than a child table since nothing else needs to relationally query into
  // an individual Tier-2 medicine (no refill/formulary linkage, unlike real
  // prescriptions).
  medicines: jsonb("medicines"),
  // The generic, FHIR/ABDM-aligned fields below are all nullable and
  // type-specific by convention (enforced at the UI/validation layer, not
  // the DB) — see docs/designs/vault-share-trd.md's field-mapping table.
  //
  // Observation (vital-signs category) — prescription, discharge_summary.
  // { bpSystolic, bpDiastolic, pulseRate, temperatureCelsius, spo2, weightKg, heightCm }
  vitals: jsonb("vitals"),
  // Observation[] (laboratory category) — lab only.
  // Array<{ testName, value, unit, referenceRange, flag: "normal"|"high"|"low"|"critical"|null }>
  labResults: jsonb("lab_results"),
  // DiagnosticReport.conclusion / discharge "course in hospital" — narrative,
  // used by lab, scan, discharge_summary, other.
  findings: text("findings"),
  // Encounter.period.start — discharge_summary only. recordDate keeps its
  // existing meaning (discharge date) for that type; this is the companion
  // field, not a rename, so no existing query/row needs to change.
  admissionDate: date("admission_date"),
  // Immunization — vaccination only.
  // { vaccineName, doseNumber, batchNumber, route, site, nextDueDate }
  vaccineDetails: jsonb("vaccine_details"),
  extractionConfidence: vaultRecordConfidence("extraction_confidence"),
  extractionStatus: vaultRecordExtractionStatus("extraction_status").notNull().default("stub"),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  // Nothing here counts toward the vault timeline or a share bundle until
  // the patient has reviewed/corrected the extracted fields and confirmed —
  // medical data never gets auto-trusted from an extraction pass.
  patientConfirmed: boolean("patient_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only edit history for vault_records — every save that actually
// changes a field (including the very first confirm, going from the
// extraction/stub to the patient's confirmed values) gets one row here. This
// is the transparency/liability record: it proves whether a given field is
// as-extracted or patient-corrected, and what it said before, independent of
// what the row shows today. Mirrors vault_share_access_log's append-only
// shape — same reasoning, different event.
export const vaultRecordEdits = pgTable("vault_record_edits", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultRecordId: uuid("vault_record_id")
    .notNull()
    .references(() => vaultRecords.id, { onDelete: "cascade" }),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
  // Names of the top-level fields that changed in this save, e.g.
  // ["recordDate", "medicines"] — not a deep diff, just which fields.
  changedFields: jsonb("changed_fields").notNull(),
  // What those fields held immediately before this save.
  previousValues: jsonb("previous_values").notNull(),
});

// ---------------------------------------------------------------------------
// Prescription Analyzer — a vision-LLM pass over an uploaded prescription that
// returns structured medications/vitals/labs with per-field confidence.
//
// The analysis runs in a separate Python container (prescription-analyzer/) as
// a Cloud Run Job, because it needs PyMuPDF and a vision model. The job reads
// the uploaded bytes from this table and writes its result back here, so the
// file never has to leave Postgres — same approach as medical_reports and
// chat_attachments.
//
// Two 300-DPI vision passes take 20-60s, which is why this is a queued job
// with a polled status rather than a request the browser waits on.
// ---------------------------------------------------------------------------

export const prescriptionAnalysisStatus = pgEnum("prescription_analysis_status", [
  "queued",
  "processing",
  "succeeded",
  "failed",
]);

export const prescriptionAnalyses = pgTable("prescription_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Whoever uploaded it — a patient analysing their own prescription, or the
  // doctor analysing one brought in from elsewhere.
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Set when the analysis was started from a vault record, so the extracted
  // fields can be written back to it.
  vaultRecordId: uuid("vault_record_id").references(() => vaultRecords.id, {
    onDelete: "cascade",
  }),

  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  data: bytea("data").notNull(),

  status: prescriptionAnalysisStatus("status").notNull().default("queued"),
  // The Cloud Run Job execution this row was handed to, e.g.
  // "prescription-analyzer-abc12". Used to poll progress and to spot a job
  // that died without ever writing a result back.
  jobExecution: text("job_execution"),
  attempts: integer("attempts").notNull().default(0),

  // The analyzer's AnalyzedPrescription payload (see
  // prescription-analyzer/prescription_analyzer/schema.py). Stored verbatim so
  // the UI can render new fields without a migration.
  result: jsonb("result"),
  // Convenience copy of result.overall_confidence for sorting/filtering
  // without unpacking the JSON.
  overallConfidence: integer("overall_confidence"),
  error: text("error"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/**
 * Hand-drawn diagrams found on an analysed prescription.
 *
 * A doctor's sketch — a spine, a tooth chart, an injection site — is often the
 * clearest instruction on the page, and a text pass reduces it to nothing. A
 * single-class YOLO detector (prescription-analyzer/models/best.pt) crops them
 * during the job and stores the crop here, beside the transcription.
 *
 * Bytes live in Postgres like every other uploaded file in this schema
 * (medical_reports, chat_attachments) rather than object storage.
 */
export const prescriptionDiagrams = pgTable("prescription_diagrams", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => prescriptionAnalyses.id, { onDelete: "cascade" }),
  // Zero-based page of the rendered document the crop came from.
  pageIndex: integer("page_index").notNull(),
  // Detector score, 0-1, stored ×100 so it sorts without float comparison.
  confidence: integer("confidence").notNull(),
  // Pixel box on the rendered page, kept so a reviewer can find the original.
  x1: integer("x1").notNull(),
  y1: integer("y1").notNull(),
  x2: integer("x2").notNull(),
  y2: integer("y2").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Whole rendered pages of an analysed prescription (300 DPI PNG), one row per
 * page. The analyzer already renders these for its own vision pass — this
 * just keeps a copy instead of throwing them away, so a patient or a doctor
 * viewing a Vault Share record can see the actual source instead of only the
 * extracted fields.
 */
export const prescriptionPageSnapshots = pgTable("prescription_page_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => prescriptionAnalyses.id, { onDelete: "cascade" }),
  pageIndex: integer("page_index").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
