import { BACKEND_ROUTES, type BackendRoute } from "./routes";
import type { ApiHandler } from "./http";
import {
  approveDoctorVerification,
  downloadVerificationDocument,
  getDoctorVerification,
  listPendingVerifications,
  rejectDoctorVerification,
} from "./admin-doctor-verification";
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  rescheduleAppointment,
  startAppointmentPayment,
  updateAppointmentStatus,
  verifyAppointmentPayment,
} from "./appointments";
import {
  getConsultNote,
  issuePrescription,
  saveConsultNote,
  savePrescription,
} from "./consult";
import { sendDueReminders } from "./cron";
import { registerAsDoctor } from "./doctor-signup";
import {
  submitVerification,
  uploadVerificationDocument,
} from "./doctor-verification";
import {
  createAvailabilityOverride,
  createAvailabilityRule,
  deleteAvailabilityOverride,
  deleteAvailabilityRule,
  getNextConsult,
  listAvailabilityOverrides,
  listAvailabilityRules,
  readDoctorProfile,
  updateDoctorProfile,
  uploadDoctorSignature,
} from "./doctor";
import { searchMedicines } from "./medicines";
import {
  readPatientProfile,
  updatePatientProfile,
} from "./patient";
import {
  downloadReport,
  uploadReport,
} from "./reports";
import { getSlots } from "./slots";
import {
  downloadAttachment,
  getMessages,
  listConversations,
  markRead,
  postMessage,
  uploadAttachment,
} from "./v1/conversations";
import {
  getDoctorAppointments,
  getDoctorHome,
  getDoctorSchedule,
  getEncounter,
  getPatient,
  getWorkQueue,
  listPatients,
} from "./v1/doctor";
import {
  actOnCareFollowUp,
  declineRefillRequest,
  fulfillRefillRequest,
  listCareSubscriptions,
  listRefillRequests,
  startAsyncConsult,
  updateCareSubscription,
} from "./v1/doctor-care";
import {
  createFollowUpHandler,
  updateFollowUpStatus,
} from "./v1/follow-ups";
import {
  cancelCare,
  getCare,
  getCareCancellation,
  getPatientAppointment,
  getPatientHome,
  listPrescriptions,
  requestCareFollowUp,
  requestRefill,
  startCare,
  updateCare,
} from "./v1/patient";
import { getRealtimeToken } from "./v1/realtime";
import {
  getPresence,
  mintVideoToken,
} from "./video";
import { razorpayWebhook } from "./webhooks";
import {
  getAnalysis,
  getDiagram,
  getPageSnapshot,
  listAnalysesHandler,
  pushAnalysisToVault,
  uploadAnalysis,
} from "./v1/prescription-analyzer";
import {
  createRecord,
  createShare,
  deleteRecord,
  exportVaultHandler,
  getRecord,
  getVault,
  listSharesHandler,
  previewShareHandler,
  recordDoctorConsent,
  redeemShare,
  revokeShareHandler,
  updateRecord,
} from "./v1/vault";

/**
 * Every endpoint the standalone backend serves, keyed by "METHOD path".
 * The keys must match `routes.json` exactly — see the check below.
 */
