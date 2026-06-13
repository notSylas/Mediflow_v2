import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  UserPen,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<string, NavItem[]> = {
  patient: [
    { href: "/patient", label: "Home", icon: Home },
    { href: "/patient/book", label: "Book a visit", icon: CalendarPlus },
    { href: "/patient/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/patient/profile", label: "Medical profile", icon: UserPen },
  ],
  doctor: [
    { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctor/schedule", label: "Schedule", icon: CalendarRange },
    { href: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/doctor/patients", label: "Patients", icon: Users },
    { href: "/doctor/settings", label: "Availability", icon: Settings },
  ],
};

/** Matches NavLinks' rule: exact for section roots, prefix for subpages. */
export function isNavActive(href: string, pathname: string): boolean {
  return (
    pathname === href ||
    (href.split("/").length > 2 && pathname.startsWith(`${href}/`))
  );
}
