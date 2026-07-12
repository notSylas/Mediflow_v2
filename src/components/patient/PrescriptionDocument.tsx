import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { type MedicineTimingLike } from "@/lib/consult/medicines";
import { ageFromDob, genderLabel } from "@/lib/people/patient-constants";
import { cn } from "@/lib/core/utils";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type PrescriptionLike = {
  id: string;
  diagnosis: string | null;
  advice: string | null;
  issuedAt: Date | string | null;
  validUntil: string | null;
};

type AppointmentLike = {
  id: string;
  startsAt: Date | string;
  visitReason: string | null;
  mode?: "video" | "async";
};

type MedicineLike = MedicineTimingLike & {
  id: string;
  name: string;
  strength: string | null;
  route: string | null;
  instructions: string | null;
};

type DoctorLike = {
  name: string | null;
  specialty: string | null;
  qualifications: string | null;
  registrationNo: string | null;
};

type PatientLike = {
  name: string;
  email: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
};

interface PrescriptionDocumentProps {
  prescription: PrescriptionLike;
  appointment: AppointmentLike;
  medicines: MedicineLike[];
  doctor: DoctorLike | null;
  patient: PatientLike;
  timezone: string;
  actions?: ReactNode;
  compact?: boolean;
}

function formatDate(value: Date | string | null, timezone: string, pattern: string) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return formatInTimeZone(date, timezone, pattern);
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "Not recorded";

  const [year, month, day] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || !day || monthIndex < 0 || monthIndex > 11) return value;

  return `${Number(day)} ${MONTHS[monthIndex]} ${year}`;
}

function frequency(medicine: MedicineTimingLike): string {
  const dose = [
    medicine.morning ? "M" : "-",
    medicine.afternoon ? "A" : "-",
    medicine.evening ? "E" : "-",
    medicine.night ? "N" : "-",
  ];
  return dose.join(" / ");
}

