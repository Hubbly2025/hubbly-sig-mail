// Sample-data mode: an in-memory stand-in for the outreach/* endpoints.
// Same paths, same shapes as live. Fictional people and companies.
// Delete nothing here when going live — flip NEXT_PUBLIC_OUTREACH_MOCK=0.

import { lintEmail } from "./lint";
import type {
  AudienceFilter,
  AudiencePreview,
  Campaign,
  CampaignSummary,
  Candidate,
  ChecklistItem,
  Classification,
  DraftCandidate,
  EmailPreview,
  Enrollment,
  ImportRow,
  InboxBundle,
  Mailbox,
  MailboxesResponse,
  Message,
  Metrics,
  OutreachSettings,
  OutreachStatus,
  Page,
  Region,
  ReplyRow,
  SenderProfile,
  SentRow,
  Step,
  Suppression,
} from "./types";

export class MockError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---------- deterministic helpers ---------- */

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
let idc = 1000;
const nid = (p: string) => `${p}_${(idc++).toString(36)}`;
const clone = <T,>(x: T): T => structuredClone(x);

/* ---------- seed data ---------- */

const status: OutreachStatus = {
  enabled: true,
  role: "Owner",
  can: { view: true, build: true, approve: true, launch: true, manage_mailboxes: true },
  operator: true,
  workspace_name: "Hubbly · Internal",
  user_name: "Vince R.",
};

const profiles: SenderProfile[] = [
  {
    id: "sp_vince",
    name: "Vince R.",
    title: "Founder",
    company: "Hubbly",
    booking_link: "https://cal.hubbly.io/vince",
    timezone: "America/Chicago",
    postal_address: "2021 Guadalupe St, Austin, TX 78705",
  },
  {
    id: "sp_paul",
    name: "Paul",
    title: "Head of Sales",
    company: "Hubbly",
    booking_link: "https://cal.hubbly.io/paul",
    timezone: "America/Chicago",
    postal_address: "2021 Guadalupe St, Austin, TX 78705",
  },
];

const defaultFilter: AudienceFilter = { source: "signal_visitors", visited_page: "/pricing", min_visits: 2, email_type: "business" };

function step(n: number, subject: string, body: string, approved: boolean, sent = 0): Step {
  return { n, subject, body, approved, approved_over: [], lint: lintEmail(subject, body, n === 1), sent, reached: sent };
}

const pricingSteps: Step[] = [
  step(
    1,
    "Saw you on our pricing page",
    "Hi {first_name},\n\nSaw {company} took a look at our pricing this week, so I'll keep this short.\n\nHubbly shows you which companies and people visit your site, then follows up with them for you. Teams like yours usually find the visitors who never filled in a form.\n\nWorth a 15-minute look at what it would find on {website}?\n\nVince",
    true,
    2140
  ),
  step(
    2,
    "Re: Saw you on our pricing page",
    "Hi {first_name},\n\nCircling back. Do you know who's visiting {website} right now? Most owners we talk to don't, and those visitors are the warmest leads they have.\n\nHappy to run it and send you what it finds. Worth a look?\n\nVince",
    true,
    1480
  ),
  step(3, "Closing the loop", "Hi {first_name},\n\nI'll stop here. If knowing who visits {website} ever becomes a priority, just reply and I'll set it up.\n\nVince", true, 610),
];

function baseCampaign(p: Partial<Campaign> & Pick<Campaign, "id" | "name" | "status">): Campaign {
  return {
    build_mode: "manual",
    brief: {
      offer: "Hubbly identifies the companies and people visiting your website and follows up with them for you.",
      proof: "Signal identifies about 40% of website visitors by name and email.",
      ask: "A 15-minute call to see who visited their site this week.",
    },
    steps: [],
    audience: { filter: { ...defaultFilter }, region: "us", region_reason: "" },
    schedule: { sender_profile_id: "sp_vince", days: [0, 1, 2, 3, 4], window: { start: "09:00", end: "16:00" } },
    checklist: [],
    daily_capacity: 360,
    ready_mailboxes: 8,
    enrolled_count: 0,
    ...p,
  };
}

const campaigns: Campaign[] = [
  baseCampaign({ id: "c_pricing", name: "Pricing-page visitors — 48h follow-up", status: "running", steps: clone(pricingSteps), enrolled_count: 1284 }),
  baseCampaign({
    id: "c_agencies",
    name: "Agencies — partner program",
    status: "running",
    steps: clone(pricingSteps).map((s) => ({ ...s, sent: Math.round(s.sent * 3.9), reached: Math.round(s.reached * 3.9) })),
    audience: { filter: { source: "all_leads", visited_page: "", min_visits: 0, email_type: "business" }, region: "us_ca", region_reason: "" },
    schedule: { sender_profile_id: "sp_paul", days: [0, 1, 2, 3], window: { start: "08:30", end: "11:30" } },
    enrolled_count: 4716,
  }),
  baseCampaign({
    id: "c_print",
    name: "Print houses — referral channel",
    status: "paused",
    steps: clone(pricingSteps).slice(0, 2).map((s) => ({ ...s, sent: Math.round(s.sent / 2.4), reached: Math.round(s.reached / 2.4) })),
    schedule: { sender_profile_id: "sp_paul", days: [1, 2, 3], window: { start: "09:00", end: "12:00" } },
    enrolled_count: 1188,
  }),
  baseCampaign({
    id: "c_returning",
    name: "Returning visitors — no demo booked",
    status: "running",
    steps: clone(pricingSteps).slice(0, 2).map((s) => ({ ...s, sent: Math.round(s.sent / 5.5), reached: Math.round(s.reached / 5.5) })),
    audience: { filter: { source: "signal_visitors", visited_page: "", min_visits: 3, email_type: "business" }, region: "us", region_reason: "" },
    enrolled_count: 388,
  }),
  baseCampaign({ id: "c_reactivation", name: "Q4 reactivation — past trials", status: "draft", build_mode: null, steps: [], schedule: { sender_profile_id: null, days: [0, 1, 2, 3, 4], window: { start: "09:00", end: "16:00" } } }),
  baseCampaign({ id: "c_webinar", name: "Webinar no-shows — August", status: "completed", steps: clone(pricingSteps).slice(0, 2), enrolled_count: 212 }),
  baseCampaign({ id: "c_q2", name: "Q2 home services test", status: "archived", steps: clone(pricingSteps).slice(0, 1), enrolled_count: 600 }),
];

