// Service-role DB helpers shared by ingest / apify-sync / unfurl.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import type { TweetSnapshot } from "./tweets.ts";
import { clampDescription, clampTitle, memeTitle } from "./titles.ts";
import { env } from "./http.ts";

export const DESK_ID = "00000000-0000-4000-a000-00000000d35c"; // = public.kalesh_desk_id()

export function serviceClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Side = "balaks" | "bataks";
export const cleanSide = (v: unknown): Side | null => {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(balak|balaks|red|🔴)$/.test(s)) return "balaks";
  if (/^(batak|bataks|blue|🔵)$/.test(s)) return "bataks";
  return null;
};
export const cleanTags = (v: unknown): string[] =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[,#\s]+/))
    .map((t) => String(t).trim().toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 24))
    .filter(Boolean)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 5);

/** Which of these tweet ids already belong to a post? Returns tweet_id → post_id. */
export async function existingTweets(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data, error } = await db.from("post_tweets").select("tweet_id,post_id").in("tweet_id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.tweet_id as string, r.post_id as string]));
}

export const snapshotRow = (postId: string, s: TweetSnapshot, position: number) => ({
  post_id: postId,
  position,
  tweet_id: s.tweet_id,
  url: s.url,
  author_handle: s.author_handle,
  author_name: s.author_name,
  author_avatar: s.author_avatar,
  text: s.text,
  media: s.media,
  metrics: s.metrics,
  tweeted_at: s.tweeted_at,
  snapshot_source: s.snapshot_source,
  fetched_at: new Date().toISOString(),
});

export type CreateInput = {
  tweets: TweetSnapshot[];
  title?: string | null;
  note?: string | null;
  side?: Side | null;
  tags?: string[];
  status: "published" | "pending";
  source: "desk" | "apify";
  sourceRef?: string | null;
};
export type CreateResult = { post_id: string; status: "published" | "pending" | "duplicate" };

/**
 * Insert a desk post with its tweet snapshots.
 * The post is inserted as `pending`, snapshots are attached, THEN it flips to `published` —
 * so the Realtime UPDATE that clients receive already has its tweets available.
 */
export async function createDeskPost(db: SupabaseClient, input: CreateInput): Promise<CreateResult> {
  const lead = input.tweets[0];
  if (!lead) throw new Error("No tweets to post");
  const dupes = await existingTweets(db, input.tweets.map((t) => t.tweet_id));
  if (dupes.size) return { post_id: [...dupes.values()][0], status: "duplicate" };

  const side = input.side ?? (BigInt(lead.tweet_id) % 2n === 0n ? "balaks" : "bataks");
  const title = clampTitle(input.title?.trim() || memeTitle(lead));
  const description = clampDescription([input.note?.trim(), lead.text]);
  const { data: post, error } = await db.from("controversies").insert({
    user_id: DESK_ID,
    title,
    description,
    x_url: lead.url,
    tags: input.tags ?? [],
    poster_emoji: "📡",
    poster_text: "KALESH DESK",
    status: "pending",
    source: input.source,
    side,
    source_ref: input.sourceRef?.slice(0, 200) ?? null,
  }).select("id").single();
  if (error) {
    // 23505 = unique violation on the x_url index → someone already posted this link
    if (error.code === "23505") {
      const { data: same } = await db.from("controversies").select("id").eq("x_url", lead.url).maybeSingle();
      return { post_id: same?.id ?? "", status: "duplicate" };
    }
    throw error;
  }

  const rows = input.tweets.map((t, i) => snapshotRow(post.id, t, i));
  const ins = await db.from("post_tweets").insert(rows);
  if (ins.error) {
    await db.from("controversies").delete().eq("id", post.id);
    if (ins.error.code === "23505") {
      const again = await existingTweets(db, input.tweets.map((t) => t.tweet_id));
      return { post_id: [...again.values()][0] ?? "", status: "duplicate" };
    }
    throw ins.error;
  }

  if (input.status === "published") {
    const up = await db.from("controversies").update({ status: "published" }).eq("id", post.id);
    if (up.error) throw up.error;
  }
  return { post_id: post.id, status: input.status };
}

export async function logIngest(db: SupabaseClient, rows: {
  channel: "sheet" | "apify" | "manual" | "unfurl";
  ref?: string | null; url?: string | null; tweet_id?: string | null; post_id?: string | null;
  outcome: "published" | "pending" | "duplicate" | "skipped" | "error"; message?: string | null; payload?: unknown;
}[]) {
  if (!rows.length) return;
  const { error } = await db.from("ingest_log").insert(rows.map((r) => ({ ...r, post_id: r.post_id || null })));
  if (error) console.error("ingest_log insert failed", error);
}
