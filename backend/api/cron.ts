import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "~backend/db";
import { appointments } from "~backend/db/schema";
import { logger } from "~backend/core/logger";
import { sendAppointmentReminder } from "~backend/notifications/notifications";
import type { ApiHandler } from "./http";

const REMINDER_LEAD_MINUTES = 30;

/**
 * GET /api/cron/reminders — sends pre-consult reminders for confirmed
 * appointments starting within the next 30 minutes that haven't been reminded
 * yet. Meant to be hit every few minutes by a scheduler (Cloud Scheduler /
 * Vercel Cron), pointed at the backend directly. Protected by CRON_SECRET
 * when set.
 */
export const sendDueReminders: ApiHandler = async (request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      request.headers.get("authorization")?.replace("Bearer ", "") ??
      request.headers.get("x-cron-secret");
    if (provided !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60 * 1000);

  const due = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        isNull(appointments.reminderSentAt),
        gt(appointments.startsAt, now),
        lt(appointments.startsAt, horizon)
      )
    );

  let sent = 0;
  for (const { id } of due) {
    await sendAppointmentReminder(id);
    await db
      .update(appointments)
      .set({ reminderSentAt: new Date() })
      .where(eq(appointments.id, id));
    sent++;
  }

  logger.info({ sent }, "reminder cron run");
  return Response.json({ sent });
};
