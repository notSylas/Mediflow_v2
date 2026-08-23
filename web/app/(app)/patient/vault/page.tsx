import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  FolderHeart,
  Hospital,
  NotebookPen,
  Pill,
  ScanLine,
  Share2,
  ShieldCheck,
  Syringe,
  Upload,
  XCircle,
} from "lucide-react";
import { auth } from "~backend/auth/auth";
import { getVaultTimeline, listShares, type VaultTimelineItem } from "~backend/vault/vault-share";
import { revokeVaultShareAction } from "@/app/(app)/patient/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/effects/Reveal";
import {
  PatientEmptyState,
  PatientHero,
  PatientPageShell,
  PatientSection,
  PatientSideCard,
  PatientStatCard,
} from "@/components/patient/PatientPortal";
import { CountUp } from "@/components/effects/CountUp";

const RECORD_TONE: Record<string, string> = {
  lab: "bg-amber-100 text-amber-700",
  scan: "bg-sky-100 text-sky-700",
  discharge_summary: "bg-slate-100 text-slate-700",
  vaccination: "bg-rose-100 text-rose-700",
};

function itemIcon(item: VaultTimelineItem) {
  const className = "h-4 w-4";
  if (item.type === "consult_note") return <NotebookPen className={className} />;
  if (item.type === "prescription") return <Pill className={className} />;
  switch (item.recordType) {
    case "lab":
      return <FlaskConical className={className} />;
    case "scan":
      return <ScanLine className={className} />;
    case "discharge_summary":
      return <Hospital className={className} />;
    case "vaccination":
      return <Syringe className={className} />;
    case "prescription":
      return <Pill className={className} />;
    default:
      return <FileText className={className} />;
  }
}

function toneFor(item: VaultTimelineItem): string {
  if (item.recordType && RECORD_TONE[item.recordType]) return RECORD_TONE[item.recordType];
  return "bg-primary/10 text-primary";
}

export default async function PatientVaultPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [items, grants] = await Promise.all([
    getVaultTimeline(session.user.id),
    listShares(session.user.id),
  ]);

  const activeShare = grants.find((g) => g.status === "active");
  const pastShares = grants.filter((g) => g.status !== "active");
  const addedCount = items.filter((i) => i.source === "added").length;

  const years = Array.from(new Set(items.map((i) => new Date(i.date).getFullYear()))).sort(
    (a, b) => b - a
  );
  const groupByYear = years.length > 1;

  return (
    <PatientPageShell>
      <Reveal>
        <PatientHero
          eyebrow="Health Vault"
          icon={FolderHeart}
          title="Your record, ready to share"
          description="Every MediFlow prescription and note lands here automatically. Add old records from any other doctor, then share exactly what you choose with anyone, anywhere — no account needed on their end."
          actions={
            <>
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/patient/vault/share">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share my vault
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/patient/vault/add">
                  <Upload className="mr-2 h-4 w-4" />
                  Add an old record
                </Link>
              </Button>
            </>
          }
        >
          <div className="space-y-1">
            <p className="text-sm text-primary-foreground/75">In your vault</p>
            <p className="font-mono text-4xl font-bold tabular-nums leading-none">
              {items.length}
            </p>
            <p className="text-sm text-primary-foreground/75">
              record{items.length === 1 ? "" : "s"} ·{" "}
              {addedCount > 0
                ? `${addedCount} added by you, the rest from MediFlow visits`
                : "all auto-captured from your MediFlow visits"}
            </p>
            {items[0] ? (
              <p className="pt-2 text-xs text-primary-foreground/60">
                Most recent · {new Date(items[0].date).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </PatientHero>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <PatientStatCard
            icon={FileText}
            label="Total records"
            value={<CountUp value={items.length} />}
            description="prescriptions and notes"
          />
        </Reveal>
        <Reveal delay={60}>
          <PatientStatCard
            icon={Upload}
            label="Added by you"
            value={<CountUp value={addedCount} />}
            description="from other doctors"
          />
        </Reveal>
        <Reveal delay={120}>
          <PatientStatCard
            icon={Share2}
            label="Active shares"
            value={<CountUp value={activeShare ? 1 : 0} />}
            description={activeShare ? "currently viewable" : "none right now"}
          />
        </Reveal>
      </div>

      {activeShare ? (
        <Reveal>
          <Card className="glass rounded-2xl border-primary/25">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">Currently shared</p>
                  <p className="text-sm text-muted-foreground">
                    Active since {new Date(activeShare.createdAt).toLocaleString()}
                    {activeShare.viewCount > 0
                      ? ` · viewed ${activeShare.viewCount}×`
                      : " · not viewed yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <form action={revokeVaultShareAction}>
                  <input type="hidden" name="grantId" value={activeShare.id} />
                  <Button type="submit" variant="outline">
                    <XCircle className="mr-2 h-4 w-4" />
                    Revoke now
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PatientSection
          title="Your timeline"
          description="Most recent first. Items you added yourself are marked so it's always clear where something came from."
        >
          {items.length === 0 ? (
            <PatientEmptyState
              icon={FolderHeart}
              title="Your vault is empty"
              description="It fills automatically after every MediFlow visit, or add an old record from another doctor now."
              action={
                <Button asChild>
                  <Link href="/patient/vault/add">Add an old record</Link>
                </Button>
              }
            />
          ) : groupByYear ? (
            <div className="space-y-6">
              {years.map((year) => (
                <div key={year} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {year}
                  </p>
                  {items
                    .filter((i) => new Date(i.date).getFullYear() === year)
                    .map((item, i) => (
                      <TimelineRow key={item.id} item={item} delay={i * 40} />
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <TimelineRow key={item.id} item={item} delay={i * 40} />
              ))}
            </div>
          )}
        </PatientSection>

        <aside className="space-y-6">
          <PatientSideCard title="Share history" description="Every past share, revoked or replaced">
            {pastShares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
            ) : (
              <div className="space-y-0">
                {pastShares.map((g, i) => (
                  <div key={g.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      {i < pastShares.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-1 text-sm">
                      <p className="font-medium">Revoked</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(g.createdAt).toLocaleDateString()}
                        {g.viewCount > 0 ? ` · viewed ${g.viewCount}×` : " · never viewed"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PatientSideCard>

          <PatientSideCard title="How sharing works">
            <p className="text-sm text-muted-foreground">
              You choose what to share. The doctor gets a code — no MediFlow account, no login.
              The code stays valid until you create a new one or revoke it, and every view is
              logged back to you.
            </p>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}

function TimelineRow({ item, delay }: { item: VaultTimelineItem; delay: number }) {
  const href =
    item.type === "added_record"
      ? `/patient/vault/records/${item.id}`
      : `/patient/appointments/${item.appointmentId}`;
  const tone = toneFor(item);

  return (
    <Reveal delay={delay}>
      <Link href={href}>
        <Card className="rounded-xl border-l-4 border-l-primary/40 transition-colors hover:border-primary/60 hover:bg-accent/40">
          <CardContent className="flex items-center gap-4 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              {itemIcon(item)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold">{item.summary}</p>
                {item.source === "added" ? <Badge variant="secondary">Added by you</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {item.doctorName || "—"} · {new Date(item.date).toLocaleDateString()}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </Reveal>
  );
}
