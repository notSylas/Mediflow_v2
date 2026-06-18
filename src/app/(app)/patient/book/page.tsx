import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarClock, CalendarPlus, FileCheck2, IndianRupee, ShieldCheck, Video } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDoctorCard, getDoctorProfile } from "@/lib/doctor";
import { BookingFlow } from "@/components/patient/booking/BookingFlow";
import {
  PatientHero,
  PatientPageShell,
  PatientSideCard,
} from "@/components/patient/PatientPortal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function BookPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [profile, doctor] = await Promise.all([getDoctorProfile(), getDoctorCard()]);
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : "Your doctor";

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
          {profile ? (
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
