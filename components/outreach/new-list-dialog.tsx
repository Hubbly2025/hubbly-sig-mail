"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui-hubbly";
import { Dialog, Panel } from "./feedback";
import { ListLeads } from "./list-leads";
import { api } from "@/lib/outreach/client";
import { useDebounced } from "@/lib/outreach/hooks";
import type { LeadList, ListFilter, ListLead } from "@/lib/outreach/types";

const input = "min-h-10 w-full px-3 rounded-control border border-control bg-surface text-sm text-ink";
const label = "flex flex-col gap-1.5 text-sm text-ink-2";

export function NewListDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (list: LeadList) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"saved_filter" | "static">("saved_filter");
  const [filter, setFilter] = useState<ListFilter>({ source: "identified", visited_page: "", min_visits: 0, business_only: true });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filterQuery = new URLSearchParams({ source: filter.source, visited_page: filter.visited_page, min_visits: String(filter.min_visits), business_only: String(filter.business_only) }).toString();
  const debouncedFilter = useDebounced(filterQuery, 250);
  const debouncedSearch = useDebounced(search, 250);
  const preview = useSWR(kind === "saved_filter" ? `outreach/lists/preview?${debouncedFilter}` : null, (path) => api<{ count: number }>("GET", path));
  const leads = useSWR(kind === "static" ? `outreach/list-leads?q=${encodeURIComponent(debouncedSearch)}` : null, (path) => api<ListLead[]>("GET", path));
  async function create() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const list = await api<LeadList>("POST", "outreach/lists", { name: name.trim(), kind, filter, lead_ids: [...selected] });
      onCreated(list);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <Dialog open onClose={() => !busy && onClose()} title="New list" width={820} footer={<><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || !name.trim() || (kind === "static" && !selected.size)} onClick={create}>{busy ? "Creating…" : "Create list"}</Button></>}>
    <div className="flex flex-col gap-5">
      <label className={label}>List name<input autoFocus className={input} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pricing-page visitors" /></label>
      <fieldset className="border-0 p-0 m-0"><legend className="text-sm text-ink-2 mb-2">List type</legend><div className="flex gap-6">{([["saved_filter", "Saved filter"], ["static", "Static"]] as const).map(([value, title]) => <label key={value} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="list-type" checked={kind === value} onChange={() => setKind(value)} />{title}</label>)}</div></fieldset>
      {kind === "saved_filter" ? <>
        <p className="m-0 text-sm text-muted">This list updates automatically as leads match your filters.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className={label}>Source<select className={input} value={filter.source} onChange={(event) => setFilter({ ...filter, source: event.target.value as ListFilter["source"] })}><option value="identified">Identified visitors</option><option value="imported">Imported</option><option value="crm">From CRM</option><option value="all">All</option></select></label>
          <label className={label}>Visited page<input className={input} value={filter.visited_page} placeholder="Any page, or /pricing" onChange={(event) => setFilter({ ...filter, visited_page: event.target.value })} /></label>
          <label className={label}>Minimum visits<input className={input} type="number" min={0} step={1} value={filter.min_visits} onChange={(event) => setFilter({ ...filter, min_visits: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label>
          <label className="flex items-center gap-2 text-sm self-end min-h-10"><input type="checkbox" checked={filter.business_only} onChange={(event) => setFilter({ ...filter, business_only: event.target.checked })} />Business email only</label>
        </div>
        <Panel title="Matching leads" loading={preview.isLoading || filterQuery !== debouncedFilter} error={preview.error} onRetry={() => void preview.mutate()} empty={preview.data?.count === 0} emptyText="No leads match. Adjust your filters or save this list for future matches."><p role="status" aria-live="polite" className="px-5 pb-4 m-0"><strong className="text-2xl tabular">{preview.data?.count ?? 0}</strong> <span className="text-muted text-sm">leads match these filters</span></p></Panel>
      </> : <>
        <div className="flex flex-col gap-2"><label className={label}>Search leads<input type="search" className={input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, company, or email" /></label><span role="status" className="text-sm text-muted">{selected.size} selected · Selection stays fixed when new leads arrive.</span></div>
        <Panel title="Pick leads" loading={leads.isLoading} error={leads.error} onRetry={() => void leads.mutate()} empty={!leads.data?.length} emptyText="No leads found. Try a different search." bodyClassName="max-h-72 overflow-y-auto">
          <ListLeads rows={leads.data ?? []} selected={selected} onSelect={(id) => setSelected((old) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; })} />
        </Panel>
      </>}
      {error && <div role="alert" className="text-danger text-sm flex items-center gap-3">{error}<Button disabled={busy} onClick={create}>Try again</Button></div>}
    </div>
  </Dialog>;
}
