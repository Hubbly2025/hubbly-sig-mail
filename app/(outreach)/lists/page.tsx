"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button, StatusPill, fmt } from "@/components/ui-hubbly";
import { Panel, useToast } from "@/components/outreach/feedback";
import { PageHeader } from "@/components/outreach/shell";
import { NewListDialog } from "@/components/outreach/new-list-dialog";
import { api } from "@/lib/outreach/client";
import type { LeadList } from "@/lib/outreach/types";

export default function ListsPage() {
  const lists = useSWR("outreach/lists", (path) => api<LeadList[]>("GET", path));
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  return <>
    <PageHeader title="Lead lists" context="Save an audience once. Use it across your campaigns." actions={<Button variant="primary" onClick={() => setCreating(true)}>New list</Button>} />
    <div className="p-4 md:p-8">
      <Panel title="Your lists" loading={lists.isLoading} error={lists.error} onRetry={() => void lists.mutate()} empty={!lists.data?.length} emptyText="No lists yet. Save a filter or pick leads to build your first audience." emptyAction={<Button onClick={() => setCreating(true)}>New list</Button>}>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-head text-muted text-xs"><tr>{["Name", "Type", "Lead count", "Used in", "Updated"].map((heading) => <th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody>{lists.data?.map((list) => <tr key={list.id} className="border-t border-divider hover:bg-head"><td className="px-5 py-4"><Link className="font-medium text-ink hover:text-accent-ink underline-offset-4 hover:underline" href={`/lists/${list.id}`}>{list.name}</Link><p className="m-0 mt-1 text-xs text-muted">{list.kind === "saved_filter" ? "Updates as leads match" : "Manually selected leads"}</p></td><td className="px-5 py-4 whitespace-nowrap"><StatusPill tone={list.kind === "saved_filter" ? "success" : "neutral"}>{list.kind === "saved_filter" ? "Saved filter" : "Static"}</StatusPill></td><td className="px-5 py-4 tabular">{fmt.n(list.count)}</td><td className="px-5 py-4 whitespace-nowrap">{list.used_in_campaigns ?? 0} campaigns</td><td className="px-5 py-4 text-muted whitespace-nowrap">{list.updated_at ?? "—"}</td></tr>)}</tbody>
        </table></div>
      </Panel>
    </div>
    {creating && <NewListDialog onClose={() => setCreating(false)} onCreated={(list) => { void lists.mutate((current) => [list, ...(current ?? []).filter((item) => item.id !== list.id)], { revalidate: true }); setCreating(false); toast("success", "List created."); }} />}
  </>;
}
