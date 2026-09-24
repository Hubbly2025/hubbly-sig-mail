# Hubbly Outreach — web

The Outreach interface, built to the devs' **"Email Outreach — Interface reference" (23 Sep 2026)**. Next.js 15, TypeScript, Tailwind. Served at `/mail` inside Hubbly Signal and ClickRabbit.

It runs in **sample-data mode** by default (an in-browser stand-in for every `outreach/*` endpoint) so every screen works before it's pointed at Signal. A banner in the sidebar says so.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000/mail
npm run build
npm run check:copy   # fails on vendor names or "AI" in UI source
```

| Variable | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_OUTREACH_MOCK` | on | Set to `0` to call the real backend |
| `NEXT_PUBLIC_OUTREACH_API_BASE` | `/api` | Where Signal serves `outreach/*` — confirm with the devs |
| `NEXT_PUBLIC_MAIL_BRAND` | `signal` | `clickrabbit` for ClickRabbit branding |

## Screens (doc section → route)

| Doc | Route |
| --- | --- |
| 6. Approval inbox | `/mail/approvals` — queue, thread, editable draft, rules panel, Send (with confirmation), Dismiss, Not interested, Write a draft, Done with it, J/K/E/Enter |
| 4.1 Campaign list | `/mail/campaigns` — New campaign, "?", search, status tabs counted within search, cards (6) / table (15) |
| 4.2 Build mode question | `/mail/campaigns/[id]` on a draft with no build mode |
| 4.3 Builder | `/mail/campaigns/[id]?step=1…4` — step in the address; autosave; Save and continue |
| 4.4 Hubbly build | `/mail/campaigns/[id]/build` |
| 4.5 Overview | Above the builder; enrolled table once launched |
| 5. Mailboxes | `/mail/mailboxes` — cards, 6 statuses, add (Managed / Connect / Import CSV with review), "?", DNS panels, 30 s refresh |
| 7. Inbox | `/mail/inbox` — Replies / Sent, search, classification filter, slide-in thread, star, delete, 10 s refresh |
| 8. Rules panel | Under every email in the builder and the approval inbox (`POST outreach/lint`) |
| 9. Outreach settings | `/mail/settings` — sender profiles (postal address required), automatic replies with consent screen, footer example, opt-out list by reach |
| 9.6 Outreach health | `/mail/health` — not in the sidebar; operators only |

Every button is shown or hidden from `GET outreach/status`. Every panel has four states: content, skeleton, empty, error with Try again.

## Where things live

- `lib/outreach/types.ts` — response shapes read from the devs' doc. Fields marked **CONFIRM** aren't spelled out there.
- `lib/outreach/client.ts` — the only thing that talks to the backend.
- `lib/outreach/mock.ts` — sample-data mode.
- `lib/outreach/lint.ts` — copy rules for sample mode only; live mode uses the server's `outreach/lint`.
- `components/outreach/` — shell, sidebar, panels, toasts, dialogs, rules panel.
- `components/campaign/` — builder and campaign pieces.

See `CONTRACT_NOTES.md` for what the devs need to confirm before this goes live.
