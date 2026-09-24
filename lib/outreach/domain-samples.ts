import type { Domain } from "./types";

export const sampleDomains: Domain[] = [
  { id: "d_try", name: "tryhubbly.com", origin: "own", connected_at: "2026-07-12", mailboxes: 3, status: "healthy", warmup_day: null, spf: true, dkim: true, dmarc: true, reputation: "good", daily_limit: 90, daily_limit_after_warmup: null, fix: null },
  { id: "d_hq", name: "hubblyhq.com", origin: "managed", connected_at: "2026-07-18", mailboxes: 3, status: "healthy", warmup_day: null, spf: true, dkim: true, dmarc: true, reputation: "good", daily_limit: 90, daily_limit_after_warmup: null, fix: null },
  { id: "d_get", name: "gethubbly.co", origin: "own", connected_at: "2026-09-01", mailboxes: 3, status: "warming", warmup_day: 23, spf: true, dkim: true, dmarc: false, reputation: "building", daily_limit: 25, daily_limit_after_warmup: 90, fix: { record: "DMARC", type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none; rua=mailto:dmarc@gethubbly.co" } },
  { id: "d_meet", name: "meethubbly.com", origin: "managed", connected_at: "2026-09-15", mailboxes: 2, status: "needs_fix", warmup_day: null, spf: true, dkim: true, dmarc: false, reputation: "poor", daily_limit: 0, daily_limit_after_warmup: null, fix: { record: "DMARC", type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none; rua=mailto:dmarc@meethubbly.com" } },
];

sampleDomains.forEach((domain) => {
  domain.records = [
    { record: "SPF", type: "TXT", host: "@", value: "v=spf1 include:_spf.google.com ~all" },
    { record: "DKIM", type: "TXT", host: "mail._domainkey", value: "v=DKIM1; k=rsa; p=SAMPLE_KEY_NOT_FOR_PRODUCTION" },
    { record: "DMARC", type: "TXT", host: "_dmarc", value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain.name}` },
  ];
});
