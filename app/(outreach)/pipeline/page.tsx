"use client";

import { useState } from "react";
import { Bar, Button, KpiTile, fmt } from "@/components/ui-hubbly";
import { Dialog, Panel } from "@/components/outreach/feedback";
import { PipelineBoard } from "@/components/outreach/pipeline-board";
import { PageHeader } from "@/components/outreach/shell";
import { useResource } from "@/lib/outreach/hooks";
import { MOCK } from "@/lib/outreach/client";
import type { Pipeline } from "@/lib/outreach/types";

export default function PipelinePage() {
  const pipeline = useResource<Pipeline>("outreach/pipeline");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const data = pipeline.data;
  return <>
    <PageHeader title="Pipeline" context={MOCK ? "Read-only demo · sample deals in each stage" : "Read-only pipeline"} actions={<Button onClick={() => setGoalsOpen(true)}>Set goals</Button>} />
    <div className="p-8 flex flex-col gap-6">
      <Panel loading={pipeline.loading} error={pipeline.error} onRetry={pipeline.reload} empty={!data} emptyText="No pipeline summary yet." className="!bg-transparent !border-0" bodyClassName="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {data && <>
          <KpiTile label={data.goal.label} value={<>{data.goal.current}<span className="text-base text-muted font-normal"> / {data.goal.target}</span></>} sub={<div className="flex flex-col gap-2"><Bar pct={data.goal.target > 0 ? data.goal.current / data.goal.target * 100 : 0} /><span>{Math.max(0, data.goal.target - data.goal.current)} to go</span></div>} />
          <KpiTile label="Open pipeline" value={<>${fmt.n(data.open_value_monthly)}<span className="text-base text-muted font-normal">/mo</span></>} sub="Across open stages" />
          <KpiTile label="Won this quarter" value={<>${fmt.n(data.won_value_monthly)}<span className="text-base text-muted font-normal">/mo</span></>} sub={`${data.won_count} customers won`} subTone="success" />
          <KpiTile label="New replies go to" value={<span className="text-xl">{data.assignees.join(", ") || "Unassigned"}</span>} sub="Taking turns" />
        </>}
      </Panel>
      <Panel title="Deals by stage" loading={pipeline.loading} error={pipeline.error} onRetry={pipeline.reload} empty={!data?.stages.length} emptyText="No pipeline stages yet." className="!bg-transparent !border-0" bodyClassName="pt-2" actions={<span className="text-xs text-muted">Read-only · open a card to review replies</span>}>
        {data && <PipelineBoard stages={data.stages} />}
      </Panel>
    </div>
    <Dialog open={goalsOpen} onClose={() => setGoalsOpen(false)} title="Pipeline goals" footer={<Button onClick={() => setGoalsOpen(false)}>Got it</Button>}>
      <p className="text-ink-2 leading-relaxed">Goal editing is not available in this read-only view. Deals, contacts, and goals need to be aligned with the CRM before editing is enabled.</p>{data && <p className="mt-4 font-medium">{data.goal.label}: {data.goal.current} of {data.goal.target}</p>}
    </Dialog>
  </>;
}
