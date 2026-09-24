"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button, StatusPill } from "@/components/ui-hubbly";
import { Dialog, Panel, Pager, useToast } from "@/components/outreach/feedback";
import { useDebounced } from "@/lib/outreach/hooks";
import { api } from "@/lib/outreach/client";
import type { AudienceFilter, AudiencePreview, Candidate, LeadList, Page, Region } from "@/lib/outreach/types";
import type { BuilderStepProps } from "./Builder";

const input = "min-h-10 px-3 rounded-control border border-control bg-surface text-sm text-ink w-full";
const label = "flex flex-col gap-1.5 text-sm text-ink-2";
export function AudienceStep({ cm, registerFinish }: BuilderStepProps) {
  const c = cm.campaign!;
  const toast = useToast();
  const f = c.audience.filter;
  const [picked, setPicked] = useState(new Set<string>());
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const currentKey = JSON.stringify({ filter: f, region: c.audience.region });
  const key = useDebounced(currentKey, 300);
  const pending = currentKey !== key;
  const lists = useSWR("outreach/lists", (path) => api<LeadList[]>("GET", path));
  const missing = f.source === "lead_list" && (!f.list_id || !lists.data?.some((list) => list.id === f.list_id));
  const preview = useSWR(!missing ? ["audience-preview", c.id, key, c.enrolled_count] : null, () => api<AudiencePreview>("POST", `outreach/campaigns/${c.id}/audience/preview`, JSON.parse(key)));
  const candidates = useSWR(!missing ? ["audience-candidates", c.id, key, page, c.enrolled_count] : null, () => api<Page<Candidate>>("POST", `outreach/campaigns/${c.id}/audience/candidates`, { ...JSON.parse(key), page }));
  const data = missing || pending ? undefined : preview.data;
  const rows = missing || pending ? undefined : candidates.data;
  const eligible = rows?.items.filter((row) => !row.held_back_reason && !row.already_enrolled) ?? [];
  function setFilter(patch: Partial<AudienceFilter>) {
    cm.patch({ audience: { filter: patch } }, (campaign) => ({ ...campaign, audience: { ...campaign.audience, filter: { ...campaign.audience.filter, ...patch } } }));
    setPage(1); setPicked(new Set());
  }
  function setRegion(region: Region, reason = c.audience.region_reason) {
    cm.patch({ audience: { region, region_reason: reason } }, (campaign) => ({ ...campaign, audience: { ...campaign.audience, region, region_reason: reason } }));
    setPicked(new Set()); setPage(1);
  }
  async function enroll(all = false) {
    setBusy(true);
    try {
      if (!await cm.flush()) throw new Error("Save your changes before enrolling leads.");
      const result = await api<{ enrolled: number }>("POST", `outreach/campaigns/${c.id}/enroll`, all ? { all: true } : { lead_ids: [...picked] });
      setPicked(new Set()); await cm.reload(); await Promise.all([preview.mutate(), candidates.mutate()]);
      toast("success", `${result.enrolled} leads enrolled.`); return true;
    } catch (error) { toast("error", (error as Error).message); return false; }
    finally { setBusy(false); }
  }
  useEffect(() => { registerFinish(async () => {
    if (missing) { toast("error", "Choose an available lead list."); return false; }
    if (c.audience.region === "anywhere" && !c.audience.region_reason.trim()) { toast("error", "Record a reason for sending anywhere."); return false; }
    if (picked.size) return enroll();
    return true;
  }); });
  const emptyText = missing ? "Choose a lead list to see its audience." : "No leads match these filters.";
  return <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
    <div className="flex flex-col gap-4">
      <Panel title="Audience source" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <label className={label}>Leads from<select className={input} value={f.source} onChange={(event) => setFilter({ source: event.target.value as AudienceFilter["source"], list_id: "" })}><option value="signal_visitors">Identified visitors</option><option value="lead_list">A lead list</option><option value="all_leads">All leads</option></select></label>
        {f.source === "lead_list" && <Panel loading={lists.isLoading} error={lists.error} onRetry={() => void lists.mutate()} empty={!lists.data?.length} emptyText={<span>No lists yet. <Link href="/lists">Create a list</Link>.</span>} bodyClassName="p-3"><label className={label}>Lead list<select className={input} value={f.list_id ?? ""} onChange={(event) => setFilter({ list_id: event.target.value })}><option value="">Choose a list</option>{lists.data?.map((list) => <option key={list.id} value={list.id}>{list.name} · {list.count} leads</option>)}</select></label></Panel>}
        <label className={label}>Visited page<input className={input} value={f.visited_page} onChange={(event) => setFilter({ visited_page: event.target.value })} placeholder="Any page, or /pricing" /></label>
        <label className={label}>Minimum visits<input className={input} type="number" min={0} step={1} value={f.min_visits} onChange={(event) => setFilter({ min_visits: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.email_type === "business"} onChange={(event) => setFilter({ email_type: event.target.checked ? "business" : "any" })} />Business email only</label>
      </Panel>
      {c.type === "reactivation" && <Panel title="Reactivation filters" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <label className={label}>Stage<select className={input} value={f.stage ?? ""} onChange={(event) => setFilter({ stage: event.target.value })}><option value="">Any stage</option><option value="new">New</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="closed_lost">Closed lost</option><option value="customer">Customer</option></select></label>
        <label className={label}>Last activity older than (days)<input className={input} type="number" min={0} step={1} value={f.inactive_days ?? 30} onChange={(event) => setFilter({ inactive_days: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label>
        <label className={label}>Closed-lost reason<select className={input} value={f.closed_lost_reason ?? ""} onChange={(event) => setFilter({ closed_lost_reason: event.target.value, ...(event.target.value ? { stage: "closed_lost" } : {}) })}><option value="">Any reason</option><option value="budget">Budget</option><option value="timing">Timing</option><option value="competitor">Chose a competitor</option><option value="no_response">No response</option></select></label>
      </Panel>}
      <Panel title="Region" bodyClassName="px-5 pb-5 flex flex-col gap-3">
        {([["us", "United States"], ["us_ca", "United States and Canada"], ["anywhere", "Anywhere, with a reason"]] as const).map(([value, text]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="region" checked={c.audience.region === value} onChange={() => setRegion(value)} />{text}</label>)}
        {c.audience.region === "anywhere" && <label className={label}>Reason<textarea className={`${input} py-2`} value={c.audience.region_reason} onChange={(event) => setRegion("anywhere", event.target.value)} /></label>}
      </Panel>
    </div>
    <div className="flex flex-col gap-4 min-w-0">
      <Panel title="Audience eligibility" loading={!missing && (pending || preview.isLoading)} error={!missing ? preview.error : undefined} onRetry={() => void preview.mutate()} empty={missing} emptyText={emptyText} bodyClassName="px-5 pb-5">
        {data && <><div className="grid grid-cols-3 gap-3"><div><div className="text-sm text-muted">Eligible</div><div className="text-2xl font-semibold text-success tabular">{data.will_enroll}</div></div><div><div className="text-sm text-muted">Matched</div><div className="text-2xl font-semibold tabular">{data.matched}</div></div><div><div className="text-sm text-muted">Enrolled</div><div className="text-2xl font-semibold tabular">{c.enrolled_count}</div></div></div><div className="mt-4 pt-4 border-t border-divider"><h3 className="m-0 text-sm font-semibold">Excluded: {data.held_back.reduce((sum, reason) => sum + reason.count, 0)}</h3>{data.held_back.length ? <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-2">{data.held_back.map((reason) => <li key={reason.reason} className="flex justify-between text-sm text-muted"><span>{reason.reason}</span><span className="tabular">{reason.count}</span></li>)}</ul> : <p className="m-0 mt-2 text-sm text-muted">No exclusions in this audience.</p>}</div></>}
      </Panel>
      <Panel title="Matching leads" loading={!missing && (pending || candidates.isLoading)} error={!missing ? candidates.error : undefined} onRetry={() => void candidates.mutate()} empty={!rows?.items.length} emptyText={emptyText} actions={<div className="flex gap-2">{c.enrolled_count > 0 && <Button small onClick={() => setRemove(true)}>Remove enrolled</Button>}<Button small variant="primary" disabled={busy || pending || missing || !!preview.error || (!picked.size && !data?.will_enroll)} onClick={() => enroll(!picked.size)}>{busy ? "Enrolling…" : picked.size ? `Enroll ${picked.size} selected` : `Enroll all ${data?.will_enroll ?? 0}`}</Button></div>}>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-head text-muted"><tr><th className="p-3"><input type="checkbox" aria-label="Select all on this page" checked={eligible.length > 0 && eligible.every((row) => picked.has(row.id))} onChange={(event) => setPicked((old) => { const next = new Set(old); eligible.forEach((row) => event.target.checked ? next.add(row.id) : next.delete(row.id)); return next; })} /></th>{["Lead", "Email", "Status"].map((text) => <th key={text} className="p-3 font-medium">{text}</th>)}</tr></thead><tbody>{rows?.items.map((row) => <tr key={row.id} className="border-t border-divider"><td className="p-3"><input type="checkbox" aria-label={`Select ${row.name}`} disabled={!!row.held_back_reason || row.already_enrolled} checked={picked.has(row.id)} onChange={() => setPicked((old) => { const next = new Set(old); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })} /></td><td className="p-3"><div className="font-medium">{row.name}</div><div className="text-xs text-muted">{row.company ?? "No company"}</div></td><td className="p-3 text-xs font-mono">{row.email}</td><td className="p-3 text-xs">{row.already_enrolled ? <StatusPill tone="accent">Enrolled</StatusPill> : row.held_back_reason ?? <span className="text-success">Eligible</span>}</td></tr>)}</tbody></table></div>
        {rows && <Pager page={page} total={rows.total} size={rows.page_size} onPage={setPage} />}
      </Panel>
    </div>
    <Dialog open={remove} onClose={() => setRemove(false)} title="Remove enrolled leads?" footer={<><Button onClick={() => setRemove(false)}>Cancel</Button><Button variant="primary" onClick={async () => { try { await api("DELETE", `outreach/campaigns/${c.id}/enrollments`); setRemove(false); setPicked(new Set()); await cm.reload(); await Promise.all([preview.mutate(), candidates.mutate()]); } catch (error) { toast("error", (error as Error).message); } }}>Remove</Button></>}><p>Leads who have not received an email will be removed. Existing conversations stay intact.</p></Dialog>
  </div>;
}
