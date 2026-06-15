"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse } from "lucide-react";
import type { Session } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS, isNavActive } from "@/components/nav/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ user }: { user: Session["user"] }) {
  const pathname = usePathname() ?? "";
  const items = NAV_ITEMS[user.role] ?? [];
  const settingsHref =
    user.role === "doctor" ? "/doctor/settings" : "/patient/settings";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex items-center gap-2 px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartPulse className="h-4.5 w-4.5" />
        </span>
        <span className="text-base font-semibold tracking-tight">MediFlow</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          href={settingsHref}
          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {user.name || user.email}
            </span>
            {user.role && (
              <Badge variant="secondary" className="uppercase tracking-wide">
                {user.role}
              </Badge>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </Link>
        <div className="px-3 pt-2">
          <LogoutButton />
        </div>
        <div className="flex items-center gap-2 px-3 pt-3 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </aside>
  );
}
