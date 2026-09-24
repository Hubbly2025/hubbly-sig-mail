"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { localDateTime, presetTime, toInstant } from "@/lib/outreach/message-time";

export function SendLater({ timezone, disabled, onSchedule, label = "Send later", initial }: {
  timezone: string; disabled?: boolean; onSchedule: (instant: string) => void; label?: string; initial?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [local, setLocal] = useState(initial ? localDateTime(initial, timezone) : "");
  const [error, setError] = useState("");
  function choose(preset?: "tomorrow" | "monday") {
    try {
      const instant = preset ? presetTime(preset, timezone) : toInstant(local, timezone);
      setError("");
      setOpen(false);
      onSchedule(instant);
    } catch (e) { setError((e as Error).message); }
  }
  return <div className="flex flex-col gap-2">
    <Button disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>{label}</Button>
    {open && <div className="rounded-control border border-line bg-head p-3 flex flex-col items-start gap-2" aria-label="Send later options">
      <p className="m-0 text-xs text-muted">Lead time zone: {timezone}</p>
      <Button small disabled={disabled} onClick={() => choose("tomorrow")}>Tomorrow 9 AM their time</Button>
      <Button small disabled={disabled} onClick={() => choose("monday")}>Monday 9 AM their time</Button>
      <Button small disabled={disabled} aria-expanded={custom} onClick={() => setCustom(!custom)}>Custom date and time</Button>
      {custom && <div className="flex flex-col gap-2 w-full">
        <label className="text-meta flex flex-col gap-1">Date and time in {timezone}
          <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="min-h-10 rounded-control border border-control bg-surface px-3 text-ink" />
        </label>
        <Button small disabled={disabled || !local} onClick={() => choose()}>Schedule email</Button>
      </div>}
      {error && <p role="alert" className="m-0 text-danger text-meta">{error}</p>}
    </div>}
  </div>;
}