const stats: Record<string, { sent: number; replies: number }> = {
  c_pricing: { sent: 4230, replies: 146 },
  c_agencies: { sent: 16497, replies: 269 },
  c_print: { sent: 1508, replies: 40 },
  c_returning: { sent: 658, replies: 44 },
  c_webinar: { sent: 390, replies: 21 },
  c_q2: { sent: 600, replies: 9 },
};

/* ---- leads (for audience candidates and enrollments) ---- */

const FIRST = ["Dana", "Marcus", "Priya", "Tom", "Lena", "Aaron", "Kim", "Chris", "Jessica", "Ray", "Sam", "Alisha", "Devon", "Morgan", "Jamie", "Derek", "Tanya", "Luis", "Nora", "Omar", "Grace", "Ben", "Carla", "Eli"];
const LAST = ["Ortiz", "Hale", "Nair", "Becker", "Wu", "Tran", "Mendel", "Lowe", "Castillo", "Whitaker", "Grant", "Price", "Ellis", "Cortez", "Hsu", "Brooks", "Moreno", "Patel", "Kim", "Reyes", "Fox", "Ward"];
const CO = ["Brightline Dental", "Northpoint Roofing", "Lumen Studio", "Becker Print Co.", "Peak Plumbing", "Mendel Law Group", "Lowe Realty", "Castillo Auto", "Summit HVAC", "Atlas Windows", "Harbor Fitness", "Crestview Dental", "Lone Star Motors", "Cedar Creek Vet", "Bluebonnet Builders"];

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string;
  email_type: "business" | "personal";
  country: "US" | "CA" | "UK";
  mailbox_ok: boolean;
  in_other: boolean;
  suppressed: boolean;
}

const leads: Lead[] = Array.from({ length: 180 }, (_, i) => {
  const f = pick(FIRST);
  const l = pick(LAST);
  const personal = rand() < 0.18;
  const company = personal ? null : pick(CO);
  const dom = company ? company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 16) + ".com" : pick(["gmail.com", "yahoo.com", "outlook.com"]);
  return {
    id: `lead_${i}`,
    name: `${f} ${l}`,
    company,
    email: `${f.toLowerCase()}${personal ? "." + l.toLowerCase() : ""}@${dom}`,
    email_type: personal ? "personal" : "business",
    country: rand() < 0.86 ? "US" : rand() < 0.6 ? "CA" : "UK",
    mailbox_ok: rand() > 0.05,
    in_other: rand() < 0.07,
    suppressed: rand() < 0.03,
  };
});

function heldReason(ld: Lead, filter: AudienceFilter, region: Region): string | null {
  if (ld.suppressed) return "On the opt-out list";
  if (!ld.mailbox_ok) return "Mailbox doesn't exist";
  if (filter.email_type === "business" && ld.email_type === "personal") return "Personal email address";
  if (region === "us" && ld.country !== "US") return "Outside the region";
  if (region === "us_ca" && ld.country === "UK") return "Outside the region";
  if (ld.in_other) return "Already in another running campaign";
  return null;
}

/** Scale so live-looking numbers come out of a 180-lead sample. */
function scaleFor(filter: AudienceFilter) {
  let s = filter.source === "signal_visitors" ? 9.4 : 26.7;
  if (filter.visited_page) s *= 0.72;
  s *= Math.max(0.25, 1 - filter.min_visits * 0.09);
  return s;
}

const enrolledSets: Record<string, Set<string>> = {};

/* ---- mailboxes ---- */

function mb(address: string, kind: Mailbox["kind"], st: Mailbox["status"], day = 0, note?: string): Mailbox {
  const ramp = day >= 35 ? 30 : day >= 28 ? 20 : day >= 21 ? 10 : day >= 14 ? 5 : 0;
  return {
    id: nid("mb"),
    address,
    kind,
    status: st,
    warmup: st === "warming" ? { day, per_day_now: ramp, per_day_target: 30 } : st === "ready" ? { day: 35, per_day_now: 30, per_day_target: 30 } : null,
    health: st === "paused" ? "watch" : st === "burnt" ? "poor" : "good",
    note,
  };
}

