// Hubbly Mail — frontend ↔ Mail API contract (proposed).
// Backend devs: build the API to return these shapes, or request changes before more screens are built.
// All records are scoped to the caller's workspace_id server-side; the frontend never sends it.

export type Brand = "signal" | "clickrabbit";

export interface Workspace {
  id: string;
  name: string;
  subLabel: string;
  brand: Brand;
  mailEnabled: boolean;
  businessAddress: string;
  user: { name: string; initials: string };
}

export type CampaignStatus = "draft" | "running" | "paused" | "completed";
export type AudienceSource = "signal" | "clickrabbit" | "csv";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  pausedReason?: string;
  audience: { source: AudienceSource; label: string; count: number; excluded: number };
  sent: number;
  /** null = live list with no fixed end */
  total: number | null;
  replyRate: number | null;
  positiveReplies: number;
  meetings: number;
  updatedAt: string;
}

export interface MailSummary {
  sent30d: number;
  sentDeltaPct: number;
  deliveredRate: number;
  replyRate: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  meetingsThisWeek: number;
  sendingToday: { used: number; capacity: number; capacityAfterWarmup: number };
  domains: number;
  mailboxes: number;
  mailboxesWarming: number;
  repliesWaiting: number;
  draftsWaiting: number;
}

export interface StepVariant {
  id: string;
  label: string;
  subject: string;
  body: string;
  weight: number;
}

export interface SequenceStep {
  id: string;
  order: number;
  dayOffset: number;
  /** Wait before this step, in days, counted from the previous step. 0 for the first. */
  waitDays: number;
  sameThread: boolean;
  variants: StepVariant[];
}

export interface CampaignDraft {
  campaign: Campaign;
  steps: SequenceStep[];
  fromLabel: string;
  savedAt: string;
}

export interface PreviewContact {
  id: string;
  name: string;
  company: string;
  email: string;
  vars: Record<string, string>;
}

export interface SendCheck {
  id: string;
  tone: "ok" | "warn";
  label: string;
  detail?: string;
  action?: string;
}

export interface LeadList {
  id: string;
  name: string;
  source: AudienceSource | "discover" | "voice";
  isLive: boolean;
  meta: string;
  count: number;
}

export type Verification = "valid" | "catch_all_verified" | "risky" | "invalid" | "duplicate";

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email: string;
  emailType: "business" | "personal";
  verification: Verification;
  verificationReason: string;
  detailsFound: string;
  lastActivity?: string;
}

export interface VerificationSummary {
  listId: string;
  listName: string;
  meta: string;
  valid: number;
  catchAllVerified: number;
  risky: number;
  invalid: number;
  duplicate: number;
  readyToSend: number;
}

export type Intent = "meeting_request" | "interested" | "not_now" | "out_of_office" | "unsubscribe";

export interface Message {
  id: string;
  direction: "out" | "in";
  from: string;
  sentAt: string;
  body: string;
}

export interface Reply {
  id: string;
  contactName: string;
  initials: string;
  role?: string;
  company?: string;
  location?: string;
  email: string;
  campaignName: string;
  step: number;
  intent: Intent;
  snippet: string;
  receivedAt: string;
  owner: string;
  handledByHubbly: boolean;
  thread: Message[];
  draftReply?: string;
  timeSlots?: string[];
  signalVisits: { path: string; value: string }[];
  crm?: string;
  history: string;
}

export interface Domain {
  id: string;
  name: string;
  origin: "own" | "hubbly";
  connectedAt?: string;
  mailboxes: number;
  status: "healthy" | "warming" | "needs_fix";
  warmupDay?: number;
  warmupTotal?: number;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  reputation: "good" | "building" | "poor";
  dailyLimit: number;
  dailyLimitAfterWarmup?: number;
  fix?: { record: "SPF" | "DKIM" | "DMARC"; type: string; host: string; value: string };
}

export interface Mailbox {
  id: string;
  domainId: string;
  address: string;
  senderName: string;
  sentToday: number;
  dailyLimit: number;
  warmupOn: boolean;
  health: "good" | "watch" | "poor";
}

export interface MailSettings {
  sendInContactTimezone: boolean;
  sendWindows: string;
  perMailboxDaily: number;
  gapMinutes: [number, number];
  matchProvider: boolean;
  plainTextFirst: boolean;
  verifyBeforeSend: boolean;
  pauseOnBouncePct: number;
  pauseOnBounce: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
  trackingDomain: string;
  stopOnReply: true;
  resumeAfterOOO: boolean;
  assignees: string[];
  draftReplies: boolean;
  unsubscribeLine: true;
  businessAddress: string;
  suppressionCount: number;
}
