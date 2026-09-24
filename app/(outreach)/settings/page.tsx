"use client";

import { useState } from "react";
import { Button, StatusPill, cx } from "@/components/ui-hubbly";
import { Toggle } from "@/components/ui-hubbly/controls";
import { Dialog, Panel, useToast } from "@/components/outreach/feedback";
import { PageHeader, useCan, useStatus } from "@/components/outreach/shell";
import { api } from "@/lib/outreach/client";
import { ProfileCalendar } from "@/components/outreach/ProfileCalendar";
import { useResource } from "@/lib/outreach/hooks";
import type { OutreachSettings, SenderProfile, Suppression } from "@/lib/outreach/types";

const input = "min-h-10 px-3 rounded-control border border-control bg-surface text-sm text-ink";
const lbl = "flex flex-col gap-1.5 text-meta text-muted";
const EMPTY: Omit<SenderProfile, "id"> = { name: "", title: "", company: "", booking_link: "", timezone: "America/Chicago", postal_address: "", calendar: { connected: false }, working_hours: { days: [0, 1, 2, 3, 4], start: "09:00", end: "17:00", buffer_minutes: 15, minimum_notice_hours: 24, meeting_length_minutes: 30 } };
const TZ = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Toronto", "Europe/London"];

const CONSENT =
  // CONFIRM with the devs: the exact consent wording and limits should come from the backend.
  "When automatic replies are on, drafted replies send without you seeing them first. Hubbly only sends a reply that passes every rule and stays within the limits the system enforces. Anything it holds back waits in the Approval inbox as it does today. You can turn this off at any time, and the change takes effect immediately.";

