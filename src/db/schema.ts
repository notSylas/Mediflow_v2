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

export const paymentStatus = pgEnum("payment_status", [
  "created",
  "paid",
  "failed",
  "refunded",
]);

export const overrideKind = pgEnum("override_kind", ["blocked", "extra"]);

export const doctorProfiles = pgTable("doctor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  bio: text("bio"),
  feeInPaise: integer("fee_in_paise").notNull(),
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
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