const mailboxes: Mailbox[] = [
  mb("vince@hubblyhq.com", "managed", "ready"),
  mb("paul@hubblyhq.com", "managed", "ready"),
  mb("team@hubblyhq.com", "managed", "ready"),
  mb("hello@hubblyhq.com", "managed", "ready"),
  mb("vince@tryhubbly.com", "google", "ready"),
  mb("paul@tryhubbly.com", "google", "ready"),
  mb("team@tryhubbly.com", "google", "ready"),
  mb("hi@tryhubbly.com", "google", "paused", 35, "Bounce rate above 3% yesterday — resting for 48 hours"),
  mb("vince@gethubbly.co", "imported", "warming", 23),
  mb("paul@gethubbly.co", "imported", "warming", 23),
  mb("team@gethubbly.co", "imported", "warming", 16),
  mb("old@hubblymail.net", "imported", "burnt", 0, "Retired after repeated spam-trap hits"),
];

const pendingDomains: MailboxesResponse["domains_pending"] = [
  {
    id: "dom_meet",
    domain: "meethubbly.com",
    records: [
      { type: "MX", host: "@", value: "mx.meethubbly.com (priority 10)", seen: true },
      { type: "TXT", host: "@", value: "v=spf1 include:_spf.meethubbly.com ~all", seen: true },
      { type: "TXT", host: "mail._domainkey", value: "v=DKIM1; k=rsa; p=MIIBIjANBg…", seen: true },
      { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none; rua=mailto:dmarc@meethubbly.com", seen: false },
    ],
  },
];

const limits = { max_mailboxes: 20, per_mailbox_daily: 30 };
const provisioningStartedAt = new Map<string, number>();

/* ---- inbox ---- */

function msg(direction: "out" | "in", from: string, at: string, subject: string, body: string): Message {
  return { id: nid("m"), direction, from, at, subject, body };
}

const outFirst = (name: string, site: string) =>
  `Hi ${name},\n\nYou've been on our pricing page a few times, so I'm guessing you're comparing options. Do you know who's visiting ${site} right now?\n\nHappy to run Hubbly on it and show you. Worth 15 minutes this week?\n\nVince`;

function bundle(
  name: string,
  email: string,
  company: string | null,
  cls: Classification,
  received: string,
  reply: string,
  draft: string | null,
  campaign = "Pricing-page visitors — 48h follow-up"
): InboxBundle {
  const site = email.split("@")[1];
  const subject = "Re: Saw you on our pricing page";
  return {
    proposal_id: draft ? nid("prop") : null,
    campaign_name: campaign,
    reply: { id: nid("rep"), from_name: name, from_email: email, company, received_at: received, classification: cls, first_line: reply.split("\n")[0] },
    thread: [msg("out", "Vince R. <vince@tryhubbly.com>", "Mon, Sep 21 · 9:12 AM", "Saw you on our pricing page", outFirst(name.split(" ")[0], site)), msg("in", `${name} <${email}>`, received, subject, reply)],
    draft: draft ? { subject, body: draft, lint: lintEmail(subject, draft, false) } : null,
  };
}

let inbox: InboxBundle[] = [
  bundle(
    "Marcus Hale",
    "marcus@northpointroofing.com",
    "Northpoint Roofing",
    "meeting",
    "12 min ago",
    "Yes — Thursday afternoon works. Can you show it on our site? We get a lot of traffic in storm season and have no idea who any of it is.\n\nMarcus",
    "Hi Marcus,\n\nThursday works. I'll run it live on northpointroofing.com so you can see who's been visiting during storm season.\n\nDoes 2:00 or 3:30 PM Central suit you better? You can also grab a time here: https://cal.hubbly.io/vince\n\nVince"
  ),
  bundle(
    "Priya Nair",
    "priya@lumenstudio.co",
    "Lumen Studio",
    "question",
    "38 min ago",
    "What does pricing look like for an agency with 9 clients? Most are local service businesses.\n\nPriya",
    "Hi Priya,\n\nFor nine clients the partner plan fits best, and each client gets its own workspace.\n\nWant me to send the breakdown along with a sample report from one of your clients' sites? Which one should I run it on?\n\nPaul",
    "Agencies — partner program"
  ),
  bundle(
    "Tom Becker",
    "tom@beckerprint.com",
    "Becker Print Co.",
    "interested",
    "1 hr ago",
    "We mail about 40k postcards a month. Would this plug into that?\n\nTom",
    "Hi Tom,\n\nIt does. Print houses use Hubbly to hand their customers the people who visited their site, ready to mail.\n\nWould a 15-minute walkthrough this week help?\n\nPaul",
    "Print houses — referral channel"
  ),
  bundle(
    "Devon Price",
    "devon@atlaswindows.com",
    "Atlas Windows",
    "interested",
    "2 hr ago",
    "Can you send over a sample of what you'd find for us?\n\nDevon",
    null
  ),
  bundle(
    "Alisha Grant",
    "alisha@harborfitness.com",
    "Harbor Fitness",
    "not_now",
    "4 hr ago",
    "Circle back in January — we're in the middle of a rebrand.\n\nAlisha",
    "Hi Alisha,\n\nWill do. Good luck with the rebrand. I'll check in the second week of January.\n\nVince",
    "Agencies — partner program"
  ),
  bundle(
    "Sam Whitaker",
    "sam@summithvac.com",
    "Summit HVAC",
    "objection",
    "Yesterday",
    "We already use a lead-gen agency. Why would we need this?\n\nSam",
    "Hi Sam,\n\nFair question. Your agency brings people to the site; Hubbly tells you who they were when they left without calling.\n\nWorth a quick look side by side with what the agency reports?\n\nVince",
    "Returning visitors — no demo booked"
  ),
];

const CLS: Classification[] = ["meeting", "interested", "question", "objection", "not_now", "not_interested", "out_of_office", "unsubscribe"];

let replies: ReplyRow[] = [
  ...inbox.map((b) => ({
    id: b.reply.id,
    from_name: b.reply.from_name,
    from_email: b.reply.from_email,
    subject: b.thread[1].subject,
    snippet: b.reply.first_line,
    classification: b.reply.classification,
    received_at: b.reply.received_at,
    starred: false,
    campaign_name: b.campaign_name,
    thread: b.thread,
  })),
  ...Array.from({ length: 14 }, (_, i) => {
    const f = pick(FIRST);
    const l = pick(LAST);
    const co = pick(CO);
    const cls = CLS[(i + 3) % CLS.length];
    const text =
      cls === "out_of_office"
        ? "I'm out of the office until Monday, Sep 28, with limited access to email."
        : cls === "unsubscribe"
        ? "Please remove me from your list."
        : cls === "not_interested"
        ? "Not interested, thanks."
        : cls === "meeting"
        ? "Sure, send me a couple of times next week."
        : cls === "question"
        ? "Does this work with WordPress sites?"
        : cls === "objection"
        ? "Sounds expensive for a shop our size."
        : cls === "not_now"
        ? "Maybe next quarter."
        : "Interesting — tell me more.";
    const email = `${f.toLowerCase()}@${co.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.com`;
    const when = `${i + 1} day${i ? "s" : ""} ago`;
    return {
      id: nid("rep"),
      from_name: `${f} ${l}`,
      from_email: email,
      subject: "Re: Saw you on our pricing page",
      snippet: text,
      classification: cls,
      received_at: when,
      starred: i === 2,
      campaign_name: pick(["Pricing-page visitors — 48h follow-up", "Agencies — partner program", "Returning visitors — no demo booked"]),
      thread: [msg("out", "Vince R. <vince@tryhubbly.com>", when, "Saw you on our pricing page", outFirst(f, email.split("@")[1])), msg("in", `${f} ${l} <${email}>`, when, "Re: Saw you on our pricing page", text)],
    } satisfies ReplyRow;
  }),
];

const sent: SentRow[] = Array.from({ length: 40 }, (_, i) => {
  const f = pick(FIRST);
  const co = pick(CO);
  const email = `${f.toLowerCase()}@${co.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.com`;
  const s = i % 3 === 0 ? pricingSteps[1] : pricingSteps[0];
  const body = s.body.replace(/\{first_name\}/g, f).replace(/\{company\}/g, co).replace(/\{website\}/g, email.split("@")[1]);
  return {
    id: nid("snt"),
    to: `${f} <${email}>`,
    subject: s.subject,
    snippet: body.split("\n").filter(Boolean)[1] ?? "",
    sent_at: i < 6 ? `${(i + 1) * 7} min ago` : `${Math.ceil(i / 6)} hr ago`,
    delivery: i === 4 ? "bounced" : i === 1 ? "queued" : "delivered",
    campaign_name: pick(["Pricing-page visitors — 48h follow-up", "Agencies — partner program"]),
    thread: [msg("out", "Vince R. <vince@tryhubbly.com>", "", s.subject, body)],
  };
});

/* ---- settings ---- */

const settings: OutreachSettings = { auto_replies: false, consented_by: null, consented_at: null };

let suppression: Suppression[] = [
  { id: nid("sup"), email: "rachel@harborfitness.com", reason: "Asked to be removed", scope: "global", campaign_name: null, added_at: "Sep 22" },
  { id: nid("sup"), email: "brian@sotolandscape.net", reason: "Hard bounce", scope: "global", campaign_name: null, added_at: "Sep 21" },
  { id: nid("sup"), email: "info@lowerealty.com", reason: "Replied not interested", scope: "campaign", campaign_name: "Agencies — partner program", added_at: "Sep 20" },
  { id: nid("sup"), email: "dana@brightlinedental.com", reason: "Became a customer", scope: "workspace", campaign_name: null, added_at: "Sep 18" },
  { id: nid("sup"), email: "legal@mendellaw.com", reason: "Added by hand", scope: "workspace", campaign_name: null, added_at: "Sep 12" },
  { id: nid("sup"), email: "jordan@lonestarmotors.com", reason: "Replied not interested", scope: "campaign", campaign_name: "Pricing-page visitors — 48h follow-up", added_at: "Sep 9" },
];

/* ---------- derived ---------- */

function checklist(c: Campaign): ChecklistItem[] {
  const profile = profiles.find((p) => p.id === c.schedule.sender_profile_id);
  return [
    { key: "audience", label: "Leads enrolled", done: c.enrolled_count > 0 },
    { key: "emails", label: "At least one email written", done: c.steps.length > 0 },
    { key: "approved", label: "Every email approved", done: c.steps.length > 0 && c.steps.every((s) => s.approved) },
    { key: "sender", label: "Sender profile chosen", done: !!profile },
    { key: "address", label: "Sender has a postal address", done: !!profile?.postal_address },
    { key: "schedule", label: "Sending days and hours set", done: c.schedule.days.length > 0 },
    { key: "mailboxes", label: "At least one mailbox ready", done: mailboxes.some((m) => m.status === "ready") },
  ];
}

function full(c: Campaign): Campaign {
  const out = clone(c);
  out.checklist = checklist(c);
  out.ready_mailboxes = mailboxes.filter((m) => m.status === "ready").length;
  out.daily_capacity = out.ready_mailboxes * limits.per_mailbox_daily;
  return out;
}

function summary(c: Campaign): CampaignSummary {
  const st = stats[c.id] ?? { sent: 0, replies: 0 };
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    sender_profile_name: profiles.find((p) => p.id === c.schedule.sender_profile_id)?.name ?? null,
    enrolled: c.enrolled_count,
    sent: st.sent,
    replies: st.replies,
    reply_rate: st.sent ? st.replies / st.sent : null,
  };
}

