"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, SourceTag, cx, fmt } from "@/components/ui-hubbly";
import { IconCheck, IconChevronLeft, IconChevronRight, IconInfo, IconMail, IconPen } from "@/components/ui-hubbly/icons";
import { saveStep, sendTest } from "@/lib/mail/api";
import { renderTemplate, TEMPLATE_VARIABLES } from "@/lib/mail/render";
import type { CampaignDraft, PreviewContact, SendCheck, SequenceStep } from "@/lib/mail/types";

const stages = ["Audience", "Sequence", "Schedule & mailboxes", "Review & launch"];
const sourceLabel = { signal: "Signal", clickrabbit: "ClickRabbit", csv: "CSV" } as const;

export function Builder({ draft, contacts, checks }: { draft: CampaignDraft; contacts: PreviewContact[]; checks: SendCheck[] }) {
  const [steps, setSteps] = useState<SequenceStep[]>(draft.steps);
  const [stepId, setStepId] = useState(steps[Math.min(1, steps.length - 1)].id);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [contactIdx, setContactIdx] = useState(0);
  const [status, setStatus] = useState(`Draft · saved ${draft.savedAt}`);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const step = steps.find((s) => s.id === stepId)!;
  const variant = step.variants.find((v) => v.id === variantId) ?? step.variants[0];
  const contact = contacts[contactIdx];
  const totalDays = steps[steps.length - 1]?.dayOffset ?? 0;

  const preview = useMemo(
    () => ({ subject: renderTemplate(variant.subject, contact.vars), body: renderTemplate(variant.body, contact.vars) }),
    [variant, contact]
  );

  function updateVariant(patch: { subject?: string; body?: string }) {
    setSteps((prev) =>
      prev.map((s) => (s.id !== step.id ? s : { ...s, variants: s.variants.map((v) => (v.id === variant.id ? { ...v, ...patch } : v)) }))
    );
    setStatus("Draft · saving…");
    saveStep(draft.campaign.id, step.id, { id: variant.id, subject: patch.subject ?? variant.subject, body: patch.body ?? variant.body }).then(() =>
      setStatus("Draft · saved just now")
    );
  }

  function insertAtCursor(text: string) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + text + el.value.slice(end);
    updateVariant({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function addStep() {
    const last = steps[steps.length - 1];
    const id = `st_new_${steps.length + 1}`;
    const s: SequenceStep = {
      id,
      order: steps.length + 1,
      dayOffset: last.dayOffset + 3,
      waitDays: 3,
      sameThread: false,
      variants: [{ id: `${id}_a`, label: "Variant A", weight: 100, subject: "", body: "Hi {first_name},\n\n" }],
    };
    setSteps([...steps, s]);
    setStepId(id);
    setVariantId(null);
  }

  function addVariant() {
    const letter = String.fromCharCode(65 + step.variants.length);
    const id = `${step.id}_${letter.toLowerCase()}`;
    const w = Math.floor(100 / (step.variants.length + 1));
    setSteps((prev) =>
      prev.map((s) =>
        s.id !== step.id
          ? s
          : { ...s, variants: [...s.variants.map((v) => ({ ...v, weight: w })), { id, label: `Variant ${letter}`, weight: 100 - w * s.variants.length, subject: variant.subject, body: variant.body }] }
      )
    );
    setVariantId(id);
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="h-[68px] shrink-0 box-border flex items-center gap-4 px-6 bg-surface border-b border-line">
        <Link href="/campaigns" aria-label="Back to campaigns" className="flex items-center justify-center w-10 h-10 rounded-control border border-line text-ink">
          <IconChevronLeft />
        </Link>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="text-base font-semibold truncate">{draft.campaign.name}</div>
          <div className="text-meta text-muted" aria-live="polite">
            {status}
          </div>
        </div>
        <ol aria-label="Campaign steps" className="list-none m-0 mx-auto p-0 flex items-center gap-1.5 text-[13px]">
          {stages.map((label, i) => {
            const done = i === 0;
            const current = i === 1;
            return (
              <li key={label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="w-5 h-px bg-control" />}
                <span
                  aria-current={current ? "step" : undefined}
                  className={cx(
                    "flex items-center gap-2 px-3 min-h-[34px] rounded-full",
                    done && "text-success",
                    current && "bg-ink text-white font-semibold",
                    !done && !current && "text-muted"
                  )}
                >
                  <span
                    className={cx(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[11.5px]",
                      done && "bg-success-bg",
                      current && "bg-white text-ink",
                      !done && !current && "border border-[#c9c9c3]"
                    )}
                  >
                    {done ? <IconCheck size={12} /> : i + 1}
                  </span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <Button
          onClick={() => {
            setStatus("Sending test…");
            sendTest(draft.campaign.id).then(() => setStatus("Test sent to your inbox"));
          }}
        >
          Send test
        </Button>
        <Button variant="primary">Continue</Button>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[330px_minmax(0,1fr)_380px]">
        {/* Sequence */}
        <section aria-label="Sequence" className="bg-sidebar border-r border-line p-5 flex flex-col gap-2.5 overflow-y-auto">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="m-0 text-[15px] font-semibold">Sequence</h2>
            <span className="text-meta text-muted">
              {steps.length} steps · {totalDays} days
            </span>
          </div>

          {steps.map((s, i) => {
            const selected = s.id === stepId;
            return (
              <div key={s.id} className="flex flex-col gap-2.5">
                {i > 0 && (
                  <div className="flex items-center gap-2 pl-6 text-meta text-muted">
                    <span className="w-px h-[18px] bg-control" />
                    Wait {s.waitDays} days · if no reply
                  </div>
                )}
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setStepId(s.id);
                    setVariantId(null);
                  }}
                  className={cx(
                    "text-left flex flex-col gap-1.5 px-3.5 py-3 rounded-xl bg-surface text-ink cursor-pointer",
                    selected ? "border-2 border-accent shadow-[0_2px_10px_rgba(43,89,195,0.12)]" : "border border-line hover:border-control"
                  )}
                >
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-[22px] h-[22px] rounded-md bg-accent-soft2 text-accent-ink flex items-center justify-center">
                      <IconMail size={13} strokeWidth={2} />
                    </span>
                    Email · Day {s.dayOffset}
                    {s.sameThread ? " · same thread" : ""}
                  </span>
                  <span className="text-sm font-semibold">{s.variants[0].subject || "Untitled email"}</span>
                  <span className="text-meta text-muted">
                    {s.variants.length} {s.variants.length === 1 ? "variant" : "variants"}
                    {s.variants.length > 1 ? ` · ${s.variants.map((v) => v.weight).join(" / ")} split` : ""}
                    {selected ? " · editing" : ""}
                  </span>
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addStep}
            className="mt-1 min-h-11 rounded-xl border-[1.5px] border-dashed border-[#c9c9c3] bg-transparent text-sm text-ink-2 cursor-pointer hover:border-muted"
          >
            + Add email step
          </button>

          <div className="mt-auto px-3.5 py-3 rounded-xl bg-tag flex flex-col gap-1">
            <div className="text-meta font-semibold">Stops automatically when a contact</div>
            <div className="text-meta text-muted">replies, books a meeting, unsubscribes, or becomes a customer.</div>
          </div>
        </section>

        {/* Editor */}
        <section aria-label="Email editor" className="px-7 py-5 flex flex-col gap-3.5 min-h-0">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-line">
            <SourceTag tone="accent">{sourceLabel[draft.campaign.audience.source]}</SourceTag>
            <div className="flex-1 min-w-0 text-[13.5px] truncate">
              <span className="font-semibold">{fmt.n(draft.campaign.audience.count)} contacts</span>
              <span className="text-muted">
                {" "}
                · {draft.campaign.audience.label} · {fmt.n(draft.campaign.audience.excluded)} excluded (customers, unsubscribed)
              </span>
            </div>
            <a href="#" className="text-[13.5px] font-semibold no-underline whitespace-nowrap">
              Edit audience
            </a>
          </div>

          <div className="flex-1 min-h-0 bg-surface border border-line rounded-card flex flex-col overflow-hidden">
            <div role="tablist" aria-label="Variants" className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-divider">
              {step.variants.map((v) => {
                const on = v.id === variant.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setVariantId(v.id)}
                    className={cx(
                      "min-h-8 px-3 rounded-lg text-[13px] cursor-pointer",
                      on ? "bg-ink text-white font-semibold border-0" : "bg-surface text-ink-2 border border-control"
                    )}
                  >
                    Step {step.order} · {v.label}
                    {step.variants.length > 1 ? ` · ${v.weight}%` : ""}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={addVariant}
                className="min-h-8 px-3 rounded-lg border border-dashed border-[#c9c9c3] bg-transparent text-ink-2 text-[13px] cursor-pointer"
              >
                + Add variant
              </button>
              <Button small className="ml-auto">
                <IconPen size={14} />
                Rewrite with Hubbly
              </Button>
            </div>

            <div className="flex items-center gap-3 px-[18px] py-3 border-b border-divider">
              <span className="w-16 text-[13px] text-muted">From</span>
              <span>{draft.fromLabel}</span>
              <Link href="/domains" className="ml-auto text-[13px] no-underline">
                Manage
              </Link>
            </div>
            <label className="flex items-center gap-3 px-[18px] py-3 border-b border-divider">
              <span className="w-16 text-[13px] text-muted">Subject</span>
              <input
                type="text"
                value={variant.subject}
                onChange={(e) => updateVariant({ subject: e.target.value })}
                className="flex-1 border-0 outline-none text-sm font-medium text-ink bg-transparent"
              />
            </label>
            <div className="flex items-center gap-1.5 px-[18px] py-2.5 border-b border-divider flex-wrap">
              <span className="text-meta text-muted mr-1">Insert</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertAtCursor(`{${v}}`)}
                  className="min-h-7 px-[9px] rounded-[7px] border border-accent-line bg-accent-soft text-accent-ink font-mono text-xs cursor-pointer"
                >
                  {`{${v}}`}
                </button>
              ))}
              <span aria-hidden className="w-px h-[18px] mx-1 bg-line" />
              <button
                type="button"
                onClick={() => insertAtCursor("{option one|option two}")}
                className="min-h-7 px-[9px] rounded-[7px] border border-[#e7ddf5] bg-[#f7f3fc] text-[#5b3596] text-xs font-medium cursor-pointer"
              >
                Spin text
              </button>
              <button
                type="button"
                onClick={() => insertAtCursor('[if industry = "home services"]Text for them[else]Text for everyone else[end]')}
                className="min-h-7 px-[9px] rounded-[7px] border border-[#e7ddf5] bg-[#f7f3fc] text-[#5b3596] text-xs font-medium cursor-pointer"
              >
                If / else
              </button>
            </div>

            <label className="flex-1 min-h-0 flex">
              <span className="sr-only">Email body</span>
              <textarea
                ref={bodyRef}
                value={variant.body}
                onChange={(e) => updateVariant({ body: e.target.value })}
                className="flex-1 resize-none border-0 outline-none px-[22px] py-5 text-[15px] leading-[1.65] text-ink bg-transparent font-sans"
              />
            </label>
            <div className="flex items-center gap-2.5 px-[18px] py-3 border-t border-divider text-meta text-muted">
              <IconInfo size={14} />
              An unsubscribe line and your business address are added to every email automatically.
            </div>
          </div>
        </section>

        {/* Preview */}
        <section aria-label="Preview" className="bg-sidebar border-l border-line p-5 flex flex-col gap-3.5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold">Preview</h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Previous contact"
                onClick={() => setContactIdx((i) => (i - 1 + contacts.length) % contacts.length)}
                className="w-8 h-8 rounded-lg border border-control bg-surface text-ink cursor-pointer flex items-center justify-center"
              >
                <IconChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Next contact"
                onClick={() => setContactIdx((i) => (i + 1) % contacts.length)}
                className="w-8 h-8 rounded-lg border border-control bg-surface text-ink cursor-pointer flex items-center justify-center"
              >
                <IconChevronRight size={14} />
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-meta text-muted">
            As contact
            <select
              value={contactIdx}
              onChange={(e) => setContactIdx(Number(e.target.value))}
              className="min-h-10 px-2.5 rounded-control border border-control bg-surface text-sm text-ink"
            >
              {contacts.map((c, i) => (
                <option key={c.id} value={i}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </label>
          <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-2.5">
            <div className="text-meta text-muted">vince@tryhubbly.com → {contact.email}</div>
            <div className="text-sm font-semibold">{preview.subject || "(no subject)"}</div>
            <div className="text-[13.5px] leading-relaxed text-ink-2 whitespace-pre-line">{preview.body}</div>
          </div>
          <div className="flex flex-col">
            <h3 className="m-0 mb-2 text-[13.5px] font-semibold">Checks before sending</h3>
            {checks.map((c, i) => (
              <div key={c.id} className={cx("flex items-start gap-2.5 py-2 text-[13px]", i > 0 && "border-t border-divider")}>
                <span aria-hidden className={cx("mt-1.5 w-2 h-2 rounded-full shrink-0", c.tone === "ok" ? "bg-success-dot" : "bg-warn-dot")} />
                <span className="sr-only">{c.tone === "ok" ? "Passed:" : "Needs review:"}</span>
                <span className="flex-1">{c.label}</span>
                {c.detail && <span className="text-muted tabular">{c.detail}</span>}
                {c.action && (
                  <a href="#" className="font-semibold no-underline">
                    {c.action}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
