import { and, asc, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "~backend/db";
import {
  appointments,
  availabilityOverrides,
  availabilityRules,
  doctorProfiles,
  user,
} from "~backend/db/schema";
import { getOrCreateDoctorProfile } from "~backend/people/doctor";
import { requireDoctorSession } from "~backend/auth/api-auth";
import type { ApiHandler } from "./http";

const LOOKAHEAD_MINUTES = 15;

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid time, expected HH:MM");

const createRuleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

const createOverrideSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date, expected YYYY-MM-DD"),
    kind: z.enum(["blocked", "extra"]),
    startTime: timeSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    reason: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      const start = data.startTime ?? null;
      const end = data.endTime ?? null;

      if (data.kind === "extra") {
        return start !== null && end !== null && start < end;
      }

      // "blocked": either a full-day block (no times) or a partial range.
      if (start === null && end === null) return true;
      if (start !== null && end !== null) return start < end;
      return false;
    },
    {
      message:
        "An 'extra' override requires startTime < endTime; a 'blocked' override must omit both times (full day) or provide startTime < endTime",
      path: ["endTime"],
    }
  );

const updateProfileSchema = z.object({
  specialty: z.string().trim().min(1).max(200).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z.string().trim().url().max(500).nullable().optional(),
  qualifications: z.string().trim().max(300).nullable().optional(),
  registrationNo: z.string().trim().max(100).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  languages: z.string().trim().max(200).nullable().optional(),
  feeInPaise: z.number().int().positive().optional(),
  carePlanPriceInPaise: z.number().int().positive().max(10_000_00).optional(),
  slotMinutes: z.number().int().positive().max(240).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});

/** GET /api/doctor/availability/rules */
export const listAvailabilityRules: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.doctorId, profile.id))
    .orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime));

  return Response.json(rules);
};

/** POST /api/doctor/availability/rules */
export const createAvailabilityRule: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const json = await request.json();
  const parsed = createRuleSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);

  const [created] = await db
    .insert(availabilityRules)
    .values({
      doctorId: profile.id,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    })
    .returning();

  return Response.json(created, { status: 201 });
};

/** DELETE /api/doctor/availability/rules/:id */
export const deleteAvailabilityRule: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const [deleted] = await db
    .delete(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, params.id),
        eq(availabilityRules.doctorId, profile.id)
      )
    )
    .returning();

  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
};

/** GET /api/doctor/availability/overrides */
export const listAvailabilityOverrides: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const overrides = await db
    .select()
    .from(availabilityOverrides)
    .where(eq(availabilityOverrides.doctorId, profile.id))
    .orderBy(asc(availabilityOverrides.date));

  return Response.json(overrides);
};

/** POST /api/doctor/availability/overrides */
export const createAvailabilityOverride: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const json = await request.json();
  const parsed = createOverrideSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  const profile = await getOrCreateDoctorProfile(access.id);

  const [created] = await db
    .insert(availabilityOverrides)
    .values({
      doctorId: profile.id,
      date: parsed.data.date,
      kind: parsed.data.kind,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      reason: parsed.data.reason ?? null,
    })
    .returning();

  return Response.json(created, { status: 201 });
};

/** DELETE /api/doctor/availability/overrides/:id */
export const deleteAvailabilityOverride: ApiHandler = async (request, { params }) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);

  const [deleted] = await db
    .delete(availabilityOverrides)
    .where(
      and(
        eq(availabilityOverrides.id, params.id),
        eq(availabilityOverrides.doctorId, profile.id)
      )
    )
    .returning();

  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
};

/**
 * GET /api/doctor/next-consult — the doctor's imminent consult, if any: a
 * confirmed appointment starting within the next 15 minutes (or currently
 * running). Powers the app-wide reminder banner.
 */
export const getNextConsult: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const [profile] = await db
    .select({ id: doctorProfiles.id })
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, access.id));

  if (!profile) return Response.json(null);

  const now = new Date();
  const horizon = new Date(now.getTime() + LOOKAHEAD_MINUTES * 60 * 1000);

  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      patientName: user.name,
      patientEmail: user.email,
    })
    .from(appointments)
    .innerJoin(user, eq(user.id, appointments.patientId))
    .where(
      and(
        eq(appointments.doctorId, profile.id),
        eq(appointments.status, "confirmed"),
        lt(appointments.startsAt, horizon),
        gt(appointments.endsAt, now)
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(1);

  return Response.json(row ?? null);
};

/** GET /api/doctor/profile */
export const readDoctorProfile: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const profile = await getOrCreateDoctorProfile(access.id);
  return Response.json(profile);
};

/** PATCH /api/doctor/profile */
export const updateDoctorProfile: ApiHandler = async (request) => {
  const access = await requireDoctorSession(request.headers);
  if (access instanceof Response) return access;

  const json = await request.json();
  const parsed = updateProfileSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  await getOrCreateDoctorProfile(access.id);

  const [updated] = await db
    .update(doctorProfiles)
    .set(parsed.data)
    .where(eq(doctorProfiles.userId, access.id))
    .returning();

  return Response.json(updated);
};
