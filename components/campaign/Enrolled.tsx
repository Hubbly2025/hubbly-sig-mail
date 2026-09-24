"use client";

import { useState } from "react";
import { StatusPill, type Tone } from "@/components/ui-hubbly";
import { Pager, Panel } from "@/components/outreach/feedback";
import { useResource } from "@/lib/outreach/hooks";
import type { Campaign, Enrollment, EnrollmentStatus, Page } from "@/lib/outreach/types";

const st: Record<EnrollmentStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warn" },
  replied: { label: "Replied", tone: "accent" },
  finished: { label: "Finished", tone: "neutral" },
  bounced: { label: "Bounced", tone: "danger" },
  unsubscribed: { label: "Unsubscribed", tone: "danger" },
};

export function Enrolled({ campaign }: { campaign: Campaign }) {
  const [page, setPage] = useState(1);
  const r = useResource<Page<Enrollment>>(`outreach/campaigns/${campaign.id}/enrollments?page=${page}`);
  const cols = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_130px_110px_160px] gap-4 items-center px-5";
  return (
    <div className="px-8 py-6">
      <Panel title="Enrolled leads" loading={r.loading} error={r.error} onRetry={r.reload} empty={r.data?.total === 0} emptyText="Nobody is enrolled in this campaign.">
        <div role="table" aria-label="Enrolled leads">
          <div role="row" className={`${cols} py-2.5 bg-head text-xs font-medium text-muted border-t border-divider`}>
            <div role="columnheader">Lead</div>
            <div role="columnheader">Email</div>
            <div role="columnheader">Status</div>
            <div role="columnheader">Step</div>
            <div role="columnheader">Next due</div>
          </div>
          {r.data?.items.map((e) => (
            <div role="row" key={e.lead_id} className={`${cols} py-3 border-t border-divider`}>
              <div role="cell" className="font-semibold truncate">{e.name}</div>
              <div role="cell" className="font-mono text-[12.5px] truncate">{e.email}</div>
              <div role="cell">
                <StatusPill tone={st[e.status].tone}>{st[e.status].label}</StatusPill>
              </div>
              <div role="cell" className="text-ink-2">
                {e.step} of {campaign.steps.length}
              </div>
              <div role="cell" className="text-ink-2">{e.next_due ?? "—"}</div>
            </div>
          ))}
        </div>
        {r.data && <Pager page={page} total={r.data.total} size={r.data.page_size} onPage={setPage} />}
      </Panel>
    </div>
  );
}
