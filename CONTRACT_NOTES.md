# For the backend devs — confirm before going live

The original screens call the endpoints in your Interface reference; the four additions below propose new endpoints. These are the places where the doc names an endpoint but not the exact request or response fields, so the frontend made a choice. Each one is a one-line answer; wrong guesses are cheap to fix in `lib/outreach/types.ts` and the page that uses it.

## New endpoints the UI needs

These are **new proposals, not endpoints in the original Interface reference**. The four new pages currently use sample data through `lib/outreach/mock.ts`; response types live in `lib/outreach/types.ts`. Confirm ownership, permissions, and exact shapes before switching them to live mode. All calls must remain workspace-scoped on the server.

| Proposed endpoint | Response and use |
| --- | --- |
| `GET outreach/overview` | `MailOverview`: `sent_30d`, `sent_delta_pct`, `delivered_rate`, `reply_rate`, `replies`, `positive_replies`, `meetings`, `meetings_this_week`, `sending_today: { used, capacity, capacity_after_warmup }`, `needs_attention: [{ id, text, href }]`, `waiting: { replies, drafts }`. Rates are 0–1; delta is percent change as displayed (22 means +22%). Last 30 days; confirm timezone and comparison window. |
| `GET outreach/lists` | `LeadList[]`: id, name, source (`signal`, `clickrabbit`, `csv`), is_live, meta, count, verification counts (`valid`, `catch_all_verified`, `risky`, `invalid`, `duplicate`, `ready_to_send`). Ready means valid + verified catch-all. |
| `GET outreach/lists/{id}/leads?page=1` | `Page<ListLead>`: `{ items, total, page, page_size }`. One-based pages. Each lead has id, name, nullable company, email, email_type, verification, reason, last_activity. Demo pagination is 5 rows from 7 sample leads per list, explicitly labeled as a sample of the aggregate list count. Live totals must reflect all actual rows. Confirm timestamp format for last_activity. |
| `GET outreach/domains` | `Domain[]`: id, name, origin, connected_at, mailboxes, status, nullable warmup_day, spf/dkim/dmarc booleans, reputation, daily_limit, nullable daily_limit_after_warmup, nullable `fix: { record, type, host, value }`. A warming domain can also be missing DNS records; fix-needed is derived from the checks, not just status. Confirm the 35-day warmup duration. |
| `GET outreach/pipeline` | `Pipeline`: goal `{ label, target, current }`, open_value_monthly, won_value_monthly, won_count, assignees, stages with key/name/count/value_monthly and deals (id, company, person, owner_initials, value_label, source, next_step). Demo stage counts are aggregate counts with only 2–3 sample cards each. Currency currently displays USD/month; confirm money units and currency. |

### Additional action contracts to confirm

- `POST outreach/domains/{id}/check`: no body; returns refreshed `Domain` on success. The sample handler returns HTTP 422 with `message: "Record not found yet. DNS changes can take up to an hour."` when a record remains missing. The demo never performs a real DNS lookup. Confirm response and failure semantics; require mailbox-management permission server-side.
- `POST outreach/lists/{id}/cleanup`: **demo-only proposal**, no body, returns updated `LeadList`. Removes invalid and duplicate addresses from the in-memory sample and updates counts. No live contract exists; the button is disabled outside sample mode. Confirm deletion semantics, permissions, and audit requirements before enabling it.
- CSV import is a file-picker preview only: no upload, parsing, or persistence. It is disabled outside sample mode; no import endpoint has been invented.
- Pipeline is read-only: cards open `/approvals`; no drag/drop, deal mutations, or goal saves. The Set goals dialog explains this limitation.
- **Pipeline overlaps the CRM. Deals and contacts belong in the OS api-server. Review with the developers before implementing a new Outreach endpoint; prefer a read-only projection of the existing CRM over a second source of truth.**
- Overview uses up to five running/paused campaigns from the existing `outreach/campaigns` response. The unchanged demo roster currently has four matching campaigns; the draft link resolves from that response.

## Transport

1. **Base path.** The browser calls `${NEXT_PUBLIC_OUTREACH_API_BASE}/outreach/...` (default `/api`). What's the real prefix on Signal?
2. **Errors.** The UI shows `message` (or `error`) from a JSON error body in a red toast. Is that the shape?
3. **404 on a deleted campaign.** `GET outreach/campaigns/{id}` returning 404 shows "This campaign no longer exists" with no Try again. Is archived also 404, or 200 with `status: "archived"`? (The UI currently shows archived campaigns normally.)

## Request bodies the doc doesn't spell out

| Endpoint | What the UI sends |
| --- | --- |
| `POST outreach/campaigns` | `{ name }` |
| `PATCH outreach/campaigns/{id}` | Any of `{ name, build_mode, brief: {offer, proof, ask}, audience: { filter, region, region_reason }, schedule: { sender_profile_id, days: [0-6, Mon=0], window: { start: "HH:MM", end: "HH:MM" } } }` — partial objects. **Does PATCH accept `brief` and `build_mode`?** |
| `POST …/audience/preview` | `{ filter, region }` |
| `POST …/audience/candidates` | `{ filter, region, page }` |
| `POST …/enroll` | `{ lead_ids: [...] }` or `{ all: true }` |
| `POST …/brief` | `{ description }` |
| `PUT …/steps/{n}` | `{ subject, body }` — also used to create step n+1 (up to 4) |
| `POST outreach/lint` | `{ subject, body, first }` |
| `POST outreach/inbox/{proposalId}/send` | `{ subject, body }` as edited |
| `POST outreach/mailboxes/managed` | `{ name, count }` |
| `POST outreach/mailboxes/import` | `{ rows: [{ address, smtp_host, smtp_port, imap_host, imap_port }] }` — passwords aren't read from the CSV in the browser. How should credentials travel? |
| `PATCH outreach/settings` | `{ auto_replies, consent_text }` |

## Audience filter fields

The UI offers: source (identified visitors / all leads), visited page, minimum visits, business-only vs any email. What filters does the backend actually support?

## Permissions

`GET outreach/status` is read as `{ enabled, role, can: { view, build, approve, launch, manage_mailboxes }, operator, workspace_name, user_name }`. Who may see **Outreach health**, and who may edit **sender profiles / opt-out list** (the UI uses `launch` for now)?

## Automatic replies

The consent text on the settings screen is a placeholder. The real wording and the limits it describes should come from the backend, and `PATCH outreach/settings` should record the exact text shown.

## Product rulings Vince needs to make (not for the devs to decide)

- The doc's **"Build it with AI"** is labelled **"Build it with Hubbly"** here; product copy never says "AI".
- **Connect Google / Microsoft** mailboxes lets customers cold-email from their own Workspace or 365 tenant. That risks their main domain; the UI warns about it, but it needs a ruling.
- The sidebar page named **Inbox** is kept as written; flagged only because "Inbox" is a retired agent name.
