// Outreach — response shapes, taken from the devs' "Email Outreach — Interface reference" (23 Sep 2026).
// Field names are this frontend's best reading of that document. Anything marked CONFIRM
// is not spelled out there; check it against the real responses before wiring live.

/* ---------- Every page ---------- */

export type Permission = "view" | "build" | "approve" | "launch" | "manage_mailboxes";

/** GET outreach/status — every button is shown or hidden from this answer. */
export interface OutreachStatus {
  enabled: boolean;
  role: string;
  can: Record<Permission, boolean>;
  /** CONFIRM: how the Outreach health page decides who may see it. */
  operator: boolean;
  workspace_name: string;
  user_name: string;
}

/** GET outreach/inbox?count_only=true */
export interface InboxCount {
  count: number;
}

export interface MailOverview {
  sent_30d: number; sent_delta_pct: number; delivered_rate: number; reply_rate: number;
  replies: number; positive_replies: number; meetings: number; meetings_this_week: number;
  sending_today: { used: number; capacity: number; capacity_after_warmup: number };
  needs_attention: { id: string; text: string; href: string }[];
  waiting: { replies: number; drafts: number };
}

export type Verification = "valid" | "catch_all_verified" | "risky" | "invalid" | "duplicate";
export interface LeadList {
  id: string; name: string; source: "signal" | "clickrabbit" | "csv"; is_live: boolean; meta: string; count: number;
  verification: Record<Verification, number> & { ready_to_send: number };
}
export interface ListLead {
  id: string; name: string; company: string | null; email: string; email_type: "business" | "personal";
  verification: Verification; reason: string; last_activity: string;
}
export interface Domain {
  id: string; name: string; origin: "own" | "managed"; connected_at: string; mailboxes: number;
  status: "healthy" | "warming" | "needs_fix"; warmup_day: number | null;
  spf: boolean; dkim: boolean; dmarc: boolean; reputation: "good" | "building" | "poor";
  daily_limit: number; daily_limit_after_warmup: number | null;
  fix: { record: string; type: string; host: string; value: string } | null;
}
export interface Pipeline {
  goal: { label: string; target: number; current: number };
  open_value_monthly: number; won_value_monthly: number; won_count: number; assignees: string[];
  stages: { key: string; name: string; count: number; value_monthly: number;
    deals: { id: string; company: string; person: string; owner_initials: string; value_label: string;
      source: "email" | "reply"; next_step: string }[] }[];
}

/* ---------- Campaigns ---------- */

export type CampaignStatus = "draft" | "running" | "paused" | "completed" | "archived";

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  sender_profile_name: string | null;
  enrolled: number;
  sent: number;
  replies: number;
  /** 0–1 */
  reply_rate: number | null;
}

export type BuildMode = "manual" | "ai";
export type Region = "us" | "us_ca" | "anywhere";

export interface AudienceFilter {
  /** CONFIRM: the filter fields the backend supports. */
  source: "all_leads" | "signal_visitors";
  visited_page: string;
  min_visits: number;
  email_type: "business" | "any";
}

export interface LintIssue {
  text: string;
  where?: "subject" | "body";
}

export interface LintReport {
  problems: LintIssue[];
  suggestions: LintIssue[];
  figures: {
    sentence_variety: string;
    reading_grade: number;
    contractions: number;
    adjectives_per_sentence: number;
    questions: number;
    paragraphs: number;
  };
  word_count: number;
  /** [min, max] — first emails 40–90, follow-ups 20–60 */
  word_target: [number, number];
}

export interface Step {
  n: number;
  subject: string;
  body: string;
  approved: boolean;
  /** Problems that were flagged when a person approved anyway. */
  approved_over: string[];
  lint: LintReport | null;
  sent: number;
  reached: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  build_mode: BuildMode | null;
  brief: { offer: string; proof: string; ask: string };
  steps: Step[];
  audience: { filter: AudienceFilter; region: Region; region_reason: string };
  schedule: {
    sender_profile_id: string | null;
    /** 0 = Monday … 6 = Sunday */
    days: number[];
    window: { start: string; end: string };
  };
  checklist: ChecklistItem[];
  daily_capacity: number;
  ready_mailboxes: number;
  enrolled_count: number;
}

export interface AudiencePreview {
  matched: number;
  will_enroll: number;
  held_back: { reason: string; count: number }[];
}

