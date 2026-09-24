"use client";

import { StatusPill, cx } from "@/components/ui-hubbly";
import { Panel } from "@/components/outreach/feedback";
import { PageHeader, useStatus } from "@/components/outreach/shell";
import { useResource } from "@/lib/outreach/hooks";
import type { Metrics } from "@/lib/outreach/types";

const ago = (s: number) => (s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`);

/** Operators only. Not in the sidebar. */
export default function HealthPage() {
  const status = useStatus();
  const m = useResource<Metrics>(status?.operator ? "outreach/metrics" : null, { every: 30_000 });
  if (status && !status.operator) return <div className="p-8 text-ink-2">This page is for operators.</div>;
  const d = m.data;

  return (
    <>
      <PageHeader
        title="Outreach health"
        context="Refreshes every 30 seconds"
        actions={d && <StatusPill tone={d.mode === "live" ? "success" : "warn"}>{d.mode === "live" ? "Sending is live" : "Dry run — nothing is really sent"}</StatusPill>}
      />
      <div className="px-8 py-6 grid grid-cols-2 gap-5 items-start">
        <Panel title="Right now" loading={m.loading} error={m.error} onRetry={m.reload} bodyClassName="px-5 pb-5">
          {d && (
            <dl className="m-0 grid grid-cols-3 gap-4">
              {[
                ["Sent in the last hour", d.sent_last_hour],
                ["Replies in the last hour", d.replies_last_hour],
                ["Stale locks", d.stale_locks],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-meta text-muted">{k}</dt>
                  <dd className={cx("m-0 text-2xl font-semibold tabular", k === "Stale locks" && Number(v) > 0 && "text-danger")}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>

        <Panel title="Mailbox health" loading={m.loading} error={m.error} onRetry={m.reload} bodyClassName="px-5 pb-5">
          {d && (
            <dl className="m-0 grid grid-cols-4 gap-4">
              {(
                [
                  ["Ready", d.mailbox_health.ready, "text-success"],
                  ["Warming", d.mailbox_health.warming, "text-accent-ink"],
                  ["Paused", d.mailbox_health.paused, "text-warn"],
                  ["Burnt", d.mailbox_health.burnt, "text-danger"],
                ] as const
              ).map(([k, v, c]) => (
                <div key={k}>
                  <dt className="text-meta text-muted">{k}</dt>
                  <dd className={cx("m-0 text-2xl font-semibold tabular", c)}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>

        <Panel title="Job queues" loading={m.loading} error={m.error} onRetry={m.reload}>
          <div role="table" aria-label="Job queues">
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_90px_190px] gap-3 px-5 py-2 bg-head text-xs font-medium text-muted border-t border-divider">
              <div role="columnheader">Queue</div>
              <div role="columnheader" className="text-right">Depth</div>
              <div role="columnheader" className="text-right">Oldest nobody picked up</div>
            </div>
            {d?.queues.map((q) => (
              <div role="row" key={q.name} className="grid grid-cols-[minmax(0,1fr)_90px_190px] gap-3 px-5 py-2.5 border-t border-divider text-[13px]">
                <div role="cell" className="font-mono">{q.name}</div>
                <div role="cell" className="text-right tabular">{q.depth}</div>
                <div role="cell" className={cx("text-right", (q.oldest_unclaimed_s ?? 0) > 600 && "text-danger font-semibold")}>
                  {q.oldest_unclaimed_s === null ? "—" : ago(q.oldest_unclaimed_s)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Workers" loading={m.loading} error={m.error} onRetry={m.reload}>
          <ul className="list-none m-0 p-0">
            {d?.workers.map((w) => (
              <li key={w.name} className="flex items-center gap-3 px-5 py-2.5 border-t border-divider text-[13px]">
                <span aria-hidden className={cx("w-2 h-2 rounded-full", w.last_seen_s > 120 ? "bg-warn-dot" : "bg-success-dot")} />
                <span className="font-mono flex-1">{w.name}</span>
                <span className={w.last_seen_s > 120 ? "text-warn" : "text-muted"}>checked in {ago(w.last_seen_s)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
