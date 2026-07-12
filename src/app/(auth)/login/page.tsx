import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarCheck2, FileText, HeartPulse, ShieldCheck, Video } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Reveal } from "@/components/effects/Reveal";
import { AuthHeroPanel } from "@/components/auth/AuthHeroPanel";
import { auth } from "@/lib/auth/auth";

const POINTS = [
  { icon: CalendarCheck2, text: "Book a guaranteed slot in two minutes" },
  { icon: Video, text: "Consult over video — no app to install" },
  { icon: FileText, text: "Every prescription saved to your account" },
];

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect(session.user.role === "doctor" ? "/doctor" : "/patient");
  }

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-primary/10 duration-500 lg:grid lg:grid-cols-2">
      {/* Brand panel — cobalt→violet, role-agnostic (docs/Design.md) */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-primary-foreground lg:flex">
        <AuthHeroPanel />

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MediFlow</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h1 className="text-2xl font-semibold leading-snug">
            Your doctor&apos;s clinic,
            <br />
            without the travel.
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
          Not for medical emergencies — call your local emergency number.
        </p>
      </div>

      {/* Form panel */}
      <div className="p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">MediFlow</span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          New here? Signing in creates your account automatically — enter your
          email to receive a one-time code.
        </p>

        <div className="mt-7">
          <Suspense fallback={null}>
            <LoginForm googleEnabled={googleEnabled} variant="patient" />
          </Suspense>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          No passwords to remember. We email you a single-use code each time.
        </div>

        <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
          Clinic staff?{" "}
          <Link href="/doctor/login" className="font-medium text-primary hover:underline">
            Sign in here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