function preview(filter: AudienceFilter, region: Region): AudiencePreview {
  const k = scaleFor(filter);
  const reasons = new Map<string, number>();
  let ok = 0;
  leads.forEach((ld) => {
    const r = heldReason(ld, filter, region);
    if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1);
    else ok++;
  });
  const held = [...reasons.entries()].map(([reason, n]) => ({ reason, count: Math.round(n * k) })).sort((a, b) => b.count - a.count);
  const will = Math.round(ok * k);
  return { matched: will + held.reduce((a, b) => a + b.count, 0), will_enroll: will, held_back: held };
}

function renderVars(t: string, ld: { name: string; company: string | null; email: string }) {
  const first = ld.name.split(" ")[0];
  return t
    .replace(/\{first_name\}/g, first)
    .replace(/\{company\}/g, ld.company ?? "your team")
    .replace(/\{website\}/g, ld.email.split("@")[1])
    .replace(/\{([^{}|]+)\|[^{}]*\}/g, "$1");
}

function footer(p: SenderProfile | undefined) {
  if (!p) return "Choose a sender profile to see the footer.";
  return `${p.name} · ${p.title}, ${p.company}\n${p.postal_address}\nNot interested? Reply "no thanks" or unsubscribe here and you won't hear from us again.`;
}

function draftsFromBrief(c: Campaign, n: number): DraftCandidate[] {
  const first = n === 1;
  const { offer, ask } = c.brief;
  const shortOffer = offer.replace(/\.$/, "");
  const variants = first
    ? [
        {
          subject: "Question about {company}",
          body: `Hi {first_name},\n\n${shortOffer}. Most owners we talk to have no idea who visits their site and leaves.\n\nWould ${ask.charAt(0).toLowerCase() + ask.slice(1).replace(/\.$/, "")} be worth it?\n\nVince`,
        },
        {
          subject: "Who visited {website} this week",
          body: `Hi {first_name},\n\nQuick one. ${shortOffer}.\n\nI can run it on {website} and send you the list — no call needed unless you want one. Should I?\n\nVince`,
        },
        {
          subject: "An idea for {company}",
          body: `Hi {first_name},\n\nI help owners see the visitors who leave their site without calling. ${shortOffer}, and we handle the follow-up so nobody on your team has to.\n\nOpen to a short call next week to see what it finds?\n\nVince`,
        },
      ]
    : [
        { subject: "Re: Question about {company}", body: "Hi {first_name},\n\nCircling back on this. Happy to run it on {website} and send you what it finds. Want me to?\n\nVince" },
        { subject: "Re: Question about {company}", body: "Hi {first_name},\n\nDid this land at a bad time? One reply and I'll send you the list of who visited {website} this week.\n\nVince" },
        { subject: "Closing the loop", body: "Hi {first_name},\n\nI'll leave it here. If you ever want to see who's visiting {website}, reply and I'll set it up.\n\nVince" },
      ];
  return variants
    .map((v) => {
      const lint = lintEmail(v.subject, v.body, first);
      const score = 100 - lint.problems.length * 20 - lint.suggestions.length * 4 - Math.abs(lint.word_count - (lint.word_target[0] + lint.word_target[1]) / 2) / 3;
      return { ...v, lint, score: Math.round(score) };
    })
    .sort((a, b) => b.score - a.score);
}

