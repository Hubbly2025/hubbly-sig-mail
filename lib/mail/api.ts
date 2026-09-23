// The only module screens may import data from.
// Every function is async so each mock can be swapped for a real Mail API call
// (one endpoint per PR) without touching any screen.

import * as mock from "./mock";
import type {
  Campaign,
  CampaignDraft,
  Domain,
  Intent,
  Lead,
  LeadList,
  MailSettings,
  MailSummary,
  Mailbox,
  PreviewContact,
  Reply,
  SendCheck,
  VerificationSummary,
  Workspace,
} from "./types";

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(x: T): T => structuredClone(x);

/* ---------- Reads ---------- */

export async function getWorkspace(): Promise<Workspace> {
  return clone(mock.workspace);
}

export async function getSummary(): Promise<MailSummary> {
  return clone(mock.summary);
}

export async function listCampaigns(): Promise<Campaign[]> {
  return clone(mock.campaigns);
}

export async function getCampaignDraft(campaignId?: string): Promise<CampaignDraft> {
  const d = clone(mock.draft);
  if (campaignId) {
    const c = mock.campaigns.find((x) => x.id === campaignId);
    if (c) d.campaign = clone(c);
  }
  return d;
}

export async function listPreviewContacts(): Promise<PreviewContact[]> {
  return clone(mock.previewContacts);
}

export async function getSendChecks(): Promise<SendCheck[]> {
  return clone(mock.sendChecks);
}

export async function listLeadLists(): Promise<LeadList[]> {
  return clone(mock.leadLists);
}

export async function listLeads(_listId: string): Promise<Lead[]> {
  return clone(mock.leads);
}

export async function getVerificationSummary(listId: string): Promise<VerificationSummary> {
  const known = mock.verification[listId];
  if (known) return clone(known);
  // Synthesize plausible numbers for lists without hand-written mocks.
  const list = mock.leadLists.find((l) => l.id === listId) ?? mock.leadLists[0];
  const n = list.count;
  const valid = Math.round(n * 0.8);
  const catchAllVerified = Math.round(n * 0.08);
  const risky = Math.round(n * 0.05);
  const invalid = Math.round(n * 0.05);
  const duplicate = n - valid - catchAllVerified - risky - invalid;
  return {
    listId,
    listName: list.name,
    meta: `${list.isLive ? "Live list" : "CSV import"} · ${n.toLocaleString("en-US")} leads · ${list.meta}`,
    valid,
    catchAllVerified,
    risky,
    invalid,
    duplicate,
    readyToSend: valid + catchAllVerified,
  };
}

export type ReplyFilter = "needs_you" | Intent | "handled";

export async function listReplies(): Promise<Reply[]> {
  return clone(mock.replies);
}

export async function listDomains(): Promise<Domain[]> {
  return clone(mock.domains);
}

export async function listMailboxes(): Promise<Mailbox[]> {
  return clone(mock.mailboxes);
}

export async function getSettings(): Promise<MailSettings> {
  return clone(mock.settings);
}

/* ---------- Writes (stubs) ---------- */

export async function saveStep(_campaignId: string, _stepId: string, _variant: { id: string; subject: string; body: string }) {
  await wait();
  return { ok: true as const };
}

export async function sendTest(_campaignId: string) {
  await wait();
  return { ok: true as const };
}

export async function sendReply(_replyId: string, _body: string, _slot?: string) {
  await wait();
  return { ok: true as const };
}

export async function markNotInterested(_replyId: string) {
  await wait();
  return { ok: true as const };
}

export async function removeInvalidAndDuplicates(_listId: string) {
  await wait();
  return { ok: true as const };
}

export async function recheckDomain(_domainId: string) {
  await wait(900);
  return { ok: false as const, message: "Record not found yet. DNS changes can take up to an hour." };
}

export async function updateSettings(_patch: Partial<MailSettings>) {
  await wait();
  return { ok: true as const };
}

export interface LaunchCampaignInput {
  campaignId: string;
  audienceListId: string;
  mailboxIds: string[];
  perMailboxDaily: number;
  sendInContactTimezone: boolean;
}

export async function launchCampaign(_input: LaunchCampaignInput) {
  await wait(900);
  return { ok: true as const, status: "running" as const };
}
