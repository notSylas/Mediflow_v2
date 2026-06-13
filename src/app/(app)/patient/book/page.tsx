import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDoctorProfile } from "@/lib/doctor";
import { BookingFlow } from "@/components/patient/booking/BookingFlow";

export default async function BookPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const profile = await getDoctorProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Book a consultation</h1>
        <p className="text-muted-foreground">
          Tell us what&apos;s going on, then pick a time that works for you.
        </p>
      </div>

      {profile ? (
        <BookingFlow feeInPaise={profile.feeInPaise} timezone={profile.timezone} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Booking isn&apos;t available yet — the doctor hasn&apos;t set up their profile.
        </p>
      )}
    </div>
  );
}
