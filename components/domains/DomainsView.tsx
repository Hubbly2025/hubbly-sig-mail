"use client";

import { useState } from "react";
import { Bar, Button, KpiTile, StatusPill, cx, fmt } from "@/components/ui-hubbly";
import { IconWarn } from "@/components/ui-hubbly/icons";
import { recheckDomain } from "@/lib/mail/api";
import type { Domain, MailSummary, Mailbox } from "@/lib/mail/types";

const cols = "grid grid-cols-[minmax(0,1.4fr)_100px_170px_210px_100px_130px] items-center gap-4 px-5";
const boxCols = "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_140px_80px_90px] items-center gap-4 px-5";

function AuthChip({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span className={cx("px-[7px] py-0.5 rounded-md text-[11.5px] font-semibold", ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
      <span className="sr-only">{ok ? "Passing: " : "Missing: "}</span>
      {children}
    </span>
  );
}

function statusOf(d: Domain) {
  if (d.status === "healthy") return <StatusPill tone="success">Healthy</StatusPill>;
  const warming = d.warmupDay ? `Warming · day ${d.warmupDay} of ${d.warmupTotal}` : "Needs a fix";
  return <StatusPill tone="warn">{warming}</StatusPill>;
}

const repLabel = { good: "Good", building: "Building", poor: "Poor" } as const;
const healthDot = { good: "bg-success-dot", watch: "bg-warn-dot", poor: "bg-danger" } as const;
const healthText = { good: "text-success", watch: "text-warn", poor: "text-danger" } as const;
const healthLabel = { good: "Good", watch: "Ramping", poor: "Poor" } as const;

export function DomainsView({ summary, domains, mailboxes }: { summary: MailSummary; domains: Domain[]; mailboxes: Mailbox[] }) {
  const [domainId, setDomainId] = useState(domains.find((d) => d.status === "healthy")?.id ?? domains[0].id);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = domains.find((d) => d.id === domainId)!;
  const boxes = mailboxes.filter((m) => m.domainId === domainId);
  const broken = domains.find((d) => d.fix);
  const needsFix = domains.filter((d) => d.fix).length;

  return (
    <div className="flex-1 px-8 py-6 flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3.5">
        <KpiTile
          label="Sent today"
          value={
            <>
              {fmt.n(summary.sendingToday.used)} <span className="text-[15px] font-normal text-muted">of {fmt.n(summary.sendingToday.capacity)}</span>
            </>
          }
        />
        <KpiTile
          label="Capacity after warm-up"
          value={
            <>
              {fmt.n(summary.sendingToday.capacityAfterWarmup)} <span className="text-[15px] font-normal text-muted">/ day</span>
            </>
          }
        />
        <KpiTile
          label="Domains"
          value={
            <>
              {domains.length} {needsFix > 0 && <span className="text-[15px] font-normal text-warn">· {needsFix} needs a fix</span>}
            </>
          }
        />
        <KpiTile
          label="Mailboxes"
          value={
            <>
              {summary.mailboxes} <span className="text-[15px] font-normal text-muted">· {summary.mailboxesWarming} warming</span>
            </>
          }
        />
      </div>

      <section aria-label="Domains" className="bg-surface border border-line rounded-card overflow-hidden">
        <div role="table" aria-label="Domains">
          <div role="row" className={`${cols} py-2.5 bg-head text-xs font-medium text-muted`}>
            <div role="columnheader">Domain</div>
            <div role="columnheader">Mailboxes</div>
            <div role="columnheader">Status</div>
            <div role="columnheader">Authentication</div>
            <div role="columnheader">Reputation</div>
            <div role="columnheader" className="text-right">Daily limit</div>
          </div>
          {domains.map((d) => {
            const sel = d.id === domainId;
            return (
              <div
                role="row"
                key={d.id}
                className={cx(`${cols} py-3.5 border-t border-divider`, d.fix ? "bg-[#fffbf3]" : "bg-surface", sel && "shadow-[inset_3px_0_0_var(--accent)]")}
              >
                <div role="cell" className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setDomainId(d.id)}
                    className="self-start p-0 border-0 bg-transparent text-left font-mono font-semibold text-[13.5px] text-ink cursor-pointer hover:text-accent"
                  >
                    {d.name}
                  </button>
                  <span className="text-meta text-muted">{d.origin === "own" ? `Your domain · connected ${d.connectedAt}` : "Set up by Hubbly"}</span>
                </div>
                <div role="cell">{d.mailboxes}</div>
                <div role="cell">{statusOf(d)}</div>
                <div role="cell" className="flex gap-1.5">
                  <AuthChip ok={d.spf}>SPF</AuthChip>
                  <AuthChip ok={d.dkim}>DKIM</AuthChip>
                  <AuthChip ok={d.dmarc}>DMARC</AuthChip>
                </div>
                <div role="cell" className="text-ink-2">
                  {repLabel[d.reputation]}
                </div>
                <div role="cell" className="text-right tabular">
                  {d.dailyLimitAfterWarmup ? `${d.dailyLimit} → ${d.dailyLimitAfterWarmup} / day` : `${d.dailyLimit} / day`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-5">
        <section aria-label="Mailboxes" className="flex-1 min-w-0 bg-surface border border-line rounded-card overflow-hidden flex flex-col">
          <div className="flex items-center px-5 py-3.5">
            <h2 className="m-0 text-[15px] font-semibold flex-1">
              Mailboxes · <span className="font-mono font-medium">{selected.name}</span>
            </h2>
            <Button small>+ Add mailbox</Button>
          </div>
          <div role="table" aria-label={`Mailboxes on ${selected.name}`}>
            <div role="row" className={`${boxCols} py-2.5 bg-head border-t border-divider text-xs font-medium text-muted`}>
              <div role="columnheader">Address</div>
              <div role="columnheader">Sender name</div>
              <div role="columnheader">Sent today</div>
              <div role="columnheader">Warm-up</div>
              <div role="columnheader">Health</div>
            </div>
            {boxes.map((b) => (
              <div role="row" key={b.id} className={`${boxCols} py-3 border-t border-divider`}>
                <div role="cell" className="font-mono text-[13px] truncate">
                  {b.address}
                </div>
                <div role="cell" className="text-ink-2">
                  {b.senderName}
                </div>
                <div role="cell" className="flex items-center gap-2">
                  <Bar pct={(b.sentToday / b.dailyLimit) * 100} className="w-[70px]" />
                  <span className="text-meta text-muted tabular">
                    {b.sentToday} of {b.dailyLimit}
                  </span>
                </div>
                <div role="cell" className="text-ink-2">
                  {b.warmupOn ? "On" : "Off"}
                </div>
                <div role="cell" className={cx("flex items-center gap-1.5", healthText[b.health])}>
                  <span aria-hidden className={cx("w-2 h-2 rounded-full", healthDot[b.health])} />
                  {healthLabel[b.health]}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto px-5 py-3 border-t border-divider text-meta text-muted">
            Warm-up is handled by Hubbly. New mailboxes ramp from 10 to 40 sends a day over 21 days.
          </div>
        </section>

        {broken?.fix && (
          <section aria-label="Fix needed" className="w-[400px] shrink-0 self-start bg-surface border border-warn-line rounded-card px-5 py-[18px] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-warn font-semibold">
              <IconWarn />
              {broken.name} needs a {broken.fix.record} record
            </div>
            <p className="m-0 text-[13.5px] leading-relaxed text-ink-2">
              Without it, inbox providers are more likely to junk your mail. Campaigns sending from this domain are paused until the record is live. Add this at your DNS
              provider:
            </p>
            <dl className="m-0 border border-line rounded-control overflow-hidden text-[13px]">
              {(
                [
                  ["Type", broken.fix.type],
                  ["Host", broken.fix.host],
                  ["Value", broken.fix.value],
                ] as const
              ).map(([k, val], i) => (
                <div key={k} className={cx("grid grid-cols-[70px_minmax(0,1fr)]", i < 2 && "border-b border-divider")}>
                  <dt className="px-3 py-2 bg-head text-muted">{k}</dt>
                  <dd className="m-0 px-3 py-2 font-mono break-all leading-normal">{val}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(broken.fix!.value).catch(() => {});
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy value"}
              </Button>
              <Button
                variant="primary"
                disabled={checking}
                onClick={() => {
                  setChecking(true);
                  recheckDomain(broken.id).then((r) => {
                    setChecking(false);
                    setCheckMsg(r.message);
                  });
                }}
              >
                {checking ? "Checking…" : "Check again"}
              </Button>
            </div>
            {checkMsg && (
              <p role="status" className="m-0 text-meta text-muted">
                {checkMsg}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
