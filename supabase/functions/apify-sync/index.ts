// POST /functions/v1/apify-sync   header  x-kalesh-secret: <KALESH_INGEST_SECRET>
//
// Three ways in:
//  1. {} or { start: true }          → (pg_cron) build the actor input from the active watchlist and START an
//                                       Apify run, with an ad-hoc webhook that calls this function back when done.
//  2. Apify webhook payload          → { resource: { id, defaultDatasetId } } from ACTOR.RUN.SUCCEEDED
//                                       (the ad-hoc webhook above, or a webhook on an Apify Schedule/Task).
//  3. { datasetId: "..." }           → manually import an existing dataset.
// Items are deduped by tweet id; tweets with engagement ≥ threshold are published, the rest go to pending.
//
// env: APIFY_TOKEN (required), APIFY_ACTOR_ID (default apidojo~tweet-scraper), APIFY_MIN_ENGAGEMENT (default 500),
//      APIFY_MAX_ITEMS (default 60), APIFY_MAX_PUBLISH (default 10 per run), APIFY_SINCE_HOURS (default 48),
//      APIFY_INPUT_JSON (optional JSON merged into the actor input, for actors with a different input schema).
import { CORS, env, errMsg, json, requireSecret } from "../_shared/http.ts";
import { canonicalURL, engagement, parseTweetURL, type TweetMedia, type TweetSnapshot } from "../_shared/tweets.ts";
import { cleanTags, createDeskPost, existingTweets, logIngest, serviceClient, type Side } from "../_shared/posts.ts";

const APIFY = "https://api.apify.com/v2";
const intEnv = (k: string, d: number) => { const n = Number(Deno.env.get(k)); return Number.isFinite(n) && n >= 0 ? n : d; };
// Actor ids with a slash must use "~" in API URLs (apidojo/tweet-scraper → apidojo~tweet-scraper).
const actorId = () => (Deno.env.get("APIFY_ACTOR_ID") || "apidojo~tweet-scraper").replace("/", "~");

type Watch = { id: string; kind: "account" | "search"; value: string; side: Side | null; tags: string[]; min_engagement: number | null };

// deno-lint-ignore no-explicit-any
type Any = any;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const denied = requireSecret(req);
  if (denied) return denied;

  let body: Any = {};
  try { body = await req.json(); } catch { /* empty body = start a run */ }

  try {
    const db = serviceClient();
    const { data: watch, error } = await db.from("watchlist").select("id,kind,value,side,tags,min_engagement").eq("active", true);
    if (error) throw error;
    const datasetId: string | undefined = body?.resource?.defaultDatasetId ?? body?.datasetId;
    if (datasetId) return json(await importDataset(db, String(datasetId), String(body?.resource?.id ?? datasetId), (watch ?? []) as Watch[]));
    if (body?.eventType && !datasetId) return json({ ignored: body.eventType });
    return json(await startRun(db, req, (watch ?? []) as Watch[]));
  } catch (e) {
    console.error(e);
    return json({ error: errMsg(e) }, 500);
  }
});

function actorInput(watch: Watch[]) {
  const since = new Date(Date.now() - intEnv("APIFY_SINCE_HOURS", 48) * 3600e3).toISOString().slice(0, 10);
  const terms = watch.map((w) => {
    const q = w.kind === "account" ? `from:${w.value.replace(/^@/, "")}` : w.value;
    return /\bsince:/.test(q) ? q : `${q} since:${since}`;
  });
  let extra = {};
  try { extra = JSON.parse(Deno.env.get("APIFY_INPUT_JSON") || "{}"); } catch { /* ignore bad JSON */ }
  // Input shape of apidojo/tweet-scraper; other actors can be adapted with APIFY_INPUT_JSON.
  return { searchTerms: terms, sort: "Latest", maxItems: intEnv("APIFY_MAX_ITEMS", 60), ...extra };
}

async function startRun(db: ReturnType<typeof serviceClient>, req: Request, watch: Watch[]) {
  if (!watch.length) return { started: false, reason: "watchlist is empty — insert rows into public.watchlist" };
  const token = env("APIFY_TOKEN");
  const selfURL = `${env("SUPABASE_URL")}/functions/v1/apify-sync`;
  const webhooks = [{
    eventTypes: ["ACTOR.RUN.SUCCEEDED"],
    requestUrl: selfURL,
    // Apify sends this header back to us, so the callback passes requireSecret().
    headersTemplate: JSON.stringify({ "x-kalesh-secret": req.headers.get("x-kalesh-secret") ?? "" }),
  }];
  const url = `${APIFY}/acts/${actorId()}/runs?webhooks=${encodeURIComponent(btoa(JSON.stringify(webhooks)))}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(actorInput(watch)),
  });
  const out: Any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Apify start failed (${r.status}): ${out?.error?.message ?? "unknown"}`);
  await db.from("watchlist").update({ last_run_at: new Date().toISOString() }).in("id", watch.map((w) => w.id));
  await logIngest(db, [{ channel: "apify", ref: out?.data?.id, outcome: "skipped", message: `run started for ${watch.length} watchlist rows` }]);
  return { started: true, runId: out?.data?.id, actor: actorId() };
}

