import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Clock,
  FileText,
  FolderHeart,
  Pill,
  Share2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { auth } from "~backend/auth/auth";
import { getVaultTimeline, listShares } from "~backend/vault/vault-share";
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
              <Button asChild size="lg" className="bg-white text-teal-900 hover:bg-teal-50">
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
          <div className="space-y-4">
            <div>
              <p className="text-sm text-teal-50/80">In your vault</p>
              <p className="mt-1 text-xl font-semibold">
                {items.length} record{items.length === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-teal-50/75">
                {addedCount > 0
                  ? `${addedCount} added by you, the rest from MediFlow visits`
                  : "All auto-captured from your MediFlow visits"}
              </p>
            </div>
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
          <Card className="glass rounded-2xl border-teal-200/70">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">Currently shared</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {new Date(activeShare.expiresAt).toLocaleString()}
                    {activeShare.viewCount > 0
                      ? ` · viewed ${activeShare.viewCount}×`
                      : " · not viewed yet"}
                  </p>
                </div>
              </div>
              <form action={revokeVaultShareAction}>
                <input type="hidden" name="grantId" value={activeShare.id} />
                <Button type="submit" variant="outline">
                  <XCircle className="mr-2 h-4 w-4" />
                  Revoke now
                </Button>
              </form>
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
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <Reveal key={item.id} delay={i * 40}>
                  <Card className="glass rounded-2xl">
                    <CardContent className="flex items-center gap-4 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Pill className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{item.summary}</p>
                          {item.source === "added" ? (
                            <Badge variant="secondary">Added by you</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.doctorName || "—"} · {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </PatientSection>

        <aside className="space-y-6">
          <PatientSideCard title="Share history" description="Every past share, revoked or expired">
            {pastShares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
            ) : (
              <div className="space-y-3">
                {pastShares.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-start gap-3 rounded-2xl border bg-background/70 p-3 text-sm"
                  >
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {g.status === "revoked" ? "Revoked" : "Expired"}
                      </p>
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
              You choose what to share and for how long. The doctor gets a code — no MediFlow
              account, no login. You can revoke access at any time, and every view is logged
              back to you.
            </p>
          </PatientSideCard>
        </aside>
      </div>
    </PatientPageShell>
  );
}
