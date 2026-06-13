import Link from "next/link";
import { HeartPulse } from "lucide-react";
import type { Session } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks, type NavLink } from "@/components/NavLinks";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS: Record<string, NavLink[]> = {
  doctor: [
    { href: "/doctor", label: "Dashboard" },
    { href: "/doctor/schedule", label: "Schedule" },
    { href: "/doctor/appointments", label: "Appointments" },
    { href: "/doctor/patients", label: "Patients" },
    { href: "/doctor/settings", label: "Availability" },
  ],
  patient: [
    { href: "/patient", label: "Home" },
    { href: "/patient/book", label: "Book" },
    { href: "/patient/appointments", label: "Appointments" },
    { href: "/patient/prescriptions", label: "Prescriptions" },
    { href: "/patient/profile", label: "Profile" },
  ],
};

export function AppHeader({ user }: { user: Session["user"] | null }) {
  const links = user?.role ? (NAV_LINKS[user.role] ?? []) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/55 shadow-sm shadow-primary/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">MediFlow</span>
          </Link>
          <div className="hidden sm:block">
            <NavLinks links={links} />
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={user.role === "doctor" ? "/doctor/settings" : "/patient/settings"}
              className="hidden items-center gap-2 rounded-full px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
            >
              {user.email}
              {user.role && (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {user.role}
                </Badge>
              )}
            </Link>
            <LogoutButton />
          </div>
        )}
      </div>

      {links.length > 0 && (
        <div className="border-t px-4 py-2 sm:hidden">
          <NavLinks links={links} />
        </div>
      )}
    </header>
  );
}
