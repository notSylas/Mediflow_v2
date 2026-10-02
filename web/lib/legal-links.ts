import { FileText, ShieldCheck, Undo2, Mail, Tag, type LucideIcon } from "lucide-react";

/** Single source of truth for the 5 public legal/compliance pages required
 *  for Razorpay activation — referenced by every footer and legal nav on
 *  the site so the link set can't drift between them. */
export type LegalLink = {
  href: string;
  /** Full label — settings/nav surfaces with room to spare. */
  label: string;
  /** Compact label — footers, where five links share one line. */
  shortLabel: string;
  icon: LucideIcon;
};

export const LEGAL_LINKS: LegalLink[] = [
  { href: "/terms", label: "Terms of Service", shortLabel: "Terms", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", shortLabel: "Privacy", icon: ShieldCheck },
  {
    href: "/refund-cancellation",
    label: "Refund & Cancellation Policy",
    shortLabel: "Refunds",
    icon: Undo2,
  },
  { href: "/contact", label: "Contact Us", shortLabel: "Contact", icon: Mail },
  { href: "/pricing", label: "Pricing", shortLabel: "Pricing", icon: Tag },
];
