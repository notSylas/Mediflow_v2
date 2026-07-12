import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  FileText,
  HeartPulse,
  History,
  Pill,
  ShieldCheck,
  Stethoscope,
  Video,
  Webcam,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { db } from "@/db";
import { doctorProfiles, user } from "@/db/schema";
import { cn } from "@/lib/core/utils";
import { TONES } from "@/lib/core/tones";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { TiltCard } from "@/components/landing/TiltCard";
import { MagneticButton } from "@/components/wow/MagneticButton";

const STATS = [
  { value: "2 min", label: "to book a visit" },
  { value: "0", label: "time in a waiting room" },
  { value: "10 min", label: "join window before your slot" },
  { value: "Forever", label: "access to prescriptions" },
];

const STEPS = [
  {
    icon: CalendarPlus,
    title: "Book a paid slot",
    description:
      "Tell the doctor what's going on, pick a time that suits you, and pay the fee securely. Your slot is guaranteed — no double-booking.",
  },
  {
    icon: Video,
    title: "Meet on video",
    description:
      "Join from your phone or laptop — no app to install. A quick camera and mic check, and you're in the consultation room.",
  },
  {
    icon: FileText,
    title: "Get your prescription",
    description:
      "Your diagnosis, medicines and advice are written up during the visit and stay in your account forever.",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Pay securely at booking",
    description: "UPI, cards and netbanking via Razorpay. No cash, no surprises.",
    tone: "emerald" as const,
  },
  {
    icon: Webcam,
    title: "Device check before the call",
    description: "Test your camera and microphone before you join — no fumbling at consult time.",
    tone: "blue" as const,
  },
  {
    icon: History,
    title: "Your history follows you",
    description: "The doctor sees your past consultations and medicines at every visit.",
    tone: "violet" as const,
  },
  {
    icon: FileText,
    title: "Prescriptions, kept forever",
    description: "Structured, readable prescriptions you can pull up at any pharmacy.",
    tone: "amber" as const,
  },
];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect(session.user.role === "doctor" ? "/doctor" : "/patient");
  }

  const [doctor] = await db
    .select({ profile: doctorProfiles, name: user.name })
    .from(doctorProfiles)
    .innerJoin(user, eq(user.id, doctorProfiles.userId))
    // Canonical (oldest) doctor — keep the public landing card consistent with
    // the rest of the app's doctor resolution.
    .orderBy(asc(doctorProfiles.createdAt))
    .limit(1);

  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Your doctor";
  const doctorInitials = (doctor?.name || "Dr").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ============ DARK HERO BAND (header + hero) ============ */}
      <section className="relative overflow-hidden bg-[#052b2a] text-white">
        <HeroBackground />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur">
                <HeartPulse className="h-4.5 w-4.5" />
              </span>
              <span className="text-base font-semibold tracking-tight">MediFlow</span>
            </span>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28 lg:pt-16">
          {/* Copy */}
          <div className="animate-in fade-in slide-in-from-bottom-6 text-center duration-700 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-emerald-50 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Your doctor&apos;s clinic, now online
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              See your doctor without
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {" "}the waiting room
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-emerald-50/80 lg:mx-0">
              Book a guaranteed slot, consult over video from wherever you are, and keep
              every prescription in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[#0c3a3a] shadow-lg shadow-black/20 hover:bg-emerald-50"
                >
                  <Link href="/patient/book">
                    Book a consultation
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
                  </Link>
                </Button>
              </MagneticButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-emerald-50/70 lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Guaranteed slots
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Video from home
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Digital prescriptions
              </span>
            </div>
          </div>

          {/* Layered product mockup — floats, and tilts toward the cursor */}
          <div className="animate-in fade-in slide-in-from-bottom-8 animate-float-gentle mx-auto w-full max-w-sm duration-1000 lg:mx-0 lg:ml-auto">
            <TiltCard className="relative">
            {/* back card (prescription) */}
            <div className="absolute -right-2 -top-6 hidden w-56 rotate-6 rounded-2xl bg-white/95 p-4 shadow-2xl shadow-black/30 sm:block">
              <div className="flex items-center gap-2 text-sm font-medium text-[#0c3a3a]">
                <Pill className="h-4 w-4 text-teal-600" /> Paracetamol 500mg
              </div>
              <p className="mt-1 text-xs text-slate-500">Morning, Night · After food · 3 days</p>
            </div>

            {/* main card */}
            <div className="relative rounded-2xl border border-white/40 bg-white p-5 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Upcoming consultation</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Confirmed
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                  AS
                </span>
                <div>
                  <p className="font-medium text-slate-900">Dr. Anita Sharma</p>
                  <p className="text-sm text-slate-500">General physician</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                <CalendarClock className="h-4 w-4 text-teal-600" />
                Today, 6:20 PM · 20 min
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white">
                <Video className="h-4 w-4" />
                Join video consultation
              </div>
            </div>
            </TiltCard>
          </div>
        </div>

        {/* curved transition into light */}
        <div aria-hidden className="h-8 bg-background [clip-path:ellipse(75%_100%_at_50%_100%)]" />
      </section>

      <main className="flex-1">
        {/* ============ STATS STRIP ============ */}
        <section className="border-b">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border sm:border-x-0 my-10 mx-4 sm:mx-auto">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80} className="bg-card px-6 py-6 text-center">
                <p className="text-2xl font-semibold tracking-tight text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="relative">
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-medium uppercase tracking-widest text-primary">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                From &ldquo;I don&apos;t feel well&rdquo; to a prescription in hand
              </h2>
            </Reveal>
            <div className="relative mt-14 grid gap-6 md:grid-cols-3">
              {/* connecting line on desktop */}
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-primary/20 md:block"
              />
              {STEPS.map((step, index) => (
                <Reveal
                  key={step.title}
                  delay={index * 120}
                  className="relative h-full rounded-2xl border bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="absolute right-5 top-5 text-5xl font-semibold text-muted/60">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============ MEET YOUR DOCTOR ============ */}
        <section className="border-t bg-card">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <Reveal className="grid items-center gap-10 rounded-3xl border bg-gradient-to-br from-accent/60 to-card p-8 sm:p-10 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-3xl font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                  {doctorInitials}
                </span>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-sm font-medium text-primary">
                  <Stethoscope className="h-4 w-4" />
                  {doctor?.profile.specialty ?? "General physician"}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium uppercase tracking-widest text-primary">
                  Meet your doctor
                </span>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">{doctorName}</h2>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                  {doctor?.profile.bio ??
                    "Consult one trusted doctor who knows your history — every visit builds on the last, so you never start from scratch."}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm">
                    <span className="font-semibold text-foreground">
                      ₹{((doctor?.profile.feeInPaise ?? 50000) / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">per consultation</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {doctor?.profile.slotMinutes ?? 20} min visit
                    </span>
                  </span>
                  <Button asChild>
                    <Link href="/patient/book">
                      Book with {doctorName}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-medium uppercase tracking-widest text-primary">
                Built for trust
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Everything you&apos;d expect from a real clinic
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, i) => (
                <Reveal
                  key={feature.title}
                  delay={i * 90}
                  className="group h-full rounded-2xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                      TONES[feature.tone].chip
                    )}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-4 pb-20 sm:px-6">
          <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#052b2a] px-6 py-16 text-center text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,#06302e_0%,#0b423d_55%,#063134_100%)]"
            />
            <div
              aria-hidden
              className="animate-aurora-1 pointer-events-none absolute -top-16 left-[20%] h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl"
            />
            <div
              aria-hidden
              className="animate-aurora-3 pointer-events-none absolute -bottom-16 right-[18%] h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Feeling unwell? Don&apos;t wait it out.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-emerald-50/80">
                Book a consultation now — it takes about two minutes.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 bg-white text-[#0c3a3a] shadow-lg shadow-black/20 hover:bg-emerald-50"
              >
                <Link href="/patient/book">
                  Book a consultation
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            MediFlow
          </span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <span>© {new Date().getFullYear()} MediFlow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
