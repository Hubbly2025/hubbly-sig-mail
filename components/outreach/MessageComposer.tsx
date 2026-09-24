"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { Dialog, useToast } from "./feedback";
import { RulesPanel } from "./RulesPanel";
import { SendLater } from "./SendLater";
import { api, ApiError, MOCK } from "@/lib/outreach/client";
import { formatSendTime } from "@/lib/outreach/message-time";
import type { MessageResult, ScheduledMessage } from "@/lib/outreach/types";

type Target = { name: string; email: string; timezone: string; contact_ref: string };

export function MessageEditor({ target, threadId, initialSubject = "", scheduled, onDone }: {
  target: Target; threadId?: string; initialSubject?: string; scheduled?: ScheduledMessage;
  onDone?: (result?: MessageResult) => void;
}) {
  const toast = useToast();
  const [subject, setSubject] = useState(scheduled?.subject ?? initialSubject);
  const [body, setBody] = useState(scheduled?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  async function submit(sendAt?: string) {
    if (!MOCK || busy) return;
    setBusy(true);
    setProblems([]);
    try {
      if (scheduled) {
        await api("PATCH", "outreach/scheduled", { id: scheduled.id, subject, body });
        toast("success", "Scheduled email updated (sample).");
        onDone?.();
      } else {
        const endpoint = threadId ? `outreach/threads/${encodeURIComponent(threadId)}/reply` : `outreach/leads/${encodeURIComponent(target.contact_ref)}/messages`;
        const result = await api<MessageResult>("POST", endpoint, { subject, body, ...(sendAt ? { send_at: sendAt } : {}) });
        toast("success", result.status === "scheduled" ? `Scheduled for ${formatSendTime(sendAt!, target.timezone)} (sample).` : `Sent to ${target.name} (sample).`);
        setBody("");
        onDone?.(result);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setProblems(e.message.split("\n"));
      toast("error", (e as Error).message);
    } finally { setBusy(false); }
  }

  if (!MOCK) return <p className="text-meta text-muted">Email composition is available in sample mode only.</p>;
  return <section aria-label={threadId ? "Write a reply" : "Compose email"} className="flex flex-col gap-3">
    <p className="m-0 text-meta text-muted">To {target.name} · {target.email}</p>
    {!threadId && <label className="flex flex-col gap-1.5 text-meta font-medium">Subject
      <input value={subject} disabled={busy} onChange={(e) => { setSubject(e.target.value); setProblems([]); }} className="min-h-10 px-3 border border-control rounded-control bg-surface text-ink" />
    </label>}
    <label className="flex flex-col gap-1.5 text-meta font-medium">{threadId ? "Reply" : "Message"}
      <textarea disabled={busy} value={body} onChange={(e) => { setBody(e.target.value); setProblems([]); }} rows={6} className="w-full p-3 border border-control rounded-control bg-surface text-ink text-sm leading-relaxed resize-y" placeholder={threadId ? "Write your reply…" : "Write an email to this lead…"} />
    </label>
    <RulesPanel subject={subject} body={body} first={scheduled ? scheduled.kind === "message" : !threadId} />
    {problems.length > 0 && <div role="alert" className="p-3 border border-danger rounded-control bg-danger-bg text-danger text-meta">
      <strong>Fix these problems before sending</strong>
      <ul className="m-0 mt-2 pl-5">{problems.map((problem, i) => <li key={i}>{problem}</li>)}</ul>
    </div>}
    <div className="flex items-start gap-2">
      <Button variant="primary" disabled={busy || !subject.trim() || !body.trim()} onClick={() => submit()}>{busy ? "Saving…" : scheduled ? "Save changes" : "Send"}</Button>
      {!scheduled && <SendLater timezone={target.timezone} disabled={busy || !subject.trim() || !body.trim()} onSchedule={submit} />}
    </div>
    <p className="m-0 text-xs text-muted">Sample only. No email is delivered; changes reset when the page reloads.</p>
  </section>;
}

export function EmailLeadButton({ contact_ref, name, email, timezone }: Target) {
  const [open, setOpen] = useState(false);
  return <>
    <Button small disabled={!MOCK} onClick={() => setOpen(true)}>Email this lead</Button>
    <Dialog open={open} onClose={() => setOpen(false)} title={`Email ${name}`} width={640}>
      {open && <MessageEditor key={contact_ref} target={{ contact_ref, name, email, timezone }} onDone={() => setOpen(false)} />}
    </Dialog>
  </>;
}
