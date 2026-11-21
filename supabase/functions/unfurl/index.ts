// POST /functions/v1/unfurl   { urls: string[] | url: string, post_id?: uuid }
// → { tweets: TweetSnapshot[], saved?: number }
//
// Without post_id: public preview (no DB writes) — used by the submit form to read the tweet text.
// With post_id: the caller must be signed in (Authorization: Bearer <user JWT>) and own that post;
// the snapshots are then stored in post_tweets with the service role (users can't write that table).
import { CORS, errMsg, json } from "../_shared/http.ts";
import { extractLinks, unfurlThread } from "../_shared/tweets.ts";
import { existingTweets, logIngest, serviceClient, snapshotRow } from "../_shared/posts.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { urls?: unknown; url?: unknown; post_id?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }

  const links = extractLinks(body.urls ?? body.url).slice(0, 10);
  if (!links.length) return json({ error: "No X status links found" }, 400);

  let tweets;
  try { tweets = await unfurlThread(links, body.post_id ? 5 : 0); }
  catch (e) { return json({ error: errMsg(e) }, 404); }

  if (!body.post_id) return json({ tweets });

  // ── attach to a post the caller owns ──
  const postId = String(body.post_id);
  if (!UUID_RE.test(postId)) return json({ error: "Bad post_id" }, 400);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in first" }, 401);
  const db = serviceClient();
  const { data: who, error: authErr } = await db.auth.getUser(token);
  if (authErr || !who?.user) return json({ error: "Sign in first" }, 401);

  const { data: post, error: postErr } = await db.from("controversies").select("id,user_id").eq("id", postId).maybeSingle();
  if (postErr) return json({ error: errMsg(postErr) }, 500);
  if (!post || post.user_id !== who.user.id) return json({ error: "Not your post" }, 403);

  const taken = await existingTweets(db, tweets.map((t) => t.tweet_id));
  const fresh = tweets.filter((t) => !taken.has(t.tweet_id) || taken.get(t.tweet_id) === postId);
  if (fresh.length) {
    const { error } = await db.from("post_tweets").upsert(fresh.map((t, i) => snapshotRow(postId, t, i)), { onConflict: "tweet_id" });
    if (error) return json({ error: errMsg(error), tweets }, 500);
  }
  await logIngest(db, [{ channel: "unfurl", ref: who.user.id, url: tweets[0].url, tweet_id: tweets[0].tweet_id, post_id: postId, outcome: "pending", message: `saved ${fresh.length}/${tweets.length} snapshots` }]);
  return json({ tweets, saved: fresh.length });
});
