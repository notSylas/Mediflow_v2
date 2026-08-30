import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal-links";

/** Reusable legal footer for settings pages — keeps every compliance page
 *  reachable from inside the authenticated app on every viewport. */
export function LegalLinks() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <h2 className="text-sm font-medium">Legal</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
