import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";

/** Reusable legal footer for settings pages — keeps Terms/Privacy reachable
 *  from inside the authenticated app on every viewport. */
export function LegalLinks() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <h2 className="text-sm font-medium">Legal</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
        <Link
          href="/terms"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline"
        >
          <FileText className="h-4 w-4" />
          Terms of Service
        </Link>
        <Link
          href="/privacy"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:underline"
        >
          <ShieldCheck className="h-4 w-4" />
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
