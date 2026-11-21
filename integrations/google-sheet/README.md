# Google Sheet → KALESH.EXE

A Google Sheet is the inbox for the KALESH DESK. Anything that can append a row (a person, Zapier/Make,
tools like "Instant" or "Muse", or a Claude chat with the Google Sheets connector) can put tweets on the site.
`sync.gs` runs every 5 minutes, sends new rows to the `ingest` Edge Function, and writes the result back.

## Sheet template

Create a sheet with a tab named **`kalesh`** and this header row (or run `setup` and it writes it for you):

| A: links | B: title | C: side | D: tags | E: note | F: status | G: post_id |
|---|---|---|---|---|---|---|
| https://x.com/someone/status/1234567890 | | balaks | bangalore, traffic | | | |
| https://x.com/a/status/111 https://x.com/a/status/112 | Bhai ka 2-part thread | | threads | context line shown above the tweet | | |

- **links** (required): one or more X status links. Several links in one cell are posted as **one thread**, in order.
  A single link that is part of the author's own thread pulls in up to 5 earlier tweets automatically.
- **title** (optional): leave blank and the desk writes a meme headline (`@handle ne phir se kalesh shuru kar diya: "…"`).
- **side** (optional): `balaks` or `bataks` (which gang's column it lands in). Blank picks one.
- **tags** (optional): up to 5, comma separated.
- **note** (optional): context shown above the tweet text.
- **status / post_id**: leave empty. The script fills them: `posted ✅`, `duplicate ♻️` (that tweet is already on the site), or `error: …`.

Rows are published straight away under the **KALESH DESK** profile, and open feeds get them live through Realtime.
To pull a post down: `update public.controversies set status = 'rejected' where id = '<post_id>';`

## Install

1. Deploy the functions and set `KALESH_INGEST_SECRET` (see the main README, "Content pipeline").
2. In the sheet: **Extensions → Apps Script**. Replace `Code.gs` with the contents of `sync.gs` and save.
3. **Project Settings (⚙) → Script properties**, add:
   - `INGEST_URL` = `https://<project-ref>.supabase.co/functions/v1/ingest`
   - `INGEST_SECRET` = the same value you gave `KALESH_INGEST_SECRET`
4. Select `setup` in the function dropdown and click **Run**. Approve the permissions (Sheets + external requests).
   This writes the headers, adds a side dropdown and installs the 5-minute trigger.
5. Reload the sheet. A **KALESH** menu appears with *Sync now* and *Retry errors*.

Keep the secret in Script properties only, never in a cell: anyone with view access to the sheet could read it.
Rotate it with `supabase secrets set KALESH_INGEST_SECRET=...` and update the script property to match.

## Feeding the sheet from automations

Each tool only has to **append a row** with column A filled (B–E optional). Examples:

- **Claude + Google Sheets connector:** "Find today's 5 spiciest Indian tech Twitter fights and append each X link to
  column A of the `kalesh` tab in my KALESH sheet, with a short note in column E. Leave columns F and G empty."
- **Zapier / Make / Instant / Muse:** trigger (RSS, bookmark, Slack message, form…) → action *Google Sheets: Add row* → map the link to `links`.
- **Manual:** paste links into column A.

## Calling ingest directly (no sheet)

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/ingest" \
  -H "content-type: application/json" -H "x-kalesh-secret: $KALESH_INGEST_SECRET" \
  -d '{"rows":[{"links":["https://x.com/someone/status/1234567890"],"side":"bataks","tags":"drama"}]}'
```
