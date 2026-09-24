"use client";

import { useEffect, useRef, useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { Dialog, Panel, useToast } from "@/components/outreach/feedback";
import { RulesPanel } from "@/components/outreach/RulesPanel";
import { useCan } from "@/components/outreach/shell";
import { api } from "@/lib/outreach/client";
import { stepVariants } from "@/lib/outreach/campaign-planning";
import type { Campaign, DraftCandidate, EmailVariant, Step } from "@/lib/outreach/types";
import type { BuilderStepProps, CM } from "./Builder";

const input = "min-h-10 px-3 rounded-control border border-control bg-surface text-sm text-ink";
const label = "flex flex-col gap-1.5 text-sm text-ink-2";
function SequenceEmail({ cm, step }: { cm: CM; step: Step }) {
  const c = cm.campaign!;
  const toast = useToast();
  const canApprove = useCan("approve");
  const [active, setActive] = useState<"A" | "B">("A");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<"step" | "variant" | null>(null);
  const [alternatives, setAlternatives] = useState<DraftCandidate[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const variants = stepVariants(step);
  const variant = variants.find((item) => item.id === active) ?? variants[0];
  function update(patch: Partial<Step>) {
    const next = { ...step, ...patch, approved: false, approved_over: [] };
    if (patch.variants) { next.subject = patch.variants[0].subject; next.body = patch.variants[0].body; }
    const steps = c.steps.map((item) => item.n === step.n ? next : item);
    cm.patch({ steps }, (campaign) => ({ ...campaign, steps }));
  }
  function updateVariant(patch: Partial<EmailVariant>) { update({ variants: variants.map((item) => item.id === variant.id ? { ...item, ...patch } : item) }); }
  async function approve() {
    setBusy(true);
    try { if (!await cm.flush()) throw new Error("Save changes before approving."); cm.replace(await api<Campaign>("POST", `outreach/campaigns/${c.id}/steps/${step.n}/approve`)); toast("success", `Email ${step.n}: all variants approved.`); }
    catch (error) { toast("error", (error as Error).message); }
    finally { setBusy(false); }
  }
  async function draft() {
    setBusy(true);
    try {
      if (!await cm.flush()) throw new Error("Save the brief before drafting.");
      const result = await api<{ candidates: DraftCandidate[] }>("POST", `outreach/campaigns/${c.id}/steps/${step.n}/draft`);
      if (result.candidates[0]) { updateVariant(result.candidates[0]); setAlternatives(result.candidates.slice(1)); }
    } catch (error) { toast("error", (error as Error).message); }
    finally { setBusy(false); }
  }
  function insert(token: string) {
    const field = bodyRef.current;
    const start = field?.selectionStart ?? variant.body.length;
    const end = field?.selectionEnd ?? start;
    updateVariant({ body: variant.body.slice(0, start) + token + variant.body.slice(end) });
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + token.length, start + token.length); });
  }
  return <Panel title={`Email ${step.n}${step.n === 1 ? " · First email" : " · Follow-up"}`} actions={<div className="flex flex-wrap gap-2 items-center"><StatusPill tone={step.approved ? "success" : "neutral"}>{step.approved ? "Approved" : "Needs approval"}</StatusPill>{step.n > 1 && <Button small disabled={step.sent > 0 || step.reached > 0} onClick={() => setRemoving("step")}>Remove email</Button>}</div>} bodyClassName="px-5 pb-5 flex flex-col gap-4">
    {step.n > 1 && <label className={`${label} max-w-xs`}>Delay after previous email (days)<input className={input} type="number" min={1} max={90} step={1} value={step.delay_days ?? 2} onChange={(event) => update({ delay_days: Number(event.target.value) })} /></label>}
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label={`Email ${step.n} variants`} className="flex gap-1 rounded-control bg-head p-1">{variants.map((item, index) => <button type="button" role="tab" id={`email-${step.n}-${item.id}`} aria-selected={variant.id === item.id} aria-controls={`email-${step.n}-panel`} tabIndex={variant.id === item.id ? 0 : -1} key={item.id} onClick={() => { setActive(item.id); setAlternatives([]); }} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? variants.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + variants.length) % variants.length;
        setActive(variants[next].id); setAlternatives([]); document.getElementById(`email-${step.n}-${variants[next].id}`)?.focus();
      }} className={cx("min-h-9 min-w-20 px-3 rounded-control border-0 cursor-pointer text-sm", variant.id === item.id ? "bg-surface shadow-sm font-semibold" : "bg-transparent text-muted")}>Variant {item.id}</button>)}</div>
      {variants.length === 1 ? <Button small onClick={() => { update({ variants: [...variants, { id: "B", subject: "", body: "" }] }); setActive("B"); }}>Add B variant</Button> : <><span className="text-xs text-muted">50 / 50 split · One variant per lead</span><Button small onClick={() => setRemoving("variant")}>Remove variant {variant.id}</Button></>}
    </div>
    <div role="tabpanel" id={`email-${step.n}-panel`} aria-labelledby={`email-${step.n}-${variant.id}`} className="flex flex-col gap-3">
      <label className={label}>Subject · {variant.id}<input className={input} value={variant.subject} onChange={(event) => updateVariant({ subject: event.target.value })} /></label>
      <label className={label}>Body · {variant.id}<textarea ref={bodyRef} className={`${input} py-3 min-h-52 leading-relaxed`} value={variant.body} onChange={(event) => updateVariant({ body: event.target.value })} /></label>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted">Insert field</span>{["{first_name}", "{company}", "{website}", ...(c.type === "reactivation" ? ["{last_contact_date}", "{last_deal}", "{owner_name}"] : [])].map((token) => <Button key={token} small onClick={() => insert(token)} className="font-mono !text-xs">{token}</Button>)}</div>
      <RulesPanel subject={variant.subject} body={variant.body} first={step.n === 1} initial={step.lint} />
    </div>
    <div className="flex flex-wrap gap-2"><Button small disabled={busy} onClick={draft}>{busy ? "Working…" : "Write it for me"}</Button>{canApprove && <Button small variant="primary" disabled={busy || step.approved || variants.some((item) => !item.subject.trim() || !item.body.trim())} onClick={approve}>{step.approved ? "Approved" : "Approve all variants"}</Button>}</div>
    {alternatives.map((draft, index) => <div key={index} className="p-3 border border-line rounded-control flex flex-col gap-2"><strong className="text-sm">{draft.subject}</strong><p className="text-sm whitespace-pre-line m-0">{draft.body}</p><Button small onClick={() => { updateVariant({ subject: draft.subject, body: draft.body }); setAlternatives([]); }}>Use this alternative</Button></div>)}
    <Dialog open={!!removing} onClose={() => setRemoving(null)} title={removing === "variant" ? `Remove variant ${variant.id}?` : `Remove email ${step.n}?`} footer={<><Button onClick={() => setRemoving(null)}>Cancel</Button><Button variant="primary" onClick={() => {
      if (removing === "variant") { const remaining = variants.filter((item) => item.id !== variant.id); update({ variants: [{ ...remaining[0], id: "A" }] }); setActive("A"); }
      else { const steps = c.steps.filter((item) => item.n !== step.n).map((item, index) => ({ ...item, n: index + 1 })); cm.patch({ steps }, (campaign) => ({ ...campaign, steps })); }
      setRemoving(null);
    }}>Remove</Button></>}><p className="text-sm text-ink-2">{removing === "variant" ? "The remaining variant becomes A and receives all sends for this step. Approval is required again." : "Later follow-ups move up one step. Their delays are kept."}</p></Dialog>
  </Panel>;
}
export function SequenceStep({ cm, registerFinish }: BuilderStepProps) {
  const c = cm.campaign!;
  const toast = useToast();
  useEffect(() => { registerFinish(async () => {
    if (!c.steps.length || c.steps.some((step) => stepVariants(step).some((variant) => !variant.subject.trim() || !variant.body.trim()))) { toast("error", "Write a subject and body for every variant."); return false; }
    if (c.steps.slice(1).some((step) => !Number.isInteger(step.delay_days ?? 2) || (step.delay_days ?? 2) < 1 || (step.delay_days ?? 2) > 90)) { toast("error", "Delays must be whole days from 1 to 90."); return false; }
    return true;
  }); });
  function add() {
    const n = c.steps.length + 1;
    const steps: Step[] = [...c.steps, { n, subject: n > 1 ? `Re: ${c.steps[0].subject}` : "", body: "", delay_days: n === 1 ? 0 : 2, approved: false, approved_over: [], lint: null, sent: 0, reached: 0 }];
    cm.patch({ steps }, (campaign) => ({ ...campaign, steps }));
  }
  return <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
    <Panel title="The brief" bodyClassName="px-5 pb-5 flex flex-col gap-4"><p className="text-sm text-muted m-0">Facts for your emails. Every variant needs human approval before launch.</p>{(["offer", "proof", "ask"] as const).map((key) => <label key={key} className={label}><span className="capitalize">{key}</span><textarea className={`${input} py-2 min-h-20`} value={c.brief[key]} onChange={(event) => { const value = event.target.value; cm.patch({ brief: { [key]: value } }, (campaign) => ({ ...campaign, brief: { ...campaign.brief, [key]: value } })); }} /></label>)}</Panel>
    <div className="flex flex-col gap-4 min-w-0">{c.steps.map((step) => <SequenceEmail key={`${step.n}-${c.steps.length}`} cm={cm} step={step} />)}{c.steps.length < 4 ? <Button onClick={add}>{c.steps.length ? "Add follow-up" : "Write the first email"}</Button> : <p className="text-sm text-muted">Maximum four emails per sequence.</p>}</div>
  </div>;
}
