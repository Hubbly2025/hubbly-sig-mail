"use client";

import { useState } from "react";
import { Button, ButtonLink, SourceTag, StatusPill, cx, fmt, type Tone } from "@/components/ui-hubbly";
import { removeInvalidAndDuplicates } from "@/lib/mail/api";
import type { Lead, LeadList, Verification, VerificationSummary } from "@/lib/mail/types";

const sourceLabel: Record<LeadList["source"], string> = { signal: "Signal", clickrabbit: "ClickRabbit", csv: "CSV", discover: "Discover", voice: "Voice" };

const vTone: Record<Verification, Tone> = { valid: "success", catch_all_verified: "accent", risky: "warn", invalid: "danger", duplicate: "neutral" };
const vLabel: Record<Verification, string> = { valid: "Valid", catch_all_verified: "Catch-all · verified", risky: "Risky", invalid: "Invalid", duplicate: "Duplicate" };

const segColors = { valid: "#2e8a5c", catchAll: "#3f6fd8", risky: "#d39a3a", invalid: "#c2412f", duplicate: "#a3a39c" };

const cols = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_170px_120px_minmax(0,1fr)] items-center gap-4 px-5";

export function LeadsView({ lists, verifications, leads }: { lists: LeadList[]; verifications: Record<string, VerificationSummary>; leads: Lead[] }) {
  const [listId, setListId] = useState(lists[0].id);
  const [cleaned, setCleaned] = useState<Record<string, boolean>>({});
  const v = verifications[listId];
  const isClean = cleaned[listId];

  const total = v.valid + v.catchAllVerified + v.risky + v.invalid + v.duplicate;
  const segs = [
    { key: "valid", label: "Valid", n: v.valid, color: segColors.valid },
    { key: "catchAll", label: "Catch-all · verified", n: v.catchAllVerified, color: segColors.catchAll },
    { key: "risky", label: "Risky", n: v.risky, color: segColors.risky },
    { key: "invalid", label: "Invalid", n: isClean ? 0 : v.invalid, color: segColors.invalid },
    { key: "duplicate", label: "Duplicates", n: isClean ? 0 : v.duplicate, color: segColors.duplicate },
  ];
  const shown = isClean ? leads.filter((l) => l.verification !== "invalid" && l.verification !== "duplicate") : leads;

  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex gap-5">
      <section aria-label="Lead lists" className="w-[280px] shrink-0 self-start bg-surface border border-line rounded-card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="m-0 text-[15px] font-semibold">Lead lists</h2>
          <span className="text-meta text-muted">{lists.length} lists</span>
        </div>
        <ul className="list-none m-0 p-0">
          {lists.map((l) => {
            const sel = l.id === listId;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setListId(l.id)}
                  className={cx(
                    "w-full flex items-center gap-2.5 min-h-[60px] px-4 py-2 border-0 border-t border-divider text-left cursor-pointer text-ink",
                    sel ? "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]" : "bg-surface hover:bg-head"
                  )}
                >
                  <span className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-[13.5px] font-semibold truncate">{l.name}</span>
                    <span className="flex items-center gap-1.5">
                      <SourceTag>{sourceLabel[l.source]}</SourceTag>
                      <span className="text-xs text-muted">{l.meta}</span>
                    </span>
                  </span>
                  <span className="text-[13px] text-ink-2 tabular">{fmt.n(l.count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-4 py-3.5 border-t border-divider flex flex-col gap-1.5">
          <div className="text-meta font-semibold">Import from</div>
          <div className="text-meta text-muted">CSV or a Signal segment. Every import is checked for duplicates and verified before it can be sent to.</div>
        </div>
      </section>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <section aria-label="Verification" className="bg-surface border border-line rounded-card px-5 py-[18px] flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <div className="flex-1 flex flex-col gap-0.5">
              <h2 className="m-0 text-[17px] font-semibold">{v.listName}</h2>
              <div className="text-meta text-muted">{v.meta}</div>
            </div>
            <Button small>Fill missing fields</Button>
            <ButtonLink href="/campaigns/new" variant="dark" small>
              Add to campaign
            </ButtonLink>
          </div>
          <div
            role="img"
            aria-label={`Verification results: ${segs.map((s) => `${fmt.n(s.n)} ${s.label.toLowerCase()}`).join(", ")}`}
            className="flex h-3 rounded-md overflow-hidden gap-0.5"
          >
            {segs.map((s) => (s.n > 0 ? <div key={s.key} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} /> : null))}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {segs.map((s) => (
              <div key={s.key} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-meta text-muted">
                  <span aria-hidden className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="text-xl font-semibold tabular">{fmt.n(s.n)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-control bg-accent-soft">
            <span className="flex-1 text-[13.5px]">
              <span className="font-semibold">{fmt.n(v.readyToSend)} leads are ready to send.</span>{" "}
              <span className="text-ink-2">Risky and invalid addresses are held back so they can&apos;t hurt your domains.</span>
            </span>
            <Button
              small
              disabled={isClean}
              onClick={() => removeInvalidAndDuplicates(listId).then(() => setCleaned((c) => ({ ...c, [listId]: true })))}
            >
              {isClean ? "Invalid & duplicates removed" : "Remove invalid & duplicates"}
            </Button>
          </div>
        </section>

        <section aria-label="Leads" className="flex-1 min-h-0 bg-surface border border-line rounded-card overflow-auto">
          <div role="table" aria-label="Leads">
            <div role="row" className={`${cols} py-2.5 bg-head text-xs font-medium text-muted`}>
              <div role="columnheader">Lead</div>
              <div role="columnheader">Email</div>
              <div role="columnheader">Verification</div>
              <div role="columnheader">Email type</div>
              <div role="columnheader">Last activity</div>
            </div>
            {shown.map((l) => (
              <div role="row" key={l.id} className={`${cols} py-[11px] border-t border-divider`}>
                <div role="cell" className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-[13.5px]">{l.name}</span>
                  <span className="text-meta text-muted truncate">{l.company ?? "No company found"}</span>
                </div>
                <div role="cell" className="font-mono text-[12.5px] truncate">
                  {l.email}
                </div>
                <div role="cell" className="flex flex-col gap-0.5 items-start">
                  <StatusPill tone={vTone[l.verification]} className="!text-xs !min-h-[22px] !px-2">
                    {vLabel[l.verification]}
                  </StatusPill>
                  <span className="text-[11.5px] text-muted">{l.verificationReason}</span>
                </div>
                <div role="cell" className={cx("text-meta", l.emailType === "personal" ? "text-warn" : "text-ink-2")}>
                  {l.emailType === "personal" ? "Personal" : "Business"}
                </div>
                <div role="cell" className="text-meta text-muted">
                  {l.lastActivity}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
