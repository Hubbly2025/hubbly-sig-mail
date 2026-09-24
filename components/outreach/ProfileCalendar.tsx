"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { useToast } from "@/components/outreach/feedback";
import { api } from "@/lib/outreach/client";
import type { CalendarConnectUrl, CalendarProvider, CalendarStatus, SenderProfile } from "@/lib/outreach/types";

const input = "w-full min-h-10 px-2 rounded-control border border-control bg-surface text-sm text-ink";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProfileCalendar({ profile, canManage, onSaved }: { profile: SenderProfile; canManage: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [hours, setHours] = useState(profile.working_hours);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(hours) !== JSON.stringify(profile.working_hours);
  const path = `outreach/sender-profiles/${profile.id}`;

  async function calendarAction(provider?: CalendarProvider) {
    setBusy(true);
    try {
      if (provider) {
        const { url } = await api<CalendarConnectUrl>("POST", `${path}/calendar/connect-url`, { provider });
        await api<CalendarStatus>("POST", url);
      } else await api("DELETE", `${path}/calendar`);
      toast("success", provider ? "Sample calendar connected. No real account was accessed." : "Sample calendar disconnected.");
      onSaved();
    } catch (error) { toast("error", (error as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="mt-3 flex flex-col gap-3 border-t border-divider pt-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-meta font-semibold mr-auto">Calendar <span className="font-normal text-muted">· Sample</span></span>
      {profile.calendar.connected ? <>
        <span className="text-meta text-ink-2 break-all">{profile.calendar.email}</span>
        {canManage && <Button small disabled={busy} onClick={() => calendarAction()}>Disconnect</Button>}
      </> : canManage ? <>
        <Button small disabled={busy} onClick={() => calendarAction("google")}>Connect Google</Button>
        <Button small disabled={busy} onClick={() => calendarAction("microsoft")}>Connect Microsoft</Button>
      </> : <span className="text-meta text-muted">Not connected</span>}
    </div>
    <fieldset disabled={!canManage || busy} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-3">
      <legend className="text-meta font-semibold mb-2">Working hours <span className="font-normal text-muted">· {profile.timezone}</span></legend>
      <div role="group" aria-label="Working days" className="flex flex-wrap gap-x-3 gap-y-2">
        {days.map((day, i) => <label key={day} className="flex items-center gap-1.5 text-meta text-ink-2 min-h-8">
          <input type="checkbox" checked={hours.days.includes(i)} onChange={(e) => setHours({ ...hours, days: e.target.checked ? [...hours.days, i].sort() : hours.days.filter((d) => d !== i) })} />{day}
        </label>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["start", "end"] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-meta text-muted">
          {key === "start" ? "Start" : "End"}<input type="time" className={input} value={hours[key]} onChange={(e) => setHours({ ...hours, [key]: e.target.value })} />
        </label>)}
        {([
          ["buffer_minutes", "Buffer minutes", 0, 120],
          ["minimum_notice_hours", "Minimum notice hours", 0, 168],
          ["meeting_length_minutes", "Meeting length (minutes)", 5, 240],
        ] as const).map(([key, label, min, max]) => <label key={key} className="flex flex-col gap-1 text-meta text-muted">
          {label}<input type="number" min={min} max={max} step={1} className={input} value={Number.isNaN(hours[key]) ? "" : hours[key]} onChange={(e) => setHours({ ...hours, [key]: e.target.valueAsNumber })} />
        </label>)}
      </div>
      {canManage && <div><Button small disabled={!dirty || busy} onClick={async () => {
        setBusy(true);
        try {
          await api("PATCH", path, { working_hours: hours });
          toast("success", "Working hours saved.");
          onSaved();
        } catch (error) { toast("error", (error as Error).message); }
        finally { setBusy(false); }
      }}>Save working hours</Button></div>}
    </fieldset>
  </div>;
}
