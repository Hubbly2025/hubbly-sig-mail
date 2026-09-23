"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, cx } from "@/components/ui-hubbly";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/ui-hubbly/icons";
import { launchCampaign, sendTest } from "@/lib/mail/api";
import type {
  CampaignDraft,
  Domain,
  LeadList,
  Mailbox,
  MailSettings,
  PreviewContact,
  SendCheck,
  SequenceStep,
  VerificationSummary,
} from "@/lib/mail/types";
import { AudienceStage } from "./AudienceStage";
import { ReviewStage } from "./ReviewStage";
import { ScheduleStage, type Schedule } from "./ScheduleStage";
import { SequenceStage } from "./SequenceStage";

const stages = ["Audience", "Sequence", "Schedule & mailboxes", "Review & launch"];
const sourceLabel = { signal: "Signal", clickrabbit: "ClickRabbit", csv: "CSV" } as const;

export function Builder({
  draft,
  contacts,
  checks,
  leadLists,
  verifications,
  mailboxes,
  domains,
  settings,
}: {
  draft: CampaignDraft;
  contacts: PreviewContact[];
  checks: SendCheck[];
  leadLists: LeadList[];
  verifications: Record<string, VerificationSummary>;
  mailboxes: Mailbox[];
  domains: Domain[];
  settings: MailSettings;
}) {
  const router = useRouter();

  const [stage, setStage] = useState(1); // land on Sequence, the heart of the builder
  const [steps, setSteps] = useState<SequenceStep[]>(draft.steps);
  const [status, setStatus] = useState(`Draft · saved ${draft.savedAt}`);
  const [launching, setLaunching] = useState(false);

  const defaultListId = useMemo(
    () => leadLists.find((l) => l.count === draft.campaign.audience.count)?.id ?? leadLists[0]?.id ?? "",
    [leadLists, draft.campaign.audience.count]
  );
  const [audienceListId, setAudienceListId] = useState(defaultListId);

  const [schedule, setSchedule] = useState<Schedule>({
    sendInContactTimezone: settings.sendInContactTimezone,
    sendWindows: settings.sendWindows,
    perMailboxDaily: settings.perMailboxDaily,
    selectedMailboxIds: mailboxes.filter((m) => m.health !== "poor").map((m) => m.id),
  });

  const selectedList = leadLists.find((l) => l.id === audienceListId);
  const verification = verifications[audienceListId];
  const audienceLabel = selectedList?.name ?? draft.campaign.audience.label;
  const audienceSource = (selectedList?.source === "signal" || selectedList?.source === "clickrabbit" || selectedList?.source === "csv"
    ? selectedList.source
    : draft.campaign.audience.source) as keyof typeof sourceLabel;
  const audienceCount = verification?.readyToSend ?? selectedList?.count ?? draft.campaign.audience.count;

  const activeBoxes = mailboxes.filter((m) => schedule.selectedMailboxIds.includes(m.id));
  const dailyCapacity = activeBoxes.reduce((sum, m) => sum + Math.min(m.dailyLimit, schedule.perMailboxDaily), 0);
  const activeDomains = new Set(activeBoxes.map((m) => m.domainId)).size;

  const canContinue = stage < stages.length - 1;
  const canLaunch = activeBoxes.length > 0 && (verification?.readyToSend ?? 0) > 0;

  function onLaunch() {
    setLaunching(true);
    setStatus("Launching…");
    launchCampaign({
      campaignId: draft.campaign.id,
      audienceListId,
      mailboxIds: schedule.selectedMailboxIds,
      perMailboxDaily: schedule.perMailboxDaily,
      sendInContactTimezone: schedule.sendInContactTimezone,
    }).then((res) => {
      if (res.ok) {
        setStatus("Campaign launched");
        router.push("/campaigns");
      } else {
        setLaunching(false);
        setStatus("Draft · not launched");
      }
    });
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
            const done = i < stage;
            const current = i === stage;
            return (
              <li key={label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="w-5 h-px bg-control" />}
                <button
                  type="button"
                  onClick={() => setStage(i)}
                  aria-current={current ? "step" : undefined}
                  className={cx(
                    "flex items-center gap-2 px-3 min-h-[34px] rounded-full border-0 cursor-pointer bg-transparent",
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
                </button>
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
        {stage > 0 && (
          <Button onClick={() => setStage((s) => Math.max(0, s - 1))}>Back</Button>
        )}
        {canContinue ? (
          <Button variant="primary" onClick={() => setStage((s) => Math.min(stages.length - 1, s + 1))}>
            Continue
            <IconChevronRight size={16} />
          </Button>
        ) : (
          <Button variant="primary" onClick={onLaunch} disabled={launching || !canLaunch}>
            {launching ? "Launching…" : "Launch campaign"}
          </Button>
        )}
      </header>

      <div className="flex-1 min-h-0">
        {stage === 0 && (
          <AudienceStage
            leadLists={leadLists}
            verifications={verifications}
            selectedListId={audienceListId}
            onSelect={setAudienceListId}
            excluded={draft.campaign.audience.excluded}
          />
        )}
        {stage === 1 && (
          <SequenceStage
            draft={draft}
            contacts={contacts}
            checks={checks}
            steps={steps}
            setSteps={setSteps}
            audienceLabel={audienceLabel}
            audienceSource={audienceSource}
            audienceCount={audienceCount}
            audienceExcluded={draft.campaign.audience.excluded}
            onEditAudience={() => setStage(0)}
            setStatus={setStatus}
          />
        )}
        {stage === 2 && (
          <ScheduleStage mailboxes={mailboxes} domains={domains} schedule={schedule} onChange={(patch) => setSchedule((s) => ({ ...s, ...patch }))} />
        )}
        {stage === 3 && (
          <ReviewStage
            campaignName={draft.campaign.name}
            steps={steps}
            verification={verification}
            checks={checks}
            mailboxCount={activeBoxes.length}
            domainCount={activeDomains}
            dailyCapacity={dailyCapacity}
            sendWindows={schedule.sendWindows}
            fromLabel={draft.fromLabel}
            goToStage={setStage}
            onLaunch={onLaunch}
            launching={launching}
          />
        )}
      </div>
    </div>
  );
}
