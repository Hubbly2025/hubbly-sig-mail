"use client";

import Link from "next/link";
import { useEffect } from "react";
import useSWR from "swr";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { Panel, useToast } from "@/components/outreach/feedback";
import { DAYS } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import { capacityPlan, selectedMailboxes, sendingConfig, sendingError } from "@/lib/outreach/campaign-planning";
import type { Campaign, MailboxesResponse, SenderProfile, SendingConfig } from "@/lib/outreach/types";
import type { BuilderStepProps } from "./Builder";

const input = "min-h-10 px-3 rounded-control border border-control bg-surface text-sm text-ink w-full";
const label = "flex flex-col gap-1.5 text-sm text-ink-2";
export function SendingStep({ cm, registerFinish }: BuilderStepProps) {
  const c = cm.campaign!;
  const config = sendingConfig(c);
  const toast = useToast();
  const boxes = useSWR("outreach/mailboxes", (path) => api<MailboxesResponse>("GET", path));
  const profiles = useSWR("outreach/sender-profiles", (path) => api<SenderProfile[]>("GET", path));
  const mailboxes = boxes.data?.mailboxes ?? [];
  const tags = [...new Set(mailboxes.flatMap((mailbox) => mailbox.tags ?? []))];
  const selected = selectedMailboxes(config, mailboxes);
  const plan = capacityPlan(c, mailboxes, boxes.data?.limits.per_mailbox_daily);
  const set = (patch: Partial<SendingConfig>) => cm.patch({ sending: patch }, (campaign) => ({ ...campaign, sending: { ...sendingConfig(campaign), ...patch } }));
  const schedule = (patch: Partial<Campaign["schedule"]>) => cm.patch({ schedule: patch }, (campaign) => ({ ...campaign, schedule: { ...campaign.schedule, ...patch } }));
  useEffect(() => { registerFinish(async () => {
    const error = sendingError(config, c.schedule);
    if (error || !selected.length) { toast("error", error ?? "Select at least one ready mailbox."); return false; }
    return true;
  }); });
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
    <div className="flex flex-col gap-4">
      <Panel title="Mailbox pool" loading={boxes.isLoading} error={boxes.error} onRetry={() => void boxes.mutate()} empty={!mailboxes.length} emptyText="No mailboxes connected." emptyAction={<Link href="/mailboxes">Add mailboxes</Link>} bodyClassName="px-5 pb-5 flex flex-col gap-4" actions={<Link href="/mailboxes" className="text-xs">Manage mailboxes</Link>}>
        <fieldset className="border-0 m-0 p-0 flex gap-4"><legend className="sr-only">Select mailbox pool</legend>{([["manual", "Choose mailboxes"], ["tag", "By tag"]] as const).map(([mode, text]) => <label key={mode} className="flex items-center gap-2 text-sm"><input type="radio" name="pool-mode" checked={config.pool_mode === mode} onChange={() => set({ pool_mode: mode })} />{text}</label>)}</fieldset>
        {config.pool_mode === "tag" && <label className={label}>Mailbox tag<select className={input} value={config.mailbox_tag} onChange={(event) => set({ mailbox_tag: event.target.value })}><option value="">Choose a tag</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>}
        <label className={label}>Default daily cap per mailbox<input className={input} type="number" min={1} max={30} value={config.per_mailbox_cap} onChange={(event) => set({ per_mailbox_cap: Number(event.target.value) })} /></label>
        <div className="max-h-96 overflow-y-auto flex flex-col divide-y divide-divider">{mailboxes.filter((mailbox) => config.pool_mode === "manual" || mailbox.tags?.includes(config.mailbox_tag)).map((mailbox) => {
          const checked = selected.some((item) => item.id === mailbox.id);
          return <div key={mailbox.id} className="flex flex-wrap items-center gap-3 py-3"><label className="flex items-center gap-2 flex-1 min-w-0 text-sm"><input type="checkbox" checked={checked} disabled={mailbox.status !== "ready" || config.pool_mode === "tag"} onChange={(event) => set({ mailbox_ids: event.target.checked ? [...config.mailbox_ids, mailbox.id] : config.mailbox_ids.filter((id) => id !== mailbox.id) })} /><span className="min-w-0"><span className="block truncate">{mailbox.address}</span><span className="block text-xs text-muted mt-1">{mailbox.tags?.join(" · ")}</span></span></label><StatusPill tone={mailbox.status === "ready" ? "success" : "neutral"}>{mailbox.status}</StatusPill>{checked && <label className="text-xs text-muted flex items-center gap-2">Cap/day<input aria-label={`Daily cap for ${mailbox.address}`} className={`${input} !w-20`} type="number" min={1} max={30} value={config.mailbox_caps[mailbox.id] ?? config.per_mailbox_cap} onChange={(event) => set({ mailbox_caps: { ...config.mailbox_caps, [mailbox.id]: Number(event.target.value) } })} /></label>}</div>;
        })}</div>
        {config.pool_mode === "tag" && !selected.length && <p role="status" className="text-sm text-muted m-0">No ready mailboxes match this tag.</p>}
        <p className="text-xs text-muted m-0">{selected.length} ready mailboxes selected. Warming, paused, and retired mailboxes cannot send.</p>
      </Panel>
      <Panel title="Daily limits" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <label className={label}>Campaign daily cap<input className={input} type="number" min={1} max={100000} value={config.daily_cap} onChange={(event) => set({ daily_cap: Number(event.target.value) })} /></label>
        <label className={label}>Plan to finish within (sending days)<input className={input} type="number" min={1} max={365} value={config.target_days} onChange={(event) => set({ target_days: Number(event.target.value) })} /></label>
        <p role="status" className="text-sm text-muted m-0">Effective capacity: <b className="text-ink">{plan.dailyCapacity} emails/day</b>. The lower of the pool and campaign caps applies. Follow-ups share this capacity.</p>
      </Panel>
    </div>
    <div className="flex flex-col gap-4">
      <Panel title="Sender" loading={profiles.isLoading} error={profiles.error} onRetry={() => void profiles.mutate()} empty={!profiles.data?.length} emptyText="Add a sender profile in settings." bodyClassName="px-5 pb-5"><label className={label}>From<select className={input} value={c.schedule.sender_profile_id ?? ""} onChange={(event) => schedule({ sender_profile_id: event.target.value || null })}><option value="">Choose a sender</option>{profiles.data?.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.company}</option>)}</select></label><Link href="/settings" className="inline-block mt-3 text-xs">Manage sender profiles</Link></Panel>
      <Panel title="Send window" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <div role="group" aria-label="Sending days" className="flex gap-1 flex-wrap">{DAYS.map((day, index) => <button type="button" key={day} aria-pressed={c.schedule.days.includes(index)} onClick={() => schedule({ days: c.schedule.days.includes(index) ? c.schedule.days.filter((value) => value !== index) : [...c.schedule.days, index].sort() })} className={cx("min-h-10 min-w-10 px-2 rounded-control border text-sm cursor-pointer", c.schedule.days.includes(index) ? "bg-accent border-accent text-white" : "bg-surface border-control text-ink")}>{day}</button>)}</div>
        <div className="grid grid-cols-2 gap-3"><label className={label}>From<input className={input} type="time" value={c.schedule.window.start} onChange={(event) => schedule({ window: { ...c.schedule.window, start: event.target.value } })} /></label><label className={label}>Until<input className={input} type="time" value={c.schedule.window.end} onChange={(event) => schedule({ window: { ...c.schedule.window, end: event.target.value } })} /></label></div>
        <Button small onClick={() => schedule({ days: [0, 1, 2, 3, 4], window: { start: "09:00", end: "17:00" } })}>Use business hours</Button>
        <div className="rounded-control bg-accent-soft p-4 text-sm text-ink-2"><strong className="block mb-1">In the lead&apos;s time zone</strong>9 AM means 9 AM where each lead is. Leads without a known time zone are excluded until their time zone is available. Delays are calendar days; emails wait for the next allowed window.</div>
      </Panel>
      {sendingError(config, c.schedule) && <p role="status" className="m-0 text-sm text-muted">{sendingError(config, c.schedule)}</p>}
    </div>
  </div>;
}
