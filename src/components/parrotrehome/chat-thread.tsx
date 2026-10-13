"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateUTC } from "@/lib/constants";
import { Send, Clock, MessageSquare, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  senderId: string | null;
  senderRole: string;
  senderName: string;
  senderDisplayName?: string;
  body: string;
  attachments?: string | null;
  createdAt: string;
  readAt?: string | null;
}

interface ChatThreadProps {
  requestId: string;
  currentUserId: string;
  currentUserRole: string;
  /** Customer view shows staff replies in iris; staff view shows customer in tail-red */
  variant: "customer" | "admin";
  /** Disable reply when status is closed */
  canReply: boolean;
}

export function ChatThread({
  requestId,
  currentUserId,
  currentUserRole,
  variant,
  canReply,
}: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error("[chat] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    load();
    // Poll every 15s for new messages (V2 — production should use WebSocket)
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (body.trim().length < 2) {
      toast.error("Message too short (min 2 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBody("");
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function isOwnMessage(m: Message): boolean {
    return m.senderId === currentUserId && m.senderRole === currentUserRole;
  }

  return (
    <div className="bg-white rounded-xl border border-feather/20 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-feather/15 flex items-center justify-between bg-ivory/50">
        <h3 className="font-heading text-slate text-[16px] font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-feather" aria-hidden /> Secure messages
        </h3>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 text-feather hover:text-slate text-[12px] font-body font-semibold"
          aria-label="Refresh messages"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Thread */}
      <div className="px-4 py-4 space-y-3 max-h-[24rem] overflow-y-auto custom-scroll bg-ivory/30">
        {loading ? (
          <p className="text-feather text-[13px] font-body italic text-center py-8">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-feather/40 mx-auto mb-2" aria-hidden />
            <p className="text-feather text-[13px] font-body">
              No messages yet. Start the conversation below.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const own = isOwnMessage(m);
            const isStaff = ["AGENT", "MANAGER", "SUPER_ADMIN", "STOCK_MANAGER", "AVIAN_PROFESSIONAL"].includes(m.senderRole);
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    own
                      ? variant === "customer"
                        ? "bg-tail-red text-white"
                        : "bg-slate text-ivory"
                      : isStaff
                      ? "bg-iris/15 text-slate border border-iris/30"
                      : "bg-white text-slate border border-feather/30"
                  }`}
                >
                  {/* Sender name + role */}
                  <div className={`text-[11px] font-body font-semibold mb-0.5 ${own ? "opacity-80" : "text-feather"}`}>
                    {m.senderDisplayName ?? m.senderName}
                    <span className="ml-1 opacity-70 lowercase">· {m.senderRole.replace(/_/g, " ").toLowerCase()}</span>
                  </div>
                  {/* Body */}
                  <p className="text-[14px] font-body leading-relaxed whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                  {/* Timestamp */}
                  <div className={`text-[10px] font-body mt-1 ${own ? "opacity-70" : "text-feather"}`}>
                    {formatDateUTC(new Date(m.createdAt))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-feather/15 bg-white">
        {canReply ? (
          <form onSubmit={send} className="flex items-start gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Type your message…"
              className="flex-1 px-3 py-2 rounded-md border border-feather/30 bg-ivory text-[14px] font-body focus-ring resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send(e as unknown as React.FormEvent);
                }
              }}
            />
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="inline-flex items-center justify-center gap-1 h-10 px-4 rounded-full bg-tail-red hover:bg-tail-red-dark text-white text-[13px] font-body font-semibold transition-colors focus-ring disabled:bg-feather/40"
            >
              {submitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          </form>
        ) : (
          <p className="text-feather text-[12px] font-body italic text-center">
            Messaging is disabled — this request is closed.
          </p>
        )}
        <p className="text-[11px] text-feather font-body mt-1">
          Messages are visible to the assigned agent and the customer. All posts are recorded in the audit log. Cmd/Ctrl+Enter to send.
        </p>
      </div>
    </div>
  );
}