export interface Candidate {
  id: string;
  name: string;
  company: string | null;
  email: string;
  email_type: "business" | "personal";
  /** null when eligible */
  held_back_reason: string | null;
  already_enrolled: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type EnrollmentStatus = "active" | "replied" | "finished" | "bounced" | "unsubscribed" | "paused";

export interface Enrollment {
  contact_ref: string;
  timezone: string;
  lead_id: string;
  name: string;
  email: string;
  status: EnrollmentStatus;
  step: number;
  next_due: string | null;
}

export interface DraftCandidate {
  subject: string;
  body: string;
  lint: LintReport;
  score: number;
}

export interface EmailPreview {
  from: string;
  to: string;
  subject: string;
  body: string;
  footer: string;
}

/* ---------- Mailboxes ---------- */

export type MailboxStatus = "provisioning" | "verifying" | "warming" | "ready" | "paused" | "burnt";
export type MailboxKind = "managed" | "google" | "microsoft" | "imported";

export interface Mailbox {
  id: string;
  address: string;
  kind: MailboxKind;
  status: MailboxStatus;
  warmup: { day: number; per_day_now: number; per_day_target: number } | null;
  health: "good" | "watch" | "poor";
  /** Why a mailbox is paused, if it is. */
  note?: string;
}

export interface PendingDomain {
  id: string;
  domain: string;
  records: { type: string; host: string; value: string; seen: boolean }[];
}

export interface MailboxesResponse {
  mailboxes: Mailbox[];
  domains_pending: PendingDomain[];
  limits: { max_mailboxes: number; per_mailbox_daily: number };
}

export interface ImportRow {
  address: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
}

/* ---------- Approval inbox & Inbox ---------- */

export type Classification =
  | "meeting"
  | "interested"
  | "question"
  | "objection"
  | "not_now"
  | "not_interested"
  | "out_of_office"
  | "unsubscribe";

export interface Message {
  id: string;
  direction: "out" | "in";
  from: string;
  at: string;
  subject: string;
  body: string;
}

export interface InboxBundle {
  thread_id: string;
  contact_ref: string;
  timezone: string;
  /** null when no draft was written — act on the reply id instead. */
  proposal_id: string | null;
  campaign_name: string;
  reply: {
    id: string;
    thread_id: string;
    from_name: string;
    from_email: string;
    company: string | null;
    received_at: string;
    classification: Classification;
    first_line: string;
  };
  thread: Message[];
  draft: { subject: string; body: string; lint: LintReport } | null;
}

export interface ReplyRow {
  id: string;
  thread_id: string;
  contact_ref: string;
  timezone: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  classification: Classification;
  received_at: string;
  starred: boolean;
  campaign_name: string;
  thread: Message[];
}

export interface MessageInput {
  subject: string;
  body: string;
  /** UTC instant, displayed and selected in the recipient's IANA timezone. */
  send_at?: string;
}

export interface ScheduledMessage extends MessageInput {
  id: string;
  kind: "reply" | "message";
  thread_id: string;
  contact_ref: string;
  to_name: string;
  to_email: string;
  timezone: string;
  send_at: string;
  campaign_name: string;
}

export interface MessageResult {
  status: "sent" | "scheduled";
  thread_id: string;
  thread: Message[];
}

export interface ScheduledPatch {
  id: string;
  subject?: string;
  body?: string;
  send_at?: string;
}

export interface SentRow {
  id: string;
  thread_id: string;
  contact_ref: string;
  timezone: string;
  to: string;
  subject: string;
  snippet: string;
  sent_at: string;
  delivery: "delivered" | "queued" | "bounced" | "failed";
  campaign_name: string;
  thread: Message[];
}

/* ---------- Settings ---------- */

export interface SenderProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  booking_link: string;
  timezone: string;
  postal_address: string;
}

export interface OutreachSettings {
  auto_replies: boolean;
  consented_by: string | null;
  consented_at: string | null;
}

export interface Suppression {
  id: string;
  email: string;
  reason: string;
  scope: "campaign" | "workspace" | "global";
  campaign_name: string | null;
  added_at: string;
}

/* ---------- Health ---------- */

export interface Metrics {
  mode: "live" | "dry_run";
  queues: { name: string; depth: number; oldest_unclaimed_s: number | null }[];
  stale_locks: number;
  workers: { name: string; last_seen_s: number }[];
  mailbox_health: { ready: number; warming: number; paused: number; burnt: number };
  sent_last_hour: number;
  replies_last_hour: number;
}
