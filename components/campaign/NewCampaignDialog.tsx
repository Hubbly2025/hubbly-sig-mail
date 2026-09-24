"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { Dialog, useToast } from "@/components/outreach/feedback";
import { api } from "@/lib/outreach/client";
import { campaignTypes } from "@/lib/outreach/campaign-planning";
import type { CampaignSummary, CampaignType } from "@/lib/outreach/types";

export function NewCampaignDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<CampaignType>("cold_outreach");
  const [step, setStep] = useState<"type" | "name">("type");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try { const campaign = await api<CampaignSummary>("POST", "outreach/campaigns", { name: name.trim(), type }); router.push(`/campaigns/${campaign.id}`); onClose(); }
    catch (error) { toast("error", (error as Error).message); setBusy(false); }
  }
  return <Dialog open onClose={() => !busy && onClose()} title={step === "type" ? "What type of campaign?" : "Name your campaign"} width={540} footer={<><Button disabled={busy} onClick={() => step === "type" ? onClose() : setStep("type")}>{step === "type" ? "Cancel" : "Back"}</Button><Button variant="primary" disabled={busy || (step === "name" && !name.trim())} onClick={() => step === "type" ? setStep("name") : create()}>{step === "type" ? "Continue" : busy ? "Creating…" : "Create draft"}</Button></>}>
    {step === "type" ? <fieldset className="border-0 m-0 p-0 flex flex-col gap-3"><legend className="sr-only">Campaign type</legend>{(["cold_outreach", "reactivation"] as const).map((value) => <label key={value} className={cx("flex gap-3 p-4 border rounded-card cursor-pointer", value === type ? "border-accent bg-accent-soft" : "border-line")}><input className="mt-1" type="radio" name="campaign-type" checked={type === value} onChange={() => setType(value)} /><span><span className="block font-semibold">{campaignTypes[value]}</span><span className="block mt-1 text-sm text-ink-2">{value === "cold_outreach" ? "Start new conversations with leads who fit your audience." : "Reconnect with past leads using their stage, activity, and deal history."}</span></span></label>)}<label className="flex gap-3 p-4 border border-line rounded-card bg-head cursor-not-allowed"><input type="radio" name="campaign-type" disabled /><span className="flex-1"><span className="flex items-center justify-between gap-2 font-semibold text-muted">Broadcast<StatusPill tone="neutral">Coming later</StatusPill></span><span className="block mt-1 text-sm text-muted">One-time updates to an existing audience.</span></span></label></fieldset> : <form onSubmit={(event) => { event.preventDefault(); void create(); }}><StatusPill tone="accent">{campaignTypes[type]}</StatusPill><label className="flex flex-col gap-2 mt-4 text-sm">Campaign name<input autoFocus maxLength={120} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} placeholder={type === "reactivation" ? "e.g. Reconnect with past trials" : "e.g. Pricing-page visitors — October"} className="min-h-11 px-3 rounded-control border border-control bg-surface text-ink" /></label><p className="text-sm text-muted mb-0">Saved as a draft. Nothing sends until you approve and launch.</p></form>}
  </Dialog>;
}
