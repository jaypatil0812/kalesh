// X link → snapshot. api.fxtwitter.com first (text, media, metrics), publish.twitter.com/oembed as a fallback (text only).
// Media stays on X's CDN (pbs.twimg.com / video.twimg.com): we store URLs, never re-host files.

export type TweetMedia = { type: "photo" | "video" | "gif"; url: string; thumb?: string; w?: number; h?: number };
export type TweetMetrics = { likes?: number; retweets?: number; replies?: number; quotes?: number; views?: number; bookmarks?: number };
export type TweetSnapshot = {
  tweet_id: string;
  url: string;
  author_handle: string | null;
  author_name: string | null;
  author_avatar: string | null;
  text: string;
  media: TweetMedia[];
  metrics: TweetMetrics;
  tweeted_at: string | null;
  snapshot_source: "fxtwitter" | "oembed" | "apify" | "manual";
  // fxtwitter only: parent in a self-thread, used to walk threads upwards
  reply_to_id?: string | null;
  reply_to_handle?: string | null;
};

const X_HOSTS = new Set(["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com", "fxtwitter.com", "vxtwitter.com", "fixupx.com"]);
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const UA = "KaleshExeBot/1.0 (+content pipeline)";

/** Returns { id, handle } for an X status URL, or null. Accepts x.com, twitter.com, mobile., fx/vx mirrors. */
export function parseTweetURL(raw: string): { id: string; handle: string | null } | null {
  let u: URL;
  try { u = new URL(String(raw).trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !X_HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/(?:([A-Za-z0-9_]{1,15})|i(?:\/web)?)\/status(?:es)?\/(\d{1,25})(?:\/|$)/);
  if (!m) return null;
  return { id: m[2], handle: m[1] && m[1] !== "i" ? m[1] : null };
}

/** Canonical https://x.com/<handle>/status/<id> (handle "i" when unknown). Matches the DB unique index on x_url. */
export function canonicalURL(id: string, handle: string | null): string {
  return `https://x.com/${handle && HANDLE_RE.test(handle) ? handle : "i"}/status/${id}`;
}

/** Pull every X status link out of free text / arrays (sheet cells can hold several links separated by anything). */
export function extractLinks(input: unknown): string[] {
  const text = Array.isArray(input) ? input.join(" ") : String(input ?? "");
  const found = text.match(/https?:\/\/[^\s,;|<>"')\]]+/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of found) {
    const p = parseTweetURL(link);
    if (p && !seen.has(p.id)) { seen.add(p.id); out.push(link); }
  }
  return out;
}

const cdn = (v: unknown, hosts = /^https:\/\/(pbs|video|abs)\.twimg\.com\//): string | null =>
  typeof v === "string" && hosts.test(v) ? v : null;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

async function fetchJSON(url: string, ms = 8000): Promise<{ status: number; body: unknown }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ctl.signal });
    const body = r.headers.get("content-type")?.includes("json") ? await r.json() : await r.text();
    return { status: r.status, body };
  } finally { clearTimeout(t); }
}

// deno-lint-ignore no-explicit-any
type Any = any;

