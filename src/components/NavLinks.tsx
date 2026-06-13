"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  // Null outside a router context (e.g. component tests).
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      {links.map((link) => {
        // Exact match for section roots, prefix match for subpages, while
        // keeping "/patient" from claiming every patient page.
        const isActive =
          pathname === link.href ||
          (link.href.split("/").length > 2 && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
