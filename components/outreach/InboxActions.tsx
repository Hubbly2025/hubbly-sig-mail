"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { Dialog, useToast } from "./feedback";
import { api } from "@/lib/outreach/client";
import { useResource } from "@/lib/outreach/hooks";
import { localDateTime, presetTime, toInstant, formatSendTime } from "@/lib/outreach/message-time";
import type { ReplyRow, SentRow } from "@/lib/outreach/types";

export function InboxActions({ item, onChanged }: { item: { kind: "reply"; row: ReplyRow } | { kind: "sent"; row: SentRow }; onChanged: (row?: ReplyRow) => void }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<"time" | "link" | null>(null);
  const [preset, setPreset] = useState("tomorrow");
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [lead, setLead] = useState("");
  const [busy, setBusy] = useState(false);
  const options = useResource<{ leads: { contact_ref: string; name: string; email: string }[] }>(dialog === "link" ? "outreach/inbox-options" : null);
  const row = item.row;
  async function act(action: string, body?: object) {
    setBusy(true);
    try {
      const result = await api<ReplyRow>("POST", `outreach/${item.kind === "reply" ? "replies" : "sent"}/${row.id}/${action}`, body);
      onChanged(item.kind === "reply" ? result : undefined); setDialog(null);
      toast("success", action === "remind" ? "Reminder set if no reply arrives." : "Inbox updated.");
    } catch (e) { toast("error", (e as Error).message); } finally { setBusy(false); }
  }
  function schedule() {
    try {
      let until: string;
      if (preset === "custom") until = toInstant(custom, row.timezone);
      else if (preset === "month") {
        const day = new Date(`${localDateTime(new Date(), row.timezone).slice(0, 10)}T09:00:00Z`);
        const d = day.getUTCDate(); day.setUTCDate(1); day.setUTCMonth(day.getUTCMonth() + 2); day.setUTCDate(0);
        day.setUTCDate(Math.min(d, day.getUTCDate()));
        until = toInstant(day.toISOString().slice(0, 16), row.timezone);
      } else until = presetTime(preset === "monday" ? "monday" : "tomorrow", row.timezone);
      void act(item.kind === "sent" ? "remind" : "snooze", { until, note });
    } catch (e) { toast("error", (e as Error).message); }
  }
  return <>
    <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-line">
      {item.kind === "reply" ? <>
        <Button small disabled={busy} onClick={() => act("unread")}>Mark unread</Button>
        <Button small disabled={busy} onClick={() => item.row.snoozed_until ? act("unsnooze") : setDialog("time")}>{item.row.snoozed_until ? "Unsnooze" : "Snooze"}</Button>
        <Button small disabled={busy} onClick={() => act(item.row.archived ? "unarchive" : "archive")}>{item.row.archived ? "Unarchive" : "Archive"}</Button>
        {item.row.untracked && <><Button small disabled={busy} onClick={() => setDialog("link")}>Link to a lead</Button><Button small disabled={busy} onClick={() => act("handled")}>Mark handled</Button><Button small disabled={busy} onClick={() => act("opt-out")}>Add to opt-out list</Button></>}
      </> : <Button small disabled={busy} onClick={() => setDialog("time")}>Remind me if no reply by…</Button>}
    </div>
    {item.kind === "reply" && (item.row.reminder || item.row.snoozed_until) && <div className="px-5 py-3 text-sm bg-accent-soft text-accent-ink"><strong>{item.row.reminder ? "Reminder" : `Snoozed until ${formatSendTime(item.row.snoozed_until!, row.timezone)}`}</strong>{item.row.note && <p className="m-0 mt-1 whitespace-pre-wrap">{item.row.note}</p>}</div>}
    <Dialog open={dialog === "time"} onClose={() => !busy && setDialog(null)} title={item.kind === "sent" ? "Remind me if no reply by…" : "Snooze reply"} width={440} footer={<><Button disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={schedule}>{item.kind === "sent" ? "Set reminder" : "Snooze reply"}</Button></>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">When<select value={preset} onChange={(e) => setPreset(e.target.value)} className="min-h-10 border border-control rounded-control bg-surface px-3"><option value="tomorrow">Tomorrow</option><option value="monday">Next Monday</option><option value="month">In a month</option><option value="custom">Custom</option></select></label>
        <p className="m-0 text-meta text-muted">Times use {row.timezone}. Presets wake at 9 AM.</p>
        {preset === "custom" && <label className="flex flex-col gap-2">Date and time<input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className="min-h-10 border border-control rounded-control bg-surface px-3" /></label>}
        <label className="flex flex-col gap-2">Note (optional)<textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="min-h-24 border border-control rounded-control bg-surface p-3" /></label>
      </div>
    </Dialog>
    <Dialog open={dialog === "link"} onClose={() => !busy && setDialog(null)} title="Link to a lead" width={440} footer={<><Button disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" disabled={busy || !lead} onClick={() => act("link", { contact_ref: lead })}>Link lead</Button></>}>
      {options.error ? <Button onClick={options.reload}>Retry leads</Button> : <label className="flex flex-col gap-2">Lead<select value={lead} onChange={(e) => setLead(e.target.value)} className="min-h-10 border border-control rounded-control bg-surface px-3"><option value="">{options.loading ? "Loading…" : "Choose a lead"}</option>{options.data?.leads.map((l) => <option key={l.contact_ref} value={l.contact_ref}>{l.name} · {l.email}</option>)}</select></label>}
    </Dialog>
  </>;
}
