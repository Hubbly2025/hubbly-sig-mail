"use client";

import Link from "next/link";
import { Bar, KpiTile, StatusPill, fmt } from "@/components/ui-hubbly";
import { Panel } from "@/components/outreach/feedback";
import { PageHeader } from "@/components/outreach/shell";
import { useResource } from "@/lib/outreach/hooks";
import type { CampaignSummary, MailOverview } from "@/lib/outreach/types";

export default function OverviewPage() {
  const overview = useResource<MailOverview>("outreach/overview");
  const campaigns = useResource<CampaignSummary[]>("outreach/campaigns");
  const data = overview.data;
  const active = campaigns.data?.filter((c) => c.status === "running" || c.status === "paused").slice(0, 5) ?? [];
  const draft = campaigns.data?.find((c) => c.status === "draft");
  const state = { loading: overview.loading, error: overview.error, onRetry: overview.reload };
  return <>
    <PageHeader title="Overview" context="Last 30 days" />
    <div className="p-8 flex flex-col gap-6">
      <Panel {...state} empty={!data} emptyText="No activity recorded yet." bodyClassName="grid grid-cols-2 xl:grid-cols-5 gap-4" className="!bg-transparent !border-0">
        {data && <>
          <KpiTile label="Sent" value={fmt.n(data.sent_30d)} sub={`+${data.sent_delta_pct}% vs previous 30 days`} subTone="success" />
          <KpiTile label="Delivered" value={fmt.pct(data.delivered_rate)} sub="Of emails sent" />
          <KpiTile label="Reply rate" value={fmt.pct(data.reply_rate)} sub={`${fmt.n(data.replies)} replies`} />
          <KpiTile label="Positive replies" value={fmt.n(data.positive_replies)} sub="Conversations worth continuing" />
          <KpiTile label="Meetings booked" value={data.meetings} sub={`${data.meetings_this_week} this week`} subTone="success" />
        </>}
      </Panel>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <Panel title="Campaigns" loading={campaigns.loading} error={campaigns.error} onRetry={campaigns.reload} empty={!active.length} emptyText="No running or paused campaigns." actions={<Link href="/campaigns">View all</Link>}>
          <div className="flex justify-between px-5 py-3 bg-head text-xs text-muted"><span>Campaign</span><span>Reply rate</span></div>
          {active.map((c) => <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center gap-4 px-5 py-5 border-t border-divider no-underline text-ink hover:bg-head">
            <div className="flex-1 min-w-0"><div className="font-medium mb-2">{c.name}</div><StatusPill tone={c.status === "running" ? "success" : "warn"}>{c.status === "running" ? "Running" : "Paused"}</StatusPill></div>
            <span className="font-mono tabular">{fmt.pct(c.reply_rate)}</span>
          </Link>)}
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Needs attention" {...state} empty={!data?.needs_attention.length} emptyText="Everything looks good." className="!bg-warn-bg !border-warn-line">
            {data?.needs_attention.map((item) => <Link key={item.id} href={item.href} className="block px-5 pb-5 text-warn leading-relaxed">{item.text}</Link>)}
          </Panel>
          <Panel title="Sending today" {...state} empty={!data?.sending_today.capacity} emptyText="No sending capacity yet.">
            {data && <div className="px-5 pb-5 flex flex-col gap-3"><div><strong className="text-2xl tabular">{data.sending_today.used}</strong><span className="text-muted"> / {data.sending_today.capacity}</span></div><Bar pct={data.sending_today.capacity ? data.sending_today.used / data.sending_today.capacity * 100 : 0} /><p className="m-0 text-xs text-muted">{data.sending_today.capacity_after_warmup} per day after warmup</p></div>}
          </Panel>
          <Panel title="Waiting on you" {...state} empty={!data || !(data.waiting.replies + data.waiting.drafts)} emptyText="You’re all caught up.">
            {data && <div className="px-5 pb-5 flex flex-col gap-3"><Link href="/approvals">{data.waiting.replies} replies to review</Link>{data.waiting.drafts > 0 && <Link href={draft ? `/campaigns/${draft.id}` : "/campaigns"}>{data.waiting.drafts} draft campaign to finish</Link>}</div>}
          </Panel>
        </div>
      </div>
    </div>
  </>;
}
