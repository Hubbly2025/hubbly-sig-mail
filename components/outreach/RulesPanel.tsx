"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui-hubbly";
import { IconWarn } from "@/components/ui-hubbly/icons";
import { api } from "@/lib/outreach/client";
import { useDebounced } from "@/lib/outreach/hooks";
import type { LintReport } from "@/lib/outreach/types";

/**
 * Checks the email as you type, against the same rules the system applies at
 * send time (POST outreach/lint). Red = problems, amber = suggestions.
 * Flagged problems never block Approve — they're recorded with the approval.
 */
export function RulesPanel({ subject, body, first, initial }: { subject: string; body: string; first: boolean; initial?: LintReport | null }) {
  const [report, setReport] = useState<LintReport | null>(initial ?? null);
  const [checking, setChecking] = useState(false);
  const ds = useDebounced(subject, 600);
  const db = useDebounced(body, 600);

  useEffect(() => {
    let live = true;
    setChecking(true);
    api<LintReport>("POST", "outreach/lint", { subject: ds, body: db, first })
      .then((r) => live && setReport(r))
      .catch(() => {})
      .finally(() => live && setChecking(false));
    return () => {
      live = false;
    };
  }, [ds, db, first]);

  if (!report) return <div className="px-4 py-3 text-meta text-muted">Checking…</div>;
  const [lo, hi] = report.word_target;
  const wcTone = report.word_count > hi ? "text-danger" : report.word_count < lo ? "text-warn" : "text-success";
  const f = report.figures;

  return (
    <section aria-label="Rules" className="border border-line rounded-control bg-head">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-divider">
        <h3 className="m-0 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label flex-1">
          Rules {checking && <span className="normal-case tracking-normal font-normal text-muted">· checking…</span>}
        </h3>
        <span className={cx("text-meta font-semibold tabular", wcTone)} title={`${first ? "First emails" : "Follow-ups"} want ${lo}–${hi} words`}>
          {report.word_count} words <span className="font-normal text-muted">· aim {lo}–{hi}</span>
        </span>
      </div>
      <ul className="list-none m-0 px-4 py-2 flex flex-col gap-1">
        {report.problems.map((p, i) => (
          <li key={`p${i}`} className="flex items-start gap-2 text-[13px] text-danger">
            <span aria-hidden className="font-bold">✕</span>
            <span className="sr-only">Problem:</span>
            <span className="flex-1">{p.text}</span>
            {p.where === "subject" && <span className="px-1.5 rounded bg-danger-bg text-[11px] font-semibold">subject</span>}
          </li>
        ))}
        {report.suggestions.map((p, i) => (
          <li key={`s${i}`} className="flex items-start gap-2 text-[13px] text-warn">
            <IconWarn size={12} className="mt-1 shrink-0" />
            <span className="sr-only">Suggestion:</span>
            <span className="flex-1">{p.text}</span>
            {p.where === "subject" && <span className="px-1.5 rounded bg-warn-bg text-[11px] font-semibold">subject</span>}
          </li>
        ))}
        {report.problems.length === 0 && report.suggestions.length === 0 && <li className="text-[13px] text-success">No problems found.</li>}
      </ul>
      <dl className="m-0 grid grid-cols-6 gap-2 px-4 py-2.5 border-t border-divider text-[11.5px]">
        {[
          ["Sentence variety", f.sentence_variety],
          ["Reading grade", f.reading_grade],
          ["Contractions", f.contractions],
          ["Adjectives / sentence", f.adjectives_per_sentence],
          ["Questions", f.questions],
          ["Paragraphs", f.paragraphs],
        ].map(([k, v]) => (
          <div key={String(k)} className="flex flex-col">
            <dt className="text-muted">{k === "Adjectives / sentence" ? <>Adjectives /<br />sentence</> : k}</dt>
            <dd className="m-0 font-semibold text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
