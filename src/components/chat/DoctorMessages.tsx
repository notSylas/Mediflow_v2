"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatThread } from "@/components/chat/ChatThread";

interface ConversationSummary {
  id: string;
  patientName: string;
  preview: string | null;
  unread: number;
  lastMessageAt: string | null;
}

export function DoctorMessages({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const active = conversations.find((c) => c.id === activeId);

  return (
    <Card className="grid h-full grid-cols-1 overflow-hidden p-0 md:grid-cols-[300px_1fr]">
      {/* Conversation list */}
      <div className="hidden flex-col border-r md:flex">
        <div className="border-b px-4 py-3">
          <p className="font-medium">Messages</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                c.id === activeId && "bg-muted"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium uppercase text-accent-foreground">
                {c.patientName.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.patientName}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {c.preview ?? "No messages yet"}
                </span>
              </span>
              {c.unread > 0 && <Badge>{c.unread}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {/* Active thread */}
      {active ? (
        <ChatThread
          key={active.id}
          conversationId={active.id}
          currentRole="doctor"
          peerName={active.patientName}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <MessageCircle className="h-8 w-8" />
          <p className="text-sm">Select a conversation</p>
        </div>
      )}
    </Card>
  );
}
