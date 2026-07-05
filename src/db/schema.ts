import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  integer,
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
  yearsExperience: integer("years_experience"),
  languages: text("languages"), // comma-separated, e.g. "English, Hindi"
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
// registration). Stored inline as bytea for now (same as medical_reports);
// swap to object storage in Phase 2.
export const verificationDocKind = pgEnum("verification_doc_kind", [
  "identity",
  "degree",
  "registration",
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
