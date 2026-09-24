"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui-hubbly";
import { IconCheck } from "@/components/ui-hubbly/icons";
import { useToast } from "@/components/outreach/feedback";
import { scheduleLine } from "@/components/outreach/format";
import { api } from "@/lib/outreach/client";
import type { Campaign, DraftCandidate, SenderProfile } from "@/lib/outreach/types";

const EXAMPLES = [
  "Email people who looked at our pricing page twice this week but didn't book a demo. Offer to show them who has been visiting their own website. Ask for a 15-minute call.",
  "Reach marketing agencies in the US and Canada about our partner program: they resell Hubbly to their clients and keep 20% of every plan. Ask if they'd like the partner pricing sheet.",
];

type Phase = "describe" | "building" | "done";
interface Decision {
  key: string;
  label: string;
  result?: string;
  state: "waiting" | "working" | "done" | "failed";
}

function Typed({ text, speed = 9 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return <>{shown}</>;
}

export default function BuildWithHubbly() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("describe");
  const [desc, setDesc] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [brief, setBrief] = useState<Campaign["brief"]>();
  const [sender, setSender] = useState<SenderProfile>();
  const [schedule, setSchedule] = useState<string>();
  const [emails, setEmails] = useState<{ subject: string; body: string }[]>([]);
  const running = useRef(false);

  const mark = (key: string, patch: Partial<Decision>) => setDecisions((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  async function build() {
    if (running.current || !desc.trim()) return;
    running.current = true;
    setPhase("building");
    setDecisions([
      { key: "brief", label: "Understanding your description", state: "working" },
      { key: "sender", label: "Choosing a sender", state: "waiting" },
      { key: "schedule", label: "Setting the schedule", state: "waiting" },
      { key: "e1", label: "Writing the first email", state: "waiting" },
      { key: "e2", label: "Writing the follow-up", state: "waiting" },
    ]);
    try {
      // The description goes to the brief call and is never stored.
      const b = await api<Campaign["brief"]>("POST", `outreach/campaigns/${id}/brief`, { description: desc });
      setBrief(b);
      mark("brief", { state: "done", result: `Offer, proof and ask written — the ask is “${b.ask}”` });

      mark("sender", { state: "working" });
      const profiles = await api<SenderProfile[]>("GET", "outreach/sender-profiles");
      const p = profiles[0];
      if (!p) throw new Error("There are no sender profiles yet. Add one in Outreach settings.");
      await api("PATCH", `outreach/campaigns/${id}`, { schedule: { sender_profile_id: p.id } });
      setSender(p);
      mark("sender", { state: "done", result: `${p.name}, ${p.title} at ${p.company}` });

      mark("schedule", { state: "working" });
      const days = [0, 1, 2, 3];
      const window = { start: "09:00", end: "11:30" };
      await api("PATCH", `outreach/campaigns/${id}`, { schedule: { days, window } });
      const line = scheduleLine(days, window.start, window.end);
      setSchedule(line);
      mark("schedule", { state: "done", result: `${line} — mornings early in the week get the most replies` });

      for (const [i, key] of (["e1", "e2"] as const).entries()) {
        mark(key, { state: "working" });
        const nn = i + 1;
        await api("PUT", `outreach/campaigns/${id}/steps/${nn}`, { subject: "", body: "" });
        const r = await api<{ candidates: DraftCandidate[] }>("POST", `outreach/campaigns/${id}/steps/${nn}/draft`);
        const best = r.candidates[0];
        await api("PUT", `outreach/campaigns/${id}/steps/${nn}`, { subject: best.subject, body: best.body });
        setEmails((xs) => [...xs, { subject: best.subject, body: best.body }]);
        mark(key, { state: "done", result: `${best.lint.word_count} words · ${best.lint.problems.length} problems · best of ${r.candidates.length}` });
      }
      setPhase("done");
    } catch (e) {
      setDecisions((ds) => ds.map((d) => (d.state === "working" ? { ...d, state: "failed", result: (e as Error).message } : d)));
      toast("error", (e as Error).message);
    } finally {
      running.current = false;
    }
  }

  if (phase === "describe") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[80vh]">
        <div className="max-w-[680px] w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] font-semibold tracking-[-0.01em]">Describe the campaign</h1>
            <p className="m-0 text-ink-2">Who it's for, what you're offering, and what you want them to do. Plain words are fine.</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Campaign description</span>
            <textarea
              autoFocus
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="min-h-[160px] p-4 rounded-card border border-control bg-surface text-[15px] leading-relaxed font-sans"
              placeholder="e.g. Email people who visited our pricing page…"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-meta text-muted">Or start from an example</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setDesc(ex)} className="text-left p-3 rounded-control border border-line bg-surface text-[13px] text-ink-2 cursor-pointer hover:border-control">
                {ex}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/campaigns/${id}?step=1`} className="text-[13px] no-underline">
              Build it myself instead
            </Link>
            <span className="ml-auto text-meta text-muted">Your description isn&apos;t stored.</span>
            <Button variant="primary" disabled={!desc.trim()} onClick={build}>
              Build it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-[380px_minmax(0,1fr)] min-h-screen">
      <section aria-label="Decisions" className="bg-sidebar border-r border-line p-6 flex flex-col gap-4">
        <h1 className="m-0 text-lg font-semibold">Hubbly is building your campaign</h1>
        <ol className="list-none m-0 p-0 flex flex-col gap-3.5" aria-live="polite">
          {decisions.map((d) => (
            <li key={d.key} className="flex gap-3">
              <span
                aria-hidden
                className={cx(
                  "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  d.state === "done" && "bg-success-bg text-success",
                  d.state === "working" && "border-2 border-accent border-t-transparent animate-spin",
                  d.state === "waiting" && "border border-control",
                  d.state === "failed" && "bg-danger-bg text-danger"
                )}
              >
                {d.state === "done" && <IconCheck size={11} />}
                {d.state === "failed" && "!"}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={cx("text-[14px]", d.state === "waiting" ? "text-muted" : "text-ink font-medium")}>{d.label}</span>
                {d.result && <span className={cx("text-meta", d.state === "failed" ? "text-danger" : "text-muted")}>{d.result}</span>}
              </span>
            </li>
          ))}
        </ol>
        {phase === "done" && (
          <div className="mt-2 p-4 rounded-card border border-accent-line bg-accent-soft flex flex-col gap-3">
            <p className="m-0 text-[14px] text-ink">
              <b>One decision is yours:</b> who receives it. Hubbly never picks your leads from a paragraph.
            </p>
            <Button variant="primary" onClick={() => router.push(`/campaigns/${id}?step=1`)}>
              Choose the leads
            </Button>
          </div>
        )}
        <Link href={`/campaigns/${id}?step=2`} className="mt-auto text-[13px] no-underline">
          Switch to building it myself
        </Link>
      </section>

      <section aria-label="Campaign" className="p-8 flex flex-col gap-4 overflow-y-auto">
        <div className="bg-surface border border-line rounded-card p-5 flex flex-col gap-3">
          <h2 className="m-0 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label">Brief</h2>
          {brief ? (
            <dl className="m-0 grid grid-cols-[60px_minmax(0,1fr)] gap-y-2 text-[14px]">
              <dt className="text-muted">Offer</dt>
              <dd className="m-0"><Typed text={brief.offer} /></dd>
              <dt className="text-muted">Proof</dt>
              <dd className="m-0"><Typed text={brief.proof} /></dd>
              <dt className="text-muted">Ask</dt>
              <dd className="m-0"><Typed text={brief.ask} /></dd>
            </dl>
          ) : (
            <div className="text-meta text-muted">Waiting…</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-line rounded-card p-5">
            <h2 className="m-0 mb-2 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label">Sender</h2>
            <div className="text-[14px]">{sender ? `${sender.name} · ${sender.title}, ${sender.company}` : <span className="text-muted">Waiting…</span>}</div>
          </div>
          <div className="bg-surface border border-line rounded-card p-5">
            <h2 className="m-0 mb-2 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label">Schedule</h2>
            <div className="text-[14px]">{schedule ?? <span className="text-muted">Waiting…</span>}</div>
          </div>
        </div>
        {emails.map((e, i) => (
          <div key={i} className="bg-surface border border-line rounded-card p-5 flex flex-col gap-2">
            <h2 className="m-0 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label">{i === 0 ? "Email 1 · first email" : `Email ${i + 1} · follow-up`}</h2>
            <div className="font-semibold">{e.subject}</div>
            <div className="text-[14px] leading-relaxed text-ink-2 whitespace-pre-line">
              <Typed text={e.body} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
