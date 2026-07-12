"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  ArrowUpRight,
  Clock3,
  HandHeart,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/components/chat/ChatThread";

interface ConversationSummary {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  preview: string | null;
  unread: number;
  lastMessageAt: string | null;
  isMember?: boolean;
}

export function DoctorMessages({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const filtered = conversations.filter((c) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${c.patientName} ${c.patientEmail} ${c.preview ?? ""}`
      .toLowerCase()
      .includes(needle);
  });
  const active = conversations.find((c) => c.id === activeId);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const lastActivity = active?.lastMessageAt
    ? formatInTimeZone(new Date(active.lastMessageAt), "Asia/Kolkata", "MMM d, h:mm a")
    : "No messages yet";

  return (
    <Card className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-3xl border-slate-200 bg-white/95 p-0 shadow-xl md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px] [&>*]:min-h-0">
      {/* Conversation list */}
      <div className="hidden min-h-0 flex-col border-r bg-slate-50/70 md:flex">
        <div className="space-y-4 border-b bg-white/80 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight">Doctor inbox</p>
              <p className="text-sm text-muted-foreground">
                Patient follow-ups and reports
              </p>
            </div>
            <Badge variant={totalUnread > 0 ? "default" : "secondary"}>
              {totalUnread} unread
            </Badge>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-2xl border bg-background px-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patients"
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {conversations.length === 0 && (
            <div className="rounded-3xl border bg-background p-6 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-7 w-7" />
              No conversations yet.
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-3xl border bg-background px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md",
                c.id === activeId && "border-indigo-200 bg-indigo-50/70 shadow-md"
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-semibold uppercase text-indigo-700">
                {c.patientName.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{c.patientName}</span>
                  {c.isMember && (
                    <HandHeart className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.patientEmail}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {c.preview ?? "No messages yet"}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-2">
                {c.unread > 0 && <Badge>{c.unread}</Badge>}
                {c.lastMessageAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatInTimeZone(new Date(c.lastMessageAt), "Asia/Kolkata", "h:mm a")}
                  </span>
                )}
              </span>
            </button>
          ))}
          {conversations.length > 0 && filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No patients match that search.
            </p>
          )}
        </div>
      </div>

      {/* Active thread */}
      {active ? (
        <div className="min-h-0 min-w-0 overflow-hidden">
          <ChatThread
            key={active.id}
            conversationId={active.id}
            currentRole="doctor"
            peerName={active.patientName}
            peerSubtitle={active.patientEmail}
            quickReplies={[
              "Please upload the latest report here.",
              "This needs a consultation. Please book a follow-up visit.",
              "Continue the medicines as prescribed unless symptoms worsen.",
              "If symptoms are urgent, please seek emergency care immediately.",
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <MessageCircle className="h-8 w-8" />
          <p className="text-sm">Select a conversation</p>
        </div>
      )}

      <aside className="hidden min-h-0 overflow-y-auto border-l bg-slate-50/70 xl:block">
        {active ? (
          <div className="space-y-4 p-5">
            <div className="rounded-3xl border bg-background p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{active.patientName}</p>
                    {active.isMember && (
                      <Badge className="border-sky-200 bg-sky-100 text-sky-700 hover:bg-sky-100">
                        <HandHeart className="mr-1 h-3 w-3" />
                        Care
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {active.patientEmail}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <p className="text-xs text-muted-foreground">Unread</p>
                  <p className="mt-1 text-xl font-semibold">{active.unread}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3">
                  <p className="text-xs text-muted-foreground">Last active</p>
                  <p className="mt-1 text-sm font-semibold">{lastActivity}</p>
                </div>
              </div>
              <Button asChild className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/doctor/patients/${active.patientId}`}>
                  Open patient record
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-3xl border bg-background p-5 shadow-sm">
              <p className="font-semibold">Clinical guardrails</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-amber-900">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Use chat for follow-up. New symptoms or medicine changes should become a visit.</p>
                </div>
                <div className="flex gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Ask for reports, timing, severity, allergies, and current medicines before advising.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-background p-5 shadow-sm">
              <p className="font-semibold">Quick links</p>
              <div className="mt-3 grid gap-2">
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/doctor/work-queue">
                    Work queue
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/doctor/appointments">
                    Appointments
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </Card>
  );
}
