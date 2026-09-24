import type { CampaignStatus, Classification, MailboxKind, MailboxStatus } from "@/lib/outreach/types";
import type { Tone } from "@/components/ui-hubbly";

export const n = (x: number) => x.toLocaleString("en-US");
export const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

export const campaignStatus: Record<CampaignStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  running: { label: "Running", tone: "success" },
  paused: { label: "Paused", tone: "warn" },
  completed: { label: "Completed", tone: "accent" },
  archived: { label: "Archived", tone: "neutral" },
};

export const mailboxStatus: Record<MailboxStatus, { label: string; tone: Tone; help: string }> = {
  provisioning: { label: "Provisioning", tone: "neutral", help: "Being created." },
  verifying: { label: "Verifying", tone: "neutral", help: "Checking we can log in and send." },
  warming: { label: "Warming", tone: "accent", help: "Building a sending history." },
  ready: { label: "Ready", tone: "success", help: "Warmed and available to campaigns." },
  paused: { label: "Paused", tone: "warn", help: "Temporarily out of rotation." },
  burnt: { label: "Burnt", tone: "danger", help: "Retired for good. Campaigns moved to your other mailboxes." },
};

export const mailboxKind: Record<MailboxKind, string> = {
  managed: "Managed",
  google: "Google",
  microsoft: "Microsoft",
  imported: "Imported",
};

export const classification: Record<Classification, { label: string; tone: Tone }> = {
  meeting: { label: "Meeting", tone: "accent" },
  interested: { label: "Interested", tone: "success" },
  question: { label: "Question", tone: "accent" },
  objection: { label: "Objection", tone: "warn" },
  not_now: { label: "Not now", tone: "warn" },
  not_interested: { label: "Not interested", tone: "neutral" },
  out_of_office: { label: "Out of office", tone: "neutral" },
  unsubscribe: { label: "Unsubscribe", tone: "danger" },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
}

export function scheduleLine(days: number[], start: string, end: string) {
  const sorted = [...days].sort();
  let dayText = sorted.map((d) => DAYS[d]).join(", ");
  if (sorted.join() === "0,1,2,3,4") dayText = "Weekdays";
  else if (sorted.length === 7) dayText = "Every day";
  else if (sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)) dayText = `${DAYS[sorted[0]]}–${DAYS[sorted[sorted.length - 1]]}`;
  if (!sorted.length) return "No sending days chosen";
  return `${dayText}, ${fmtTime(start)}–${fmtTime(end)} in each recipient's time zone`;
}
