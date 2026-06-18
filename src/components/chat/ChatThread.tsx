"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  ChevronUp,
  FileText,
  Loader2,
  Paperclip,
  SendHorizontal,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react";
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
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingFile, setPendingFile] = useState<ChatAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef<string | null>(null);

  const append = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
    );
  }, []);

  const markRead = useCallback(() => {
    void fetch(`/api/v1/conversations/${conversationId}/read`, { method: "POST" });
  }, [conversationId]);

  // Load the latest page when the conversation changes. (Parent remounts this
  // via `key`, so `loading` starts true and we only ever clear it here.)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((page: MessagesPage) => {
        if (cancelled) return;
        setMessages(page.messages);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Live messages for this conversation. A message from the other side that
  // lands while the thread is open should be marked read immediately.
  useChatSocket(
    useCallback(
      ({ conversationId: cid, message }) => {
        if (cid !== conversationId) return;
        append(message);
        if (message.senderRole !== currentRole) markRead();
      },
      [conversationId, currentRole, append, markRead]
    )
  );

  // Stick to the latest message only when one is appended at the bottom — not
  // when older history is prepended.
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    if (lastId !== lastIdRef.current) {
      lastIdRef.current = lastId;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  const loadOlder = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/v1/conversations/${conversationId}/messages?before=${cursor}`
      );
      if (res.ok) {
        const page: MessagesPage = await res.json();
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...page.messages.filter((m) => !seen.has(m.id)), ...prev];
        });
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/v1/conversations/${conversationId}/attachments`,
        { method: "POST", body: form }
      );
      if (res.ok) {
        setPendingFile(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setUploadError(body?.error ?? "Upload failed. Please try again.");
      }
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
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
      <div className="border-b bg-background/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{peerName}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Not monitored 24/7 — for emergencies, call your local emergency number.
            </p>
          </div>
          <span className="hidden rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            Secure chat
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.08),transparent_34%),linear-gradient(180deg,rgba(248,250,252,0.7),rgba(255,255,255,0.92))] px-4 py-5"
      >
        {loading && (
          <div className="mx-auto mt-8 w-fit rounded-full border bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            Loading conversation…
          </div>
        )}
        {!loading && hasMore && (
          <div className="flex justify-center pb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOlder}
              disabled={loadingMore}
              className="text-xs text-muted-foreground"
            >
              {loadingMore ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
              Load earlier messages
            </Button>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border bg-background/85 p-5 text-center shadow-sm">
            <p className="font-medium">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a short, specific follow-up question.
            </p>
          </div>
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
                  "max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border bg-background text-foreground"
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

      <div className="border-t bg-background/95 p-3 backdrop-blur">
        {uploadError && (
          <p className="mb-2 text-xs text-destructive">{uploadError}</p>
        )}
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border bg-muted/60 px-3 py-2 text-sm">
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
            className="h-11 w-11 shrink-0 rounded-2xl"
            aria-label="Attach a file"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
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
            placeholder="Write a message…"
            rows={1}
            className="max-h-32 min-h-11 resize-none rounded-2xl bg-background/80"
          />
          <Button
            onClick={send}
            disabled={(!draft.trim() && !pendingFile) || sending}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
