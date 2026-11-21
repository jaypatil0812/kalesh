// Meme-style headline generator for desk posts that arrive without a title.
// Deterministic per tweet id, so re-running ingest gives the same title.
import type { TweetSnapshot } from "./tweets.ts";

const TEMPLATES: ((h: string, q: string) => string)[] = [
  (h, q) => `@${h} ne phir se kalesh shuru kar diya: “${q}”`,
  (h, q) => `BREAKING: @${h} ka naya bayaan — “${q}”`,
  (h, q) => `Timeline mein aag: @${h} bole “${q}”`,
  (h, q) => `@${h} ne bola “${q}” aur replies ne court laga diya`,
  (h, q) => `Sootron ke hawale se: @${h} — “${q}”`,
  (h, q) => `“${q}” — @${h}. Popcorn ready rakho 🍿`,
  (h, q) => `Absolute cinema: @${h} ne likha “${q}”`,
];

const hash = (s: string) => [...s].reduce((v, c) => (Math.imul(v, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Shorten tweet text to a quotable fragment: no links/handles soup, cut on a word boundary. */
export function quotable(text: string, max = 70): string {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").replace(/^(@\w+\s*)+/, "").trim();
  if ([...clean].length <= max) return clean;
  const cut = [...clean].slice(0, max).join("");
  return cut.replace(/\s+\S*$/, "").replace(/[,;:.!?-]+$/, "") + "…";
}

export function memeTitle(tweet: TweetSnapshot): string {
  const h = tweet.author_handle ?? "kisi_ne";
  const q = quotable(tweet.text) || "(sirf ek photo, zero context)";
  const title = TEMPLATES[hash(tweet.tweet_id) % TEMPLATES.length](h, q);
  return clampTitle(title);
}

/** DB check: title 8–150 chars. */
export function clampTitle(t: string): string {
  let s = t.replace(/\s+/g, " ").trim();
  if ([...s].length > 150) s = [...s].slice(0, 149).join("") + "…";
  if ([...s].length < 8) s = (s + " — KALESH DESK").trim();
  return s;
}

/** DB check: description 10–700 chars. */
export function clampDescription(parts: (string | null | undefined)[]): string {
  let s = parts.filter(Boolean).join("\n\n").trim();
  if ([...s].length > 700) s = [...s].slice(0, 699).join("") + "…";
  if ([...s].length < 10) s = (s ? s + " · " : "") + "Filed by KALESH DESK.";
  return s;
}
