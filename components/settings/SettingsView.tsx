"use client";

import { useState, type ReactNode } from "react";
import { Button, fmt } from "@/components/ui-hubbly";
import { Toggle } from "@/components/ui-hubbly/controls";
import { updateSettings } from "@/lib/mail/api";
import type { MailSettings } from "@/lib/mail/types";

type BoolKey = { [K in keyof MailSettings]: MailSettings[K] extends boolean ? K : never }[keyof MailSettings];

function Row({ label, desc, children }: { label: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-[11px] border-t border-divider">
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-[13.5px] font-medium">{label}</span>
        <span className="text-meta text-muted">{desc}</span>
      </div>
      {children}
    </div>
  );
}

function Value({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-[13px] font-medium text-ink text-right max-w-[190px]">{children}</span>;
}

function SettingsCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-card px-[18px] pt-4 pb-1.5 flex flex-col">
      <h2 className="m-0 mb-1 text-[15px] font-semibold">{title}</h2>
      <p className="m-0 mb-2 text-meta text-muted">{sub}</p>
      {children}
    </section>
  );
}

export function SettingsView({ initial }: { initial: MailSettings }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const T = (key: BoolKey, label: string, desc: string, locked = false) => (
    <Row label={label} desc={desc}>
      <Toggle
        label={label}
        checked={s[key] as boolean}
        locked={locked}
        onChange={(v) => {
          setS((prev) => ({ ...prev, [key]: v }));
          setDirty(true);
          setSaved(false);
        }}
      />
    </Row>
  );

  return (
    <div className="flex-1 px-8 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <p className="m-0 flex-1 text-meta text-muted">Applies to every campaign in this workspace.</p>
        {saved && (
          <span role="status" className="text-meta text-success">
            Saved
          </span>
        )}
        <Button
          variant="primary"
          disabled={!dirty}
          onClick={() =>
            updateSettings(s).then(() => {
              setDirty(false);
              setSaved(true);
            })
          }
        >
          Save changes
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        <SettingsCard title="Sending schedule" sub="When and how fast Hubbly sends.">
          {T("sendInContactTimezone", "Send in each contact’s time zone", "Emails land during their business hours, not yours.")}
          <Row label="Days and hours" desc="Two windows avoid looking automated.">
            <Value>{s.sendWindows}</Value>
          </Row>
          <Row label="Per mailbox, per day" desc="Warming mailboxes ramp up to this.">
            <Value>{s.perMailboxDaily} sends</Value>
          </Row>
          <Row label="Gap between sends" desc="Randomized per mailbox.">
            <Value>
              {s.gapMinutes[0]}–{s.gapMinutes[1]} min
            </Value>
          </Row>
        </SettingsCard>

        <SettingsCard title="Deliverability" sub="Keeps your domains out of spam.">
          {T("matchProvider", "Match sender to recipient’s provider", "Gmail contacts get mail from Google mailboxes, Outlook contacts from Microsoft.")}
          {T("plainTextFirst", "Plain-text first email", "No links or images on the first touch.")}
          {T("verifyBeforeSend", "Verify every lead before first send", "Including catch-all addresses. Risky and invalid are held back.", true)}
          {T("pauseOnBounce", `Pause a domain if bounces pass ${s.pauseOnBouncePct}%`, "Hubbly tells you what to fix.")}
        </SettingsCard>

        <SettingsCard title="Tracking" sub="Reply rate is the number that matters.">
          {T("trackOpens", "Track opens", "Apple Mail preloads images, so opens are inflated, and the tracking pixel can hurt deliverability.")}
          {T("trackClicks", "Track link clicks", "Uses your own tracking domain when on.")}
          <Row label="Tracking domain" desc="Used only if click tracking is on.">
            <Value>
              <span className="font-mono">{s.trackingDomain}</span>
            </Value>
          </Row>
        </SettingsCard>

        <SettingsCard title="Replies and routing" sub="What happens when someone answers.">
          {T("stopOnReply", "Stop the sequence on any reply", "Always on.", true)}
          {T("resumeAfterOOO", "Resume after out-of-office", "Picks up the day they’re back.")}
          <Row label="Assign positive replies" desc="Taking turns.">
            <Value>{s.assignees.join(", ")}</Value>
          </Row>
          {T("draftReplies", "Let Hubbly draft replies", "You approve before anything sends.")}
        </SettingsCard>

        <SettingsCard title="Compliance" sub="Required on every email. Can’t be turned off.">
          {T("unsubscribeLine", "Unsubscribe line", "Honored across every campaign and brand.", true)}
          <Row label="Business address" desc="Added to the footer.">
            <Value>{s.businessAddress}</Value>
          </Row>
          <Row label="Do-not-contact list" desc="Unsubscribes, bounces, customers, uploads.">
            <Value>{fmt.n(s.suppressionCount)} contacts</Value>
          </Row>
        </SettingsCard>
      </div>
    </div>
  );
}
