"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, cx } from "@/components/ui-hubbly";
import { useToast } from "@/components/outreach/feedback";
import { AudienceStep } from "./AudienceStep";
import { SequenceStep } from "./SequenceStep";
import { SendingStep } from "./SendingStep";
import { LaunchStep } from "./LaunchStep";
import type { useCampaign } from "./useCampaign";

export type CM = ReturnType<typeof useCampaign>;
export type BuilderStepProps = { cm: CM; registerFinish: (finish: () => Promise<boolean>) => void };
const STEPS = ["Audience", "Sequence", "Sending", "Launch"];
export function Builder({ cm, step }: { cm: CM; step: number }) {
  const router = useRouter();
  const toast = useToast();
  const finish = useRef<() => Promise<boolean>>(async () => true);
  const [busy, setBusy] = useState(false);
  async function go(next: number, validate = false) {
    setBusy(true);
    try {
      if (!await cm.flush()) { toast("error", "Changes could not be saved. Try again before continuing."); return; }
      if (validate && !await finish.current()) return;
      router.push(`/campaigns/${cm.campaign!.id}?step=${next}`);
    } finally { setBusy(false); }
  }
  const props: BuilderStepProps = { cm, registerFinish: (handler) => { finish.current = handler; } };
  return <div className="flex-1 flex flex-col">
    <div className="flex flex-wrap items-center gap-3 px-4 md:px-8 pt-5"><ol aria-label="Builder steps" className="list-none p-0 m-0 flex gap-2 flex-wrap">{STEPS.map((name, index) => <li key={name}><button type="button" disabled={busy} aria-current={step === index + 1 ? "step" : undefined} onClick={() => go(index + 1)} className={cx("min-h-10 px-4 rounded-full border text-sm cursor-pointer", step === index + 1 ? "bg-ink text-white border-ink font-semibold" : "bg-surface text-muted border-line")}>{index + 1}. {name}</button></li>)}</ol><span role="status" className="ml-auto text-xs text-muted">{cm.save === "saving" ? "Saving…" : cm.save === "saved" ? "All changes saved" : cm.save === "error" ? <Button small onClick={() => void cm.flush()}>Save failed · Retry</Button> : ""}</span></div>
    <div className="flex-1 p-4 md:px-8 md:py-5">{step === 1 && <AudienceStep {...props} />}{step === 2 && <SequenceStep {...props} />}{step === 3 && <SendingStep {...props} />}{step === 4 && <LaunchStep cm={cm} />}</div>
    {step < 4 && <div className="sticky bottom-0 flex items-center gap-3 px-4 md:px-8 py-3 bg-surface border-t border-line">{step > 1 && <Button disabled={busy} onClick={() => go(step - 1)}>Back</Button>}<Button className="ml-auto" variant="primary" disabled={busy} onClick={() => go(step + 1, true)}>{busy ? "Saving…" : "Save and continue"}</Button></div>}
  </div>;
}
