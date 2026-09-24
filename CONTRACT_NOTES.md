# For the backend devs — confirm before going live

The UI calls exactly the endpoints in your Interface reference. These are the places where the doc names an endpoint but not the exact request or response fields, so the frontend made a choice. Each one is a one-line answer; wrong guesses are cheap to fix in `lib/outreach/types.ts` and the page that uses it.

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