/* ---------- router ---------- */

function need(id: string) {
  const c = campaigns.find((x) => x.id === id);
  if (!c) throw new MockError(404, "This campaign no longer exists.");
  return c;
}

function tickMailboxes() {
  const now = Date.now();
  mailboxes.forEach((m) => {
    const t0 = provisioningStartedAt.get(m.id);
    if (!t0) return;
    const age = (now - t0) / 1000;
    if (m.status === "provisioning" && age > 20) m.status = "verifying";
    if (m.status === "verifying" && age > 45) {
      m.status = "warming";
      m.warmup = { day: 1, per_day_now: 0, per_day_target: 30 };
      provisioningStartedAt.delete(m.id);
    }
  });
}

export async function handleMock(method: string, rawPath: string, body?: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
  const [pathOnly, qs] = rawPath.split("?");
  const q = new URLSearchParams(qs ?? "");
  const path = pathOnly.replace(/^\/?outreach\//, "");
  const seg = path.split("/");
  const b = (body ?? {}) as Record<string, any>;
  const M = method.toUpperCase();

  // every page
  if (M === "GET" && path === "status") return clone(status);

  // approval inbox
  if (seg[0] === "inbox") {
    if (M === "GET" && seg.length === 1) return q.get("count_only") === "true" ? { count: inbox.length } : clone(inbox);
    if (M === "POST" && seg[1] === "replies") {
      const rid = seg[2];
      const i = inbox.findIndex((x) => x.reply.id === rid);
      if (i < 0) throw new MockError(404, "That reply has already been handled.");
      if (seg[3] === "dismiss") {
        inbox.splice(i, 1);
        return { ok: true };
      }
      if (seg[3] === "draft") {
        const bx = inbox[i];
        const first = bx.reply.from_name.split(" ")[0];
        const subject = bx.thread[bx.thread.length - 1].subject;
        const text = `Hi ${first},\n\nHappy to. I'll run Hubbly on ${bx.reply.from_email.split("@")[1]} for 48 hours and send you the companies and people who visited.\n\nAnything in particular you want me to look for?\n\nVince`;
        bx.proposal_id = nid("prop");
        bx.draft = { subject, body: text, lint: lintEmail(subject, text, false) };
        return clone(bx);
      }
    }
    if (M === "POST") {
      const pid = seg[1];
      const i = inbox.findIndex((x) => x.proposal_id === pid);
      if (i < 0) throw new MockError(404, "That reply has already been handled.");
      const bx = inbox[i];
      if (seg[2] === "send") {
        const text = String(b.body ?? bx.draft?.body ?? "");
        const lint = lintEmail(String(b.subject ?? bx.draft?.subject ?? ""), text, false);
        if (lint.problems.some((p) => /variable is unfinished/.test(p.text))) throw new MockError(422, "The reply has an unfinished variable. Fix it and send again.");
        inbox.splice(i, 1);
        return { ok: true, sent_from: "vince@tryhubbly.com" };
      }
      if (seg[2] === "dismiss") {
        inbox.splice(i, 1);
        return { ok: true };
      }
      if (seg[2] === "not-interested") {
        inbox.splice(i, 1);
        suppression.unshift({ id: nid("sup"), email: bx.reply.from_email, reason: "Replied not interested", scope: "campaign", campaign_name: bx.campaign_name, added_at: "Today" });
        return { ok: true };
      }
    }
  }

  // lint
  if (M === "POST" && path === "lint") return lintEmail(String(b.subject ?? ""), String(b.body ?? ""), !!b.first);

  // campaigns
  if (seg[0] === "campaigns") {
    if (seg.length === 1) {
      if (M === "GET") return campaigns.map(summary);
      if (M === "POST") {
        const name = String(b.name ?? "").trim();
        if (!name) throw new MockError(422, "Give the campaign a name.");
        const c = baseCampaign({ id: nid("c"), name, status: "draft", build_mode: null, steps: [], schedule: { sender_profile_id: null, days: [0, 1, 2, 3, 4], window: { start: "09:00", end: "16:00" } } });
        campaigns.unshift(c);
        return summary(c);
      }
    }
    const c = need(seg[1]);
    if (seg.length === 2) {
      if (M === "GET") return full(c);
      if (M === "PATCH") {
        if (b.name !== undefined) c.name = b.name;
        if (b.build_mode !== undefined) c.build_mode = b.build_mode;
        if (b.audience) c.audience = { ...c.audience, ...b.audience, filter: { ...c.audience.filter, ...(b.audience.filter ?? {}) } };
        if (b.schedule) c.schedule = { ...c.schedule, ...b.schedule, window: { ...c.schedule.window, ...(b.schedule.window ?? {}) } };
        if (b.brief) c.brief = { ...c.brief, ...b.brief };
        return full(c);
      }
    }
    const action = seg[2];
    if (M === "POST" && ["launch", "pause", "resume", "archive"].includes(action)) {
      if (action === "launch") {
        const missing = checklist(c).filter((x) => !x.done);
        if (missing.length) throw new MockError(409, `Can't launch yet: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`);
        c.status = "running";
      }
      if (action === "pause") c.status = "paused";
      if (action === "resume") c.status = "running";
      if (action === "archive") c.status = "archived";
      return full(c);
    }
    if (action === "audience") {
      const filter: AudienceFilter = { ...c.audience.filter, ...(b.filter ?? {}) };
      const region: Region = b.region ?? c.audience.region;
      if (seg[3] === "preview") return preview(filter, region);
      if (seg[3] === "candidates") {
        const page = Number(b.page ?? 1);
        const size = 12;
        const set = enrolledSets[c.id] ?? new Set();
        const all: Candidate[] = leads.map((ld) => ({
          id: ld.id,
          name: ld.name,
          company: ld.company,
          email: ld.email,
          email_type: ld.email_type,
          held_back_reason: heldReason(ld, filter, region),
          already_enrolled: set.has(ld.id),
        }));
        return { items: all.slice((page - 1) * size, page * size), total: all.length, page, page_size: size } satisfies Page<Candidate>;
      }
    }
    if (M === "POST" && action === "enroll") {
      const filter = c.audience.filter;
      const region = c.audience.region;
      const set = (enrolledSets[c.id] ??= new Set());
      let ids: string[] = b.all ? leads.filter((l) => !heldReason(l, filter, region)).map((l) => l.id) : (b.lead_ids ?? []);
      ids = ids.filter((id) => {
        const ld = leads.find((l) => l.id === id);
        return ld && !heldReason(ld, filter, region) && !set.has(id);
      });
      ids.forEach((id) => set.add(id));
      const added = b.all ? preview(filter, region).will_enroll : ids.length;
      c.enrolled_count += added;
      return { enrolled: added, total: c.enrolled_count };
    }
    if (action === "enrollments") {
      if (M === "DELETE") {
        const sentAny = (stats[c.id]?.sent ?? 0) > 0;
        const kept = sentAny ? Math.round(c.enrolled_count * 0.8) : 0;
        const removed = c.enrolled_count - kept;
        c.enrolled_count = kept;
        enrolledSets[c.id]?.clear();
        return { removed, kept };
      }
      if (M === "GET") {
        const page = Number(q.get("page") ?? 1);
        const size = 12;
        const total = c.enrolled_count;
        const statuses: Enrollment["status"][] = ["active", "active", "active", "replied", "finished", "active", "bounced", "unsubscribed"];
        const items: Enrollment[] = Array.from({ length: Math.min(size, Math.max(0, total - (page - 1) * size)) }, (_, i) => {
          const ld = leads[((page - 1) * size + i) % leads.length];
          const st = statuses[((page - 1) * size + i) % statuses.length];
          const stp = st === "finished" ? c.steps.length : Math.min(c.steps.length, 1 + (((page - 1) * size + i) % Math.max(1, c.steps.length)));
          return { lead_id: ld.id, name: ld.name, email: ld.email, status: c.status === "paused" && st === "active" ? "paused" : st, step: stp, next_due: st === "active" ? pick(["Today 2:10 PM", "Tomorrow 9:40 AM", "Fri 10:15 AM", "Mon 9:05 AM"]) : null };
        });
        return { items, total, page, page_size: size } satisfies Page<Enrollment>;
      }
    }
    if (M === "POST" && action === "brief") {
      const d = String(b.description ?? "").trim();
      if (!d) throw new MockError(422, "Describe the campaign first.");
      // Sample mode only: a canned reading of the description. The real writer lives on the backend.
      const partner = /agenc|partner|resell/i.test(d);
      c.brief = {
        offer: partner
          ? "Agencies resell Hubbly to their clients and keep a share of every plan."
          : "Hubbly shows you the companies and people who visit your website, then follows up with them for you.",
        proof: (d.match(/[^.]*\d+%?[^.]*\./) ?? [])[0]?.trim() ?? "Signal identifies about 40% of website visitors by name and email.",
        ask: /call|demo|meet/i.test(d) ? "A 15-minute call this week." : partner ? "A reply asking for the partner pricing sheet." : "A reply saying they'd like to see the list.",
      };
      return clone(c.brief);
    }
    if (action === "steps") {
      const n = Number(seg[3]);
      const idx = c.steps.findIndex((s) => s.n === n);
      const sub = seg[4];
      if (M === "PUT" && !sub) {
        const subject = String(b.subject ?? "");
        const text = String(b.body ?? "");
        if (idx < 0) {
          if (n !== c.steps.length + 1 || n > 4) throw new MockError(422, "A campaign can have up to four emails.");
          c.steps.push({ n, subject, body: text, approved: false, approved_over: [], lint: lintEmail(subject, text, n === 1), sent: 0, reached: 0 });
        } else {
          const s = c.steps[idx];
          const changed = s.subject !== subject || s.body !== text;
          s.subject = subject;
          s.body = text;
          s.lint = lintEmail(subject, text, n === 1);
          if (changed) {
            s.approved = false;
            s.approved_over = [];
          }
        }
        return full(c);
      }
      if (idx < 0) throw new MockError(404, "That email no longer exists.");
      const s = c.steps[idx];
      if (M === "POST" && sub === "draft") return { candidates: draftsFromBrief(c, n) };
      if (M === "POST" && sub === "approve") {
        s.lint = lintEmail(s.subject, s.body, n === 1);
        s.approved = true;
        s.approved_over = s.lint.problems.map((p) => p.text);
        return full(c);
      }
      if (M === "DELETE" && !sub) {
        if (s.sent > 0 || s.reached > 0) throw new MockError(409, "This email has already been sent or reached by leads, so it can't be removed.");
        c.steps.splice(idx, 1);
        c.steps.forEach((x, i) => (x.n = i + 1));
        return full(c);
      }
      if (M === "POST" && sub === "preview") {
        const p = profiles.find((x) => x.id === c.schedule.sender_profile_id);
        const ld = leads.find((l) => !heldReason(l, c.audience.filter, c.audience.region))!;
        return {
          from: p ? `${p.name} <${p.name.split(" ")[0].toLowerCase()}@hubblyhq.com>` : "No sender chosen",
          to: `${ld.name} <${ld.email}>`,
          subject: renderVars(s.subject, ld),
          body: renderVars(s.body, ld),
          footer: footer(p),
        } satisfies EmailPreview;
      }
    }
  }

  // mailboxes
  if (seg[0] === "mailboxes") {
    tickMailboxes();
    if (M === "GET" && seg.length === 1) return { mailboxes: clone(mailboxes), domains_pending: clone(pendingDomains), limits } satisfies MailboxesResponse;
    if (M === "POST" && seg[1] === "managed") {
      const count = Math.max(1, Math.min(Number(b.count ?? 3), limits.max_mailboxes - mailboxes.filter((m) => m.status !== "burnt").length));
      const base = String(b.name ?? "yourbrand").toLowerCase().replace(/[^a-z0-9]/g, "") || "yourbrand";
      const domain = `try${base}.com`;
      const made = ["hello", "team", "hi", "go", "meet"].slice(0, count).map((local) => {
        const m = mb(`${local}@${domain}`, "managed", "provisioning");
        provisioningStartedAt.set(m.id, Date.now());
        mailboxes.unshift(m);
        return m;
      });
      return { created: made.length, domain };
    }
    if (M === "GET" && seg[1] === "connect") return { url: `https://accounts.example/${seg[2]}/oauth?return=/mail/mailboxes` };
    if (M === "POST" && seg[1] === "import") {
      const rows: ImportRow[] = b.rows ?? [];
      const room = limits.max_mailboxes - mailboxes.filter((m) => m.status !== "burnt").length;
      if (rows.length > room) throw new MockError(422, `You have room for ${room} more mailbox${room === 1 ? "" : "es"} on your plan. Untick ${rows.length - room} and try again.`);
      rows.forEach((r) => {
        const m = mb(r.address, "imported", "verifying");
        provisioningStartedAt.set(m.id, Date.now() - 21000);
        mailboxes.unshift(m);
      });
      return { created: rows.length };
    }
    if (seg[1] === "domains" && M === "POST") {
      const d = pendingDomains.find((x) => x.id === seg[2]);
      if (!d) throw new MockError(404, "That domain is no longer waiting on DNS.");
      d.records.forEach((r) => (r.seen = r.seen || rand() < 0.35));
      return clone(d);
    }
    const m = mailboxes.find((x) => x.id === seg[1]);
    if (!m) throw new MockError(404, "That mailbox was removed.");
    if (M === "POST" && seg[2] === "pause") {
      m.status = m.status === "paused" ? "ready" : "paused";
      m.note = m.status === "paused" ? "Paused by you" : undefined;
      return clone(m);
    }
    if (M === "DELETE") {
      mailboxes.splice(mailboxes.indexOf(m), 1);
      return { ok: true };
    }
  }

  // inbox (all mail)
  if (M === "GET" && path === "replies") {
    const term = (q.get("q") ?? "").toLowerCase();
    const cls = q.get("classification");
    const page = Number(q.get("page") ?? 1);
    const size = 15;
    const rows = replies.filter((r) => (!cls || r.classification === cls) && (!term || `${r.from_name} ${r.from_email} ${r.snippet} ${r.campaign_name}`.toLowerCase().includes(term)));
    return { items: clone(rows.slice((page - 1) * size, page * size)), total: rows.length, page, page_size: size } satisfies Page<ReplyRow>;
  }
  if (M === "GET" && path === "sent") {
    const term = (q.get("q") ?? "").toLowerCase();
    const page = Number(q.get("page") ?? 1);
    const size = 15;
    const rows = sent.filter((r) => !term || `${r.to} ${r.subject} ${r.campaign_name}`.toLowerCase().includes(term));
    return { items: clone(rows.slice((page - 1) * size, page * size)), total: rows.length, page, page_size: size } satisfies Page<SentRow>;
  }
  if (seg[0] === "replies" && seg[1]) {
    const r = replies.find((x) => x.id === seg[1]);
    if (!r) throw new MockError(404, "That reply was deleted.");
    if (M === "POST" && seg[2] === "star") {
      r.starred = !r.starred;
      return clone(r);
    }
    if (M === "DELETE") {
      replies = replies.filter((x) => x !== r);
      inbox = inbox.filter((x) => x.reply.id !== r.id);
      return { ok: true };
    }
  }

  // settings
  if (seg[0] === "sender-profiles") {
    if (M === "GET") return clone(profiles);
    const data = b as Partial<SenderProfile>;
    if (!String(data.postal_address ?? (seg[1] ? "x" : "")).trim()) throw new MockError(422, "A postal address is required by law — a profile without one can never send.");
    if (M === "POST") {
      const p: SenderProfile = { id: nid("sp"), name: "", title: "", company: "", booking_link: "", timezone: "America/Chicago", postal_address: "", ...data } as SenderProfile;
      profiles.push(p);
      return clone(p);
    }
    if (M === "PATCH") {
      const p = profiles.find((x) => x.id === seg[1]);
      if (!p) throw new MockError(404, "That profile was removed.");
      if (data.postal_address !== undefined && !data.postal_address.trim()) throw new MockError(422, "A postal address is required by law — a profile without one can never send.");
      Object.assign(p, data);
      return clone(p);
    }
  }
  if (path === "settings") {
    if (M === "GET") return clone(settings);
    if (M === "PATCH") {
      settings.auto_replies = !!b.auto_replies;
      settings.consented_by = b.auto_replies ? status.user_name : null;
      settings.consented_at = b.auto_replies ? new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : null;
      return clone(settings);
    }
  }
  if (seg[0] === "suppression") {
    if (M === "GET") return clone(suppression);
    if (M === "DELETE") {
      suppression = suppression.filter((s) => s.id !== seg[1]);
      return { ok: true };
    }
  }

  // health
  if (M === "GET" && path === "metrics") {
    tickMailboxes();
    const count = (s: Mailbox["status"]) => mailboxes.filter((m) => m.status === s).length;
    return {
      mode: "dry_run",
      queues: [
        { name: "send", depth: 42 + Math.floor(rand() * 20), oldest_unclaimed_s: 14 },
        { name: "check_replies", depth: 3, oldest_unclaimed_s: 2 },
        { name: "draft_reply", depth: inbox.filter((x) => !x.draft).length, oldest_unclaimed_s: inbox.some((x) => !x.draft) ? 2400 : null },
        { name: "warmup", depth: 11, oldest_unclaimed_s: 40 },
        { name: "provision_domain", depth: pendingDomains.length, oldest_unclaimed_s: null },
      ],
      stale_locks: 0,
      workers: [
        { name: "send-1", last_seen_s: 4 },
        { name: "send-2", last_seen_s: 6 },
        { name: "imap-poller", last_seen_s: 12 },
        { name: "writer", last_seen_s: 190 },
      ],
      mailbox_health: { ready: count("ready"), warming: count("warming") + count("provisioning") + count("verifying"), paused: count("paused"), burnt: count("burnt") },
      sent_last_hour: 61,
      replies_last_hour: 4,
    } satisfies Metrics;
  }

  throw new MockError(404, `No sample data for ${M} ${path}`);
}
