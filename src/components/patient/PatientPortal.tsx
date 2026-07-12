import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PatientPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-7xl space-y-8 px-4 py-8 duration-500 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PatientHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-teal-200/70 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.22),transparent_32%),linear-gradient(135deg,rgba(15,118,110,0.96),rgba(13,148,136,0.88)_48%,rgba(8,47,73,0.94))] p-6 text-white shadow-2xl shadow-teal-950/10 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-32 w-32 rounded-full border border-white/20" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            {Icon && (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
                <Icon className="h-5 w-5" />
              </span>
            )}
            {eyebrow && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-teal-50">
                {eyebrow}
              </span>
            )}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-teal-50/85 sm:text-lg">
            {description}
          </p>
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {children && (
          <div className="rounded-3xl border border-white/20 bg-white/12 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export function PatientStatCard({
  icon: Icon,
  label,
  value,
  description,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={cn("glass hover-lift rounded-2xl", className)}>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function PatientSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PatientEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="glass border-dashed rounded-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function PatientSideCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("glass rounded-2xl", className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
