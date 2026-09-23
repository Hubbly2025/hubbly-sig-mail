"use client";

import { Bar, SourceTag, StatusPill, cx, fmt } from "@/components/ui-hubbly";
import { IconCheck, IconSignal } from "@/components/ui-hubbly/icons";
import type { LeadList, VerificationSummary } from "@/lib/mail/types";

const sourceLabel: Record<string, string> = { signal: "Signal", clickrabbit: "ClickRabbit", csv: "CSV", discover: "Discover", voice: "Voice" };

function VerifyRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-medium">
          {fmt.n(value)} <span className="text-muted">· {pct.toFixed(0)}%</span>
        </span>
      </div>
      <Bar pct={pct} color={color} />
    </div>
  );
}

export function AudienceStage({
  leadLists,
  verifications,
  selectedListId,
  onSelect,
  excluded,
}: {
  leadLists: LeadList[];
  verifications: Record<string, VerificationSummary>;
  selectedListId: string;
  onSelect: (id: string) => void;
  excluded: number;
}) {
  const v = verifications[selectedListId];
  const total = v ? v.valid + v.catchAllVerified + v.risky + v.invalid + v.duplicate : 0;
  const readyPct = total ? (v.readyToSend / total) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1040px] px-8 py-8 grid grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* List picker */}
        <section aria-label="Choose an audience" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[17px] font-semibold">Who should this campaign reach?</h2>
            <span className="text-meta text-muted">{leadLists.length} lists</span>
          </div>
          <p className="m-0 text-[13.5px] text-muted -mt-1">
            Pick a list to send to. Live lists keep adding new matches automatically; customers and unsubscribes are always excluded.
          </p>

          <div role="radiogroup" aria-label="Lead lists" className="flex flex-col gap-2.5 mt-1">
            {leadLists.map((l) => {
              const on = l.id === selectedListId;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSelect(l.id)}
                  className={cx(
                    "text-left flex items-center gap-3.5 px-4 py-3.5 rounded-card bg-surface cursor-pointer",
                    on ? "border-2 border-accent shadow-[0_2px_10px_rgba(43,89,195,0.12)]" : "border border-line hover:border-control"
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                      on ? "bg-accent text-white" : "border-2 border-[#c9c9c3]"
                    )}
                  >
                    {on && <IconCheck size={12} strokeWidth={2.4} />}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{l.name}</span>
                      {l.isLive && (
                        <StatusPill tone="success" className="gap-1">
                          <IconSignal size={11} strokeWidth={2} />
                          Live
                        </StatusPill>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-meta text-muted">
                      <SourceTag>{sourceLabel[l.source] ?? l.source}</SourceTag>
                      {l.meta}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[17px] font-semibold tabular leading-none">{fmt.n(l.count)}</div>
                    <div className="text-meta text-muted mt-1">leads</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Verification summary */}
        <aside aria-label="List quality" className="bg-surface border border-line rounded-card p-5 flex flex-col gap-4 sticky top-8">
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-[15px] font-semibold">Deliverable now</h3>
            <span className="text-meta text-muted truncate">{v?.listName ?? "—"}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <span className="text-[30px] font-semibold tabular leading-none text-success">{v ? fmt.n(v.readyToSend) : "—"}</span>
              <span className="text-meta text-muted mb-1">ready to send</span>
            </div>
            <Bar pct={readyPct} color="var(--success-dot, #1f9d5b)" height={8} />
            <span className="text-meta text-muted">{readyPct.toFixed(0)}% of {v ? fmt.n(total) : 0} leads · verified addresses</span>
          </div>

          {v && (
            <div className="flex flex-col gap-3 pt-1">
              <VerifyRow label="Valid" value={v.valid} total={total} color="#1f9d5b" />
              <VerifyRow label="Catch-all, verified" value={v.catchAllVerified} total={total} color="#4a89dc" />
              <VerifyRow label="Risky — skipped" value={v.risky} total={total} color="#e2a531" />
              <VerifyRow label="Invalid — skipped" value={v.invalid} total={total} color="#d0563f" />
              <VerifyRow label="Duplicate — merged" value={v.duplicate} total={total} color="#9a94a6" />
            </div>
          )}

          <div className="mt-1 px-3.5 py-3 rounded-xl bg-tag flex flex-col gap-1">
            <div className="text-meta font-semibold">{fmt.n(excluded)} excluded automatically</div>
            <div className="text-meta text-muted">Existing customers and anyone who unsubscribed are never contacted.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
