"use client";

import { Button, StatusPill, cx, fmt } from "@/components/ui-hubbly";
import { IconCheck, IconMail, IconPerson, IconSend, IconWarn } from "@/components/ui-hubbly/icons";
import type { SendCheck, SequenceStep, VerificationSummary } from "@/lib/mail/types";

function SummaryCard({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-line rounded-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-accent-soft2 text-accent-ink flex items-center justify-center">{icon}</span>
        <h3 className="m-0 text-[15px] font-semibold flex-1">{title}</h3>
        <button type="button" onClick={onEdit} className="text-[13px] font-semibold text-accent bg-transparent border-0 cursor-pointer">
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function ReviewStage({
  campaignName,
  steps,
  verification,
  checks,
  mailboxCount,
  domainCount,
  dailyCapacity,
  sendWindows,
  fromLabel,
  goToStage,
  onLaunch,
  launching,
}: {
  campaignName: string;
  steps: SequenceStep[];
  verification?: VerificationSummary;
  checks: SendCheck[];
  mailboxCount: number;
  domainCount: number;
  dailyCapacity: number;
  sendWindows: string;
  fromLabel: string;
  goToStage: (stage: number) => void;
  onLaunch: () => void;
  launching: boolean;
}) {
  const totalDays = steps[steps.length - 1]?.dayOffset ?? 0;
  const totalVariants = steps.reduce((n, s) => n + s.variants.length, 0);
  const ready = verification?.readyToSend ?? 0;
  const estDays = dailyCapacity > 0 ? Math.ceil(ready / dailyCapacity) : 0;
  const warnings = checks.filter((c) => c.tone === "warn");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[960px] px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[17px] font-semibold">Ready to launch “{campaignName}”</h2>
          <p className="m-0 text-[13.5px] text-muted">Review everything below. Nothing sends until you launch, and you can pause anytime.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon={<IconPerson size={15} />} title="Audience" onEdit={() => goToStage(0)}>
            <div className="flex flex-col gap-2">
              <Line label="List" value={<span className="truncate max-w-[140px] inline-block align-bottom">{verification?.listName ?? "—"}</span>} />
              <Line label="Ready to send" value={<span className="text-success">{fmt.n(ready)}</span>} />
              <Line label="Skipped / merged" value={fmt.n((verification?.risky ?? 0) + (verification?.invalid ?? 0) + (verification?.duplicate ?? 0))} />
            </div>
          </SummaryCard>

          <SummaryCard icon={<IconMail size={15} />} title="Sequence" onEdit={() => goToStage(1)}>
            <div className="flex flex-col gap-2">
              <Line label="Emails" value={`${steps.length} steps`} />
              <Line label="Variants" value={`${totalVariants} total`} />
              <Line label="Runs over" value={`${totalDays} days`} />
            </div>
          </SummaryCard>

          <SummaryCard icon={<IconSend size={15} />} title="Sending" onEdit={() => goToStage(2)}>
            <div className="flex flex-col gap-2">
              <Line label="Mailboxes" value={`${mailboxCount} on · ${domainCount} domains`} />
              <Line label="Daily capacity" value={`${fmt.n(dailyCapacity)}/day`} />
              <Line label="From" value={<span className="truncate max-w-[130px] inline-block align-bottom">{fromLabel}</span>} />
            </div>
          </SummaryCard>
        </div>

        <section className="bg-surface border border-line rounded-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="m-0 text-[15px] font-semibold flex-1">Checks before sending</h3>
            {warnings.length === 0 ? (
              <StatusPill tone="success">All clear</StatusPill>
            ) : (
              <StatusPill tone="warn">{warnings.length} to review</StatusPill>
            )}
          </div>
          {checks.map((c, i) => (
            <div key={c.id} className={cx("flex items-start gap-2.5 py-2 text-[13.5px]", i > 0 && "border-t border-divider")}>
              <span
                aria-hidden
                className={cx(
                  "mt-px w-4 h-4 rounded-full shrink-0 flex items-center justify-center",
                  c.tone === "ok" ? "bg-success-bg text-success" : "bg-warn-bg text-warn"
                )}
              >
                {c.tone === "ok" ? <IconCheck size={11} strokeWidth={2.4} /> : <IconWarn size={11} />}
              </span>
              <span className="sr-only">{c.tone === "ok" ? "Passed:" : "Needs review:"}</span>
              <span className="flex-1">{c.label}</span>
              {c.detail && <span className="text-muted tabular">{c.detail}</span>}
              {c.action && (
                <button type="button" className="font-semibold text-accent bg-transparent border-0 cursor-pointer">
                  {c.action}
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="bg-ink text-white rounded-card p-6 flex items-center gap-6">
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-[15px] font-semibold">Everything looks good</div>
            <div className="text-[13.5px] text-white/70">
              At {fmt.n(dailyCapacity)} emails/day, first touches to all {fmt.n(ready)} contacts finish in about{" "}
              <span className="font-semibold text-white">{estDays} business {estDays === 1 ? "day" : "days"}</span>. Sends only during {sendWindows}.
            </div>
          </div>
          <Button variant="primary" className="shrink-0" onClick={onLaunch} disabled={launching}>
            {launching ? "Launching…" : "Launch campaign"}
          </Button>
        </section>
      </div>
    </div>
  );
}
