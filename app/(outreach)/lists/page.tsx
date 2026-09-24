"use client";

import { useState } from "react";
import { Button, StatusPill, cx, fmt } from "@/components/ui-hubbly";
import { Dialog, Pager, Panel, useToast } from "@/components/outreach/feedback";
import { ListVerification, verificationStyles } from "@/components/outreach/list-verification";
import { PageHeader } from "@/components/outreach/shell";
import { useResource } from "@/lib/outreach/hooks";
import { api, MOCK } from "@/lib/outreach/client";
import type { LeadList, ListLead, Page } from "@/lib/outreach/types";

function SelectedList({ list, refresh }: { list: LeadList; refresh: () => Promise<void> }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const leads = useResource<Page<ListLead>>(`outreach/lists/${list.id}/leads?page=${page}`);
  async function cleanup() {
    setBusy(true);
    try {
      await api("POST", `outreach/lists/${list.id}/cleanup`);
      setPage(1);
      await Promise.all([refresh(), leads.reload()]);
      toast("success", "Invalid addresses and duplicates removed from the sample list.");
    } catch (error) { toast("error", (error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 flex flex-col gap-5">
    <ListVerification list={list} busy={busy} onCleanup={cleanup} sample={MOCK} />
    <Panel title="Leads" actions={MOCK && <span className="text-xs text-muted">Sample rows · {leads.data?.total ?? 7} of {fmt.n(list.count)}</span>} loading={leads.loading} error={leads.error} onRetry={leads.reload} empty={!leads.data?.items.length} emptyText="No leads in this list.">
      <div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="bg-head text-muted text-xs"><tr>{["Lead", "Email", "Verification", "Type", "Last activity"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{leads.data?.items.map((lead) => <tr key={lead.id} className="border-t border-divider"><td className="px-4 py-4"><div className="font-medium whitespace-nowrap">{lead.name}</div><div className="text-xs text-muted mt-1">{lead.company ?? "—"}</div></td><td className="px-4 py-4 font-mono text-xs">{lead.email}</td><td className="px-4 py-4"><StatusPill tone={verificationStyles[lead.verification].tone}>{verificationStyles[lead.verification].label}</StatusPill><div className="text-xs text-muted mt-1">{lead.reason}</div></td><td className="px-4 py-4">{lead.email_type === "personal" ? <StatusPill tone="warn">Personal</StatusPill> : "Business"}</td><td className="px-4 py-4 whitespace-nowrap text-muted text-xs">{lead.last_activity}</td></tr>)}</tbody></table></div>
      {leads.data && <Pager page={page} total={leads.data.total} size={leads.data.page_size} onPage={setPage} />}
    </Panel>
  </div>;
}
export default function ListsPage() {
  const lists = useResource<LeadList[]>("outreach/lists");
  const [selectedId, setSelectedId] = useState<string>();
  const [importOpen, setImportOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const selected = lists.data?.find((list) => list.id === selectedId) ?? lists.data?.[0];
  return <>
    <PageHeader title="Lead lists" context="Verified audiences, ready for outreach" actions={<Button variant="primary" disabled={!MOCK} onClick={() => setImportOpen(true)}>Import CSV</Button>} />
    <div className="p-8 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
      <Panel title="Your lists" loading={lists.loading} error={lists.error} onRetry={lists.reload} empty={!lists.data?.length} emptyText="No lists yet.">
        {lists.data?.map((list) => <button key={list.id} type="button" aria-pressed={selected?.id === list.id} onClick={() => setSelectedId(list.id)} className={cx("w-full text-left px-5 py-4 border-0 border-t border-solid border-divider cursor-pointer", selected?.id === list.id ? "bg-accent-soft2 shadow-[inset_3px_0_0_var(--accent)]" : "bg-transparent hover:bg-head")}><span className="block font-medium text-ink">{list.name}</span><span className="flex flex-wrap items-center gap-2 text-xs text-muted mt-2"><span>{list.source === "csv" ? "CSV" : list.source === "signal" ? "Signal" : "ClickRabbit"}</span>{list.is_live && <StatusPill tone="success">Live</StatusPill>}<span className="ml-auto">{fmt.n(list.count)}</span></span></button>)}
      </Panel>
      {selected ? <SelectedList key={selected.id} list={selected} refresh={lists.reload} /> : <Panel title="Verification" loading={lists.loading} error={lists.error} onRetry={lists.reload} empty emptyText="Select a list to see its verification results." />}
    </div>
    <Dialog open={importOpen} onClose={() => { setImportOpen(false); setFilename(""); }} title="Import CSV — sample preview" footer={<Button onClick={() => { setImportOpen(false); setFilename(""); }}>Done</Button>}>
      <p className="text-muted leading-relaxed">Choose a CSV to preview the file selection. This demo does not upload, parse, or save your contacts.</p><label htmlFor="list-csv" className="block font-medium mb-2">CSV file</label><input id="list-csv" type="file" accept=".csv,text/csv" onChange={(event) => setFilename(event.target.files?.[0]?.name ?? "")} className="block w-full text-sm" />{filename && <p role="status" className="text-muted">Selected: {filename}. No data was uploaded.</p>}
    </Dialog>
  </>;
}
