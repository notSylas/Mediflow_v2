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
  const portalLabel = user.role === "doctor" ? "Clinic console" : "Patient portal";

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border/60 bg-card/80 shadow-2xl shadow-slate-950/5 backdrop-blur-xl lg:flex">
      <Link href="/" className="group px-5 py-5">
        <span className="flex items-center gap-3 rounded-2xl border bg-background/70 p-3 transition-colors group-hover:bg-background">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight">MediFlow</span>
            <span className="block text-xs text-muted-foreground">{portalLabel}</span>
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
        {items.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all",
                active
                  ? "bg-primary/10 font-semibold text-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        <Link
          href={settingsHref}
          className="block rounded-2xl border bg-background/70 p-3 transition-colors hover:bg-background"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {user.name || user.email}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <Badge variant="secondary" className="shrink-0 uppercase tracking-wide">
              {user.role}
            </Badge>
          </span>
        </Link>
        <div className="pt-3">
          <LogoutButton />
        </div>
        <div className="flex items-center gap-2 px-1 pt-3 text-xs text-muted-foreground">
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
