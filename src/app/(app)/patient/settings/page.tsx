import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountSettings } from "@/components/account/AccountSettings";
import { LegalLinks } from "@/components/account/LegalLinks";

export default async function PatientSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-2xl space-y-6 px-4 py-10 duration-500 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {session.user.email}.
        </p>
      </div>
      <AccountSettings initialName={session.user.name ?? ""} />
      <LegalLinks />
    </div>
  );
}
