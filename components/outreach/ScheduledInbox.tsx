"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { Dialog, Pager, Panel, useToast } from "./feedback";
import { MessageEditor } from "./MessageComposer";
import { SendLater } from "./SendLater";
import { api, MOCK } from "@/lib/outreach/client";
import { useResource } from "@/lib/outreach/hooks";
import { formatSendTime } from "@/lib/outreach/message-time";
import type { Page, ScheduledMessage } from "@/lib/outreach/types";

export function ScheduledInbox({ query, campaign = "", page, onPage }: { query: string; campaign?: string; page: number; onPage: (page: number) => void }) {
  const toast = useToast();
  const data = useResource<Page<ScheduledMessage>>(MOCK ? `outreach/scheduled?${new URLSearchParams({ q: query, campaign, page: String(page) })}` : null);
  const [edit, setEdit] = useState<ScheduledMessage | null>(null);
  const [reschedule, setReschedule] = useState<ScheduledMessage | null>(null);
  const [cancel, setCancel] = useState<ScheduledMessage | null>(null);
  const [busy, setBusy] = useState(false);
  async function change(kind: "cancel" | "reschedule", sendAt?: string) {
    const row = kind === "cancel" ? cancel : reschedule;
    if (!row || busy || !MOCK) return;
    setBusy(true);
    try {
      await api(kind === "cancel" ? "DELETE" : "PATCH", "outreach/scheduled", { id: row.id, ...(sendAt ? { send_at: sendAt } : {}) });
      toast("success", kind === "cancel" ? "Scheduled email cancelled (sample)." : "Email rescheduled (sample).");
      setCancel(null); setReschedule(null);
      if (kind === "cancel" && data.data?.items.length === 1 && page > 1) onPage(page - 1);
      else data.reload();
    } catch (e) { toast("error", (e as Error).message); }
    finally { setBusy(false); }
  }
  if (!MOCK) return <p className="text-muted">Scheduled email is available in sample mode only.</p>;
  return <>
    <Panel title="Scheduled emails" loading={data.loading} error={data.error} onRetry={data.reload} empty={data.data?.total === 0} emptyText={query ? "Nothing matches." : "No scheduled emails. Use Send later in a thread or lead email."}>
      <ul className="list-none m-0 p-0">{data.data?.items.map((row) => <li key={row.id} className="border-b border-divider last:border-0 px-5 py-4 flex items-center gap-4">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <span className="font-semibold">{row.to_name} <span className="text-muted font-normal text-meta">· {row.to_email}</span></span>
          <span className="truncate">{row.subject}</span>
          <span className="truncate text-meta text-muted">{row.body}</span>
          <time dateTime={row.send_at} className="text-meta text-accent-ink">{formatSendTime(row.send_at, row.timezone)} · {row.timezone}</time>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button small onClick={() => setEdit(row)}>Edit</Button>
          <Button small onClick={() => setReschedule(row)}>Reschedule</Button>
          <Button small onClick={() => setCancel(row)}>Cancel</Button>
        </div>
      </li>)}</ul>
      {data.data && <Pager page={page} total={data.data.total} size={data.data.page_size} onPage={onPage} />}
    </Panel>
    <Dialog open={!!edit} onClose={() => setEdit(null)} title="Edit scheduled email" width={640}>
      {edit && <MessageEditor key={edit.id} scheduled={edit} target={{ contact_ref: edit.contact_ref, name: edit.to_name, email: edit.to_email, timezone: edit.timezone }} onDone={() => { setEdit(null); data.reload(); }} />}
    </Dialog>
    <Dialog open={!!reschedule} onClose={() => !busy && setReschedule(null)} title="Reschedule email" width={480}>
      {reschedule && <div className="flex flex-col gap-4">
        <p className="m-0 text-ink-2">To {reschedule.to_name} · Currently {formatSendTime(reschedule.send_at, reschedule.timezone)}</p>
        <SendLater key={reschedule.id} timezone={reschedule.timezone} initial={reschedule.send_at} disabled={busy} label="Choose a new time" onSchedule={(instant) => change("reschedule", instant)} />
      </div>}
    </Dialog>
    <Dialog open={!!cancel} onClose={() => !busy && setCancel(null)} title="Cancel this scheduled email?" width={440} footer={<>
      <Button disabled={busy} onClick={() => setCancel(null)}>Keep scheduled</Button>
      <Button variant="primary" disabled={busy} onClick={() => change("cancel")}>{busy ? "Cancelling…" : "Cancel email"}</Button>
    </>}><p className="m-0 text-ink-2">The email to {cancel?.to_name} will be removed from the sample schedule. This cannot be undone.</p></Dialog>
  </>;
}
