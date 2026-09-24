"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui-hubbly";
import { PageHeader } from "./shell";
import { Panel, Pager, useToast } from "./feedback";
import { ListVerification } from "./list-verification";
import { ListLeads, leadSourceLabels } from "./list-leads";
import { api, MOCK } from "@/lib/outreach/client";
import type { LeadList, ListLead, Page } from "@/lib/outreach/types";

export function ListDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const list = useSWR(`outreach/lists/${encodeURIComponent(id)}`, (path) => api<LeadList>("GET", path));
  const leads = useSWR(list.data ? `outreach/lists/${encodeURIComponent(id)}/leads?page=${page}` : null, (path) => api<Page<ListLead>>("GET", path));
  async function cleanup() {
    setBusy(true);
    try { await api("POST", `outreach/lists/${encodeURIComponent(id)}/cleanup`); setPage(1); await Promise.all([list.mutate(), leads.mutate()]); toast("success", "Invalid addresses removed."); }
    catch (error) { toast("error", (error as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeader title={list.data?.name ?? "Lead list"} context={list.data ? `${list.data.count} leads · ${list.data.used_in_campaigns ?? 0} campaigns` : "Audience details"} actions={<Link href="/lists" className="text-sm text-accent-ink hover:underline">All lists</Link>} />
    <div className="p-4 md:p-8 flex flex-col gap-5">
      <Panel title={list.data?.kind === "saved_filter" ? "Saved filter" : "List details"} loading={list.isLoading} error={list.error} onRetry={() => void list.mutate()} empty={!list.data} emptyText="This list is unavailable." bodyClassName="px-5 pb-5">
        {list.data && <div className="flex flex-wrap gap-4 text-sm text-ink-2">{list.data.kind === "saved_filter" && list.data.filter ? <><span>Source: {list.data.filter.source === "all" ? "All" : leadSourceLabels[list.data.filter.source]}</span><span>Page: {list.data.filter.visited_page || "Any"}</span><span>Minimum visits: {list.data.filter.min_visits}</span><span>{list.data.filter.business_only ? "Business email only" : "Business and personal email"}</span></> : <span>Static list · Manually selected leads</span>}</div>}
      </Panel>
      {list.data && !list.error && <>
        {list.data.kind === "static" && <ListVerification list={list.data} busy={busy} onCleanup={cleanup} sample={MOCK} />}
        <Panel title="Leads" loading={leads.isLoading} error={leads.error} onRetry={() => void leads.mutate()} empty={!leads.data?.items.length} emptyText={list.data.kind === "saved_filter" ? "No leads match this filter yet. New matches will appear here automatically." : "No leads in this list."}>
          <ListLeads rows={leads.data?.items ?? []} />
          {leads.data && <Pager page={page} total={leads.data.total} size={leads.data.page_size} onPage={setPage} />}
        </Panel>
      </>}
    </div>
  </>;
}
