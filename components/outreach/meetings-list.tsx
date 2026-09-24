"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button, StatusPill } from "@/components/ui-hubbly";
import { Panel } from "./feedback";
import { PageHeader } from "./shell";
import { api } from "@/lib/outreach/client";
import type { BookedMeeting, CampaignSummary } from "@/lib/outreach/types";

const statusLabels = { upcoming: "Upcoming", held: "Held", no_show: "No-show" } as const;
const fieldClass = "min-h-10 rounded-control border border-control bg-surface px-3 text-sm text-ink";

export function MeetingsList() {
  const meetings = useSWR("outreach/meetings", (path) => api<BookedMeeting[]>("GET", path));
  const campaigns = useSWR("outreach/campaigns", (path) => api<CampaignSummary[]>("GET", path));
  const [campaign, setCampaign] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = !!(from && to && from > to);
  const filtered = !!(campaign || from || to);
  const rows = (meetings.data ?? []).filter((meeting) => {
    const day = meeting.starts_at.slice(0, 10);
    return !invalidRange && (!campaign || meeting.campaign_id === campaign) && (!from || day >= from) && (!to || day <= to);
  }).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const campaignOptions = new Map((campaigns.data ?? []).map((item) => [item.id, item.name]));
  meetings.data?.forEach((meeting) => campaignOptions.set(meeting.campaign_id, meeting.campaign_name));
  function clear() { setCampaign(""); setFrom(""); setTo(""); }

  return <>
    <PageHeader title="Meetings" context="Booked conversations from your outreach" />
    <div className="px-4 py-6 md:px-8 flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Meeting filters">
        <label className="flex flex-col gap-1.5 text-meta text-muted">Campaign<select className={`${fieldClass} max-w-full sm:max-w-80`} value={campaign} onChange={(event) => setCampaign(event.target.value)}><option value="">All campaigns</option>{Array.from(campaignOptions).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 text-meta text-muted">From<input type="date" className={fieldClass} value={from} max={to || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? "meeting-date-error" : undefined} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="flex flex-col gap-1.5 text-meta text-muted">Through<input type="date" className={fieldClass} value={to} min={from || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? "meeting-date-error" : undefined} onChange={(event) => setTo(event.target.value)} /></label>
        {filtered && <Button onClick={clear}>Clear filters</Button>}
        <span className="sm:ml-auto text-meta text-muted py-2">Times and date filters in UTC</span>
      </div>
      {invalidRange && <p id="meeting-date-error" role="alert" className="m-0 text-sm text-danger">Choose an end date on or after the start date.</p>}
      <Panel title="Booked meetings" loading={meetings.isLoading} error={meetings.error} onRetry={() => { void meetings.mutate(); }} actions={<span className="text-meta text-muted" aria-live="polite">{rows.length} meeting{rows.length === 1 ? "" : "s"}</span>} empty={!rows.length} emptyText={filtered ? "No meetings match these filters. Try another campaign or date range." : "No meetings booked yet. Connect a calendar in Outreach settings to bring booked meetings here."} emptyAction={filtered ? <Button onClick={clear}>Clear filters</Button> : <Link href="/settings" className="text-sm font-medium underline underline-offset-4">Open Outreach settings</Link>}>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Booked outreach meetings, with times in UTC</caption><thead className="bg-head text-xs text-muted"><tr>{["Lead", "Company", "Campaign", "Time · UTC", "Source", "Status"].map((label) => <th scope="col" key={label} className="px-5 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{rows.map((meeting) => <tr key={meeting.id} className="border-t border-divider">
            <td className="p-5 font-medium whitespace-nowrap">{meeting.lead}</td><td className="p-5 whitespace-nowrap text-ink-2">{meeting.company}</td>
            <td className="p-5"><Link href={`/campaigns/${encodeURIComponent(meeting.campaign_id)}`} className="text-ink-2 underline decoration-line underline-offset-4">{meeting.campaign_name}</Link></td>
            <td className="p-5 whitespace-nowrap"><time dateTime={meeting.starts_at}>{new Date(meeting.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}<span className="block text-meta text-muted mt-1">{new Date(meeting.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}</span></time></td>
            <td className="p-5 whitespace-nowrap text-ink-2">{meeting.source === "booking_link" ? "Booking link" : "Calendar"}</td>
            <td className="p-5"><StatusPill tone={meeting.status === "upcoming" ? "neutral" : meeting.status === "held" ? "success" : "warn"}>{statusLabels[meeting.status]}</StatusPill></td>
          </tr>)}</tbody></table></div>
      </Panel>
      {!!meetings.data?.length && <p className="m-0 text-meta text-muted">Missing a meeting? Connect a calendar in <Link href="/settings" className="underline underline-offset-4">Outreach settings</Link>.</p>}
    </div>
  </>;
}
