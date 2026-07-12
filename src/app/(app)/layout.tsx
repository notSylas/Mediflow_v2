import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { cn } from "@/lib/core/utils";
import { AmbientBackground } from "@/components/effects/AmbientBackground";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { NextConsultBanner } from "@/components/doctor/NextConsultBanner";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = session.user;

  return (
    <div
      className={cn(
        "relative min-h-full lg:flex",
        user.role === "doctor" && "theme-doctor"
      )}
    >
      <AmbientBackground />
      <Sidebar user={user} />

      <div className="flex min-h-screen w-full min-w-0 flex-col">
        <MobileTopBar user={user} />
        {user.role === "doctor" && <NextConsultBanner />}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