export async function viaFxTwitter(id: string, handle: string | null): Promise<TweetSnapshot | null> {
  const { status, body } = await fetchJSON(`https://api.fxtwitter.com/${handle ?? "i"}/status/${id}`);
  const t: Any = (body as Any)?.tweet;
  if (status !== 200 || !t?.id) return null;
  const media: TweetMedia[] = [];
  for (const m of (t.media?.all ?? []) as Any[]) {
    const type = m.type === "video" ? "video" : m.type === "gif" ? "gif" : "photo";
    const url = cdn(m.url);
    if (!url) continue;
    media.push({ type, url, thumb: cdn(m.thumbnail_url) ?? undefined, w: num(m.width), h: num(m.height) });
  }
  const author = t.author ?? {};
  const h = HANDLE_RE.test(author.screen_name ?? "") ? author.screen_name : handle;
  return {
    tweet_id: String(t.id),
    url: canonicalURL(String(t.id), h),
    author_handle: h,
    author_name: typeof author.name === "string" ? author.name.slice(0, 100) : null,
    author_avatar: cdn(author.avatar_url, /^https:\/\/(pbs|abs)\.twimg\.com\//),
    text: String(t.raw_text?.text ?? t.text ?? "").slice(0, 4000),
    media: media.slice(0, 4),
    metrics: { likes: num(t.likes), retweets: num(t.retweets), replies: num(t.replies), quotes: num(t.quotes), views: num(t.views), bookmarks: num(t.bookmarks) },
    tweeted_at: t.created_timestamp ? new Date(t.created_timestamp * 1000).toISOString() : (t.created_at ? new Date(t.created_at).toISOString() : null),
    snapshot_source: "fxtwitter",
    reply_to_id: t.replying_to_status ? String(t.replying_to_status) : null,
    reply_to_handle: typeof t.replying_to === "string" ? t.replying_to : null,
  };
}

const decode = (s: string) => s
  .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).trim();

export async function viaOEmbed(id: string, handle: string | null): Promise<TweetSnapshot | null> {
  const target = `https://twitter.com/${handle ?? "i"}/status/${id}`;
  const { status, body } = await fetchJSON(`https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=${encodeURIComponent(target)}`);
  const o: Any = body;
  if (status !== 200 || typeof o?.html !== "string") return null;
  const p = o.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const dateLink = [...o.html.matchAll(/<a[^>]*>([^<]*)<\/a>/gi)].pop()?.[1];
  const authorHandle = String(o.author_url ?? "").match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/)?.[1] ?? handle;
  const parsedDate = dateLink ? Date.parse(dateLink) : NaN;
  return {
    tweet_id: id,
    url: canonicalURL(id, authorHandle),
    author_handle: authorHandle,
    author_name: typeof o.author_name === "string" ? o.author_name.slice(0, 100) : null,
    author_avatar: null,
    text: p ? decode(p[1]).replace(/\s*pic\.twitter\.com\/\w+$/, "").slice(0, 4000) : "",
    media: [],
    metrics: {},
    tweeted_at: Number.isNaN(parsedDate) ? null : new Date(parsedDate).toISOString(),
    snapshot_source: "oembed",
  };
}

/** Snapshot one link. Throws if neither source knows the tweet (deleted / private / bad id). */
export async function unfurl(link: string): Promise<TweetSnapshot> {
  const p = parseTweetURL(link);
  if (!p) throw new Error("Not an X status link");
  try {
    const fx = await viaFxTwitter(p.id, p.handle);
    if (fx) return fx;
  } catch (_) { /* fall through to oEmbed */ }
  const oe = await viaOEmbed(p.id, p.handle).catch(() => null);
  if (oe) return oe;
  throw new Error(`Tweet ${p.id} not found (deleted, private or rate limited)`);
}

/**
 * Snapshot a list of links as one post. If only ONE link is given and it replies to its own author,
 * walk up the self-thread (max `maxParents`) so the post shows the whole thread in order.
 */
export async function unfurlThread(links: string[], maxParents = 5): Promise<TweetSnapshot[]> {
  const shots: TweetSnapshot[] = [];
  for (const link of links.slice(0, 25)) shots.push(await unfurl(link));
  if (shots.length === 1) {
    let cur = shots[0];
    for (let i = 0; i < maxParents && cur.reply_to_id && cur.reply_to_handle && cur.author_handle &&
      cur.reply_to_handle.toLowerCase() === cur.author_handle.toLowerCase(); i++) {
      const parent = await viaFxTwitter(cur.reply_to_id, cur.reply_to_handle).catch(() => null);
      if (!parent) break;
      shots.unshift(parent);
      cur = parent;
    }
  }
  const seen = new Set<string>();
  return shots.filter((s) => !seen.has(s.tweet_id) && seen.add(s.tweet_id));
}

export const engagement = (m: TweetMetrics) =>
  (m.likes ?? 0) + 2 * (m.retweets ?? 0) + (m.replies ?? 0) + 2 * (m.quotes ?? 0);
