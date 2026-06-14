"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { FileText, Paperclip, SendHorizontal, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatSocket } from "@/components/chat/useChatSocket";
import type { ChatAttachment, ChatMessage, MessagesPage } from "@/components/chat/types";

interface ChatThreadProps {
  conversationId: string;
  currentRole: "patient" | "doctor";
  /** Who you're talking to, for the header. */
  peerName: string;
}

export function ChatThread({ conversationId, currentRole, peerName }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const append = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
    );
  }, []);

  // Load history when the conversation changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/v1/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((page: MessagesPage) => {
        if (!cancelled) setMessages(page.messages);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Live messages for this conversation.
  useChatSocket(
    useCallback(
      ({ conversationId: cid, message }) => {
        if (cid === conversationId) append(message);
      },
      [conversationId, append]
    )
  );

  // Keep pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/v1/conversations/${conversationId}/attachments`,
        { method: "POST", body: form }
      );
      if (res.ok) setPendingFile(await res.json());
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    const body = draft.trim();
    if ((!body && !pendingFile) || sending) return;
    setSending(true);
    const sentFile = pendingFile;
    setDraft("");
    setPendingFile(null);
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body || undefined,
          attachmentId: sentFile?.id,
        }),
      });
      if (res.ok) {
        const { message } = await res.json();
        append(message); // socket echo is deduped by id
      } else {
        setDraft(body); // restore on failure
        setPendingFile(sentFile);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="font-medium">{peerName}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          Not monitored 24/7 — for emergencies, call your local emergency number.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderRole === currentRole;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {m.attachment &&
                  (m.attachment.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/v1/attachments/${m.attachment.id}`}
                      alt={m.attachment.filename}
                      className="mb-1 max-h-60 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <a
                      href={`/api/v1/attachments/${m.attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm underline",
                        mine ? "bg-primary-foreground/15" : "bg-background"
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{m.attachment.filename}</span>
                    </a>
                  ))}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {formatInTimeZone(new Date(m.createdAt), "Asia/Kolkata", "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3">
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{pendingFile.filename}</span>
            <button onClick={() => setPendingFile(null)} aria-label="Remove attachment">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="h-[42px] w-[42px] shrink-0"
            aria-label="Attach a file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={uploading ? "Uploading…" : "Write a message…"}
            rows={1}
            className="max-h-32 min-h-[42px] resize-none"
          />
          <Button
            onClick={send}
            disabled={(!draft.trim() && !pendingFile) || sending}
            size="icon"
            className="h-[42px] w-[42px] shrink-0"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
