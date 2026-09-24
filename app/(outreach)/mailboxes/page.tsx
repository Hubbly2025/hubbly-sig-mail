"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, Button, StatusPill, cx } from "@/components/ui-hubbly";
import { IconPlus } from "@/components/ui-hubbly/icons";
import { Dialog, HelpButton, Panel, Skel, useToast } from "@/components/outreach/feedback";
import { PageHeader, useCan } from "@/components/outreach/shell";
import { mailboxKind, mailboxStatus } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import { useResource } from "@/lib/outreach/hooks";
import type { ImportRow, Mailbox, MailboxesResponse, PendingDomain } from "@/lib/outreach/types";

const RAMP = [
  { day: "Day 14", perDay: 5 },
  { day: "Day 21", perDay: 10 },
  { day: "Day 28", perDay: 20 },
  { day: "Day 35", perDay: 30 },
];

function MailboxCard({ m, onChanged }: { m: Mailbox; onChanged: () => void }) {
  const toast = useToast();
  const canManage = useCan("manage_mailboxes");
  const [confirm, setConfirm] = useState(false);
  const st = mailboxStatus[m.status];
  const w = m.warmup;
  return (
    <article className={cx("bg-surface border rounded-card p-4 flex flex-col gap-3", m.status === "burnt" ? "border-line opacity-70" : "border-line")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[13.5px] font-semibold truncate">{m.address}</div>
          <div className="text-meta text-muted">{mailboxKind[m.kind]}</div>
        </div>
        <StatusPill tone={st.tone}>
          <span title={st.help}>{st.label}</span>
        </StatusPill>
      </div>
      {m.status === "warming" && w ? (
        <div className="flex flex-col gap-1.5">
          <Bar pct={Math.min(100, (w.day / 35) * 100)} />
          <div className="flex justify-between text-meta text-muted">
            <span>Day {w.day} of 35</span>
            <span>
              {w.per_day_now} of {w.per_day_target} a day
            </span>
          </div>
        </div>
      ) : m.status === "ready" ? (
        <div className="text-meta text-muted">Sends up to {w?.per_day_target ?? 30} a day</div>
      ) : (
        <div className="text-meta text-muted">{m.note ?? st.help}</div>
      )}
      {canManage && m.status !== "burnt" && m.status !== "provisioning" && m.status !== "verifying" && (
        <div className="flex gap-2 pt-2 border-t border-divider">
          <Button
            small
            onClick={async () => {
              try {
                await api("POST", `outreach/mailboxes/${m.id}/pause`);
                toast("success", m.status === "paused" ? "Back in rotation." : "Taken out of rotation.");
                onChanged();
              } catch (e) {
                toast("error", (e as Error).message);
              }
            }}
          >
            {m.status === "paused" ? "Resume" : "Pause"}
          </Button>
          <Button small variant="ghost" className="ml-auto" onClick={() => setConfirm(true)}>
            Remove
          </Button>
        </div>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove this mailbox?"
        width={420}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirm(false);
                try {
                  await api("DELETE", `outreach/mailboxes/${m.id}`);
                  toast("warn", `${m.address} disconnected. Campaigns using it moved to your other ready mailboxes.`);
                  onChanged();
                } catch (e) {
                  toast("error", (e as Error).message);
                }
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="m-0 text-ink-2">
          <span className="font-mono">{m.address}</span> is disconnected. Campaigns in the middle of sending move to another ready mailbox.
        </p>
      </Dialog>
    </article>
  );
}

function DomainPanel({ d, onChanged }: { d: PendingDomain; onChanged: () => void }) {
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const seen = d.records.filter((r) => r.seen).length;
  return (
    <Panel
      title={`${d.domain} · waiting on DNS`}
      actions={
        <Button
          small
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            try {
              const r = await api<PendingDomain>("POST", `outreach/mailboxes/domains/${d.id}/check`);
              const left = r.records.filter((x) => !x.seen).length;
              toast(left ? "warn" : "success", left ? `${left} record${left === 1 ? "" : "s"} not seen yet. DNS changes can take up to an hour.` : "All records found.");
              onChanged();
            } catch (e) {
              toast("error", (e as Error).message);
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "Checking…" : "Check DNS now"}
        </Button>
      }
    >
      <p className="m-0 px-5 pb-3 text-meta text-muted">
        Add these at your DNS provider. {seen} of {d.records.length} seen so far.
      </p>
      <div role="table" aria-label={`DNS records for ${d.domain}`}>
        <div role="row" className="grid grid-cols-[70px_150px_minmax(0,1fr)_110px] gap-3 px-5 py-2 bg-head text-xs font-medium text-muted border-t border-divider">
          <div role="columnheader">Type</div>
          <div role="columnheader">Host</div>
          <div role="columnheader">Value</div>
          <div role="columnheader">Status</div>
        </div>
        {d.records.map((r, i) => (
          <div role="row" key={i} className="grid grid-cols-[70px_150px_minmax(0,1fr)_110px] gap-3 items-center px-5 py-2.5 border-t border-divider text-[13px]">
            <div role="cell" className="font-mono">{r.type}</div>
            <div role="cell" className="font-mono truncate">{r.host}</div>
            <div role="cell" className="font-mono break-all text-ink-2">{r.value}</div>
            <div role="cell">{r.seen ? <StatusPill tone="success">Seen</StatusPill> : <StatusPill tone="warn">Not yet</StatusPill>}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- Add mailboxes ---------- */

type AddTab = "managed" | "connect" | "import";

function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((nm) => h.includes(nm)));
  const iAddr = col("email", "address", "username");
  const iSh = col("smtp_host", "smtp host", "smtp server");
  const iSp = col("smtp_port", "smtp port");
  const iIh = col("imap_host", "imap host", "imap server");
  const iIp = col("imap_port", "imap port");
  return lines
    .slice(1)
    .map((l) => l.split(",").map((x) => x.trim()))
    .filter((c) => c[iAddr]?.includes("@"))
    .map((c) => ({
      address: c[iAddr],
      smtp_host: c[iSh] ?? "",
      smtp_port: Number(c[iSp] ?? 587),
      imap_host: c[iIh] ?? "",
      imap_port: Number(c[iIp] ?? 993),
    }));
}

const SAMPLE_CSV =
  "email,smtp_host,smtp_port,imap_host,imap_port,password\njane@yourdomain.com,smtp.yourdomain.com,587,imap.yourdomain.com,993,app-password-here\n";

function AddMailboxes({ open, onClose, room, onDone }: { open: boolean; onClose: () => void; room: number; onDone: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<AddTab>("managed");
  const [dir, setDir] = useState<1 | -1>(1);
  const [name, setName] = useState("");
  const [count, setCount] = useState(3);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const order: AddTab[] = ["managed", "connect", "import"];

  const switchTo = (t: AddTab) => {
    setDir(order.indexOf(t) > order.indexOf(tab) ? 1 : -1);
    setTab(t);
  };

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => string) {
    setBusy(true);
    try {
      const r = await fn();
      toast("success", ok(r));
      onDone();
      onClose();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add mailboxes" width={640}>
      <div role="tablist" aria-label="How to add" className="flex gap-1 p-1 rounded-control bg-track mb-4">
        {(
          [
            ["managed", "Managed by Hubbly"],
            ["connect", "Connect your own"],
            ["import", "Import"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => switchTo(k)}
            className={cx("flex-1 min-h-9 rounded-lg border-0 text-[13px] cursor-pointer", tab === k ? "bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] font-semibold text-ink" : "bg-transparent text-muted")}
          >
            {l}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-[slide_220ms_ease-out]" style={{ ["--from" as string]: `${dir * 24}px` }}>
        <p className="m-0 mb-3 text-meta text-muted">You have room for {room} more on your plan.</p>
        {tab === "managed" && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-ink-2 text-[14px] leading-relaxed">We buy a domain close to your brand, set up its DNS, then create and warm the mailboxes. They move to Ready on their own in about five weeks.</p>
            <label className="flex flex-col gap-1.5 text-meta text-muted">
              Your brand name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hubbly" className="min-h-10 px-3 rounded-control border border-control text-sm text-ink" />
            </label>
            <label className="flex flex-col gap-1.5 text-meta text-muted">
              How many mailboxes
              <input type="number" min={1} max={Math.max(1, room)} value={count} onChange={(e) => setCount(Number(e.target.value))} className="min-h-10 px-3 rounded-control border border-control text-sm text-ink w-28" />
            </label>
            <div className="flex justify-end">
              <Button variant="primary" disabled={busy || !name.trim() || room < 1} onClick={() => run(() => api<{ created: number; domain: string }>("POST", "outreach/mailboxes/managed", { name, count }), (r) => `Setting up ${r.created} mailbox${r.created === 1 ? "" : "es"} on ${r.domain}.`)}>
                {busy ? "Starting…" : "Set them up"}
              </Button>
            </div>
          </div>
        )}
        {tab === "connect" && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-ink-2 text-[14px] leading-relaxed">
              Sign in with the account you want to send from. Use a secondary domain, not the one your main inbox runs on — cold email on your main domain puts your everyday
              email at risk.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["google", "microsoft"] as const).map((p) => (
                <Button
                  key={p}
                  className="min-h-12"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api<{ url: string }>("GET", `outreach/mailboxes/connect/${p}`);
                      window.location.href = r.url;
                    } catch (e) {
                      toast("error", (e as Error).message);
                      setBusy(false);
                    }
                  }}
                >
                  Sign in with {p === "google" ? "Google" : "Microsoft"}
                </Button>
              ))}
            </div>
          </div>
        )}
        {tab === "import" && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-ink-2 text-[14px] leading-relaxed">Upload a CSV exported from another provider. We read the SMTP and IMAP settings out of it and show you what we found before anything is created.</p>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="Mailbox CSV"
                className="text-sm"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const parsed = parseCsv(await f.text());
                  setRows(parsed);
                  setTicked(new Set(parsed.map((_, i) => i).slice(0, room)));
                  if (!parsed.length) toast("error", "No mailboxes found in that file. Check it has an email column.");
                }}
              />
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="mailboxes-sample.csv" className="ml-auto text-[13px] no-underline">
                Download a sample CSV
              </a>
            </div>
            {rows.length > 0 && (
              <>
                <div className="border border-line rounded-control max-h-[240px] overflow-y-auto">
                  {rows.map((r, i) => (
                    <label key={i} className="flex items-center gap-3 px-3 py-2 border-b border-divider last:border-b-0 text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ticked.has(i)}
                        onChange={(e) =>
                          setTicked((s) => {
                            const next = new Set(s);
                            e.target.checked ? next.add(i) : next.delete(i);
                            return next;
                          })
                        }
                      />
                      <span className="font-mono flex-1 truncate">{r.address}</span>
                      <span className="text-muted font-mono text-[12px]">
                        {r.smtp_host}:{r.smtp_port}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cx("text-meta", ticked.size > room ? "text-danger" : "text-muted")}>
                    {ticked.size} ticked · room for {room}
                  </span>
                  <Button
                    variant="primary"
                    className="ml-auto"
                    disabled={busy || !ticked.size}
                    onClick={() => run(() => api<{ created: number }>("POST", "outreach/mailboxes/import", { rows: rows.filter((_, i) => ticked.has(i)) }), (r) => `${r.created} mailbox${r.created === 1 ? "" : "es"} imported. They're being verified now.`)}
                  >
                    Import {ticked.size}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default function MailboxesPage() {
  const canManage = useCan("manage_mailboxes");
  const r = useResource<MailboxesResponse>("outreach/mailboxes", { every: 30_000 });
  const [adding, setAdding] = useState(false);
  const d = r.data;

  const stats = useMemo(() => {
    if (!d) return null;
    const live = d.mailboxes.filter((m) => m.status !== "burnt");
    const ready = d.mailboxes.filter((m) => m.status === "ready");
    const today = d.mailboxes.reduce((a, m) => a + (m.status === "ready" || m.status === "warming" ? m.warmup?.per_day_now ?? 0 : 0), 0);
    return { total: live.length, ready: ready.length, today, room: d.limits.max_mailboxes - live.length };
  }, [d]);

  return (
    <>
      <PageHeader
        title="Mailboxes"
        context={stats ? `${stats.total} mailboxes · ${stats.ready} ready · can send ${stats.today.toLocaleString("en-US")} emails today` : " "}
        actions={
          <>
            <HelpButton title="What is a mailbox?">
              <p className="m-0">A mailbox is an address your campaigns send from. Campaigns spread their sending across every ready mailbox, so no single address sends too much.</p>
              <h3 className="m-0 mt-1 text-[14px] font-semibold text-ink">Three ways to get one</h3>
              <ul className="m-0 pl-5">
                <li><b>Managed by Hubbly</b> — we buy a domain, set up DNS, create and warm the mailboxes.</li>
                <li><b>Connect your own</b> — sign in with Google or Microsoft.</li>
                <li><b>Import</b> — bring mailboxes you bought elsewhere, from a CSV.</li>
              </ul>
              <h3 className="m-0 mt-1 text-[14px] font-semibold text-ink">Why a secondary domain</h3>
              <p className="m-0">Cold email is judged harshly by inbox providers. Sending it from a domain close to your brand, not your main one, keeps your everyday email safe if anything goes wrong.</p>
              <h3 className="m-0 mt-1 text-[14px] font-semibold text-ink">The warmup ramp</h3>
              <table className="w-full text-[13px] border border-line rounded-control">
                <thead className="bg-head text-muted">
                  <tr>
                    <th className="text-left font-medium px-3 py-1.5">When</th>
                    <th className="text-left font-medium px-3 py-1.5">Campaign emails a day</th>
                  </tr>
                </thead>
                <tbody>
                  {RAMP.map((x) => (
                    <tr key={x.day} className="border-t border-divider">
                      <td className="px-3 py-1.5">{x.day}</td>
                      <td className="px-3 py-1.5">{x.perDay === 30 ? "30 (full)" : x.perDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HelpButton>
            {canManage && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <IconPlus size={15} />
                Add mailboxes
              </Button>
            )}
          </>
        }
      />
      <div className="px-8 py-6 flex flex-col gap-4">
        {d?.domains_pending.map((x) => (
          <DomainPanel key={x.id} d={x} onChanged={r.reload} />
        ))}
        <Panel
          title="Your mailboxes"
          loading={r.loading}
          error={r.error}
          onRetry={r.reload}
          empty={d?.mailboxes.length === 0}
          emptyText="No mailboxes yet. Campaigns can't send until at least one is ready."
          emptyAction={canManage ? <Button variant="primary" onClick={() => setAdding(true)}>Add mailboxes</Button> : undefined}
          skeleton={
            <div className="grid grid-cols-3 gap-4 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skel key={i} className="h-[130px] rounded-card" />
              ))}
            </div>
          }
          actions={d && <span className="text-meta text-muted">{d.limits.max_mailboxes} allowed on your plan · up to {d.limits.per_mailbox_daily} a day each</span>}
        >
          <div className="grid grid-cols-3 gap-4 p-5 pt-1">
            {d?.mailboxes.map((m) => (
              <MailboxCard key={m.id} m={m} onChanged={r.reload} />
            ))}
          </div>
        </Panel>
      </div>
      {stats && <AddMailboxes open={adding} onClose={() => setAdding(false)} room={stats.room} onDone={r.reload} />}
    </>
  );
}
