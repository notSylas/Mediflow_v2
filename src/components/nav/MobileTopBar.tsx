import Link from "next/link";
import { HeartPulse } from "lucide-react";
import type { Session } from "@/lib/auth/auth";
import { LogoutButton } from "@/components/common/LogoutButton";
import { NavLinks } from "@/components/common/NavLinks";
import { NAV_ITEMS } from "@/components/nav/nav-items";

/** Top bar shown only below the lg breakpoint, where the sidebar is hidden. */
export function MobileTopBar({ user }: { user: Session["user"] }) {
  const links = (NAV_ITEMS[user.role] ?? []).map(({ href, label }) => ({
    href,
    label,
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">MediFlow</span>
        </Link>
        <LogoutButton />
      </div>
      <div className="border-t border-border/60 px-2 py-1.5">
        <NavLinks links={links} />
      </div>
    </header>
  );
}
