# Hubbly Mail — web

The Mail frontend, served at `/mail` inside Hubbly Signal and ClickRabbit. Next.js 15 (App Router), TypeScript, Tailwind. Runs entirely on mock data until the Mail API ships.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000/mail
npm run build        # production build
npm run check:copy   # fails on vendor names or "AI" in UI source
```

Set `NEXT_PUBLIC_MAIL_BRAND=clickrabbit` to see the ClickRabbit branding (default is `signal`).

## Screens

| Route | Screen |
| --- | --- |
| `/mail/campaigns` | Campaigns: KPIs, table with filters, needs-attention, sending today |
| `/mail/campaigns/new`, `/mail/campaigns/[id]` | Campaign builder: email steps, variants, variables, spin text, if/else, live preview, send checks |
| `/mail/leads` | Lead lists, verification breakdown, business vs personal email |
| `/mail/replies` | Replies by intent, Hubbly-drafted reply, time slots, Signal visit history |
| `/mail/domains` | Domains, SPF/DKIM/DMARC, warm-up, mailboxes, DNS fix card |
| `/mail/settings` | Schedule, deliverability, tracking, routing, compliance |

If the workspace doesn't have Mail (`mailEnabled: false`), every screen shows the upgrade card instead.

## Where things live

- `lib/mail/types.ts` — **the contract with the backend.** The Mail API returns these shapes.
- `lib/mail/api.ts` — the only module screens import data from. Every function is async and returns mocks today.
- `lib/mail/mock.ts` — sample data (fictional people and companies).
- `lib/mail/render.ts` — preview renderer for `{variables}`, `{spin|text}` and `[if field = "x"]…[else]…[end]`.
- `components/ui-hubbly/` — the Hubbly design system (tokens in `app/globals.css`, `tailwind.config.ts`).

## Wiring the real API

Swap one function in `lib/mail/api.ts` per PR for a real `fetch` to the Mail API. Screens don't change. The browser never calls an email vendor and never holds a vendor key.

## Serving at /mail (multi-zones)

This app has `basePath: "/mail"`. In the Signal (and ClickRabbit) host app's `next.config`, add a rewrite so it serves from the same domain and the login cookie carries over:

```js
async rewrites() {
  return [
    { source: "/mail", destination: "https://<mail-deployment>/mail" },
    { source: "/mail/:path*", destination: "https://<mail-deployment>/mail/:path*" },
  ];
}
```

## Rules

- One screen or concern per PR; someone other than the builder reviews it.
- No `app/api` routes that send email, no vendor SDKs, no `.env` secrets in this repo.
- Never name an email vendor in the UI. Copy says "Hubbly", never "AI".
