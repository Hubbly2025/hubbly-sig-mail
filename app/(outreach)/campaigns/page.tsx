"use client";

import Link from "next/link";
import { NewCampaignDialog } from "@/components/campaign/NewCampaignDialog";
import { campaignTypes, pauseReasons } from "@/lib/outreach/campaign-planning";
import { useMemo, useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { SegmentedControl } from "@/components/ui-hubbly/controls";
import { IconPlus, IconSearch } from "@/components/ui-hubbly/icons";
import { HelpButton, Pager, Panel, Skel } from "@/components/outreach/feedback";
import { PageHeader, useCan } from "@/components/outreach/shell";
import { campaignStatus, n, pct } from "@/components/outreach/format";
import { useResource } from "@/lib/outreach/hooks";
import type { CampaignStatus, CampaignSummary } from "@/lib/outreach/types";

type Tab = "all" | CampaignStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "running", label: "Running" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

export default function CampaignsPage() {
  const canBuild = useCan("build");
  const list = useResource<CampaignSummary[]>("outreach/campaigns");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);


  // Tab counts are counted within the current search.
  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((c) => !t || c.name.toLowerCase().includes(t) || (c.sender_profile_name ?? "").toLowerCase().includes(t));
  }, [list.data, q]);
  const counts = useMemo(() => {
    const m: Record<Tab, number> = { all: searched.length, draft: 0, running: 0, paused: 0, completed: 0, archived: 0 };
    searched.forEach((c) => m[c.status]++);
    return m;
  }, [searched]);
  const effectiveTab: Tab = counts[tab] === 0 && tab !== "all" ? "all" : tab;
  const rows = effectiveTab === "all" ? searched : searched.filter((c) => c.status === effectiveTab);
  const size = view === "cards" ? 6 : 15;
  const pageRows = rows.slice((page - 1) * size, page * size);

  const all = list.data ?? [];
  const running = all.filter((c) => c.status === "running").length;
  const drafts = all.filter((c) => c.status === "draft").length;


  return (
    <>
      <PageHeader
        title="Campaigns"
        context={list.data ? `${running} running · ${drafts} draft${drafts === 1 ? "" : "s"} · ${all.length} in total` : " "}
        actions={
          <>
            <HelpButton title="What is a campaign?">
              <p className="m-0">
                A campaign is a short sequence of up to four emails sent to a group of leads, from one sender, on a schedule you choose. Everyone stops receiving it
                the moment they reply.
              </p>
              <h3 className="m-0 mt-1 text-[14px] font-semibold text-ink">Before it can launch</h3>
              <ul className="m-0 pl-5">
                <li>Leads are enrolled</li>
                <li>Every email is approved by a person</li>
                <li>A sender profile with a postal address is chosen</li>
                <li>Sending days and hours are set</li>
                <li>At least one mailbox is ready</li>
              </ul>
              <h3 className="m-0 mt-1 text-[14px] font-semibold text-ink">Statuses</h3>
              <ul className="m-0 pl-5">
                <li><b>Draft</b> — being built; nothing sends.</li>
                <li><b>Running</b> — sending on its schedule.</li>
                <li><b>Paused</b> — stopped by you, or by the system when a send-time check found something new.</li>
                <li><b>Completed</b> — everyone has received every email or replied.</li>
                <li><b>Archived</b> — put away; kept for its numbers.</li>
              </ul>
            </HelpButton>
            {canBuild && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus size={15} />
                New campaign
              </Button>
            )}
          </>
        }
      />

      <div className="px-8 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 w-[280px] min-h-10 px-3 box-border border border-control rounded-control bg-surface text-muted">
            <IconSearch size={15} />
            <span className="sr-only">Search campaigns</span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by campaign or sender"
              className="border-0 outline-none text-sm flex-1 bg-transparent text-ink"
            />
          </label>
          <div role="tablist" aria-label="Status" className="flex gap-1.5 flex-wrap">
            {TABS.map((t) => {
              const disabled = t.key !== "all" && counts[t.key] === 0;
              const on = effectiveTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  disabled={disabled}
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                  }}
                  className={cx(
                    "min-h-8 px-3 rounded-full border text-[13px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                    on ? "bg-ink border-ink text-white" : "bg-surface border-control text-ink-2"
                  )}
                >
                  {t.label} · {counts[t.key]}
                </button>
              );
            })}
          </div>
          <SegmentedControl
            label="View"
            className="ml-auto w-[170px]"
            value={view}
            onChange={(v) => {
              setView(v);
              setPage(1);
            }}
            options={[
              { value: "cards", label: "Cards" },
              { value: "table", label: "Table" },
            ]}
          />
        </div>

        <Panel
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          empty={rows.length === 0}
          emptyText={q ? `No campaigns match “${q}”.` : "No campaigns yet."}
          emptyAction={!q && canBuild ? <Button variant="primary" onClick={() => setCreating(true)}>New campaign</Button> : undefined}
          skeleton={
            <div className="grid grid-cols-3 gap-4 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skel key={i} className="h-[150px] rounded-card" />
              ))}
            </div>
          }
        >
          {view === "cards" ? (
            <div className="grid grid-cols-3 gap-4 p-5">
              {pageRows.map((c) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="flex flex-col gap-3 p-4 rounded-card border border-line bg-surface no-underline text-ink hover:border-control hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:text-ink"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-meta text-muted truncate">{c.sender_profile_name ? `From ${c.sender_profile_name}` : "No sender yet"}</div>
                    </div>
                    <StatusPill tone={campaignStatus[c.status].tone}>{campaignStatus[c.status].label}</StatusPill>
                  </div>
                  {c.status === "paused" && <p className="m-0 rounded-control bg-warn-bg px-3 py-2 text-xs text-warn">{pauseReasons[c.pause_reason ?? "manual"]}</p>}
                  <span className="text-xs text-muted">{campaignTypes[c.type ?? "cold_outreach"]}</span>
                  <dl className="m-0 grid grid-cols-4 gap-2 pt-3 border-t border-divider">
                    {[
                      ["Enrolled", n(c.enrolled)],
                      ["Sent", n(c.sent)],
                      ["Replies", n(c.replies)],
                      ["Reply rate", pct(c.reply_rate)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <dt className="text-[11.5px] text-muted">{k}</dt>
                        <dd className="m-0 font-semibold tabular">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              ))}
            </div>
          ) : (
            <div role="table" aria-label="Campaigns">
              <div role="row" className="grid grid-cols-[minmax(0,1fr)_120px_140px_90px_90px_90px_90px] gap-4 px-5 py-2.5 bg-head text-xs font-medium text-muted">
                {["Campaign", "Status", "Sender", "Enrolled", "Sent", "Replies", "Reply rate"].map((h, i) => (
                  <div key={h} role="columnheader" className={i > 2 ? "text-right" : ""}>
                    {h}
                  </div>
                ))}
              </div>
              {pageRows.map((c) => (
                <div role="row" key={c.id} className="grid grid-cols-[minmax(0,1fr)_120px_140px_90px_90px_90px_90px] gap-4 items-center px-5 py-3 border-t border-divider">
                  <div role="cell" className="min-w-0">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold text-ink no-underline truncate block hover:text-accent">
                      {c.name}
                    </Link>
                  </div>
                  <div role="cell">
                    <StatusPill tone={campaignStatus[c.status].tone}>{campaignStatus[c.status].label}</StatusPill>
                    {c.status === "paused" && <div className="mt-1 text-xs text-warn">{pauseReasons[c.pause_reason ?? "manual"]}</div>}
                  </div>
                  <div role="cell" className="text-ink-2 truncate">{c.sender_profile_name ?? "—"}</div>
                  <div role="cell" className="text-right tabular">{n(c.enrolled)}</div>
                  <div role="cell" className="text-right tabular">{n(c.sent)}</div>
                  <div role="cell" className="text-right tabular">{n(c.replies)}</div>
                  <div role="cell" className="text-right tabular font-semibold">{pct(c.reply_rate)}</div>
                </div>
              ))}
            </div>
          )}
          <Pager page={page} total={rows.length} size={size} onPage={setPage} />
        </Panel>
      </div>

      {creating && <NewCampaignDialog onClose={() => setCreating(false)} />}
    </>
  );
}
