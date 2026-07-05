import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  FileText,
  HandHeart,
  Home,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Pill,
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
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
    { href: "/patient/profile", label: "Medical profile", icon: UserPen },
  ],
  doctor: [
    { href: "/doctor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctor/work-queue", label: "Work queue", icon: ListChecks },
    { href: "/doctor/schedule", label: "Schedule", icon: CalendarRange },
    { href: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/doctor/refill-requests", label: "Refills", icon: Pill },
    { href: "/doctor/patients", label: "Patients", icon: Users },
    { href: "/doctor/care", label: "Care members", icon: HandHeart },
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
