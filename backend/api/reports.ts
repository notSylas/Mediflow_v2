import { eq } from "drizzle-orm";
import { db } from "~backend/db";
import { appointments, doctorProfiles, medicalReports } from "~backend/db/schema";
import { requireSession } from "~backend/auth/api-auth";
import { ALLOWED_REPORT_TYPES, MAX_REPORT_SIZE_BYTES } from "~backend/consult/reports";
import { verifyFileContentType } from "~backend/core/file-validation";
import type { ApiHandler } from "./http";

/** POST /api/reports — patient uploads a medical report (multipart). */
export const uploadReport: ApiHandler = async (request) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED_REPORT_TYPES.includes(file.type as (typeof ALLOWED_REPORT_TYPES)[number])) {
    return Response.json(
      { error: "Only PDF, JPG, and PNG files are supported" },
      { status: 400 }
    );
  }

  if (file.size > MAX_REPORT_SIZE_BYTES) {
    return Response.json({ error: "File is too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!(await verifyFileContentType(buffer, ALLOWED_REPORT_TYPES))) {
    return Response.json(
      { error: "File content doesn't match a supported PDF, JPG, or PNG" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(medicalReports)
    .values({
      patientId: access.id,
      filename: file.name,
      mimeType: file.type,
      data: buffer,
    })
    .returning({ id: medicalReports.id, filename: medicalReports.filename });

  return Response.json(created, { status: 201 });
};

/**
 * GET /api/reports/:id — streams the file back to its owner, or to the doctor
 * of the appointment it's attached to. Returns raw bytes, not JSON.
 */
export const downloadReport: ApiHandler = async (request, { params }) => {
  const access = await requireSession(request.headers);
  if (access instanceof Response) return access;

  const [report] = await db
    .select()
    .from(medicalReports)
    .where(eq(medicalReports.id, params.id));

  if (!report) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isPatient = report.patientId === access.id;
  let isAppointmentDoctor = false;

  if (!isPatient && access.role === "doctor" && report.appointmentId) {
    const [ownedAppointment] = await db
      .select({ doctorUserId: doctorProfiles.userId })
      .from(appointments)
      .innerJoin(doctorProfiles, eq(doctorProfiles.id, appointments.doctorId))
      .where(eq(appointments.id, report.appointmentId));

    isAppointmentDoctor = ownedAppointment?.doctorUserId === access.id;
  }

  if (!isPatient && !isAppointmentDoctor) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return new Response(new Uint8Array(report.data), {
    headers: {
      "Content-Type": report.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(report.filename)}"`,
    },
  });
};
