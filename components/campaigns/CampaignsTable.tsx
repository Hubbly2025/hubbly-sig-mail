"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, SourceTag, StatusPill, fmt, type Tone } from "@/components/ui-hubbly";
import { FilterPill } from "@/components/ui-hubbly/controls";
import type { Campaign, CampaignStatus } from "@/lib/mail/types";

const statusTone: Record<CampaignStatus, Tone> = { running: "success", paused: "warn", draft: "neutral", completed: "accent" };
const statusLabel: Record<CampaignStatus, string> = { running: "Running", paused: "Paused", draft: "Draft", completed: "Completed" };
const sourceLabel = { signal: "Signal", clickrabbit: "ClickRabbit", csv: "CSV" } as const;

const cols = "grid grid-cols-[minmax(0,1fr)_118px_140px_56px_64px_70px] items-center gap-3 px-5";

type Filter = "all" | CampaignStatus;

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (s: CampaignStatus) => campaigns.filter((c) => c.status === s).length;
  const rows = useMemo(() => (filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter)), [campaigns, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: `All · ${campaigns.length}` },
    { value: "running", label: `Running · ${count("running")}` },
    { value: "paused", label: `Paused · ${count("paused")}` },
    { value: "draft", label: `Draft · ${count("draft")}` },
  ];

  return (
    <section aria-label="Campaigns" className="flex-1 min-w-0 bg-surface border border-line rounded-card flex flex-col overflow-hidden self-start">
      <div className="flex items-center gap-2 px-5 py-3.5">
        <h2 className="m-0 mr-3 text-base font-semibold">Campaigns</h2>
        {filters.map((f) => (
          <FilterPill key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </FilterPill>
        ))}
      </div>

      <div role="table" aria-label="Campaigns">
        <div role="row" className={`${cols} py-2.5 bg-head border-t border-divider text-xs font-medium text-muted`}>
          <div role="columnheader">Campaign</div>
          <div role="columnheader">Status</div>
          <div role="columnheader">Progress</div>
          <div role="columnheader" className="text-right">Reply</div>
          <div role="columnheader" className="text-right">Positive</div>
          <div role="columnheader" className="text-right">Meetings</div>
        </div>

        {rows.map((c) => {
          const pct = c.total ? (c.sent / c.total) * 100 : c.sent > 0 ? 100 : 0;
          const prog =
            c.status === "draft" ? "Not started" : c.total === null ? `${fmt.n(c.sent)} sent · always on` : `${fmt.n(c.sent)} / ${fmt.n(c.total)}`;
          return (
            <div role="row" key={c.id} className={`${cols} py-3.5 border-t border-divider`}>
              <div role="cell" className="flex flex-col gap-1 min-w-0">
                <Link href={`/campaigns/${c.id}`} className="text-ink font-semibold no-underline truncate hover:text-accent">
                  {c.name}
                </Link>
                <div className="flex items-center gap-1.5 min-w-0">
                  <SourceTag>{sourceLabel[c.audience.source]}</SourceTag>
                  <span className="text-meta text-muted truncate">{c.audience.label}</span>
                </div>
              </div>
              <div role="cell">
                <StatusPill tone={statusTone[c.status]}>{c.status === "paused" ? "Paused · domain" : statusLabel[c.status]}</StatusPill>
              </div>
              <div role="cell" className="flex flex-col gap-1.5">
                <Bar pct={pct} color={c.status === "paused" ? "#c8892e" : undefined} />
                <div className="text-xs text-muted font-mono">{prog}</div>
              </div>
              <div role="cell" className="text-right tabular">{fmt.pct(c.replyRate)}</div>
              <div role="cell" className="text-right tabular">{c.status === "draft" ? "—" : fmt.n(c.positiveReplies)}</div>
              <div role="cell" className="text-right tabular font-semibold">{c.status === "draft" ? "—" : fmt.n(c.meetings)}</div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="px-5 py-10 text-center text-muted border-t border-divider">No campaigns here yet.</div>}
      </div>
    </section>
  );
}