function ProfileDialog({ open, initial, onClose, onSaved }: { open: boolean; initial: SenderProfile | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Omit<SenderProfile, "id">>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const missingAddress = !f.postal_address.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? "Edit sender profile" : "Add a sender profile"}
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || !f.name.trim() || missingAddress}
            onClick={async () => {
              setBusy(true);
              try {
                if (initial) await api("PATCH", `outreach/sender-profiles/${initial.id}`, f);
                else await api("POST", "outreach/sender-profiles", f);
                toast("success", initial ? "Profile saved." : "Profile added.");
                onSaved();
                onClose();
              } catch (e) {
                toast("error", (e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className={lbl}>
          Name
          <input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={lbl}>
          Job title
          <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className={lbl}>
          Company
          <input className={input} value={f.company} onChange={(e) => set("company", e.target.value)} />
        </label>
        <label className={lbl}>
          Time zone
          <select className={input} value={f.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TZ.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={cx(lbl, "col-span-2")}>
          Booking link
          <input className={input} value={f.booking_link} placeholder="https://" onChange={(e) => set("booking_link", e.target.value)} />
        </label>
        <label className={cx(lbl, "col-span-2")}>
          Postal address <span className="text-danger">Required by law — added to every email</span>
          <textarea className={cx(input, "py-2 min-h-[64px]")} value={f.postal_address} onChange={(e) => set("postal_address", e.target.value)} />
        </label>
      </div>
    </Dialog>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const status = useStatus();
  const canManage = useCan("launch");
  const profiles = useResource<SenderProfile[]>("outreach/sender-profiles");
  const settings = useResource<OutreachSettings>("outreach/settings");
  const supp = useResource<Suppression[]>("outreach/suppression");
  const [editing, setEditing] = useState<SenderProfile | null | "new">(null);
  const [consent, setConsent] = useState(false);
  const [removing, setRemoving] = useState<Suppression | null>(null);
  const [scope, setScope] = useState<"" | Suppression["scope"]>("");

  const p0 = profiles.data?.[0];

  async function setAuto(on: boolean) {
    try {
      const s = await api<OutreachSettings>("PATCH", "outreach/settings", { auto_replies: on, consent_text: on ? CONSENT : undefined });
      settings.setData(() => s);
      toast(on ? "warn" : "success", on ? "Automatic replies are on. Check the Approval inbox for anything Hubbly held back." : "Automatic replies are off. Every reply waits for you.");
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  const scopeLabel: Record<Suppression["scope"], string> = { campaign: "This campaign", workspace: "Whole workspace", global: "Everywhere" };
  const suppRows = (supp.data ?? []).filter((s) => !scope || s.scope === scope);

  return (
    <>
      <PageHeader title="Outreach settings" context="Who emails come from, how replies are answered, and who is never emailed" />
      <div className="px-8 py-6 grid grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Panel
            title="Sender profiles"
            loading={profiles.loading}
            error={profiles.error}
            onRetry={profiles.reload}
            empty={profiles.data?.length === 0}
            emptyText="No sender profiles yet. Campaigns need one to launch."
            actions={
              canManage && (
                <Button small onClick={() => setEditing("new")}>
                  Add a profile
                </Button>
              )
            }
          >
            <ul className="list-none m-0 p-0">
              {profiles.data?.map((p) => (
                <li key={p.id} className="flex items-start gap-3 px-5 py-3.5 border-t border-divider">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {p.name} <span className="font-normal text-muted">· {p.title}, {p.company}</span>
                    </span>
                    <span className="text-meta text-muted">{p.postal_address}</span>
                    <span className="text-meta text-muted">
                      {p.timezone}
                      {p.booking_link && (
                        <>
                          {" · "}
                          <a href={p.booking_link} className="no-underline">
                            {p.booking_link.replace(/^https?:\/\//, "")}
                          </a>
                        </>
                      )}
                    </span>
                    <ProfileCalendar key={`${p.id}:${JSON.stringify(p.working_hours)}:${p.calendar.connected}`} profile={p} canManage={canManage} onSaved={profiles.reload} />
                  </div>
                  {canManage && (
                    <Button small onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Answering replies" loading={settings.loading} error={settings.error} onRetry={settings.reload} bodyClassName="px-5 pb-5 flex flex-col gap-3">
            {settings.data && (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-semibold">Send drafted replies automatically</span>
                    <span className="text-meta text-muted">
                      {settings.data.auto_replies
                        ? `On since ${settings.data.consented_at}, turned on by ${settings.data.consented_by}.`
                        : "Off. Every drafted reply waits in the Approval inbox for you."}
                    </span>
                  </div>
                  <Toggle label="Send drafted replies automatically" checked={settings.data.auto_replies} locked={!canManage} onChange={(v) => (v ? setConsent(true) : setAuto(false))} />
                </div>
              </>
            )}
          </Panel>

          <Panel title="What every email carries" bodyClassName="px-5 pb-5 flex flex-col gap-2">
            <p className="m-0 text-meta text-muted">Added to the bottom of every message. This is exactly what recipients see.</p>
            <div className="p-4 rounded-control border border-line bg-head text-[13px] leading-relaxed text-ink-2 whitespace-pre-line">
              {p0
                ? `${p0.name} · ${p0.title}, ${p0.company}\n${p0.postal_address}\nNot interested? Reply "no thanks" or unsubscribe here and you won't hear from us again.`
                : "Add a sender profile to see the footer."}
            </div>
          </Panel>
        </div>

        <Panel
          title="Opt-out list"
          loading={supp.loading}
          error={supp.error}
          onRetry={supp.reload}
          empty={suppRows.length === 0}
          emptyText={scope ? "Nobody at this reach." : "Nobody has opted out yet."}
          actions={
            <select aria-label="Reach" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="min-h-8 px-2 rounded-lg border border-control bg-surface text-[13px]">
              <option value="">Every reach</option>
              <option value="campaign">This campaign only</option>
              <option value="workspace">Whole workspace</option>
              <option value="global">Everywhere</option>
            </select>
          }
        >
          <p className="m-0 px-5 pb-3 text-meta text-muted">Everyone here will never be emailed again at the reach shown. {supp.data ? `${supp.data.length} in total.` : ""}</p>
          <ul className="list-none m-0 p-0">
            {suppRows.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 border-t border-divider">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="font-mono text-[13px] truncate">{s.email}</span>
                  <span className="text-meta text-muted truncate">
                    {s.reason} · {s.added_at}
                    {s.campaign_name ? ` · ${s.campaign_name}` : ""}
                  </span>
                </div>
                <StatusPill tone={s.scope === "global" ? "danger" : s.scope === "workspace" ? "warn" : "neutral"}>{scopeLabel[s.scope]}</StatusPill>
                {canManage && (
                  <Button small variant="ghost" onClick={() => setRemoving(s)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {editing && <ProfileDialog open initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={profiles.reload} />}

      <Dialog
        open={consent}
        onClose={() => setConsent(false)}
        title="Turn on automatic replies?"
        width={560}
        footer={
          <>
            <Button onClick={() => setConsent(false)}>Keep them off</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConsent(false);
                setAuto(true);
              }}
            >
              I understand — turn them on
            </Button>
          </>
        }
      >
        <p className="m-0 text-ink-2 leading-relaxed">{CONSENT}</p>
        <p className="m-0 mt-3 text-meta text-muted">This text is recorded with your name{status ? ` (${status.user_name})` : ""} and the time.</p>
      </Dialog>

      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Take this address off the list?"
        width={440}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                const s = removing!;
                setRemoving(null);
                try {
                  await api("DELETE", `outreach/suppression/${s.id}`);
                  supp.setData((xs) => xs?.filter((x) => x.id !== s.id));
                  toast("warn", `${s.email} can be emailed again.`);
                } catch (e) {
                  toast("error", (e as Error).message);
                }
              }}
            >
              Remove from list
            </Button>
          </>
        }
      >
        <p className="m-0 text-ink-2">
          <span className="font-mono">{removing?.email}</span> was added because: {removing?.reason.toLowerCase()}. Only remove it if they asked to hear from you again.
        </p>
      </Dialog>
    </>
  );
}
