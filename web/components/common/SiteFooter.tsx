import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { LEGAL_LINKS } from "@/lib/legal-links";

/** Shared site footer — two variants, one link source (`LEGAL_LINKS`) so the
 *  public marketing footer and the legal-pages footer can never drift apart. */
export function SiteFooter({ variant = "full" }: { variant?: "full" | "minimal" }) {
  if (variant === "minimal") {
    return (
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href}>
              {i > 0 && <span className="px-2">·</span>}
              <Link href={link.href} className="hover:underline">
                {link.shortLabel}
              </Link>
            </span>
          ))}
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <span className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          MediFlow
        </span>
        <div className="flex items-center gap-4">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.shortLabel}
            </Link>
          ))}
          <span>© {new Date().getFullYear()} MediFlow</span>
        </div>
      </div>
    </footer>
  );
}
