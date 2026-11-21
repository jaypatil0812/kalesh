// POST /functions/v1/ingest   header  x-kalesh-secret: <KALESH_INGEST_SECRET>
// body: { rows: [{ links: string[] | string, title?, side?, tags?, note?, ref? }] }   (or a single row object)
// Each row = one post (several links = a thread, in the given order). Rows are unfurled, deduped by
// tweet id and published immediately under KALESH DESK. Used by the Google Sheet script and any
// automation that can send an HTTP POST.
// → { results: [{ ref, ok, status: 'published'|'duplicate'|'error', post_id?, error?, title? }] }
import { CORS, errMsg, json, requireSecret } from "../_shared/http.ts";
import { extractLinks, unfurlThread } from "../_shared/tweets.ts";
import { cleanSide, cleanTags, createDeskPost, logIngest, serviceClient } from "../_shared/posts.ts";

type Row = { links?: unknown; title?: unknown; side?: unknown; tags?: unknown; note?: unknown; ref?: unknown };
const MAX_ROWS = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const denied = requireSecret(req);
  if (denied) return denied;

  let body: { rows?: Row[] } & Row;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
  const rows: Row[] = Array.isArray(body.rows) ? body.rows : body.links ? [body] : [];
  if (!rows.length) return json({ error: "Send { rows: [{ links: [...] }] }" }, 400);
  if (rows.length > MAX_ROWS) return json({ error: `Max ${MAX_ROWS} rows per call` }, 413);

  const db = serviceClient();
  const results = [];
  const log: Parameters<typeof logIngest>[1] = [];

  for (const [i, row] of rows.entries()) {
    const ref = row.ref == null ? String(i) : String(row.ref).slice(0, 100);
    const links = extractLinks(row.links);
    if (!links.length) {
      results.push({ ref, ok: false, status: "error", error: "No X status link in this row" });
      log.push({ channel: "sheet", ref, outcome: "skipped", message: "no link", payload: row });
      continue;
    }
    try {
      const tweets = await unfurlThread(links);
      const res = await createDeskPost(db, {
        tweets,
        title: row.title ? String(row.title).slice(0, 200) : null,
        note: row.note ? String(row.note).slice(0, 500) : null,
        side: cleanSide(row.side),
        tags: cleanTags(row.tags),
        status: "published",
        source: "desk",
        sourceRef: `sheet:${ref}`,
      });
      results.push({ ref, ok: true, status: res.status, post_id: res.post_id, tweets: tweets.length });
      log.push({ channel: "sheet", ref, url: tweets[0].url, tweet_id: tweets[0].tweet_id, post_id: res.post_id, outcome: res.status });
    } catch (e) {
      results.push({ ref, ok: false, status: "error", error: errMsg(e) });
      log.push({ channel: "sheet", ref, url: links[0], outcome: "error", message: errMsg(e), payload: row });
    }
  }
  await logIngest(db, log);
  return json({ results });
});
