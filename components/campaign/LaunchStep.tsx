"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button, cx } from "@/components/ui-hubbly";
import { IconCheck } from "@/components/ui-hubbly/icons";
import { Dialog, Panel, useToast } from "@/components/outreach/feedback";
import { useCan } from "@/components/outreach/shell";
import { api } from "@/lib/outreach/client";
import { capacityPlan, sendingConfig } from "@/lib/outreach/campaign-planning";
import type { Campaign, EmailPreview, MailboxesResponse } from "@/lib/outreach/types";
import type { CM } from "./Builder";

export function LaunchStep({ cm }: { cm: CM }) {
  const c = cm.campaign!;
  const canLaunch = useCan("launch");
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxes = useSWR("outreach/mailboxes", (path) => api<MailboxesResponse>("GET", path));
  const preview = useSWR(c.steps.length ? ["first-email-preview", c.id, JSON.stringify(c.steps[0]), c.schedule.sender_profile_id] : null, () => api<EmailPreview>("POST", `outreach/campaigns/${c.id}/steps/1/preview`));
  const plan = capacityPlan(c, boxes.data?.mailboxes ?? [], boxes.data?.limits.per_mailbox_daily);
  const ready = c.checklist.every((item) => item.done) && plan.fits && !boxes.error && !boxes.isLoading && cm.save !== "error" && cm.save !== "saving";
  async function stretch() {
    if (!plan.minimumDays) return;
    cm.patch({ sending: { target_days: plan.minimumDays } }, (campaign) => ({ ...campaign, sending: { ...sendingConfig(campaign), target_days: plan.minimumDays! } }));
    if (await cm.flush()) toast("success", `Plan stretched to ${plan.minimumDays} sending days.`);
  }
  const capacity = <div className="flex flex-col gap-4">
    <p className="m-0 text-lg font-semibold leading-relaxed">This sends {plan.messages.toLocaleString("en-US")} emails over {plan.targetDays} sending days on {plan.requiredMailboxes ?? "more"} mailboxes. You have {plan.selected}.</p>
    <p className="m-0 text-sm text-muted">{plan.available} ready in your workspace · {plan.selected} in this pool · {plan.dailyCapacity}/day. A/B splits do not double sends. This conservative plan includes every follow-up and reserves {plan.delayDays} days for delays; replies reduce volume. Non-sending days extend the calendar duration.</p>
    {!plan.fits && <p role="status" className="m-0 text-sm text-warn">{!plan.selected ? "Select ready mailboxes in Sending." : plan.campaignCapLimited ? "Your campaign daily cap also limits this plan. Raising the mailbox count alone will not make it fit." : "Your selected pool needs more capacity or a longer planning window."}</p>}
    <div className="flex flex-wrap gap-2"><Link href="/mailboxes" className="inline-flex min-h-10 items-center px-3 rounded-control border border-control text-sm no-underline">Add mailboxes</Link>{plan.minimumDays !== null && plan.minimumDays > plan.targetDays && plan.minimumDays <= 365 && <Button onClick={stretch}>Stretch to {plan.minimumDays} days</Button>}<Link href={`/campaigns/${c.id}?step=3`} className="inline-flex items-center min-h-10 text-sm">Adjust sending</Link></div>
  </div>;
  return <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
    <Panel title="Launch checklist" bodyClassName="px-5 pb-5 flex flex-col gap-4"><ul className="list-none p-0 m-0 flex flex-col gap-3">{c.checklist.map((item) => <li key={item.key} className="flex gap-2 items-center text-sm"><span aria-hidden className={cx("w-5 h-5 flex items-center justify-center rounded-full shrink-0", item.done ? "bg-success-bg text-success" : "border border-control")}>{item.done && <IconCheck size={12} />}</span><span className="sr-only">{item.done ? "Done: " : "Not done: "}</span>{item.label}</li>)}</ul>{c.status === "draft" ? canLaunch ? <Button variant="primary" disabled={!ready || busy} onClick={() => setConfirm(true)}>Review and launch</Button> : <p className="text-sm text-muted">Your role cannot launch campaigns.</p> : <p className="text-sm text-muted">This campaign has already launched.</p>}<p className="m-0 text-xs text-muted">Every variant is checked again before sending. A bounce rate over 5% or a failed canary pauses the campaign.</p></Panel>
    <div className="flex flex-col gap-4 min-w-0">
      <Panel title="Capacity plan" loading={boxes.isLoading} error={boxes.error} onRetry={() => void boxes.mutate()} bodyClassName="px-5 pb-5">{capacity}</Panel>
      <Panel title="First email · Variant A preview" loading={preview.isLoading} error={preview.error} onRetry={() => void preview.mutate()} empty={!c.steps.length} emptyText="Write your first email to see the preview." bodyClassName="px-5 pb-5">{preview.data && <div className="flex flex-col gap-3"><dl className="grid grid-cols-[60px_minmax(0,1fr)] gap-2 text-sm m-0">{(["from", "to", "subject"] as const).map((key) => <div key={key} className="contents"><dt className="text-muted capitalize">{key}</dt><dd className="m-0 break-words">{preview.data?.[key]}</dd></div>)}</dl><div className="border border-line rounded-control p-4 whitespace-pre-line text-sm leading-relaxed">{preview.data.body}</div><div className="bg-head p-3 rounded-control whitespace-pre-line text-xs text-muted">{preview.data.footer}</div></div>}</Panel>
    </div>
    <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} title="Launch this campaign?" width={620} footer={<><Button disabled={busy} onClick={() => setConfirm(false)}>Not yet</Button><Button variant="primary" disabled={!ready || busy} onClick={async () => { setBusy(true); try { if (!await cm.flush()) throw new Error("Save your changes before launching."); cm.replace(await api<Campaign>("POST", `outreach/campaigns/${c.id}/launch`)); setConfirm(false); toast("success", "Campaign launched in sample mode."); } catch (error) { toast("error", (error as Error).message); } finally { setBusy(false); } }}>{busy ? "Launching…" : "Launch campaign"}</Button></>}>{capacity}</Dialog>
  </div>;
}
