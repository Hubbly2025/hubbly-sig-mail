import type { Campaign, Mailbox, SendingConfig, Step } from "./types";

export const pauseReasons = { bounces_over_5: "Bounces over 5%", canary_failed: "Canary failed", manual: "Paused manually" };
export const campaignTypes = { cold_outreach: "Cold outreach", reactivation: "Reactivation" };
export const defaultSending: SendingConfig = { pool_mode: "manual", mailbox_ids: [], mailbox_tag: "", per_mailbox_cap: 30, mailbox_caps: {}, daily_cap: 240, target_days: 10, timezone: "lead" };
export function sendingConfig(campaign: Campaign): SendingConfig { return { ...defaultSending, ...campaign.sending }; }
export function stepVariants(step: Step) { return step.variants?.length ? step.variants : [{ id: "A" as const, subject: step.subject, body: step.body }]; }
export function selectedMailboxes(config: SendingConfig, mailboxes: Mailbox[]) {
  return mailboxes.filter((mailbox) => mailbox.status === "ready" && (config.pool_mode === "tag" ? mailbox.tags?.includes(config.mailbox_tag) : config.mailbox_ids.includes(mailbox.id)));
}
export function capacityPlan(campaign: Campaign, mailboxes: Mailbox[], maxDaily = 30) {
  const config = sendingConfig(campaign);
  const selected = selectedMailboxes(config, mailboxes);
  const poolCapacity = selected.reduce((sum, mailbox) => sum + Math.min(maxDaily, config.mailbox_caps[mailbox.id] ?? config.per_mailbox_cap), 0);
  const dailyCapacity = Math.min(poolCapacity, config.daily_cap);
  const messages = campaign.enrolled_count * campaign.steps.length;
  const delayDays = campaign.steps.slice(1).reduce((sum, step) => sum + (step.delay_days ?? 2), 0);
  const sendDays = Math.max(0, config.target_days - delayDays);
  const minimumDays = dailyCapacity > 0 ? Math.ceil(messages / dailyCapacity) + delayDays : null;
  const neededDaily = sendDays > 0 ? Math.ceil(messages / sendDays) : Infinity;
  const requiredMailboxes = Number.isFinite(neededDaily) ? Math.ceil(neededDaily / Math.min(config.per_mailbox_cap, maxDaily)) : null;
  return { messages, delayDays, dailyCapacity, selected: selected.length, available: mailboxes.filter((mailbox) => mailbox.status === "ready").length, requiredMailboxes, minimumDays, targetDays: config.target_days, campaignCapLimited: neededDaily > config.daily_cap, fits: messages > 0 && dailyCapacity > 0 && minimumDays !== null && minimumDays <= config.target_days };
}
export function sendingError(config: SendingConfig, schedule: Campaign["schedule"]) {
  if (!Number.isInteger(config.per_mailbox_cap) || config.per_mailbox_cap < 1 || config.per_mailbox_cap > 30 || Object.values(config.mailbox_caps).some((cap) => !Number.isInteger(cap) || cap < 1 || cap > 30)) return "Mailbox daily caps must be whole numbers from 1 to 30.";
  if (!Number.isInteger(config.daily_cap) || config.daily_cap < 1 || config.daily_cap > 100000) return "Set a campaign daily cap from 1 to 100,000.";
  if (!Number.isInteger(config.target_days) || config.target_days < 1 || config.target_days > 365) return "Choose a planning window of 1–365 sending days.";
  if (!schedule.days.length || schedule.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return "Choose at least one sending day.";
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(schedule.window.start) || !time.test(schedule.window.end) || schedule.window.start >= schedule.window.end) return "Choose an end time after the start time.";
  if (!schedule.sender_profile_id) return "Choose a sender profile.";
  return null;
}
