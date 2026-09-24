"use client";

import { useState } from "react";
import { Button, cx } from "@/components/ui-hubbly";
import { Dialog, useToast } from "./feedback";
import { useResource } from "@/lib/outreach/hooks";
import { api } from "@/lib/outreach/client";
import type { InboxFolder, InboxView } from "@/lib/outreach/types";

const folders: [InboxFolder, string][] = [["all", "All"], ["unread", "Unread"], ["starred", "Starred"], ["snoozed", "Snoozed"], ["scheduled", "Scheduled"], ["sent", "Sent"], ["archived", "Archived"], ["untracked", "Untracked"]];
export function InboxFolders({ current, unread, onFolder, onView }: { current: Omit<InboxView, "id" | "name">; unread: number; onFolder: (folder: InboxFolder) => void; onView: (view: InboxView) => void }) {
  const views = useResource<InboxView[]>("outreach/views");
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await api("POST", "outreach/views", { ...current, name }); await views.reload(); setSaving(false); setName(""); toast("success", "View saved."); }
    catch (e) { toast("error", (e as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <nav aria-label="Inbox folders" className="w-full md:w-44 shrink-0 flex flex-col gap-1">
      {folders.map(([id, label]) => <button key={id} type="button" aria-current={current.folder === id ? "page" : undefined} onClick={() => onFolder(id)} className={cx("min-h-10 px-3 rounded-control border-0 cursor-pointer flex items-center justify-between text-left text-sm", current.folder === id ? "bg-accent-soft text-accent-ink font-semibold" : "bg-transparent text-ink-2 hover:bg-active")}><span>{label}</span>{id === "unread" && <span className="text-meta tabular-nums">{unread}</span>}</button>)}
      <div className="mt-5 pt-4 border-t border-line flex flex-col gap-2">
        <h2 className="m-0 px-3 text-meta font-semibold text-muted">Views</h2>
        {views.error && <Button small onClick={views.reload}>Retry views</Button>}
        {views.loading && <span className="px-3 text-meta text-muted">Loading views…</span>}
        {views.data?.map((view) => <div key={view.id} className="flex items-center min-w-0">
          <button type="button" onClick={() => onView(view)} className="flex-1 min-w-0 truncate text-left px-3 min-h-10 border-0 bg-transparent text-ink-2 hover:bg-active rounded-control cursor-pointer" title={view.name}>{view.name}</button>
          <button type="button" aria-label={`Delete view ${view.name}`} disabled={busy} className="w-9 min-h-10 shrink-0 border-0 bg-transparent text-muted cursor-pointer hover:text-danger" onClick={async () => { setBusy(true); try { await api("DELETE", `outreach/views/${view.id}`); await views.reload(); toast("success", "View deleted."); } catch (e) { toast("error", (e as Error).message); } finally { setBusy(false); } }}>×</button>
        </div>)}
        {!views.loading && !views.error && !views.data?.length && <p className="m-0 px-3 text-meta text-muted">No saved views.</p>}
        <Button small onClick={() => setSaving(true)}>Save view</Button>
      </div>
    </nav>
    <Dialog open={saving} onClose={() => !busy && setSaving(false)} title="Save view" width={420} footer={<><Button disabled={busy} onClick={() => setSaving(false)}>Cancel</Button><Button variant="primary" disabled={busy || !name.trim()} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
      <label className="flex flex-col gap-2 text-sm">View name<input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="min-h-10 px-3 border border-control rounded-control bg-surface text-ink" /></label>
      <p className="text-meta text-muted">Saves the current folder, classification, campaign, and search. Sample data resets on reload.</p>
    </Dialog>
  </>;
}
