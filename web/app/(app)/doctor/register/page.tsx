import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~backend/auth/auth";
import { DoctorRegisterForm } from "@/components/doctor/DoctorRegisterForm";

export default async function DoctorRegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  if (session.user.role === "doctor") redirect("/doctor");

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-12">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Set up clinic access
        </h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as {session.user.email}. Enter your
          registration code below to turn this account into a doctor account.
        </p>
      </div>

      <DoctorRegisterForm />
    </div>
  );
}
