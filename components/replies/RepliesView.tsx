"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, SourceTag, StatusPill, cx, type Tone } from "@/components/ui-hubbly";
import { FilterPill } from "@/components/ui-hubbly/controls";
import { IconPen } from "@/components/ui-hubbly/icons";
import { markNotInterested, sendReply } from "@/lib/mail/api";
import type { Intent, Reply } from "@/lib/mail/types";

const intentLabel: Record<Intent, string> = {
  meeting_request: "Meeting request",
  interested: "Interested",
  not_now: "Not now",
  out_of_office: "Out of office",
  unsubscribe: "Unsubscribe",
};
const intentTone: Record<Intent, Tone> = { meeting_request: "accent", interested: "success", not_now: "warn", out_of_office: "neutral", unsubscribe: "danger" };

type Filter = "needs_you" | "meeting_request" | "interested" | "handled";

export function RepliesView({ replies, currentUser }: { replies: Reply[]; currentUser: string }) {
  const [filter, setFilter] = useState<Filter>("needs_you");
  const [mine, setMine] = useState(false);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState<Record<string, string>>({});
  const [slot, setSlot] = useState<Record<string, string>>({});

  const needsYou = (r: Reply) => !r.handledByHubbly && !sent[r.id] && !dismissed[r.id];
  const rows = useMemo(
    () =>
      replies.filter((r) => {
        if (mine && r.owner !== currentUser) return false;
        if (filter === "needs_you") return needsYou(r);
        if (filter === "handled") return r.handledByHubbly;
        return r.intent === filter;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replies, filter, mine, sent, dismissed]
  );
  const [selectedId, setSelectedId] = useState(replies[0]?.id);
  const selected = replies.find((r) => r.id === selectedId) ?? rows[0];

  const count = (f: Filter) =>
    replies.filter((r) => (f === "needs_you" ? needsYou(r) : f === "handled" ? r.handledByHubbly : r.intent === f)).length;

  const draftValue = selected ? draftText[selected.id] ?? selected.draftReply ?? "" : "";

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[380px_minmax(0,1fr)_300px]">
      {/* List */}
      <section aria-label="Reply list" className="bg-surface border-r border-line flex flex-col min-h-0">
        <div className="flex flex-wrap gap-1.5 px-4 pt-3.5 pb-3 border-b border-divider">
          <FilterPill active={filter === "needs_you"} onClick={() => setFilter("needs_you")}>
            Needs you · {count("needs_you")}
          </FilterPill>
          <FilterPill active={filter === "meeting_request"} onClick={() => setFilter("meeting_request")}>
            Meeting request · {count("meeting_request")}
          </FilterPill>
          <FilterPill active={filter === "interested"} onClick={() => setFilter("interested")}>
            Interested · {count("interested")}
          </FilterPill>
          <FilterPill active={filter === "handled"} onClick={() => setFilter("handled")}>
            Handled by Hubbly · {count("handled")}
          </FilterPill>
          <FilterPill active={mine} onClick={() => setMine((m) => !m)}>
            Mine
          </FilterPill>
        </div>
        <ul className="list-none m-0 p-0 overflow-y-auto">
          {rows.map((r) => {
            const sel = r.id === selected?.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => {
                    setSelectedId(r.id);
                    setEditing(false);
                  }}
                  className={cx(
                    "w-full flex flex-col gap-1.5 px-4 py-3.5 border-0 border-b border-divider text-left cursor-pointer text-ink",
                    sel ? "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]" : "bg-surface hover:bg-head"
                  )}
                >
                  <span className="flex items-center gap-2 w-full">
                    <span className="font-semibold">{r.contactName}</span>
                    <span className="text-meta text-muted truncate flex-1">{r.company}</span>
                    <span className="text-xs text-muted shrink-0">{r.receivedAt}</span>
                  </span>
                  <span className="text-[13px] text-ink-2 truncate w-full">{r.snippet}</span>
                  <span className="flex items-center gap-2 w-full">
                    <StatusPill tone={intentTone[r.intent]} className="!text-xs !min-h-[22px] !px-2">
                      {intentLabel[r.intent]}
                    </StatusPill>
                    <span className="text-xs text-muted truncate flex-1">{r.campaignName}</span>
                    <span className="text-xs text-muted">{r.owner}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {rows.length === 0 && <li className="px-4 py-10 text-center text-muted">Nothing waiting on you.</li>}
        </ul>
      </section>

      {/* Conversation */}
      {selected ? (
        <section aria-label="Conversation" className="flex flex-col min-h-0">
          <div className="flex items-center gap-3 px-6 py-4 bg-surface border-b border-line">
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
              <h2 className="m-0 text-base font-semibold truncate">
                {selected.contactName}
                {selected.company ? ` · ${selected.company}` : ""}
              </h2>
              <div className="text-meta text-muted truncate">
                {selected.campaignName} · Step {selected.step}
              </div>
            </div>
            <StatusPill tone="neutral">Sequence stopped on reply</StatusPill>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-3.5">
            {selected.thread.map((m) => (
              <article
                key={m.id}
                className={cx("max-w-[78%] bg-surface border border-line rounded-card px-4 py-3.5 flex flex-col gap-2", m.direction === "out" ? "self-end" : "self-start")}
              >
                <div className="flex justify-between gap-4 text-meta text-muted">
                  <span>{m.from}</span>
                  <span>{m.sentAt}</span>
                </div>
                <div className={cx("text-sm leading-relaxed whitespace-pre-line", m.direction === "out" ? "text-ink-2" : "text-ink")}>{m.body}</div>
              </article>
            ))}

            {sent[selected.id] ? (
              <article className="self-end max-w-[78%] bg-surface border border-line rounded-card px-4 py-3.5 flex flex-col gap-2">
                <div className="flex justify-between gap-4 text-meta text-muted">
                  <span>You</span>
                  <span>Just now</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{sent[selected.id]}</div>
              </article>
            ) : selected.draftReply ? (
              <div className="mt-auto bg-surface border-[1.5px] border-accent rounded-card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-accent-ink">
                  <IconPen size={15} />
                  Hubbly drafted a reply · read as {intentLabel[selected.intent].toLowerCase()}
                </div>
                {editing ? (
                  <label className="flex">
                    <span className="sr-only">Reply</span>
                    <textarea
                      value={draftValue}
                      onChange={(e) => setDraftText((d) => ({ ...d, [selected.id]: e.target.value }))}
                      rows={4}
                      className="flex-1 resize-y border border-control rounded-control p-3 text-sm leading-relaxed font-sans"
                    />
                  </label>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-line">{draftValue}</div>
                )}
                {selected.timeSlots && (
                  <div className="flex gap-2 flex-wrap">
                    {selected.timeSlots.map((t) => {
                      const on = slot[selected.id] === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSlot((s) => ({ ...s, [selected.id]: t }))}
                          className={cx(
                            "min-h-9 px-3 rounded-[9px] border text-[13px] font-medium cursor-pointer",
                            on ? "bg-accent text-white border-accent" : "bg-accent-soft text-accent-ink border-accent-line"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-divider">
                  <Button
                    variant="primary"
                    onClick={() => {
                      const body = draftValue + (slot[selected.id] ? `\n\nProposed time: ${slot[selected.id]}` : "");
                      sendReply(selected.id, body, slot[selected.id]).then(() => setSent((s) => ({ ...s, [selected.id]: body })));
                    }}
                  >
                    Send reply
                  </Button>
                  <Button onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit"}</Button>
                  {selected.timeSlots && <span className="ml-auto text-meta text-muted">Invite is sent when they pick a time</span>}
                </div>
              </div>
            ) : (
              <div className="mt-auto text-meta text-muted">Hubbly handled this reply. {selected.history}</div>
            )}
          </div>
        </section>
      ) : (
        <section className="flex items-center justify-center text-muted">Select a reply</section>
      )}

      {/* Contact */}
      {selected && (
        <aside aria-label="Contact" className="bg-sidebar border-l border-line p-5 flex flex-col gap-[18px] overflow-y-auto">
          <div className="flex items-center gap-3">
            <Avatar initials={selected.initials} tone="success" size={44} />
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-[15px] font-semibold">{selected.contactName}</div>
              <div className="text-meta text-muted">{[selected.role, selected.company, selected.location].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="dark">Book meeting</Button>
            <Button
              variant="ghost"
              disabled={dismissed[selected.id]}
              onClick={() => markNotInterested(selected.id).then(() => setDismissed((d) => ({ ...d, [selected.id]: true })))}
            >
              {dismissed[selected.id] ? "Marked not interested" : "Mark not interested"}
            </Button>
          </div>
          <section className="flex flex-col gap-2.5">
            <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold">
              <SourceTag tone="accent">Signal</SourceTag>
              Website visits
            </h3>
            {selected.signalVisits.map((v) => (
              <div key={v.path} className="flex justify-between text-[13px]">
                <span className="text-ink-2">{v.path}</span>
                <span className="text-muted">{v.value}</span>
              </div>
            ))}
          </section>
          <section className="flex flex-col gap-2.5 pt-4 border-t border-line">
            <h3 className="m-0 text-[13px] font-semibold">Contact</h3>
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-muted">Email</span>
              <span className="truncate">{selected.email}</span>
            </div>
            {selected.crm && (
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">CRM</span>
                <span>{selected.crm}</span>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-2.5 pt-4 border-t border-line">
            <h3 className="m-0 text-[13px] font-semibold">History</h3>
            <p className="m-0 text-[13px] leading-normal text-ink-2">{selected.history}</p>
          </section>
        </aside>
      )}
    </div>
  );
}
