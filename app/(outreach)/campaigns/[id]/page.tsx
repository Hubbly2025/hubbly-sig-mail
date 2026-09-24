"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bar, Button, StatusPill } from "@/components/ui-hubbly";
import { Skel, useToast } from "@/components/outreach/feedback";
import { PageHeader, useCan } from "@/components/outreach/shell";
import { campaignStatus, scheduleLine } from "@/components/outreach/format";
import { useCampaign } from "@/components/campaign/useCampaign";
import { Builder } from "@/components/campaign/Builder";
import { Enrolled } from "@/components/campaign/Enrolled";
import { api } from "@/lib/outreach/client";
import { pauseReasons } from "@/lib/outreach/campaign-planning";
import type { BuildMode, Campaign } from "@/lib/outreach/types";

function BuildModeQuestion({ onPick }: { onPick: (m: BuildMode) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
      <div className="max-w-[720px] w-full flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <h1 className="m-0 text-[28px] font-semibold tracking-[-0.01em]">How do you want to build this campaign?</h1>
          <p className="m-0 text-ink-2">You can switch to building it yourself at any point without losing anything.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onPick("manual")}
            className="text-left flex flex-col gap-2 p-6 rounded-card border border-line bg-surface cursor-pointer hover:border-accent hover:shadow-[0_2px_16px_rgba(43,89,195,0.12)]"
          >
            <span className="text-lg font-semibold">Build it myself</span>
            <span className="text-ink-2 text-[14px] leading-relaxed">Four steps: audience, sequence, sending capacity, then review and launch.</span>
          </button>
          <button
            type="button"
            onClick={() => onPick("ai")}
            className="text-left flex flex-col gap-2 p-6 rounded-card border-2 border-accent bg-accent-soft cursor-pointer hover:shadow-[0_2px_16px_rgba(43,89,195,0.16)]"
          >
            <span className="text-lg font-semibold text-accent-ink">Build it with Hubbly</span>
            <span className="text-ink-2 text-[14px] leading-relaxed">Describe it in a few sentences. Hubbly writes the brief, picks the sender and schedule, and drafts the emails. You choose the leads.</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Overview({ c, onAction, busy }: { c: Campaign; onAction: (a: "pause" | "resume" | "archive") => void; busy: boolean }) {
  const canLaunch = useCan("launch");
  const done = c.checklist.filter((x) => x.done).length;
  return (
    <div className="flex items-center gap-6 px-8 py-3.5 bg-surface border-b border-line text-[13.5px]">
      <div className="flex-1 min-w-0 text-ink-2 truncate">{scheduleLine(c.schedule.days, c.schedule.window.start, c.schedule.window.end)}</div>
      {c.status === "draft" ? (
        <div className="flex items-center gap-2.5 w-[260px]">
          <span className="text-muted whitespace-nowrap">
            Launch checklist {done}/{c.checklist.length}
          </span>
          <Bar pct={(done / Math.max(1, c.checklist.length)) * 100} className="flex-1" color={done === c.checklist.length ? "var(--success-dot)" : undefined} />
        </div>
      ) : (
        <div className="text-muted whitespace-nowrap">
          {c.enrolled_count.toLocaleString("en-US")} enrolled · {c.ready_mailboxes} mailboxes · {c.daily_capacity}/day
        </div>
      )}
      {canLaunch && (c.status === "running" || c.status === "paused" || c.status === "completed") && (
        <div className="flex gap-2">
          {c.status === "running" && (
            <Button small disabled={busy} onClick={() => onAction("pause")}>
              Pause
            </Button>
          )}
          {c.status === "paused" && (
            <Button small variant="primary" disabled={busy} onClick={() => onAction("resume")}>
              Resume
            </Button>
          )}
          <Button small disabled={busy} onClick={() => onAction("archive")}>
            Archive
          </Button>
        </div>
      )}
    </div>
  );
}

function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const canBuild = useCan("build");
  const cm = useCampaign(id);
  const [busy, setBusy] = useState(false);
  const c = cm.campaign;

  if (cm.error) {
    const gone = "status" in cm.error && (cm.error as { status: number }).status === 404;
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div role="alert" className="max-w-md flex flex-col items-center gap-3 text-center">
          <h1 className="m-0 text-xl font-semibold">{gone ? "This campaign no longer exists" : "This campaign didn't load"}</h1>
          <p className="m-0 text-ink-2">{gone ? "It may have been deleted. Nothing about your other campaigns has changed." : cm.error.message}</p>
          <div className="flex gap-2">
            <Link href="/campaigns" className="inline-flex items-center min-h-10 px-4 rounded-control bg-accent text-white font-semibold no-underline hover:text-white">
              Back to campaigns
            </Link>
            {!gone && <Button onClick={cm.reload}>Try again</Button>}
          </div>
        </div>
      </div>
    );
  }

  if (!c)
    return (
      <div className="p-8 flex flex-col gap-4">
        <Skel className="h-7 w-80" />
        <Skel className="h-4 w-96" />
        <Skel className="h-[420px] w-full rounded-card" />
      </div>
    );

  if (c.status === "draft" && c.build_mode === null && canBuild) {
    return (
      <BuildModeQuestion
        onPick={async (m) => {
          const next = await api<Campaign>("PATCH", `outreach/campaigns/${id}`, { build_mode: m });
          cm.replace(next);
          router.replace(m === "ai" ? `/campaigns/${id}/build` : `/campaigns/${id}?step=1`);
        }}
      />
    );
  }

  const stepParam = Number(sp.get("step") ?? 0);
  const showBuilder = canBuild && (c.status === "draft" || stepParam > 0);
  const step = Math.min(4, Math.max(1, stepParam || 1));

  async function act(a: "pause" | "resume" | "archive") {
    setBusy(true);
    try {
      cm.replace(await api<Campaign>("POST", `outreach/campaigns/${id}/${a}`));
      toast("success", a === "pause" ? "Paused. Nothing more sends until you resume." : a === "resume" ? "Resumed." : "Archived.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={c.name}
        context={
          <span className="flex items-center gap-2">
            <StatusPill tone={campaignStatus[c.status].tone} className="!min-h-5 !text-[11.5px] !px-2">
              {campaignStatus[c.status].label}
            </StatusPill>
            <Link href="/campaigns" className="no-underline">
              All campaigns
            </Link>
            {c.build_mode === "ai" && c.status === "draft" && (
              <>
                <span>·</span>
                <Link href={`/campaigns/${id}/build`} className="no-underline">
                  Build with Hubbly
                </Link>
              </>
            )}
          </span>
        }
        actions={
          !showBuilder && canBuild ? (
            <Button onClick={() => router.push(`/campaigns/${id}?step=2`)}>Edit emails</Button>
          ) : undefined
        }
      />
      {c.status === "paused" && <div role="status" className="px-8 py-3 bg-warn-bg text-warn text-sm">Paused: {pauseReasons[c.pause_reason ?? "manual"]}. Review mailbox health before resuming.</div>}
      <Overview c={c} onAction={act} busy={busy} />
      {showBuilder ? <Builder cm={cm} step={step} /> : <Enrolled campaign={c} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CampaignPage />
    </Suspense>
  );
}