const HANDLERS: Record<string, ApiHandler> = {
  "GET /api/admin/doctor-verification": listPendingVerifications,
  "GET /api/admin/doctor-verification/:doctorId": getDoctorVerification,
  "POST /api/admin/doctor-verification/:doctorId/approve": approveDoctorVerification,
  "POST /api/admin/doctor-verification/:doctorId/reject": rejectDoctorVerification,
  "GET /api/admin/verification-documents/:documentId": downloadVerificationDocument,
  "GET /api/appointments": listAppointments,
  "POST /api/appointments": createAppointment,
  "GET /api/appointments/:id": getAppointment,
  "POST /api/appointments/:id/cancel": cancelAppointment,
  "GET /api/appointments/:id/consult-note": getConsultNote,
  "PUT /api/appointments/:id/consult-note": saveConsultNote,
  "POST /api/appointments/:id/payment": startAppointmentPayment,
  "POST /api/appointments/:id/payment/verify": verifyAppointmentPayment,
  "PUT /api/appointments/:id/prescription": savePrescription,
  "POST /api/appointments/:id/prescription/issue": issuePrescription,
  "GET /api/appointments/:id/presence": getPresence,
  "POST /api/appointments/:id/reschedule": rescheduleAppointment,
  "POST /api/appointments/:id/status": updateAppointmentStatus,
  "POST /api/appointments/:id/video-token": mintVideoToken,
  "GET /api/cron/reminders": sendDueReminders,
  "GET /api/doctor/availability/overrides": listAvailabilityOverrides,
  "POST /api/doctor/availability/overrides": createAvailabilityOverride,
  "DELETE /api/doctor/availability/overrides/:id": deleteAvailabilityOverride,
  "GET /api/doctor/availability/rules": listAvailabilityRules,
  "POST /api/doctor/availability/rules": createAvailabilityRule,
  "DELETE /api/doctor/availability/rules/:id": deleteAvailabilityRule,
  "GET /api/doctor/next-consult": getNextConsult,
  "GET /api/doctor/profile": readDoctorProfile,
  "PATCH /api/doctor/profile": updateDoctorProfile,
  "POST /api/doctor/register": registerAsDoctor,
  "POST /api/doctor/signature": uploadDoctorSignature,
  "POST /api/doctor/verification/documents": uploadVerificationDocument,
  "POST /api/doctor/verification/submit": submitVerification,
  "GET /api/medicines": searchMedicines,
  "GET /api/patient/profile": readPatientProfile,
  "PUT /api/patient/profile": updatePatientProfile,
  "POST /api/reports": uploadReport,
  "GET /api/reports/:id": downloadReport,
  "GET /api/slots": getSlots,
  "GET /api/v1/attachments/:id": downloadAttachment,
  "GET /api/v1/conversations": listConversations,
  "POST /api/v1/conversations/:id/attachments": uploadAttachment,
  "GET /api/v1/conversations/:id/messages": getMessages,
  "POST /api/v1/conversations/:id/messages": postMessage,
  "POST /api/v1/conversations/:id/read": markRead,
  "GET /api/v1/doctor/appointments": getDoctorAppointments,
  "POST /api/v1/doctor/async-consult": startAsyncConsult,
  "POST /api/v1/doctor/care-follow-ups/:id": actOnCareFollowUp,
  "GET /api/v1/doctor/care-subscriptions": listCareSubscriptions,
  "POST /api/v1/doctor/care-subscriptions/:patientId": updateCareSubscription,
  "GET /api/v1/doctor/encounters/:id": getEncounter,
  "GET /api/v1/doctor/home": getDoctorHome,
  "GET /api/v1/doctor/patients": listPatients,
  "GET /api/v1/doctor/patients/:id": getPatient,
  "GET /api/v1/doctor/refill-requests": listRefillRequests,
  "POST /api/v1/doctor/refill-requests/:id/decline": declineRefillRequest,
  "POST /api/v1/doctor/refill-requests/:id/fulfill": fulfillRefillRequest,
  "GET /api/v1/doctor/schedule": getDoctorSchedule,
  "GET /api/v1/doctor/work-queue": getWorkQueue,
  "POST /api/v1/follow-ups": createFollowUpHandler,
  "PATCH /api/v1/follow-ups/:id": updateFollowUpStatus,
  "GET /api/v1/patient/appointments/:id": getPatientAppointment,
  "DELETE /api/v1/patient/care": cancelCare,
  "GET /api/v1/patient/care": getCare,
  "PATCH /api/v1/patient/care": updateCare,
  "POST /api/v1/patient/care": startCare,
  "GET /api/v1/patient/care/cancellation": getCareCancellation,
  "POST /api/v1/patient/care/follow-up": requestCareFollowUp,
  "GET /api/v1/patient/home": getPatientHome,
  "GET /api/v1/patient/prescriptions": listPrescriptions,
  "POST /api/v1/patient/refill-requests": requestRefill,
  "GET /api/v1/realtime/token": getRealtimeToken,
  "POST /api/webhooks/razorpay": razorpayWebhook,
  "GET /api/v1/prescription-analyses": listAnalysesHandler,
  "POST /api/v1/prescription-analyses": uploadAnalysis,
  "GET /api/v1/prescription-analyses/:id": getAnalysis,
  "POST /api/v1/prescription-analyses/:id/push-to-vault": pushAnalysisToVault,
  "GET /api/v1/prescription-diagrams/:id": getDiagram,
  "GET /api/v1/prescription-page-snapshots/:id": getPageSnapshot,
  "GET /api/v1/patient/vault": getVault,
  "POST /api/v1/patient/vault/doctor-consent": recordDoctorConsent,
  "POST /api/v1/patient/vault/records": createRecord,
  "GET /api/v1/patient/vault/records/:id": getRecord,
  "PATCH /api/v1/patient/vault/records/:id": updateRecord,
  "DELETE /api/v1/patient/vault/records/:id": deleteRecord,
  "GET /api/v1/patient/vault/export": exportVaultHandler,
  "GET /api/v1/patient/vault/share": listSharesHandler,
  "POST /api/v1/patient/vault/share": createShare,
  "GET /api/v1/patient/vault/share/preview": previewShareHandler,
  "POST /api/v1/patient/vault/share/:id/revoke": revokeShareHandler,
  "POST /api/v1/vault/redeem": redeemShare,
};

const key = (route: BackendRoute) => `${route.method} ${route.path}`;

/**
 * The route table the Hono server mounts.
 *
 * Both directions are checked at import time, so a mismatch fails the server at
 * startup rather than silently 404ing in production: a declared route with no
 * handler would be dead, and a handler with no declaration would be served by
 * Hono but never proxied from the web app.
 */
export const API_ROUTES = BACKEND_ROUTES.map((route) => {
  const handler = HANDLERS[key(route)];
  if (!handler) {
    throw new Error(`backend/api: no handler registered for "${key(route)}"`);
  }
  return { ...route, handler };
});

const declared = new Set(BACKEND_ROUTES.map(key));
for (const registered of Object.keys(HANDLERS)) {
  if (!declared.has(registered)) {
    throw new Error(
      `backend/api: handler "${registered}" is missing from BACKEND_ROUTES in routes.json`
    );
  }
}