function durationLabel(days: number | null): string {
  if (!days) return "As advised";
  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

function adviceLines(advice: string | null): string[] {
  if (!advice) return ["Follow the prescribed schedule exactly."];
  return advice
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

export function PrescriptionDocument({
  prescription,
  appointment,
  medicines,
  doctor,
  patient,
  timezone,
  actions,
  compact = false,
}: PrescriptionDocumentProps) {
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Doctor";
  const prescriptionNo = prescription.id.slice(0, 8).toUpperCase();
  const issuedAt = formatDate(
    prescription.issuedAt ?? appointment.startsAt,
    timezone,
    "dd MMM yyyy"
  );
  const consultAt = formatDate(appointment.startsAt, timezone, "dd MMM yyyy, h:mm a");
  const age = ageFromDob(patient.dateOfBirth ?? null);
  const gender = genderLabel(patient.gender ?? null);
  const dateOfBirth = formatDateOnly(patient.dateOfBirth);
  const ageGender =
    age !== null && gender
      ? `${age} yrs / ${gender}`
      : age !== null
        ? `${age} yrs`
        : gender ?? "Not recorded";
  const blood = patient.bloodGroup || "Not recorded";
  const printId = `prescription-${prescription.id}`;

  return (
    <article
      id={printId}
      data-prescription-document
      className={cn(
        "overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-xl print:rounded-none print:border-0 print:shadow-none",
        compact && "shadow-md"
      )}
    >
      <div className="grid grid-cols-[14px_1fr]">
        <div className="bg-gradient-to-b from-teal-500 via-teal-700 to-slate-950 print:bg-teal-700" />
        <div className="px-8 py-8 sm:px-10 print:px-8 print:py-7">
          <header className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
                <HeartPulse className="h-3.5 w-3.5" />
                MediFlow Clinic
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                {doctorName}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-slate-500">
                {doctor?.qualifications && <span>{doctor.qualifications}</span>}
                {doctor?.specialty && <span>{doctor.specialty}</span>}
                {doctor?.registrationNo && <span>Reg. {doctor.registrationNo}</span>}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left sm:min-w-64">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Prescription
                  </p>
                  <p className="font-mono text-lg font-extrabold">{prescriptionNo}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Issued</dt>
                  <dd className="font-semibold">{issuedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Mode</dt>
                  <dd className="font-semibold">
                    {appointment.mode === "async" ? "Async" : "Video"}
                  </dd>
                </div>
              </dl>
            </div>
          </header>

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <Meta label="Patient name" value={patient.name} />
            <Meta label="Age / Gender" value={ageGender} />
            <Meta label="Date of birth" value={dateOfBirth} />
            <Meta label="Blood group" value={blood} />
            <Meta label="Contact email" value={patient.email} />
            <Meta label="Consultation" value={consultAt} />
          </section>

          <section className="mt-7 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-[1fr_1fr]">
            <ClinicalBlock
              title="Diagnosis"
              value={prescription.diagnosis ?? appointment.visitReason ?? "Not specified"}
            />
            <ClinicalBlock
              title="Clinical context"
              value={appointment.visitReason ?? "General consultation"}
            />
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-serif text-5xl font-bold italic leading-none text-teal-700">
                  Rx
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Medicines and dosage instructions
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {medicines.length} medicine{medicines.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[2.4rem_2fr_1.25fr_1.2fr_1fr] gap-4 bg-slate-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white">
                <span />
                <span>Medicine</span>
                <span>Dose / Route</span>
                <span>Timing</span>
                <span>Duration</span>
              </div>

              {medicines.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500">
                  No medicines were added to this prescription.
                </div>
              ) : (
                medicines.map((medicine, index) => (
                  <div
                    key={medicine.id}
                    className="grid grid-cols-[2.4rem_2fr_1.25fr_1.2fr_1fr] gap-4 border-b border-slate-100 px-4 py-5 text-sm last:border-b-0"
                  >
                    <p className="font-extrabold text-teal-700">{index + 1}</p>
                    <div>
                      <p className="font-extrabold text-slate-950">
                        {medicine.name}
                        {medicine.strength && (
                          <span className="ml-1 font-semibold text-slate-500">
                            {medicine.strength}
                          </span>
                        )}
                      </p>
                      {medicine.instructions && (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Note: {medicine.instructions}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{medicine.strength || "As prescribed"}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {medicine.route || "Oral / as advised"}
                      </p>
                    </div>
                    <div>
                      <p className="font-extrabold">{frequency(medicine)}</p>
                      {medicine.foodRelation && (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {medicine.foodRelation}
                        </p>
                      )}
                    </div>
                    <p className="font-extrabold">{durationLabel(medicine.durationDays)}</p>
                  </div>
                ))
              )}
            </div>

            <p className="mt-2 text-xs font-medium text-slate-500">
              Timing legend: M morning, A afternoon, E evening, N night. A dash means no
              dose at that time.
            </p>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                <p className="font-extrabold text-teal-950">Doctor&apos;s advice</p>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm font-medium text-teal-950/80">
                {adviceLines(prescription.advice).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <p className="font-extrabold">Follow-up</p>
              </div>
              <p className="text-sm font-medium text-slate-600">
                {prescription.validUntil
                  ? `Review by ${prescription.validUntil}`
                  : "Book a review if symptoms persist or worsen."}
              </p>
            </div>
          </section>

          {patient.allergies && (
            <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              <span className="font-extrabold">Known allergies: </span>
              {patient.allergies}
            </section>
          )}

          <footer className="mt-12 grid gap-8 border-t border-slate-200 pt-8 sm:grid-cols-[1fr_16rem]">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Digitally generated clinical prescription from MediFlow. This is not
              for emergency care. Take medicines only as prescribed and consult the
              doctor before changing dose or duration.
            </p>
            <div className="self-end text-center">
              <div className="mb-3 border-t border-slate-300" />
              <p className="font-extrabold">{doctorName}</p>
              <p className="text-xs font-medium text-slate-500">Doctor signature</p>
            </div>
          </footer>

          {actions && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 print:hidden">
              {actions}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function ClinicalBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
