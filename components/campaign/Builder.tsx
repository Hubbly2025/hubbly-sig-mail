"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { IconCheck, IconPen } from "@/components/ui-hubbly/icons";
import { Dialog, Pager, Panel, Skel, useToast } from "@/components/outreach/feedback";
import { RulesPanel } from "@/components/outreach/RulesPanel";
import { useCan } from "@/components/outreach/shell";
import { DAYS, n } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import { useDebounced, useResource } from "@/lib/outreach/hooks";
import type { AudienceFilter, AudiencePreview, Campaign, Candidate, DraftCandidate, EmailPreview, Page, Region, SenderProfile, Step } from "@/lib/outreach/types";
import type { useCampaign } from "./useCampaign";

type CM = ReturnType<typeof useCampaign>;
const STEPS = ["Who this goes to", "What it says", "When it sends", "Review and launch"];

const input = "min-h-10 px-3 rounded-control border border-control bg-surface text-sm text-ink";
const label = "flex flex-col gap-1.5 text-meta text-muted";

export function Builder({ cm, step }: { cm: CM; step: number }) {
  const router = useRouter();
  const c = cm.campaign!;
  const go = (s: number) => router.push(`/campaigns/${c.id}?step=${s}`);
  const finishRef = useRef<() => Promise<boolean>>(async () => true);
  const [finishing, setFinishing] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-4 px-8 pt-5">
        <ol aria-label="Builder steps" className="list-none m-0 p-0 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const k = i + 1;
            const on = k === step;
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="w-6 h-px bg-control" />}
                <button
                  type="button"
                  aria-current={on ? "step" : undefined}
                  onClick={() => go(k)}
                  className={cx("flex items-center gap-2 min-h-9 px-3 rounded-full border-0 cursor-pointer text-[13px]", on ? "bg-ink text-white font-semibold" : "bg-transparent text-muted hover:text-ink")}
                >
                  <span aria-hidden className={cx("w-2 h-2 rounded-full", on ? "bg-white" : k < step ? "bg-accent" : "bg-control")} />
                  {s}
                </button>
              </li>
            );
          })}
        </ol>
        <span role="status" className="ml-auto text-meta text-muted">
          {cm.save === "saving" ? "Saving…" : cm.save === "saved" ? "All changes saved" : cm.save === "error" ? <span className="text-danger">Couldn&apos;t save — keep this tab open and try again</span> : ""}
        </span>
      </div>

      <div className="flex-1 px-8 py-5">
        {step === 1 && <AudienceStep cm={cm} registerFinish={(f) => (finishRef.current = f)} />}
        {step === 2 && <ContentStep cm={cm} registerFinish={(f) => (finishRef.current = f)} />}
        {step === 3 && <ScheduleStep cm={cm} registerFinish={(f) => (finishRef.current = f)} />}
        {step === 4 && <ReviewStep cm={cm} />}
      </div>

      {step < 4 && (
        <div className="sticky bottom-0 flex items-center gap-3 px-8 py-3.5 bg-surface border-t border-line">
          {step > 1 && <Button onClick={() => go(step - 1)}>Back</Button>}
          <Button
            variant="primary"
            className="ml-auto"
            disabled={finishing}
            onClick={async () => {
              setFinishing(true);
              await cm.flush();
              const ok = await finishRef.current();
              setFinishing(false);
              if (ok) go(step + 1);
            }}
          >
            {finishing ? "Saving…" : "Save and continue"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ================= Step 1 — Who this goes to ================= */

function AudienceStep({ cm, registerFinish }: { cm: CM; registerFinish: (f: () => Promise<boolean>) => void }) {
  const c = cm.campaign!;
  const toast = useToast();
  const f = c.audience.filter;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [prev, setPrev] = useState<AudiencePreview>();
  const [cands, setCands] = useState<Page<Candidate>>();
  const [enrolling, setEnrolling] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const key = useDebounced(JSON.stringify({ f, r: c.audience.region }), 400);

  useEffect(() => {
    const { f: filter, r: region } = JSON.parse(key);
    api<AudiencePreview>("POST", `outreach/campaigns/${c.id}/audience/preview`, { filter, region }).then(setPrev).catch(() => {});
    api<Page<Candidate>>("POST", `outreach/campaigns/${c.id}/audience/candidates`, { filter, region, page }).then(setCands).catch(() => {});
  }, [key, page, c.id]);

  const setFilter = (p: Partial<AudienceFilter>) => {
    cm.patch({ audience: { filter: p } }, (x) => ({ ...x, audience: { ...x.audience, filter: { ...x.audience.filter, ...p } } }));
    setPage(1);
  };
  const setRegion = (region: Region, region_reason?: string) =>
    cm.patch({ audience: { region, region_reason: region_reason ?? c.audience.region_reason } }, (x) => ({ ...x, audience: { ...x.audience, region, region_reason: region_reason ?? x.audience.region_reason } }));

  async function enroll(ids: string[] | "all") {
    setEnrolling(true);
    try {
      await cm.flush();
      const r = await api<{ enrolled: number }>("POST", `outreach/campaigns/${c.id}/enroll`, ids === "all" ? { all: true } : { lead_ids: ids });
      toast("success", `${n(r.enrolled)} lead${r.enrolled === 1 ? "" : "s"} enrolled.`);
      setPicked(new Set());
      await cm.reload();
      return true;
    } catch (e) {
      toast("error", (e as Error).message);
      return false;
    } finally {
      setEnrolling(false);
    }
  }

  // Next enrolls only what's ticked — nobody if nothing is ticked.
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => {
    registerFinish(async () => {
      if (c.audience.region === "anywhere" && !c.audience.region_reason.trim()) {
        toast("error", "Sending anywhere needs a recorded reason.");
        return false;
      }
      if (pickedRef.current.size) return enroll([...pickedRef.current]);
      return true;
    });
  });

  const eligibleOnPage = (cands?.items ?? []).filter((x) => !x.held_back_reason && !x.already_enrolled);
  const allOnPage = eligibleOnPage.length > 0 && eligibleOnPage.every((x) => picked.has(x.id));

  return (
    <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
      <div className="flex flex-col gap-4">
        <Panel title="Filters" bodyClassName="px-5 pb-5 flex flex-col gap-3.5">
          <label className={label}>
            Leads from
            <select className={input} value={f.source} onChange={(e) => setFilter({ source: e.target.value as AudienceFilter["source"] })}>
              <option value="signal_visitors">Identified website visitors</option>
              <option value="all_leads">All leads</option>
            </select>
          </label>
          <label className={label}>
            Visited page (optional)
            <input className={cx(input, "font-mono")} value={f.visited_page} placeholder="/pricing" onChange={(e) => setFilter({ visited_page: e.target.value })} />
          </label>
          <label className={label}>
            At least this many visits
            <input className={input} type="number" min={0} max={20} value={f.min_visits} onChange={(e) => setFilter({ min_visits: Math.max(0, Number(e.target.value)) })} />
          </label>
          <label className={label}>
            Email addresses
            <select className={input} value={f.email_type} onChange={(e) => setFilter({ email_type: e.target.value as AudienceFilter["email_type"] })}>
              <option value="business">Business addresses only</option>
              <option value="any">Business and personal</option>
            </select>
          </label>
        </Panel>

        <Panel title="Region" bodyClassName="px-5 pb-5 flex flex-col gap-2">
          {(
            [
              ["us", "United States only"],
              ["us_ca", "United States and Canada"],
              ["anywhere", "Anywhere, with a recorded reason"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2.5 min-h-8 text-sm cursor-pointer">
              <input type="radio" name="region" checked={c.audience.region === v} onChange={() => setRegion(v)} />
              {l}
            </label>
          ))}
          {c.audience.region === "anywhere" && (
            <label className={label}>
              Reason (kept on record)
              <textarea
                className={cx(input, "py-2 min-h-[72px]")}
                value={c.audience.region_reason}
                onChange={(e) => setRegion("anywhere", e.target.value)}
                placeholder="e.g. UK partners who asked to hear from us"
              />
            </label>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <Panel title="Who is matched" loading={!prev} skeleton={<div className="p-5"><Skel className="h-16 w-full" /></div>} bodyClassName="px-5 pb-5">
          {prev && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-meta text-muted">Matched</div>
                  <div className="text-2xl font-semibold tabular">{n(prev.matched)}</div>
                </div>
                <div>
                  <div className="text-meta text-muted">Will be enrolled</div>
                  <div className="text-2xl font-semibold tabular text-success">{n(prev.will_enroll)}</div>
                </div>
                <div>
                  <div className="text-meta text-muted">Already enrolled</div>
                  <div className="text-2xl font-semibold tabular">{n(c.enrolled_count)}</div>
                </div>
              </div>
              {prev.held_back.length > 0 && (
                <div className="flex flex-col gap-1 pt-3 border-t border-divider">
                  <div className="text-meta font-semibold">Held back</div>
                  {prev.held_back.map((h) => (
                    <div key={h.reason} className="flex justify-between text-[13px]">
                      <span className="text-ink-2">{h.reason}</span>
                      <span className="tabular text-muted">{n(h.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Leads"
          loading={!cands}
          actions={
            <div className="flex gap-2">
              {c.enrolled_count > 0 && (
                <Button small onClick={() => setConfirmRemove(true)}>
                  Remove enrolled
                </Button>
              )}
              <Button small variant="primary" disabled={enrolling || (!picked.size && !prev?.will_enroll)} onClick={() => enroll(picked.size ? [...picked] : "all")}>
                {enrolling ? "Enrolling…" : picked.size ? `Enroll ${n(picked.size)} selected` : `Enroll all ${n(prev?.will_enroll ?? 0)}`}
              </Button>
            </div>
          }
        >
          <div role="table" aria-label="Matching leads">
            <div role="row" className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1.2fr)_100px_minmax(0,1fr)] gap-3 items-center px-5 py-2.5 bg-head text-xs font-medium text-muted border-t border-divider">
              <div role="columnheader">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allOnPage}
                  onChange={(e) =>
                    setPicked((s) => {
                      const next = new Set(s);
                      eligibleOnPage.forEach((x) => (e.target.checked ? next.add(x.id) : next.delete(x.id)));
                      return next;
                    })
                  }
                />
              </div>
              <div role="columnheader">Lead</div>
              <div role="columnheader">Email</div>
              <div role="columnheader">Type</div>
              <div role="columnheader">Status</div>
            </div>
            {cands?.items.map((x) => {
              const disabled = !!x.held_back_reason || x.already_enrolled;
              return (
                <label
                  role="row"
                  key={x.id}
                  className={cx("grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1.2fr)_100px_minmax(0,1fr)] gap-3 items-center px-5 py-2.5 border-t border-divider", disabled ? "text-muted" : "cursor-pointer hover:bg-head")}
                >
                  <div role="cell">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={picked.has(x.id)}
                      onChange={(e) =>
                        setPicked((s) => {
                          const next = new Set(s);
                          e.target.checked ? next.add(x.id) : next.delete(x.id);
                          return next;
                        })
                      }
                      aria-label={`Select ${x.name}`}
                    />
                  </div>
                  <div role="cell" className="min-w-0">
                    <div className={cx("font-medium truncate", !disabled && "text-ink")}>{x.name}</div>
                    <div className="text-meta text-muted truncate">{x.company ?? "No company found"}</div>
                  </div>
                  <div role="cell" className="font-mono text-[12.5px] truncate">{x.email}</div>
                  <div role="cell" className={cx("text-meta", x.email_type === "personal" ? "text-warn" : "")}>
                    {x.email_type === "personal" ? "Personal" : "Business"}
                  </div>
                  <div role="cell" className="text-meta">
                    {x.already_enrolled ? <StatusPill tone="accent">Enrolled</StatusPill> : x.held_back_reason ? `Held back · ${x.held_back_reason}` : <span className="text-success">Eligible</span>}
                  </div>
                </label>
              );
            })}
          </div>
          {cands && <Pager page={page} total={cands.total} size={cands.page_size} onPage={setPage} />}
        </Panel>
      </div>

      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove enrolled leads?"
        width={440}
        footer={
          <>
            <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirmRemove(false);
                try {
                  const r = await api<{ removed: number; kept: number }>("DELETE", `outreach/campaigns/${c.id}/enrollments`);
                  toast(r.kept ? "warn" : "success", r.kept ? `Removed ${n(r.removed)}. Kept ${n(r.kept)} who have already been emailed.` : `Removed ${n(r.removed)}.`);
                  cm.reload();
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
        <p className="m-0 text-ink-2">Everyone this campaign has never emailed comes out. Anyone who has already received an email stays, so their thread isn&apos;t cut off.</p>
      </Dialog>
    </div>
  );
}

/* ================= Step 2 — What it says ================= */

function StepEditor({ cm, s, total }: { cm: CM; s: Step; total: number }) {
  const c = cm.campaign!;
  const toast = useToast();
  const canApprove = useCan("approve");
  const [subject, setSubject] = useState(s.subject);
  const [body, setBody] = useState(s.body);
  const [alts, setAlts] = useState<DraftCandidate[]>([]);
  const [showAlts, setShowAlts] = useState(false);
  const [writing, setWriting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const dSubject = useDebounced(subject, 700);
  const dBody = useDebounced(body, 700);
  const first = s.n === 1;

  // Autosave: PUT the step. The server clears approval when the text changed.
  useEffect(() => {
    if (dSubject === s.subject && dBody === s.body) return;
    cm.setSave("saving");
    api<Campaign>("PUT", `outreach/campaigns/${c.id}/steps/${s.n}`, { subject: dSubject, body: dBody })
      .then((next) => {
        cm.replace(next);
        cm.setSave("saved");
      })
      .catch(() => cm.setSave("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSubject, dBody]);

  async function write() {
    setWriting(true);
    try {
      const r = await api<{ candidates: DraftCandidate[] }>("POST", `outreach/campaigns/${c.id}/steps/${s.n}/draft`);
      const [best, ...rest] = r.candidates;
      setSubject(best.subject);
      setBody(best.body);
      setAlts(rest);
      setShowAlts(false);
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setWriting(false);
    }
  }

  async function approve() {
    try {
      await api<Campaign>("PUT", `outreach/campaigns/${c.id}/steps/${s.n}`, { subject, body });
      const next = await api<Campaign>("POST", `outreach/campaigns/${c.id}/steps/${s.n}/approve`);
      cm.replace(next);
      const st = next.steps.find((x) => x.n === s.n);
      if (st?.approved_over.length) toast("warn", `Approved. ${st.approved_over.length} flagged rule${st.approved_over.length === 1 ? " was" : "s were"} recorded with your approval.`);
      else toast("success", `Email ${s.n} approved.`);
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  const live = c.steps.find((x) => x.n === s.n) ?? s;

  return (
    <Panel
      title={first ? "Email 1 · first email" : `Email ${s.n} · follow-up`}
      actions={
        <div className="flex items-center gap-2">
          {live.approved ? <StatusPill tone="success">Approved</StatusPill> : <StatusPill tone="neutral">Not approved</StatusPill>}
          <Button small disabled={writing} onClick={write}>
            <IconPen size={14} />
            {writing ? "Writing…" : "Write it for me"}
          </Button>
          {!first && (
            <Button small onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          )}
          {canApprove && (
            <Button small variant={live.approved ? "secondary" : "primary"} disabled={live.approved} onClick={approve}>
              {live.approved ? (
                <>
                  <IconCheck size={12} /> Approved
                </>
              ) : (
                "Approve"
              )}
            </Button>
          )}
        </div>
      }
      bodyClassName="px-5 pb-5 flex flex-col gap-3"
    >
      <label className={label}>
        Subject
        <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className={label}>
        Body
        <textarea className={cx(input, "py-3 min-h-[200px] leading-relaxed font-sans")} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <p className="m-0 text-[12px] text-muted">
        Variables: <code className="font-mono">{"{first_name}"}</code> <code className="font-mono">{"{company}"}</code> <code className="font-mono">{"{website}"}</code> · Spin text:{" "}
        <code className="font-mono">{"{Hi|Hello}"}</code>
      </p>
      <RulesPanel subject={subject} body={body} first={first} initial={s.lint} />
      {alts.length > 0 && (
        <div className="flex flex-col gap-2">
          <button type="button" className="self-start p-0 border-0 bg-transparent text-accent text-[13px] font-semibold cursor-pointer" onClick={() => setShowAlts((v) => !v)}>
            {showAlts ? "Hide alternatives" : `Show alternatives (${alts.length})`}
          </button>
          {showAlts &&
            alts.map((a, i) => (
              <div key={i} className="border border-line rounded-control p-3.5 flex flex-col gap-2">
                <div className="text-[13px] font-semibold">{a.subject}</div>
                <div className="text-[13px] text-ink-2 whitespace-pre-line">{a.body}</div>
                <div className="flex items-center gap-3">
                  <span className="text-meta text-muted">
                    {a.lint.problems.length} problems · {a.lint.suggestions.length} suggestions · {a.lint.word_count} words
                  </span>
                  <Button
                    small
                    className="ml-auto"
                    onClick={() => {
                      const cur = { subject, body, lint: a.lint, score: 0 };
                      setSubject(a.subject);
                      setBody(a.body);
                      setAlts((xs) => xs.map((x, j) => (j === i ? cur : x)));
                    }}
                  >
                    Use this one
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove email ${s.n}?`}
        width={420}
        footer={
          <>
            <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirmRemove(false);
                try {
                  cm.replace(await api<Campaign>("DELETE", `outreach/campaigns/${c.id}/steps/${s.n}`));
                  toast("success", `Email ${s.n} removed.`);
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
        <p className="m-0 text-ink-2">The follow-ups after it move up one. This can&apos;t be undone.</p>
      </Dialog>
      <span className="sr-only">{total}</span>
    </Panel>
  );
}

function ContentStep({ cm, registerFinish }: { cm: CM; registerFinish: (f: () => Promise<boolean>) => void }) {
  const c = cm.campaign!;
  const toast = useToast();
  const canApprove = useCan("approve");
  const setBrief = (k: keyof Campaign["brief"], v: string) => cm.patch({ brief: { [k]: v } }, (x) => ({ ...x, brief: { ...x.brief, [k]: v } }));

  useEffect(() => {
    registerFinish(async () => {
      if (!c.steps.length) {
        toast("error", "Write at least one email first.");
        return false;
      }
      if (!canApprove) return true;
      for (const s of c.steps) {
        if (!s.approved && s.subject.trim() && s.body.trim()) {
          try {
            cm.replace(await api<Campaign>("POST", `outreach/campaigns/${c.id}/steps/${s.n}/approve`));
          } catch (e) {
            toast("error", (e as Error).message);
            return false;
          }
        }
      }
      return true;
    });
  });

  async function addStep() {
    const nn = c.steps.length + 1;
    try {
      cm.replace(await api<Campaign>("PUT", `outreach/campaigns/${c.id}/steps/${nn}`, { subject: nn === 1 ? "" : `Re: ${c.steps[0]?.subject ?? ""}`, body: "Hi {first_name},\n\n" }));
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
      <Panel title="The brief" bodyClassName="px-5 pb-5 flex flex-col gap-3.5" className="sticky top-5">
        <p className="m-0 text-meta text-muted">The writer works from this. Any number in an email must come from the proof.</p>
        {(
          [
            ["offer", "Offer", "What you're offering, in one sentence."],
            ["proof", "Proof", "Facts and numbers you can stand behind."],
            ["ask", "Ask", "The one thing you want them to do."],
          ] as const
        ).map(([k, l, ph]) => (
          <label key={k} className={label}>
            {l}
            <textarea className={cx(input, "py-2 min-h-[76px] leading-normal")} value={c.brief[k]} placeholder={ph} onChange={(e) => setBrief(k, e.target.value)} />
          </label>
        ))}
      </Panel>
      <div className="flex flex-col gap-4 min-w-0">
        {c.steps.map((s) => (
          <StepEditor key={`${s.n}-${c.steps.length}`} cm={cm} s={s} total={c.steps.length} />
        ))}
        {c.steps.length < 4 ? (
          <button type="button" onClick={addStep} className="min-h-12 rounded-card border-[1.5px] border-dashed border-[#c9c9c3] bg-transparent text-sm text-ink-2 cursor-pointer hover:border-muted">
            {c.steps.length === 0 ? "+ Write the first email" : `+ Add a follow-up (${c.steps.length} of 4)`}
          </button>
        ) : (
          <p className="m-0 text-meta text-muted text-center">Four emails is the most a campaign can have.</p>
        )}
      </div>
    </div>
  );
}

/* ================= Step 3 — When it sends ================= */

const PRESETS = [
  { label: "Morning", start: "08:00", end: "11:00" },
  { label: "Business hours", start: "09:00", end: "17:00" },
  { label: "Late morning & early afternoon", start: "10:00", end: "14:00" },
];

function ScheduleStep({ cm, registerFinish }: { cm: CM; registerFinish: (f: () => Promise<boolean>) => void }) {
  const c = cm.campaign!;
  const toast = useToast();
  const profiles = useResource<SenderProfile[]>("outreach/sender-profiles");
  const sch = c.schedule;
  const set = (p: Partial<Campaign["schedule"]>) => cm.patch({ schedule: p }, (x) => ({ ...x, schedule: { ...x.schedule, ...p, window: { ...x.schedule.window, ...(p.window ?? {}) } } }));

  useEffect(() => {
    registerFinish(async () => {
      if (!c.schedule.sender_profile_id) {
        toast("error", "Choose who the emails come from.");
        return false;
      }
      if (!c.schedule.days.length) {
        toast("error", "Choose at least one sending day.");
        return false;
      }
      return true;
    });
  });

  return (
    <div className="grid grid-cols-2 gap-5 items-start max-w-[1000px]">
      <Panel title="From" loading={profiles.loading} error={profiles.error} onRetry={profiles.reload} bodyClassName="px-5 pb-5 flex flex-col gap-2">
        {profiles.data?.map((p) => (
          <label key={p.id} className={cx("flex items-start gap-3 p-3 rounded-control border cursor-pointer", sch.sender_profile_id === p.id ? "border-accent bg-accent-soft" : "border-line")}>
            <input type="radio" name="sender" className="mt-1" checked={sch.sender_profile_id === p.id} onChange={() => set({ sender_profile_id: p.id })} />
            <span className="flex flex-col">
              <span className="font-semibold">{p.name}</span>
              <span className="text-meta text-muted">
                {p.title}, {p.company} · {p.timezone}
              </span>
            </span>
          </label>
        ))}
        <Link href="/settings" className="text-[13px] font-semibold no-underline mt-1">
          Add a sender profile
        </Link>
      </Panel>

      <Panel title="Days and hours" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <div role="group" aria-label="Sending days" className="flex gap-1.5">
          {DAYS.map((d, i) => {
            const on = sch.days.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => set({ days: on ? sch.days.filter((x) => x !== i) : [...sch.days, i].sort() })}
                className={cx("w-12 min-h-10 rounded-control border text-[13px] cursor-pointer", on ? "bg-ink border-ink text-white font-semibold" : "bg-surface border-control text-ink-2")}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <Button small key={p.label} onClick={() => set({ window: { start: p.start, end: p.end } })} className={cx(sch.window.start === p.start && sch.window.end === p.end && "!border-accent !text-accent-ink")}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <label className={label}>
            From
            <input className={input} type="time" value={sch.window.start} onChange={(e) => set({ window: { start: e.target.value, end: sch.window.end } })} />
          </label>
          <label className={label}>
            Until
            <input className={input} type="time" value={sch.window.end} onChange={(e) => set({ window: { start: sch.window.start, end: e.target.value } })} />
          </label>
        </div>
        <p className="m-0 p-3 rounded-control bg-accent-soft text-[13px] text-ink-2">
          These are the <b>recipient&apos;s</b> hours, not yours. Nine in the morning means nine where they are, so a campaign to New York and Los Angeles sends at different moments for
          each.
        </p>
      </Panel>
    </div>
  );
}

/* ================= Step 4 — Review and launch ================= */

function ReviewStep({ cm }: { cm: CM }) {
  const c = cm.campaign!;
  const toast = useToast();
  const canLaunch = useCan("launch");
  const [pv, setPv] = useState<EmailPreview>();
  const [pvErr, setPvErr] = useState<Error>();
  const [launching, setLaunching] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ready = c.checklist.every((x) => x.done);

  const loadPreview = useMemo(
    () => () => {
      setPvErr(undefined);
      if (!c.steps.length) return;
      api<EmailPreview>("POST", `outreach/campaigns/${c.id}/steps/1/preview`).then(setPv).catch(setPvErr);
    },
    [c.id, c.steps.length]
  );
  useEffect(loadPreview, [loadPreview]);

  return (
    <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
      <Panel title="Launch checklist" bodyClassName="px-5 pb-5 flex flex-col gap-4">
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          {c.checklist.map((x) => (
            <li key={x.key} className="flex items-center gap-2.5 text-[14px]">
              <span aria-hidden className={cx("w-5 h-5 rounded-full flex items-center justify-center shrink-0", x.done ? "bg-success-bg text-success" : "border border-control")}>
                {x.done && <IconCheck size={11} />}
              </span>
              <span className="sr-only">{x.done ? "Done:" : "Not done:"}</span>
              <span className={x.done ? "text-ink" : "text-muted"}>{x.label}</span>
            </li>
          ))}
        </ul>
        {c.status === "draft" ? (
          canLaunch ? (
            <Button variant="primary" disabled={!ready || launching} onClick={() => setConfirm(true)}>
              {launching ? "Launching…" : ready ? "Launch" : "Finish the checklist to launch"}
            </Button>
          ) : (
            <p className="m-0 text-meta text-muted">Your role can build campaigns but not launch them.</p>
          )
        ) : (
          <p className="m-0 text-meta text-success">This campaign has launched.</p>
        )}
        <p className="m-0 text-meta text-muted">
          Every email is checked again at the moment it sends, after the personal details are filled in. If that check finds something new, the campaign pauses itself instead of
          sending it.
        </p>
      </Panel>

      <Panel title="The first email, as it will arrive" loading={!pv && !pvErr && c.steps.length > 0} error={pvErr} onRetry={loadPreview} empty={!c.steps.length} emptyText="Write the first email to see it here.">
        {pv && (
          <div className="px-5 pb-5 flex flex-col gap-3">
            <dl className="m-0 grid grid-cols-[70px_minmax(0,1fr)] gap-y-1 text-[13px]">
              <dt className="text-muted">From</dt>
              <dd className="m-0">{pv.from}</dd>
              <dt className="text-muted">To</dt>
              <dd className="m-0">{pv.to}</dd>
              <dt className="text-muted">Subject</dt>
              <dd className="m-0 font-semibold">{pv.subject}</dd>
            </dl>
            <div className="p-4 rounded-control border border-line bg-surface text-[14px] leading-relaxed whitespace-pre-line">{pv.body}</div>
            <div className="px-4 py-3 rounded-control bg-head text-[12px] text-muted whitespace-pre-line">{pv.footer}</div>
          </div>
        )}
      </Panel>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Launch this campaign?"
        width={440}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Not yet</Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirm(false);
                setLaunching(true);
                try {
                  cm.replace(await api<Campaign>("POST", `outreach/campaigns/${c.id}/launch`));
                  toast("success", "Launched. The first emails go out in the next sending window.");
                } catch (e) {
                  toast("error", (e as Error).message);
                } finally {
                  setLaunching(false);
                }
              }}
            >
              Launch
            </Button>
          </>
        }
      >
        <p className="m-0 text-ink-2">
          {n(c.enrolled_count)} leads will start receiving email {c.steps.length === 1 ? "1" : `1 of ${c.steps.length}`} in their next sending window. You can pause it at any time.
        </p>
      </Dialog>
    </div>
  );
}
