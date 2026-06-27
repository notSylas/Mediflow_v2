import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatDate } from "@/lib/format";
import type { Medicine, PrescriptionRow } from "@/lib/types";

export interface PrescriptionDoctor {
  name: string;
  specialty: string | null;
  qualifications: string | null;
  registrationNo: string | null;
}

/** Builds a branded PDF from a prescription and opens the share sheet. */
export async function sharePrescriptionPdf(
  row: PrescriptionRow,
  doctor: PrescriptionDoctor | null,
  patientName: string
) {
  const html = buildHtml(row, doctor, patientName);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Share prescription",
    });
  }
}

function timing(m: Medicine): string {
  const parts = [
    m.morning && "Morning",
    m.afternoon && "Afternoon",
    m.evening && "Evening",
    m.night && "Night",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "As directed";
}

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml(
  row: PrescriptionRow,
  doctor: PrescriptionDoctor | null,
  patientName: string
): string {
  const { prescription, medicines } = row;
  const doctorName = doctor?.name
    ? /^dr\.?\s/i.test(doctor.name)
      ? doctor.name
      : `Dr. ${doctor.name}`
    : "Your doctor";

  const rows = medicines
    .map(
      (m) => `
      <tr>
        <td><strong>${esc(m.name)}</strong>${m.strength ? ` ${esc(m.strength)}` : ""}</td>
        <td>${esc(timing(m))}</td>
        <td>${m.foodRelation ? esc(m.foodRelation) : "—"}</td>
        <td>${m.durationDays ? `${m.durationDays} days` : "Ongoing"}</td>
      </tr>${m.instructions ? `<tr><td colspan="4" class="note">${esc(m.instructions)}</td></tr>` : ""}`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    * { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #172126; }
    body { margin: 0; padding: 40px; }
    .head { display: flex; justify-content: space-between; border-bottom: 3px solid #2a4cc7; padding-bottom: 16px; }
    .brand { color: #2a4cc7; font-size: 22px; font-weight: 800; }
    .doctor { text-align: right; }
    .doctor .name { font-size: 16px; font-weight: 700; }
    .muted { color: #66747b; font-size: 12px; }
    .meta { display: flex; justify-content: space-between; margin: 20px 0; font-size: 13px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #66747b; margin: 22px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: #66747b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #dce4e6; padding: 6px 8px; }
    td { padding: 8px; border-bottom: 1px solid #eef2f3; vertical-align: top; }
    td.note { color: #66747b; font-size: 12px; padding-top: 0; }
    .advice { background: #ddf5f1; border-radius: 8px; padding: 12px; font-size: 13px; }
    .footer { margin-top: 36px; border-top: 1px solid #dce4e6; padding-top: 12px; font-size: 11px; color: #66747b; }
  </style></head>
  <body>
    <div class="head">
      <div>
        <div class="brand">MediFlow</div>
        <div class="muted">Telemedicine prescription</div>
      </div>
      <div class="doctor">
        <div class="name">${esc(doctorName)}</div>
        ${doctor?.qualifications ? `<div class="muted">${esc(doctor.qualifications)}</div>` : ""}
        ${doctor?.specialty ? `<div class="muted">${esc(doctor.specialty)}</div>` : ""}
        ${doctor?.registrationNo ? `<div class="muted">Reg. No: ${esc(doctor.registrationNo)}</div>` : ""}
      </div>
    </div>

    <div class="meta">
      <div><strong>Patient:</strong> ${esc(patientName || "—")}</div>
      <div><strong>Issued:</strong> ${prescription.issuedAt ? esc(formatDate(prescription.issuedAt)) : "—"}</div>
    </div>

    ${prescription.diagnosis ? `<h2>Diagnosis</h2><div>${esc(prescription.diagnosis)}</div>` : ""}

    <h2>Medicines</h2>
    <table>
      <thead><tr><th>Medicine</th><th>When</th><th>Food</th><th>Duration</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">No medicines listed.</td></tr>`}</tbody>
    </table>

    ${prescription.advice ? `<h2>Advice</h2><div class="advice">${esc(prescription.advice)}</div>` : ""}

    <div class="footer">
      ${prescription.validUntil ? `Valid until ${esc(formatDate(prescription.validUntil))}. ` : ""}
      This prescription was issued via a MediFlow video consultation. Follow the instructions as directed by your doctor.
    </div>
  </body></html>`;
}
