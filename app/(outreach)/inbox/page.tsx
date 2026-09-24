"use client";

import { useEffect, useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { SegmentedControl } from "@/components/ui-hubbly/controls";
import { IconSearch } from "@/components/ui-hubbly/icons";
import { Dialog, Pager, Panel, useToast } from "@/components/outreach/feedback";
import { PageHeader } from "@/components/outreach/shell";
import { classification } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import { MessageEditor } from "@/components/outreach/MessageComposer";
import { ScheduledInbox } from "@/components/outreach/ScheduledInbox";
import { useDebounced, useResource } from "@/lib/outreach/hooks";
import type { Classification, Message, Page, ReplyRow, SentRow } from "@/lib/outreach/types";

type View = "replies" | "sent" | "scheduled";
type Open = { kind: "reply"; row: ReplyRow } | { kind: "sent"; row: SentRow } | null;

const delivery: Record<SentRow["delivery"], { label: string; tone: "success" | "neutral" | "danger" | "warn" }> = {
  delivered: { label: "Delivered", tone: "success" },
  queued: { label: "Queued", tone: "neutral" },
  bounced: { label: "Bounced", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
};

function Star({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill={on ? "#d39a3a" : "none"} stroke={on ? "#d39a3a" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}

export default function InboxPage() {
  const toast = useToast();
  const [view, setView] = useState<View>("replies");
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<Classification | "">("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Open>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReplyRow | null>(null);
  const dq = useDebounced(q, 300);

  useEffect(() => setPage(1), [dq, cls, view]);

  const qs = new URLSearchParams({ page: String(page) });
  if (dq) qs.set("q", dq);
  if (cls && view === "replies") qs.set("classification", cls);
  const replies = useResource<Page<ReplyRow>>(view === "replies" ? `outreach/replies?${qs}` : null, { every: 10_000, refetchOnFocus: true });
  const sent = useResource<Page<SentRow>>(view === "sent" ? `outreach/sent?${qs}` : null);
  const cur = view === "replies" ? replies : sent;

  async function star(r: ReplyRow) {
    try {
      const next = await api<ReplyRow>("POST", `outreach/replies/${r.id}/star`);
      replies.setData((p) => p && { ...p, items: p.items.map((x) => (x.id === r.id ? next : x)) });
      if (open?.kind === "reply" && open.row.id === r.id) setOpen({ kind: "reply", row: next });
      toast("success", next.starred ? "Starred — kept past the retention schedule." : "Unstarred.");
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  const thread: Message[] = open?.row.thread ?? [];

  return (
    <>
      <PageHeader title="Inbox" context={view === "scheduled" ? "Upcoming emails · sample data" : cur.data ? `${cur.data.total.toLocaleString("en-US")} ${view === "replies" ? "replies received" : "messages sent"}` : " "} />
      <div className="px-8 py-6 flex flex-col gap-4 relative">
        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedControl
            label="View"
            className="w-[360px]"
            value={view}
            onChange={(v) => {
              setView(v);
              setOpen(null);
            }}
            options={[
              { value: "replies", label: "Replies received" },
              { value: "sent", label: "Sent" },
              { value: "scheduled", label: "Scheduled" },
            ]}
          />
          <label className="flex items-center gap-2 w-[280px] min-h-10 px-3 box-border border border-control rounded-control bg-surface text-muted">
            <IconSearch size={15} />
            <span className="sr-only">Search</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, companies, text" className="border-0 outline-none text-sm flex-1 bg-transparent text-ink" />
          </label>
          {view === "replies" && (
            <label className="flex items-center gap-2 text-meta text-muted">
              Classification
              <select value={cls} onChange={(e) => setCls(e.target.value as Classification | "")} className="min-h-10 px-2.5 rounded-control border border-control bg-surface text-sm text-ink">
                <option value="">All</option>
                {Object.entries(classification).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {view === "scheduled" ? <ScheduledInbox query={dq} page={page} onPage={setPage} /> : <Panel loading={cur.loading} error={cur.error} onRetry={cur.reload} empty={cur.data?.total === 0} emptyText={q || cls ? "Nothing matches." : view === "replies" ? "No replies yet." : "Nothing sent yet."}>
          <ul className="list-none m-0 p-0">
            {view === "replies"
              ? replies.data?.items.map((r) => {
                  const cl = classification[r.classification];
                  return (
                    <li key={r.id} className={cx("flex items-center gap-3 px-5 py-3 border-b border-divider last:border-b-0", open?.row.id === r.id && "bg-accent-soft")}>
                      <button type="button" aria-label={r.starred ? "Unstar" : "Star"} aria-pressed={r.starred} onClick={() => star(r)} className="w-8 h-8 rounded-lg border-0 bg-transparent text-muted cursor-pointer hover:bg-active flex items-center justify-center">
                        <Star on={r.starred} />
                      </button>
                      <button type="button" onClick={() => setOpen({ kind: "reply", row: r })} className="flex-1 min-w-0 grid grid-cols-[200px_minmax(0,1fr)_130px_90px] gap-4 items-center text-left border-0 bg-transparent cursor-pointer text-ink p-0">
                        <span className="font-semibold truncate">{r.from_name}</span>
                        <span className="truncate text-ink-2">
                          <span className="text-ink">{r.snippet}</span> <span className="text-muted">· {r.campaign_name}</span>
                        </span>
                        <span>
                          <StatusPill tone={cl.tone} className="!min-h-[22px] !text-xs !px-2">
                            {cl.label}
                          </StatusPill>
                        </span>
                        <span className="text-meta text-muted text-right">{r.received_at}</span>
                      </button>
                    </li>
                  );
                })
              : sent.data?.items.map((s) => (
                  <li key={s.id} className={cx("px-5 py-3 border-b border-divider last:border-b-0", open?.row.id === s.id && "bg-accent-soft")}>
                    <button type="button" onClick={() => setOpen({ kind: "sent", row: s })} className="w-full grid grid-cols-[200px_minmax(0,1fr)_110px_100px] gap-4 items-center text-left border-0 bg-transparent cursor-pointer text-ink p-0">
                      <span className="font-semibold truncate">{s.to}</span>
                      <span className="truncate text-ink-2">
                        <span className="text-ink">{s.subject}</span> <span className="text-muted">· {s.snippet}</span>
                      </span>
                      <span>
                        <StatusPill tone={delivery[s.delivery].tone} className="!min-h-[22px] !text-xs !px-2">
                          {delivery[s.delivery].label}
                        </StatusPill>
                      </span>
                      <span className="text-meta text-muted text-right">{s.sent_at}</span>
                    </button>
                  </li>
                ))}
          </ul>
          {cur.data && <Pager page={page} total={cur.data.total} size={cur.data.page_size} onPage={setPage} />}
        </Panel>}
      </div>

      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-30 bg-black/10" onClick={() => setOpen(null)} />
          <aside
            role="dialog"
            aria-label="Thread"
            className="fixed top-0 right-0 bottom-0 z-40 w-[560px] bg-surface border-l border-line shadow-[-8px_0_32px_rgba(0,0,0,0.08)] flex flex-col animate-[pane-in_220ms_ease-out]"
            onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{open.kind === "reply" ? open.row.from_name : open.row.to}</div>
                <div className="text-meta text-muted truncate">{open.row.campaign_name}</div>
              </div>
              {open.kind === "reply" && (
                <>
                  <Button small onClick={() => star(open.row)}>
                    <Star on={open.row.starred} />
                    {open.row.starred ? "Starred" : "Star"}
                  </Button>
                  <Button small onClick={() => setConfirmDelete(open.row)}>
                    Delete
                  </Button>
                </>
              )}
              <button type="button" autoFocus aria-label="Close" onClick={() => setOpen(null)} className="w-9 h-9 rounded-lg border-0 bg-transparent text-muted text-xl cursor-pointer hover:bg-active">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5 bg-bg">
              {thread.map((m) => (
                <article key={m.id} className="bg-surface border border-line rounded-card px-4 py-3.5 flex flex-col gap-2">
                  <div className="flex justify-between gap-4 text-meta text-muted">
                    <span>{m.from}</span>
                    <span>{m.at}</span>
                  </div>
                  <div className="text-[13px] font-semibold">{m.subject}</div>
                  <div className="text-[14px] leading-relaxed whitespace-pre-line text-ink-2">{m.body}</div>
                </article>
              ))}
              {open.kind === "reply" && !open.row.starred && <p className="m-0 text-meta text-muted">Message bodies are deleted on the retention schedule. Star this to keep it.</p>}
              <div className="p-4 bg-surface border border-line rounded-card">
                <MessageEditor key={open.row.thread_id} threadId={open.row.thread_id} initialSubject={open.row.subject.startsWith("Re:") ? open.row.subject : `Re: ${open.row.subject}`}
                  target={{ contact_ref: open.row.contact_ref, timezone: open.row.timezone,
                    name: open.kind === "reply" ? open.row.from_name : open.row.to.split(" <")[0],
                    email: open.kind === "reply" ? open.row.from_email : open.row.to.match(/<([^>]+)>/)?.[1] ?? open.row.to }}
                  onDone={(result) => {
                    if (result?.status === "sent") {
                      setOpen((current) => current && current.row.thread_id === result.thread_id ? { ...current, row: { ...current.row, thread: result.thread } } as Open : current);
                      if (view === "replies") replies.reload(); else sent.reload();
                    }
                  }} />
              </div>
            </div>
          </aside>
        </>
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this reply?"
        width={420}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                const r = confirmDelete!;
                setConfirmDelete(null);
                try {
                  await api("DELETE", `outreach/replies/${r.id}`);
                  replies.setData((p) => p && { ...p, items: p.items.filter((x) => x.id !== r.id), total: p.total - 1 });
                  setOpen(null);
                  toast("success", "Reply deleted.");
                } catch (e) {
                  toast("error", (e as Error).message);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="m-0 text-ink-2">The reply and any draft attached to it are removed. This can&apos;t be undone.</p>
      </Dialog>
    </>
  );
}
