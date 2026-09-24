"use client";

import { Button, ButtonLink, fmt, type Tone } from "@/components/ui-hubbly";
import { Panel } from "./feedback";
import type { LeadList, Verification } from "@/lib/outreach/types";

export const verificationStyles: Record<Verification, { label: string; color: string; tone: Tone }> = {
  valid: { label: "Valid", color: "#2E8A5C", tone: "success" },
  catch_all_verified: { label: "Catch-all verified", color: "#3F6FD8", tone: "accent" },
  risky: { label: "Risky", color: "#D39A3A", tone: "warn" },
  invalid: { label: "Invalid", color: "#C2412F", tone: "danger" },
  duplicate: { label: "Duplicates", color: "#A3A39C", tone: "neutral" },
};
export function ListVerification({ list, busy, onCleanup, sample }: { list: LeadList; busy: boolean; onCleanup: () => void; sample: boolean }) {
  return <Panel title="Verification" bodyClassName="px-5 pb-5">
    <h2 className="text-lg font-semibold m-0">{list.name}</h2><p className="mt-1 mb-5 text-muted text-meta">{list.meta} · {fmt.n(list.count)} leads</p>
    <div className="flex h-3 rounded-full overflow-hidden bg-track" aria-hidden="true">{(Object.keys(verificationStyles) as Verification[]).map((key) => <div key={key} style={{ width: `${list.count ? list.verification[key] / list.count * 100 : 0}%`, background: verificationStyles[key].color }} />)}</div>
    <dl className="grid grid-cols-2 xl:grid-cols-5 gap-3 my-5">{(Object.keys(verificationStyles) as Verification[]).map((key) => <div key={key}><dt className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full shrink-0" style={{ background: verificationStyles[key].color }} />{verificationStyles[key].label}</dt><dd className="m-0 mt-1 text-lg font-semibold tabular">{fmt.n(list.verification[key])}</dd></div>)}</dl>
    <p className="bg-success-bg text-success rounded-control p-4 mb-4 leading-relaxed"><strong>{fmt.n(list.verification.ready_to_send)} leads are ready to send.</strong>{" Risky and invalid addresses are held back so they can't hurt your domains."}</p>
    <div className="flex flex-wrap gap-2"><Button disabled={!sample || busy || !(list.verification.invalid + list.verification.duplicate)} onClick={onCleanup}>{busy ? "Removing…" : "Remove invalid & duplicates"}</Button><ButtonLink href="/campaigns" variant="primary">Use in a campaign</ButtonLink></div>
    {sample && <p className="text-xs text-muted mt-3 mb-0">Sample cleanup only. Reloading the app restores the demo.</p>}
  </Panel>;
}
