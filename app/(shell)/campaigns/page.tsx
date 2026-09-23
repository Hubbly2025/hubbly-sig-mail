import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { CampaignsTable } from "@/components/campaigns/CampaignsTable";
import { Bar, ButtonLink, Card, KpiTile, fmt } from "@/components/ui-hubbly";
import { IconPlus, IconSearch, IconWarn } from "@/components/ui-hubbly/icons";
import { getSummary, listCampaigns } from "@/lib/mail/api";

export default async function CampaignsPage() {
  const [summary, campaigns] = await Promise.all([getSummary(), listCampaigns()]);
  const paused = campaigns.filter((c) => c.status === "paused");
  const today = summary.sendingToday;

  return (
    <>
      <PageHeader
        repliesWaiting={summary.repliesWaiting}
        actions={
          <>
            <label className="flex items-center gap-2 w-[260px] min-h-10 px-3 box-border border border-control rounded-control bg-surface text-muted">
              <IconSearch size={15} />
              <span className="sr-only">Search campaigns</span>
              <input type="search" placeholder="Search campaigns" className="border-0 outline-none text-sm flex-1 bg-transparent text-ink" />
            </label>
            <ButtonLink href="/campaigns/new" variant="primary">
              <IconPlus size={15} />
              New campaign
            </ButtonLink>
          </>
        }
      />

      <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-5">
        <div className="grid grid-cols-5 gap-3.5">
          <KpiTile label="Sent · last 30 days" value={fmt.n(summary.sent30d)} sub={`+${summary.sentDeltaPct}% vs previous 30`} subTone="success" />
          <KpiTile label="Delivered" value={fmt.pct(summary.deliveredRate)} sub="Bounces under 2%" />
          <KpiTile label="Reply rate" value={fmt.pct(summary.replyRate)} sub={`${fmt.n(summary.replies)} replies`} />
          <KpiTile label="Positive replies" value={fmt.n(summary.positiveReplies)} sub="Interested or meeting request" />
          <KpiTile label="Meetings booked" value={fmt.n(summary.meetings)} sub={`+${summary.meetingsThisWeek} this week`} subTone="success" />
        </div>

        <div className="flex gap-5 flex-1 min-h-0">
          <CampaignsTable campaigns={campaigns} />

          <aside className="w-[300px] shrink-0 flex flex-col gap-4">
            {paused.map((c) => (
              <section key={c.id} aria-label="Needs attention" className="bg-[#fff8ec] border border-warn-line rounded-card px-[18px] py-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-warn font-semibold">
                  <IconWarn />
                  Needs attention
                </div>
                <p className="m-0 text-[13.5px] leading-normal text-ink-2">
                  {c.name} is paused. {c.pausedReason}
                </p>
                <Link href="/domains" className="text-[13.5px] font-semibold no-underline">
                  Fix in Domains &amp; mailboxes →
                </Link>
              </section>
            ))}

            <Card aria-label="Sending today" className="px-[18px] py-4 flex flex-col gap-3.5">
              <h2 className="m-0 text-[15px] font-semibold">Sending today</h2>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold tabular">{fmt.n(today.used)}</span>
                <span className="text-muted">of {fmt.n(today.capacity)} sends</span>
              </div>
              <Bar pct={(today.used / today.capacity) * 100} height={8} />
              <dl className="m-0 flex flex-col gap-2.5 text-[13.5px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Domains</dt>
                  <dd className="m-0">{summary.domains}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Mailboxes</dt>
                  <dd className="m-0">
                    {summary.mailboxes} · {summary.mailboxesWarming} warming
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Capacity after warm-up</dt>
                  <dd className="m-0">{fmt.n(today.capacityAfterWarmup)} / day</dd>
                </div>
              </dl>
            </Card>

            <Card aria-label="Waiting on you" className="px-[18px] py-4 flex flex-col">
              <h2 className="m-0 mb-1 text-[15px] font-semibold">Waiting on you</h2>
              <Link href="/replies" className="flex justify-between items-center min-h-10 text-ink no-underline hover:text-accent">
                <span>Replies to review</span>
                <span className="font-semibold">{summary.repliesWaiting}</span>
              </Link>
              <Link href="/campaigns/cmp_reactivation" className="flex justify-between items-center min-h-10 text-ink no-underline border-t border-divider hover:text-accent">
                <span>Drafts to finish</span>
                <span className="font-semibold">{summary.draftsWaiting}</span>
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
