"use client";

import { Bar, StatusPill, cx, fmt } from "@/components/ui-hubbly";
import { Toggle } from "@/components/ui-hubbly/controls";
import type { Domain, Mailbox } from "@/lib/mail/types";

export interface Schedule {
  sendInContactTimezone: boolean;
  sendWindows: string;
  perMailboxDaily: number;
  selectedMailboxIds: string[];
}

const healthTone = { good: "success", watch: "warn", poor: "danger" } as const;
const healthLabel = { good: "Healthy", watch: "Warming", poor: "Needs care" } as const;

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-divider last:border-b-0">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        {hint && <span className="text-meta text-muted">{hint}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ScheduleStage({
  mailboxes,
  domains,
  schedule,
  onChange,
}: {
  mailboxes: Mailbox[];
  domains: Domain[];
  schedule: Schedule;
  onChange: (patch: Partial<Schedule>) => void;
}) {
  const selected = new Set(schedule.selectedMailboxIds);
  const activeBoxes = mailboxes.filter((m) => selected.has(m.id));
  const dailyCapacity = activeBoxes.reduce((sum, m) => sum + Math.min(m.dailyLimit, schedule.perMailboxDaily), 0);
  const activeDomains = new Set(activeBoxes.map((m) => m.domainId)).size;

  function toggleMailbox(id: string) {
    onChange({
      selectedMailboxIds: selected.has(id) ? schedule.selectedMailboxIds.filter((x) => x !== id) : [...schedule.selectedMailboxIds, id],
    });
  }

  function toggleDomain(domainId: string, on: boolean) {
    const ids = mailboxes.filter((m) => m.domainId === domainId).map((m) => m.id);
    const rest = schedule.selectedMailboxIds.filter((x) => !ids.includes(x));
    onChange({ selectedMailboxIds: on ? [...rest, ...ids] : rest });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1040px] px-8 py-8 grid grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* Left: schedule + mailboxes */}
        <div className="flex flex-col gap-6">
          <section aria-label="Sending schedule" className="flex flex-col gap-3">
            <h2 className="m-0 text-[17px] font-semibold">When and how fast to send</h2>
            <div className="bg-surface border border-line rounded-card">
              <Field title="Send in each contact's timezone" hint="Emails land during working hours wherever they are.">
                <Toggle
                  label="Send in each contact's timezone"
                  checked={schedule.sendInContactTimezone}
                  onChange={(v) => onChange({ sendInContactTimezone: v })}
                />
              </Field>
              <Field title="Sending windows" hint={schedule.sendWindows}>
                <span className="text-meta text-muted">Business hours</span>
              </Field>
              <Field title="Per-mailbox daily limit" hint="New emails per mailbox each day. Kept low protects your reputation.">
                <div className="flex items-center rounded-control border border-control overflow-hidden">
                  <button
                    type="button"
                    aria-label="Decrease daily limit"
                    onClick={() => onChange({ perMailboxDaily: Math.max(5, schedule.perMailboxDaily - 5) })}
                    className="w-9 h-10 bg-surface text-ink cursor-pointer border-0 text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-12 text-center tabular font-semibold border-x border-control leading-10">{schedule.perMailboxDaily}</span>
                  <button
                    type="button"
                    aria-label="Increase daily limit"
                    onClick={() => onChange({ perMailboxDaily: Math.min(80, schedule.perMailboxDaily + 5) })}
                    className="w-9 h-10 bg-surface text-ink cursor-pointer border-0 text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>
          </section>

          <section aria-label="Mailboxes" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="m-0 text-[17px] font-semibold">Mailboxes rotating through this campaign</h2>
              <span className="text-meta text-muted">{activeBoxes.length} of {mailboxes.length} on</span>
            </div>

            {domains.map((d) => {
              const boxes = mailboxes.filter((m) => m.domainId === d.id);
              const onCount = boxes.filter((m) => selected.has(m.id)).length;
              const allOn = onCount === boxes.length;
              return (
                <div key={d.id} className="bg-surface border border-line rounded-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-divider bg-head">
                    <span className="text-sm font-semibold">{d.name}</span>
                    {d.status === "warming" || d.status === "needs_fix" ? (
                      <StatusPill tone="warn">Warming{d.warmupDay ? ` · day ${d.warmupDay}/${d.warmupTotal}` : ""}</StatusPill>
                    ) : (
                      <StatusPill tone="success">Healthy</StatusPill>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDomain(d.id, !allOn)}
                      className="ml-auto text-[13px] font-semibold text-accent bg-transparent border-0 cursor-pointer"
                    >
                      {allOn ? "Turn all off" : "Turn all on"}
                    </button>
                  </div>
                  {boxes.map((m) => {
                    const on = selected.has(m.id);
                    const cap = Math.min(m.dailyLimit, schedule.perMailboxDaily);
                    return (
                      <div key={m.id} className={cx("flex items-center gap-3.5 px-4 py-3 border-b border-divider last:border-b-0", !on && "opacity-55")}>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="text-sm font-medium truncate">{m.address}</span>
                          <span className="text-meta text-muted truncate">
                            {m.senderName} · {fmt.n(m.sentToday)}/{fmt.n(m.dailyLimit)} sent today
                          </span>
                        </div>
                        <StatusPill tone={healthTone[m.health]}>{healthLabel[m.health]}</StatusPill>
                        <span className="text-meta text-muted tabular w-[68px] text-right">+{cap}/day</span>
                        <Toggle label={`Use ${m.address}`} checked={on} onChange={() => toggleMailbox(m.id)} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </div>

        {/* Right: capacity summary */}
        <aside aria-label="Sending capacity" className="bg-surface border border-line rounded-card p-5 flex flex-col gap-4 sticky top-8">
          <h3 className="m-0 text-[15px] font-semibold">Daily capacity</h3>
          <div className="flex items-end gap-2">
            <span className="text-[30px] font-semibold tabular leading-none">{fmt.n(dailyCapacity)}</span>
            <span className="text-meta text-muted mb-1">new emails / day</span>
          </div>
          <Bar pct={Math.min(100, (dailyCapacity / (mailboxes.length * schedule.perMailboxDaily)) * 100)} height={8} />
          <div className="flex flex-col gap-2 text-[13px] pt-1">
            <div className="flex items-center justify-between">
              <span className="text-muted">Mailboxes on</span>
              <span className="tabular font-medium">{activeBoxes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Domains in rotation</span>
              <span className="tabular font-medium">{activeDomains}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Per mailbox</span>
              <span className="tabular font-medium">{schedule.perMailboxDaily}/day</span>
            </div>
          </div>
          <div className="mt-1 px-3.5 py-3 rounded-xl bg-tag flex flex-col gap-1">
            <div className="text-meta font-semibold">Warmup keeps limits low on new mailboxes</div>
            <div className="text-meta text-muted">Capacity rises automatically as reputation builds — no action needed.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
