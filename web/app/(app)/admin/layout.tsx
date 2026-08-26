import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~backend/auth/auth";

/**
 * Guards every /admin/** route in one place, rather than each page doing its
 * own inline check (the pattern every other role-gated page uses today). A
 * privilege check is exactly the kind of duplication where one missed copy
 * is a real escalation bug, so this subtree gets a shared layout guard
 * instead — scoped only to /admin, doesn't change the doctor/patient pages.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/patient");

  return <>{children}</>;
}
