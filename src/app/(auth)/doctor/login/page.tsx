import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, ShieldCheck, Stethoscope, Video } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Reveal } from "@/components/Reveal";
import { AuthHeroPanel } from "@/components/auth/AuthHeroPanel";
import { auth } from "@/lib/auth/auth";

const POINTS = [
  { icon: CalendarClock, text: "Your day's schedule and bookings at a glance" },
  { icon: Video, text: "Start consultations without juggling links" },
  { icon: ClipboardList, text: "Notes and prescriptions tied to each visit" },
];

export default async function DoctorLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Already signed in: send doctors to the clinic, anyone else to their own
  // portal — this page is staff-only, there's nothing here for a patient.
  if (session) {
    redirect(session.user.role === "doctor" ? "/doctor" : "/patient");
  }

  return (
    <div className="theme-doctor animate-in fade-in slide-in-from-bottom-4 w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-primary/10 duration-500 lg:grid lg:grid-cols-2">
      {/* Brand panel — violet-led for the staff surface (docs/Design.md) */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-primary-foreground lg:flex">
        <AuthHeroPanel variant="doctor" />

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MediFlow Clinic</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h1 className="text-2xl font-semibold leading-snug">
            Your clinic,
            <br />
            wherever you are.
          </h1>
          <ul className="space-y-3">
            {POINTS.map((point, i) => (
              <Reveal key={point.text} delay={i * 120}>
                <li className="flex items-center gap-3 text-sm text-primary-foreground/90">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                    <point.icon className="h-4 w-4" />
                  </span>
                  {point.text}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          Clinic staff access only.
        </p>
      </div>

      {/* Form panel */}
      <div className="p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">MediFlow Clinic</span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">Clinic sign-in</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email to receive a one-time code. This entrance is for
          clinic staff.
        </p>

        <div className="mt-7">
          <Suspense fallback={null}>
            {/* Google is never offered here — it can't be role-filtered before
                auth, so the doctor surface is OTP-only by design. */}
            <LoginForm googleEnabled={false} variant="doctor" />
          </Suspense>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          No passwords to remember. We email you a single-use code each time.
        </div>

        <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          Here for an appointment?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Patient sign-in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
