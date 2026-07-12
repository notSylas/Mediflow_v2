import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  FileCheck2,
  IndianRupee,
  ShieldCheck,
  UserRoundCheck,
  Video,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getDoctorCard, getDoctorProfile } from "@/lib/people/doctor";
import { getPatientProfile } from "@/lib/people/patient";
import { getBookingProfileMissing } from "@/lib/people/patient-readiness";
import { BookingFlow } from "@/components/patient/booking/BookingFlow";
import {
  PatientHero,
  PatientPageShell,
  PatientSideCard,
} from "@/components/patient/PatientPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function BookPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [profile, doctor, patientProfile] = await Promise.all([
    getDoctorProfile(),
    getDoctorCard(),
    getPatientProfile(session.user.id),
  ]);
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Your doctor";
  const missingProfile = getBookingProfileMissing(session.user, patientProfile);
  const canBook = missingProfile.length === 0;

  return (
    <PatientPageShell>
      <PatientHero
        eyebrow="Book consultation"
        icon={CalendarPlus}
        title="Book a private video consultation"
        description="Share the reason for your visit, attach reports if needed, then reserve a confirmed time with secure payment."
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-teal-50/80">Assigned doctor</p>
            <p className="mt-1 text-xl font-semibold">{doctorName}</p>
            <p className="text-sm text-teal-50/75">
              {doctor?.specialty ?? "General physician"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
              <IndianRupee className="h-4 w-4 text-teal-50" />
              <p className="mt-2 text-lg font-semibold">
                ₹{((profile?.feeInPaise ?? doctor?.feeInPaise ?? 50000) / 100).toFixed(0)}
              </p>
              <p className="text-xs text-teal-50/75">consultation fee</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
              <CalendarClock className="h-4 w-4 text-teal-50" />
              <p className="mt-2 text-lg font-semibold">
                {profile?.slotMinutes ?? doctor?.slotMinutes ?? 20} min
              </p>
              <p className="text-xs text-teal-50/75">video visit</p>
            </div>
          </div>
        </div>
      </PatientHero>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {!canBook ? (
            <Card className="glass overflow-hidden rounded-3xl border-amber-200">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold">Complete profile before booking</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Video consultations need basic patient identity so the doctor can
                      prescribe safely and the prescription has valid patient details.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {["Full name", "Valid date of birth", "Gender"].map((item) => {
                    const missing = missingProfile.includes(item);
                    return (
                      <div
                        key={item}
                        className="rounded-2xl border bg-background/70 p-4 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{item}</span>
                          <Badge variant={missing ? "outline" : "secondary"}>
                            {missing ? "Missing" : "Done"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button asChild size="lg">
                  <Link href="/patient/profile">
                    <UserRoundCheck className="mr-2 h-4 w-4" />
                    Complete patient profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : profile ? (
            <BookingFlow feeInPaise={profile.feeInPaise} timezone={profile.timezone} />
          ) : (
            <Card className="glass rounded-2xl border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Booking is not available yet because the doctor has not finished clinic setup.
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <PatientSideCard title="How booking works" description="A clear flow before payment">
            {[
              {
                icon: FileCheck2,
                title: "Share visit details",
                text: "Tell the doctor the reason, symptoms, and attach reports.",
              },
              {
                icon: CalendarClock,
                title: "Pick a real slot",
                text: "Slots are computed live from the doctor's availability.",
              },
              {
                icon: ShieldCheck,
                title: "Confirm securely",
                text: "Payment confirms the appointment and reduces no-shows.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-2xl border bg-background/60 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </PatientSideCard>

          <PatientSideCard title="Before you book" description="For safe online care">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Video consultations are not for emergencies. If you have severe symptoms,
              call your local emergency number or go to an emergency room.
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Private visit</Badge>
              <Badge variant="secondary">Report upload</Badge>
              <Badge variant="secondary">Prescription saved</Badge>
            </div>
          </PatientSideCard>

          <PatientSideCard title="Visit format">
            <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Video className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Video consultation</p>
                <p className="text-sm text-muted-foreground">
                  Join from the appointment page near the scheduled time.
                </p>
              </div>
            </div>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
