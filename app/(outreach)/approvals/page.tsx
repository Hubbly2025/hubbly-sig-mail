"use client";

import { useEffect, useRef, useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { Dialog, Panel, Skel, useToast } from "@/components/outreach/feedback";
import { PageHeader, useCan } from "@/components/outreach/shell";
import { RulesPanel } from "@/components/outreach/RulesPanel";
import { classification } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import { useResource } from "@/lib/outreach/hooks";
import type { InboxBundle } from "@/lib/outreach/types";

function isTyping() {
  const el = document.activeElement;
  return !!el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);
}

export default function ApprovalInbox() {
  const toast = useToast();
  const canApprove = useCan("approve");
  const q = useResource<InboxBundle[]>("outreach/inbox", { every: 10_000, refetchOnFocus: true });
  const [selId, setSelId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const items = q.data ?? [];
  const sel = items.find((b) => b.reply.id === selId) ?? items[0];
  const idx = sel ? items.indexOf(sel) : -1;
  const body = sel?.draft ? edits[sel.reply.id] ?? sel.draft.body : "";

  const remove = (id: string) => {
    q.setData((xs) => xs?.filter((b) => b.reply.id !== id));
    window.dispatchEvent(new Event("outreach:inbox-changed"));
    const next = items[idx + 1] ?? items[idx - 1];
    setSelId(next && next.reply.id !== id ? next.reply.id : null);
  };

  async function act(kind: "send" | "dismiss" | "not-interested" | "reply-dismiss" | "draft") {
    if (!sel) return;
    setBusy(true);
    try {
      if (kind === "draft") {
        const b = await api<InboxBundle>("POST", `outreach/inbox/replies/${sel.reply.id}/draft`);
        q.setData((xs) => xs?.map((x) => (x.reply.id === b.reply.id ? b : x)));
        toast("success", "Draft written.");
      } else if (kind === "reply-dismiss") {
        await api("POST", `outreach/inbox/replies/${sel.reply.id}/dismiss`);
        remove(sel.reply.id);
        toast("success", "Done with it.");
      } else {
        await api("POST", `outreach/inbox/${sel.proposal_id}/${kind}`, kind === "send" ? { subject: sel.draft?.subject, body } : undefined);
        remove(sel.reply.id);
        toast(
          kind === "send" ? "success" : kind === "not-interested" ? "warn" : "success",
          kind === "send" ? `Sent to ${sel.reply.from_name}.` : kind === "dismiss" ? "Dismissed." : `${sel.reply.from_name} won't hear from this campaign again.`
        );
      }
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  // J / K move, E edits, Enter opens the send confirmation (never sends by itself).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (confirm || isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const n = items[Math.min(items.length - 1, Math.max(0, idx + (e.key === "j" ? 1 : -1)))];
        if (n) setSelId(n.reply.id);
      } else if (e.key === "e" && sel?.draft) {
        e.preventDefault();
        editorRef.current?.focus();
      } else if (e.key === "Enter" && sel?.draft && canApprove) {
        e.preventDefault();
        setConfirm(true);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [items, idx, sel, confirm, canApprove]);

  return (
    <>
      <PageHeader
        title="Approval inbox"
        context={q.data ? `${items.length} repl${items.length === 1 ? "y needs" : "ies need"} a decision · J / K to move, E to edit, Enter to send` : " "}
      />
      <div className="flex-1 min-h-0 grid grid-cols-[380px_minmax(0,1fr)]">
        <section aria-label="Queue" className="bg-surface border-r border-line overflow-y-auto">
          {q.loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="px-4 py-3.5 border-b border-divider flex flex-col gap-2">
                  <Skel className="h-3.5 w-1/2" />
                  <Skel className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          ) : q.error ? (
            <div role="alert" className="p-6 flex flex-col items-start gap-3">
              <p className="m-0 text-ink-2">{q.error.message}</p>
              <Button onClick={q.reload}>Try again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted">Nothing is waiting on you. New replies appear here within about twenty seconds.</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {items.map((b) => {
                const on = b.reply.id === sel?.reply.id;
                const cl = classification[b.reply.classification];
                return (
                  <li key={b.reply.id}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => setSelId(b.reply.id)}
                      className={cx(
                        "w-full text-left flex flex-col gap-1.5 px-4 py-3.5 border-0 border-b border-divider cursor-pointer text-ink",
                        on ? "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]" : "bg-surface hover:bg-head"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-semibold truncate">{b.reply.from_name}</span>
                        <span className="text-meta text-muted truncate flex-1">{b.reply.company}</span>
                        <span className="text-xs text-muted shrink-0">{b.reply.received_at}</span>
                      </span>
                      <span className="text-[13px] text-ink-2 truncate">{b.reply.first_line}</span>
                      <span className="flex items-center gap-2">
                        <StatusPill tone={cl.tone} className="!min-h-[22px] !text-xs !px-2">
                          {cl.label}
                        </StatusPill>
                        {!b.draft && <span className="text-xs font-medium text-warn">No draft</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Thread" className="min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-3.5">
          {!sel ? (
            q.loading ? <Skel className="h-[300px] w-full rounded-card" /> : <div className="m-auto text-muted">Pick a reply on the left.</div>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <h2 className="m-0 text-lg font-semibold">
                  {sel.reply.from_name}
                  {sel.reply.company ? ` · ${sel.reply.company}` : ""}
                </h2>
                <span className="text-meta text-muted">{sel.campaign_name}</span>
              </div>
              {sel.thread.map((m) => (
                <article key={m.id} className={cx("max-w-[80%] bg-surface border border-line rounded-card px-4 py-3.5 flex flex-col gap-2", m.direction === "out" ? "self-end" : "self-start")}>
                  <div className="flex justify-between gap-4 text-meta text-muted">
                    <span>{m.direction === "out" ? `You sent · ${m.from}` : m.from}</span>
                    <span>{m.at}</span>
                  </div>
                  <div className={cx("text-[14px] leading-relaxed whitespace-pre-line", m.direction === "out" ? "text-ink-2" : "text-ink")}>{m.body}</div>
                </article>
              ))}

              {sel.draft ? (
                <Panel title="Your reply" className="border-accent border-[1.5px]" bodyClassName="px-5 pb-5 flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="sr-only">Reply</span>
                    <textarea
                      ref={editorRef}
                      value={body}
                      onChange={(e) => setEdits((x) => ({ ...x, [sel.reply.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Escape" && (e.target as HTMLTextAreaElement).blur()}
                      className="min-h-[170px] p-3.5 rounded-control border border-control text-[14px] leading-relaxed font-sans"
                    />
                  </label>
                  <RulesPanel subject={sel.draft.subject} body={body} first={false} initial={sel.draft.lint} />
                  {canApprove && (
                    <div className="flex items-center gap-2">
                      <Button variant="primary" disabled={busy || !body.trim()} onClick={() => setConfirm(true)}>
                        Send
                      </Button>
                      <Button disabled={busy} onClick={() => act("dismiss")}>
                        Dismiss
                      </Button>
                      <Button variant="ghost" className="ml-auto" disabled={busy} onClick={() => act("not-interested")}>
                        Not interested
                      </Button>
                    </div>
                  )}
                </Panel>
              ) : (
                <Panel title="No draft yet" bodyClassName="px-5 pb-5 flex flex-col gap-3">
                  <p className="m-0 text-ink-2 text-[14px]">The writer couldn&apos;t draft a reply when this arrived. The reply itself is safe. Ask for a draft now, or deal with it yourself.</p>
                  {canApprove && (
                    <div className="flex gap-2">
                      <Button variant="primary" disabled={busy} onClick={() => act("draft")}>
                        {busy ? "Writing…" : "Write a draft"}
                      </Button>
                      <Button disabled={busy} onClick={() => act("reply-dismiss")}>
                        Done with it
                      </Button>
                    </div>
                  )}
                </Panel>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Send this reply to ${sel?.reply.from_name ?? ""}?`}
        width={520}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Keep editing</Button>
            <Button variant="primary" disabled={busy} onClick={() => act("send")}>
              {busy ? "Sending…" : "Send"}
            </Button>
          </>
        }
      >
        <p className="m-0 mb-2 text-meta text-muted">
          From the same mailbox the thread is on, to {sel?.reply.from_email}. It&apos;s checked once more before it goes.
        </p>
        <div className="p-3.5 rounded-control bg-head text-[13.5px] leading-relaxed whitespace-pre-line">{body}</div>
      </Dialog>
    </>
  );
}