async function importDataset(db: ReturnType<typeof serviceClient>, datasetId: string, runRef: string, watch: Watch[]) {
  const token = env("APIFY_TOKEN");
  const r = await fetch(`${APIFY}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=1000`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Apify dataset fetch failed (${r.status})`);
  const items: Any[] = await r.json();

  const shots = items.map(toSnapshot).filter((s): s is TweetSnapshot => !!s);
  const unique = [...new Map(shots.map((s) => [s.tweet_id, s])).values()];
  const already = await existingTweets(db, unique.map((s) => s.tweet_id));
  const fresh = unique.filter((s) => !already.has(s.tweet_id)).sort((a, b) => engagement(b.metrics) - engagement(a.metrics));

  const threshold = intEnv("APIFY_MIN_ENGAGEMENT", 500);
  let publishBudget = intEnv("APIFY_MAX_PUBLISH", 10);
  const counts = { items: items.length, tweets: unique.length, duplicates: unique.length - fresh.length, published: 0, pending: 0, errors: 0 };
  const log: Parameters<typeof logIngest>[1] = [];

  for (const s of fresh) {
    const w = matchWatch(s, watch);
    const min = w?.min_engagement ?? threshold;
    const hot = engagement(s.metrics) >= min && publishBudget > 0;
    try {
      const res = await createDeskPost(db, {
        tweets: [s], side: w?.side ?? null, tags: cleanTags(w?.tags ?? []),
        status: hot ? "published" : "pending", source: "apify", sourceRef: `apify:${runRef}`,
      });
      if (res.status === "published") { counts.published++; publishBudget--; }
      else if (res.status === "pending") counts.pending++;
      else counts.duplicates++;
      log.push({ channel: "apify", ref: runRef, url: s.url, tweet_id: s.tweet_id, post_id: res.post_id, outcome: res.status, message: `engagement ${engagement(s.metrics)} / min ${min}` });
    } catch (e) {
      counts.errors++;
      log.push({ channel: "apify", ref: runRef, url: s.url, tweet_id: s.tweet_id, outcome: "error", message: errMsg(e) });
    }
  }
  await logIngest(db, log);
  return { imported: true, datasetId, threshold, ...counts };
}

function matchWatch(s: TweetSnapshot, watch: Watch[]): Watch | undefined {
  const h = (s.author_handle ?? "").toLowerCase();
  const text = s.text.toLowerCase();
  return watch.find((w) => w.kind === "account" && w.value.replace(/^@/, "").toLowerCase() === h)
    ?? watch.find((w) => w.kind === "search" && w.value.toLowerCase().split(/\s+/)
      .filter((t) => t && !t.includes(":") && !t.startsWith("-")).map((t) => t.replace(/["()]/g, ""))
      .some((t) => t.length > 2 && text.includes(t)));
}

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const twimg = (v: unknown) => (typeof v === "string" && /^https:\/\/(pbs|video)\.twimg\.com\//.test(v) ? v : undefined);

/** Normalize one Apify item (apidojo/tweet-scraper shape, with fallbacks for legacy Twitter API field names). */
function toSnapshot(it: Any): TweetSnapshot | null {
  if (!it || it.noResults || (it.type && it.type !== "tweet")) return null;
  if (it.isRetweet || it.retweeted_tweet || it.retweetedTweet) return null;
  const url = String(it.url ?? it.twitterUrl ?? "");
  const parsed = parseTweetURL(url);
  const id = String(it.id ?? it.id_str ?? parsed?.id ?? "");
  if (!/^\d{1,25}$/.test(id)) return null;
  const a = it.author ?? it.user ?? {};
  const handle = String(a.userName ?? a.screen_name ?? parsed?.handle ?? "");
  const h = /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
  const media: TweetMedia[] = [];
  for (const m of (it.extendedEntities?.media ?? it.extended_entities?.media ?? it.media ?? []) as Any[]) {
    if (typeof m !== "object" || !m) continue;
    const thumb = twimg(m.media_url_https);
    if (m.type === "video" || m.type === "animated_gif") {
      const best = ((m.video_info?.variants ?? []) as Any[])
        .filter((v) => v.content_type === "video/mp4" && twimg(v.url))
        .sort((x, y) => (y.bitrate ?? 0) - (x.bitrate ?? 0))[0];
      const src = twimg(best?.url) ?? thumb;
      if (src) media.push({ type: m.type === "video" ? "video" : "gif", url: src, thumb });
    } else if (thumb) {
      media.push({ type: "photo", url: thumb, w: n(m.original_info?.width), h: n(m.original_info?.height) });
    }
  }
  const created = Date.parse(it.createdAt ?? it.created_at ?? "");
  return {
    tweet_id: id,
    url: canonicalURL(id, h),
    author_handle: h,
    author_name: typeof (a.name) === "string" ? a.name.slice(0, 100) : null,
    author_avatar: typeof a.profilePicture === "string" && /^https:\/\/(pbs|abs)\.twimg\.com\//.test(a.profilePicture) ? a.profilePicture
      : typeof a.profile_image_url_https === "string" && /^https:\/\/(pbs|abs)\.twimg\.com\//.test(a.profile_image_url_https) ? a.profile_image_url_https : null,
    text: String(it.fullText ?? it.full_text ?? it.text ?? "").slice(0, 4000),
    media: media.slice(0, 4),
    metrics: {
      likes: n(it.likeCount ?? it.favorite_count), retweets: n(it.retweetCount ?? it.retweet_count),
      replies: n(it.replyCount ?? it.reply_count), quotes: n(it.quoteCount ?? it.quote_count),
      views: n(it.viewCount ?? Number(it.views?.count)), bookmarks: n(it.bookmarkCount ?? it.bookmark_count),
    },
    tweeted_at: Number.isNaN(created) ? null : new Date(created).toISOString(),
    snapshot_source: "apify",
  };
}
