/* KALESH.EXE v2 — Balaks vs Bataks
   Vanilla JS, no build step. Two modes:
   - DEMO: no config.js credentials → everything lives in this browser (localStorage).
   - LIVE: config.js has Supabase URL + anon key → email magic link / X OAuth, Postgres, Storage. */
(function () {
'use strict';

/* ───────────────────────── utils ───────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeURL = v => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const safeImg = v => /^(?:assets\/memes\/[a-z]+\.(?:jpe?g|png|gif)|data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)$/.test(String(v)) ? String(v) : safeURL(v);
const isXURL = v => { try { const u = new URL(v); return ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'mobile.x.com'].includes(u.hostname) && /\/status\/\d+/.test(u.pathname); } catch { return false; } };
const makeId = () => globalThis.crypto?.randomUUID?.() || 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2);
const pick = a => a[Math.floor(Math.random() * a.length)];
const cleanHandle = v => String(v || '').trim().replace(/^@/, '').toLowerCase();
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const X_RE = /^[A-Za-z0-9_]{1,15}$/;
const BANNED_HANDLES = ['admin', 'administrator', 'kalesh', 'kaleshexe', 'mod', 'moderator', 'root', 'support', 'system', 'official', 'null', 'undefined'];
const C = window.KALESH_CONTENT;
const media = window.KALESH_MEDIA;
const cfg = window.KALESH_CONFIG || {};
const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoursAgo = h => new Date(Date.now() - h * 3600000).toISOString();
function relTime(iso) { const m = Math.floor(Math.max(0, Date.now() - new Date(iso)) / 60000); if (m < 2) return 'abhi abhi'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; }
const short = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n || 0);

/* ───────────────────────── demo seed (fictional) ───────────────────────── */
const DEMO_PEOPLE = [
  { id: 'seed-1', handle: 'certifiedyapper', x_username: 'certifiedyapper', x_verified: true, avatar_emoji: '🐸', gang: 'balaks' },
  { id: 'seed-2', handle: 'batak_exe', x_username: 'batak_exe', x_verified: true, avatar_emoji: '🦆', gang: 'bataks' },
  { id: 'seed-3', handle: 'nallaminister', x_claimed: 'nalla_minister', avatar_emoji: '🐱', gang: 'balaks', title: 'Minister of Unemployment' },
  { id: 'seed-4', handle: 'quackops', avatar_emoji: '🦖', gang: 'bataks' },
  { id: 'seed-5', handle: 'samosaceo', x_username: 'samosaCEO', x_verified: true, avatar_emoji: '🍟', gang: 'balaks', title: 'CEO of Yapping' },
  { id: 'seed-6', handle: 'emotionaldamage', avatar_emoji: '👽', gang: 'bataks' },
  { id: 'seed-7', handle: 'bas_kar_bhai', avatar_emoji: '💀', gang: 'balaks' },
  { id: 'seed-8', handle: 'duckzilla', avatar_emoji: '🤡', gang: 'bataks' },
  { id: 'kalesh-desk', handle: 'kalesh_desk', avatar_emoji: '📡', title: 'KALESH DESK', desk: true }
];
const DEMO_RESERVED = [
  { handle: 'billi_ceo', x_username: 'billi_ceo_demo', display_name: 'Billi CEO (fictional demo)', title: 'Founding Server Cat', bio: 'This handle is reserved for its X owner. Log in with that X account to claim it.', avatar_emoji: '😼', claimed_by: null }
];
const P = (id, user, h, t, d, tags, spice, count, likes, emoji, poster) => ({ id, user_id: user, title: t, description: d, tags, created_at: hoursAgo(h), status: 'published', seed: { spice, count, likes }, poster_emoji: emoji, poster_text: poster });
const DEMO_POSTS = [
  P('demo-1', 'seed-1', 1, 'Bro announced his retirement from a group chat nobody invited him to 😭', 'A twelve-tweet farewell speech. Zero replies. One extremely concerned cat.', ['groupchat', 'cinema'], 9.4, 36, 421, '🎬', 'MAIN CHARACTER SYNDROME'),
  P('demo-2', 'seed-2', 2.7, 'Someone typed “source?” under a joke. We are now in a constitutional crisis.', 'The reply section has appointed three lawyers and one fact-checking pigeon.', ['discourse', 'brainrot'], 9.1, 28, 380, '📜', 'SOURCE: TRUST ME BRO'),
  P('demo-3', 'seed-3', 5, 'A 19-slide apology presentation for accidentally saying “bro”', 'The apology has an executive summary, footnotes, and a pie chart. Cinema.', ['apology', 'office'], 8.7, 31, 259, '📊', 'SORRY FOR THE INCONVENIENCE'),
  P('demo-4', 'seed-4', 7, 'Two fandoms fighting over who invented the word “peak”', 'Neither fandom has touched grass since Tuesday. An investigation is underway.', ['fandom', 'peak'], 8.3, 23, 203, '⚔️', 'THE BATTLE OF PEAK'),
  P('demo-5', 'seed-5', 11, 'Verified account got out-argued by a cat pressing random keyboard keys', 'The cat is currently being considered for a cabinet position.', ['cats', 'ratio'], 9.8, 52, 690, '🐈', 'MEOW IS THE FINAL VERDICT'),
  P('demo-6', 'seed-6', 16, 'The internet is debating whether a PNG has more aura than an entire cast', 'Judges have been unable to reach a verdict. The PNG remains undefeated.', ['aura', 'cinema'], 7.8, 17, 176, '🗿', '+999 AURA'),
  P('demo-7', 'seed-7', 25, '“My final statement” — thread six of an ongoing twelve-part final statement', 'Bhai ka final boss bhi final nahi hai. The sequel is already announced.', ['threads', 'drama'], 7.5, 22, 110, '🎤', 'THE FINAL FINAL FINAL'),
  P('demo-8', 'seed-8', 33, 'Someone ranked traffic jams by cinematic universe. Twitter took it personally.', 'The roundabout has entered its villain arc. Reviews are mixed.', ['traffic', 'gta6'], 8.2, 20, 199, '🚗', 'GTA 6 SE PEHLE TRAFFIC'),
  P('demo-bangalore', 'seed-1', 4, 'Bangalore anna declared every other city’s filter coffee illegal', 'The group chat demanded a blind taste test. It turned into a debate about traffic, rent and the correct way to say Bengaluru.', ['bangalore', 'food'], 8.9, 24, 128, '☕', 'ANNA APPROVAL PENDING'),
  P('demo-biryani', 'seed-2', 6, 'Hyderabadi biryani group chat split over one boiled egg', 'Someone ranked the egg above the rice. The recipe thread now has rival manifestos and an emergency dinner plan.', ['biryani', 'food'], 9.1, 27, 160, '🍚', 'DUM PE DRAMA'),
  ...demoDeskPosts()
];
/* KALESH DESK demo: fictional tweet snapshots in the same shape as public.post_tweets rows. */
function demoTweet(id, handle, name, avatar, h, text, media, metrics) {
  return { tweet_id: id, url: `https://x.com/${handle}/status/${id}`, author_handle: handle, author_name: name, author_avatar: avatar, text, media: media || [], metrics: metrics || {}, tweeted_at: hoursAgo(h), snapshot_source: 'demo' };
}
function deskPost(id, h, side, title, note, tags, tweets, seed) {
  return { id, user_id: 'kalesh-desk', source: 'desk', side, title, description: note || tweets[0].text, x_url: tweets[0].url, tags, tweets, created_at: hoursAgo(h), status: 'published', seed: seed || { spice: 0, count: 0, likes: 0 }, poster_emoji: '📡', poster_text: 'KALESH DESK' };
}
function demoDeskPosts() {
  return [
    deskPost('demo-desk-thread', 0.6, 'bataks', '@standup_sharma ne phir se kalesh shuru kar diya: “10x engineers don’t attend standups”', 'A 3-part thread. Fictional demo of a KALESH DESK post pulled in from the Google Sheet.', ['office', 'threads'], [
      demoTweet('1900000000000000001', 'standup_sharma', 'Standup Sharma (demo)', '', 0.9, 'Unpopular opinion: 10x engineers don’t attend standups. Standups attend them. 🧵', [], { likes: 4200, retweets: 610, replies: 980, views: 310000 }),
      demoTweet('1900000000000000002', 'standup_sharma', 'Standup Sharma (demo)', '', 0.85, 'If your standup has a slide deck, it is not a standup. It is a sitdown with extra steps.', [{ type: 'photo', url: 'assets/memes/rollsafe.jpg' }], { likes: 2100, retweets: 240, replies: 300 }),
      demoTweet('1900000000000000003', 'standup_sharma', 'Standup Sharma (demo)', '', 0.8, 'Manager has replied “let’s take this offline”. The thread is now offline. Like my career.', [], { likes: 8800, retweets: 1200, replies: 1500 })
    ], { spice: 8.6, count: 14, likes: 230 }),
    deskPost('demo-desk-single', 3, 'balaks', 'BREAKING: @chai_vs_coffee ka naya bayaan — “filter coffee is just chai that went to IIT”', '', ['food', 'bangalore'], [
      demoTweet('1900000000000000010', 'chai_vs_coffee', 'Chai vs Coffee (demo)', '', 3.2, 'filter coffee is just chai that went to IIT and never called home', [{ type: 'photo', url: 'assets/memes/disaster.png' }], { likes: 15300, retweets: 2900, replies: 4100, views: 1200000 })
    ], { spice: 9.2, count: 19, likes: 410 })
  ];
}
/* Demo stand-in for Supabase Realtime: these arrive while the feed is open, once per browser. */
const DEMO_WIRE = [
  () => deskPost('demo-wire-1', 0, 'balaks', 'Sootron ke hawale se: @pg_owner_ji — “WiFi password change kar diya, rent bhi”', 'Fictional demo: this post arrived live, like a Realtime insert from the pipeline.', ['bangalore', 'rent'], [
    demoTweet('1900000000000000101', 'pg_owner_ji', 'PG Owner Ji (demo)', '', 0, 'WiFi password change kar diya hai. Naya password: rent_bhar_do_2026. Rent bhi change kar diya hai.', [{ type: 'photo', url: 'assets/memes/harold.png' }], { likes: 980, retweets: 120, replies: 340 })
  ]),
  () => deskPost('demo-wire-2', 0, 'bataks', '“Ye meeting email ho sakti thi” — @calendar_kiler. Popcorn ready rakho 🍿', 'Fictional demo: Apify-style auto-published post (engagement over the threshold).', ['office'], [
    demoTweet('1900000000000000102', 'calendar_kiler', 'Calendar Killer (demo)', '', 0, 'Ye meeting email ho sakti thi. Ye email WhatsApp ho sakta tha. Ye WhatsApp seen-zone ho sakta tha.', [], { likes: 23100, retweets: 4100, replies: 900, views: 2400000 })
  ])
];

/* ───────────────────────── state ───────────────────────── */
const STORE_KEY = 'kalesh-exe-demo-v2';
function loadStore() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.posts)) return s; } catch {} return { profile: null, posts: DEMO_POSTS, votes: {}, likes: {}, reports: {}, reserved: DEMO_RESERVED }; }
let store = loadStore();
for (const post of DEMO_POSTS.filter(p => ['demo-bangalore', 'demo-biryani', 'demo-desk-thread', 'demo-desk-single'].includes(p.id))) {
  if (!store.posts.some(p => p.id === post.id)) store.posts.push(post);
}
const saveStore = () => { bump(); if (S.mode === 'demo') try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { notice('Browser storage full. Demo images might not save.'); } };
let ach = {}; try { ach = JSON.parse(localStorage.getItem('kalesh-achievements')) || {}; } catch {}

const S = {
  mode: 'guest',           // guest | demo | live
  sb: null, session: null, profile: null,
  posts: [], votes: [], likes: [],
  vaultMemes: [], vaultNews: [],
  search: '', sort: 'newest', board: 'week',
  authTab: 'signup', authUser: '', bombClicks: 0, logoClicks: 0, catClicks: 0, sirenCount: 0, breakingCount: 0,
  combo: { n: 0, t: 0 }, publicProfile: null, panelTimer: null
};

const memeImage = (m, still = reducedMotion()) => safeImg((still && m[5]) || m[4]);
let catalog = [], programming = [], deck = [], programmingDeck = [], lastMeme, lastClip, draws = 0;
fetch('assets/meme-catalog.json').then(r => r.ok ? r.json() : []).then(rows => {
  const toMeme = ([id, name, category, url]) => ['🎞', name, category === 'bulk-programming' ? 'From the programming meme shelf.' : 'From the meme archive.', 'pop', url, url, url, id];
  catalog = rows.filter(row => row[2] !== 'bulk-programming').map(toMeme);
  programming = rows.filter(row => row[2] === 'bulk-programming').map(toMeme);
  deck = [];
  programmingDeck = [];
}).catch(() => {});
function shuffled(values) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function randomMedia() {
  if (programming.length && ++draws % 3 === 0) {
    if (!programmingDeck.length) programmingDeck = shuffled(programming).filter(m => m !== lastMeme);
    lastMeme = programmingDeck.pop();
  } else {
    if (!deck.length) deck = shuffled([...S.vaultMemes.filter(m => m[4]), ...media, ...catalog]).filter(m => m !== lastMeme);
    lastMeme = deck.pop();
  }
  return lastMeme;
}
function randomSound() {
  const clips = window.KALESH_TUNA.filter(clip => clip !== lastClip);
  lastClip = pick(clips);
  if (lastClip) SFX.clip(tunaPath(lastClip), 5);
}
const tunaPath = clip => 'assets/sounds/tuna/kalesh-tuna-sounds/' + encodeURIComponent(clip[0]);
// Data version + memo so scoring isn't recomputed per card (posts × votes gets expensive fast)
let dataVer = 0; const bump = () => { dataVer++; };
const memo = {};
function cached(key, fn) { const m = memo[key]; if (m && m.v === dataVer) return m.val; const val = fn(); memo[key] = { v: dataVer, val }; return val; }
function groupBy(arr, k) { const m = {}; for (const x of arr) (m[x[k]] ||= []).push(x); return m; }
window.KALESH_MEMES = () => [...S.vaultMemes.filter(m => m[4]), ...media, ...catalog];
window.KALESH_MEME_IMAGE = memeImage;

/* ───────────────────────── achievements ───────────────────────── */
const ACH = {
  first_post: ['🎤', 'FIRST DAY OF UNEMPLOYMENT', 'Submitted your first kalesh'],
  judge: ['⚖️', 'PROFESSIONAL OPINION DISTRIBUTOR', 'Cast 5 spice votes'],
  bomber: ['💣', 'BHAI BAS KAR', 'Pressed the meme bomb 10 times'],
  cat: ['🐈', 'CAT COUNCIL MEMBER', 'Found the forbidden council'],
  typist: ['⌨️', 'KEYBOARD WARRIOR', 'Typed a secret word'],
  traitor: ['🐍', 'GADDAR DETECTED', 'Tried to switch gangs'],
  siren: ['🚨', 'BREAKING NEWS JUNKIE', 'Pressed the siren 3 times'],
  lost: ['🧭', 'BHAI TU YAHAN KAISE AAYA?', 'Found the 404 page'],
  drama: ['📺', 'SERIAL KI BAHU', 'Triggered the dramatic zoom'],
  combo: ['🕹️', 'COMBO KING', 'Hit a 3x voting combo']
};
function achieve(key) {
  if (ach[key] || !ACH[key]) return;
  ach[key] = Date.now();
  try { localStorage.setItem('kalesh-achievements', JSON.stringify(ach)); } catch {}
  const [e, t] = ACH[key];
  setTimeout(() => { notice(`🏅 ACHIEVEMENT UNLOCKED: ${e} ${t}`, 'achievement'); SFX.play('powerup'); }, 400);
}
window.KALESH_ACHIEVE = achieve;

/* ───────────────────────── toasts / overlays ───────────────────────── */
function notice(txt, kind = '') { const t = document.createElement('button'); t.type = 'button'; t.className = 'toast ' + kind; t.textContent = txt; t.title = 'Dismiss'; t.onclick = () => t.remove(); $('#toast-zone').append(t); setTimeout(() => t.remove(), 7400); }
window.KALESH_TOAST = notice;
let overlayOpener;
function overlay(html) {
  const zone = $('#overlays');
  if (!zone.firstChild) overlayOpener = document.activeElement;
  zone.innerHTML = html;
  $('#app').inert = true;
  document.body.classList.add('modal-open');
  ($('[autofocus]', zone) || $('button', zone))?.focus();
}
function closeOverlay() {
  markActivity();
  const zone = $('#overlays');
  if (!zone.firstChild) return;
  zone.replaceChildren();
  $('#app').inert = false;
  document.body.classList.remove('modal-open');
  if (overlayOpener?.isConnected) overlayOpener.focus();
  overlayOpener = null;
}

/* ───────────────────────── scoring / identity ───────────────────────── */
const me = () => S.profile;
const peopleById = () => { const m = {}; for (const p of DEMO_PEOPLE) m[p.id] = p; if (S.mode === 'demo' && store.profile) m[store.profile.id] = store.profile; return m; };
function authorOf(p) { if (p.author) return p.author; return peopleById()[p.user_id] || { handle: 'anonymous', avatar_emoji: '🐈', gang: 'balaks' }; }
// Desk/Apify posts carry their own side; user posts belong to the author's gang.
const postGang = p => p.side || authorOf(p).gang;
const isDeskPost = p => !!p.source && p.source !== 'user';
const allPosts = () => S.mode === 'demo' ? store.posts : S.posts;
function voteInfo(p) {
  if (S.mode === 'demo') { const own = store.votes[p.id] || 0, b = p.seed?.spice || 0, n = p.seed?.count || 0; return { avg: own ? (b * n + own) / (n + 1) : b, count: n + (own ? 1 : 0), mine: own }; }
  const arr = cached('votesByPost', () => groupBy(S.votes, 'post_id'))[p.id] || [];
  return { avg: arr.length ? arr.reduce((a, v) => a + v.spice, 0) / arr.length : 0, count: arr.length, mine: (arr.find(v => v.user_id === S.session?.user.id) || {}).spice || 0 };
}
const likeCount = p => S.mode === 'demo' ? (p.seed?.likes || 0) + (store.likes[p.id] ? 1 : 0) : (cached('likesByPost', () => groupBy(S.likes, 'post_id'))[p.id] || []).length;
const liked = p => S.mode === 'demo' ? !!store.likes[p.id] : S.likes.some(l => l.post_id === p.id && l.user_id === S.session?.user.id);
function postPoints(p) { if (p.status !== 'published') return 0; const v = voteInfo(p); return 10 + (v.count >= 3 ? Math.min(40, Math.round(v.avg * 4)) : 0); }
function titleFor(points, override) { if (override) return override; let t = C.titles[0][1]; for (const [min, name] of C.titles) if (points >= min) t = name; return t; }
function rankings(period = 'week') { return cached('rank-' + period, () => computeRankings(period)); }
function computeRankings(period) {
  const d = new Date(), monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const authors = new Map(), gangs = { balaks: 0, bataks: 0 };
  for (const p of allPosts()) {
    if (period === 'week' && new Date(p.created_at).getTime() < monday) continue;
    const pts = postPoints(p); if (!pts) continue;
    const a = authorOf(p), g = postGang(p);
    if (gangs[g] != null) gangs[g] += pts;
    if (isDeskPost(p)) continue; // the desk feeds the gang war but never tops the people leaderboard
    const row = authors.get(p.user_id) || { id: p.user_id, ...a, points: 0, posts: 0 };
    row.points += pts; row.posts++; authors.set(p.user_id, row);
  }
  return { authors: [...authors.values()].sort((a, b) => b.points - a.points), gangs };
}
const lifetimePoints = id => cached('pointsById', () => Object.fromEntries(rankings('all').authors.map(a => [a.id, a.points])))[id] || 0;
const gangLabel = g => g === 'balaks' ? '🔴 BALAK' : g === 'bataks' ? '🔵 BATAK' : '⚪ NO GANG';
function avatar(a, cls = '') { const url = a?.avatar_url && safeImg(a.avatar_url); return url ? `<img class="av ${cls}" src="${esc(url)}" alt="">` : `<span class="av ${cls}" aria-hidden="true">${esc(a?.avatar_emoji || '🐈')}</span>`; }
function xBadge(a) {
  if (a?.x_username) return `<a class="x-badge verified" href="https://x.com/${esc(a.x_username)}" target="_blank" rel="noopener noreferrer nofollow" title="Verified via X login">𝕏 @${esc(a.x_username)} ✓</a>`;
  if (a?.x_claimed) return `<a class="x-badge" href="https://x.com/${esc(a.x_claimed)}" target="_blank" rel="noopener noreferrer nofollow" title="Self-reported, not verified">𝕏 @${esc(a.x_claimed)} <small>unverified</small></a>`;
  return '';
}

/* ───────────────────────── routing ───────────────────────── */
const route = () => (location.hash.startsWith('#/') ? location.hash.slice(1) : '/').replace(/\/$/, '') || '/';
function go(r) { if (route() === r) render(); else location.hash = '#' + r; }

/* ───────────────────────── shell pieces (v1 look + v2 features) ───────────────────────── */
// v1-style avatar markup
function cssAvatar(a, cls = '') { const url = a?.avatar_url && safeImg(a.avatar_url); return url ? `<img class="avatar-img ${cls}" src="${esc(url)}" alt="User avatar"/>` : `<span class="avatar ${cls}" aria-hidden="true">${esc(a?.avatar_emoji || '🐈')}</span>`; }
const soundLabel = () => SFX.enabled ? '🔊 AWAAZ ON' : '🔇 AWAAZ OFF';
function newsHeadlines() {
  const fromFeed = allPosts().filter(p => p.status === 'published').slice(0, 6).map(p => `SOOTRON KE HAWALE SE: @${authorOf(p).handle} NE KIYA KHULASA — ${p.title.toUpperCase()}`);
  return [...fromFeed, ...S.vaultNews, ...C.news];
}
function recentReports() { return allPosts().filter(p => p.status === 'published').slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); }
function ticker() {
  const posts = recentReports().slice(0, 10);
  const items = posts.map(p => `<button type="button" data-action="scroll-post" data-id="${esc(p.id)}">@${esc(authorOf(p).handle)} · ${esc(p.title)}</button><i>✦</i>`).join('')
    || [...S.vaultNews, ...C.news].map(h => `<span>${esc(h)}</span><i>✦</i>`).join('');
  return `<div class="news-bar" role="region" aria-label="Kalesh Tak breaking news">
    <div class="news-label"><span class="live-dot"></span>BREAKING</div>
    <div class="news-track-wrap"><div class="news-track">${items}<div class="ticker-duplicate" inert aria-hidden="true">${items}</div></div></div>
    <button type="button" class="news-siren" data-action="siren" title="Siren bajao">🚨<span>SIREN</span></button>
  </div>`;
}
function header() {
  const u = me(), r = route(), sel = to => r === to ? 'selected' : '';
  return `${ticker()}<header class="site-header"><div class="header-inner"><a class="brand" href="#/" data-action="logo" aria-label="Kalesh homepage"><span class="brand-star">✸</span>KALESH<span class="brand-ext">.EXE</span><small>EST. 2026 · 0 brain cells</small></a><nav class="main-nav" aria-label="Main navigation"><a href="#/" class="nav-link ${sel('/')}">🔥 Feed</a><a href="#/news" class="nav-link ${sel('/news')}">📺 Kalesh Tak</a><a href="#/leaderboard" class="nav-link ${sel('/leaderboard')}">🏆 Leaderboard</a><a href="#/profile" class="nav-link ${sel('/profile')}">😼 My Profile</a></nav><div class="header-actions"><button type="button" class="sound-chip" data-action="sound" aria-pressed="${SFX.enabled}" title="Meme sounds">${soundLabel()}</button><button type="button" data-action="open-post" class="button button-red header-post"><span class="plus-circle">＋</span> POST KALESH</button><button class="avatar-button" type="button" data-action="go-profile" aria-label="Open profile">${cssAvatar(u)}</button></div></div></header>`;
}
function footer() {
  return `<footer class="kfooter">
    <div class="kfooter-end">YOU HAVE REACHED THE END OF THE INTERNET</div>
    <button type="button" class="kfooter-headline" data-action="prophecy">26 me to duniya khatam h</button>
    <p class="kfooter-sub">Tab tak kalesh dekh le. 🐈 💥 🦆 💥 🐈</p><div class="footer-games"><button type="button" data-action="prophecy">🌎 Pick an ending</button><a href="#/cat-council">⚖️ Cat Courtroom</a></div>
    <div class="kfooter-row">
      <span>© 2026 KALESH.EXE · MADE WITH ZERO BRAIN CELLS</span>
      <span class="visitor">VISITORS: <b>${String(4200 + Math.floor(Date.now() / 3.6e6) % 9000).padStart(7, '0')}</b></span>
      <button type="button" class="link-btn" data-action="chaos">CHAOS: ${Chaos.on ? 'ON 💥' : 'OFF 😇'}</button>
      <button type="button" class="link-btn" data-action="secret">DO NOT CLICK ↗</button>
    </div>
    <div class="kfooter-fine">All posts here are user submissions linking public X posts. Rate the absurdity, never the person. No doxxing, threats or pile-ons. ${S.mode === 'demo' ? 'DEMO MODE: data lives only in this browser.' : ''}</div>
  </footer>`;
}
function shell(content) {
  const r = route(), sel = to => r === to ? 'selected' : '';
  return `${header()}<main class="main-shell">${content}</main>${footer()}<nav class="mobile-nav" aria-label="Mobile navigation"><a href="#/" class="${sel('/')}">🔥 <span>Feed</span></a><a href="#/news" class="${sel('/news')}">📺 <span>News</span></a><button type="button" data-action="open-post">➕ <span>Post</span></button><a href="#/leaderboard" class="${sel('/leaderboard')}">🏆 <span>Ranks</span></a><a href="#/profile" class="${sel('/profile')}">😼 <span>Me</span></a></nav>`;
}

/* ───────────────────────── home (v1 layout) ───────────────────────── */
const dailyIdx = () => Math.floor(Date.now() / 86400000);
const dailyMeme = () => { const m = [...S.vaultMemes, ...media]; return m[dailyIdx() % m.length]; };
function controversyOfDay() {
  const pub = allPosts().filter(p => p.status === 'published');
  const recent = pub.filter(p => Date.now() - new Date(p.created_at) < 864e5);
  return (recent.length ? recent : pub).slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg)[0];
}
function gangMeters() {
  const g = rankings().gangs, total = g.balaks + g.bataks; const a = total ? Math.round(g.balaks / total * 100) : 50, b = 100 - a;
  return `<section class="widget gang-widget" aria-label="Gang standings"><div class="widget-heading"><span>⚔️ GANG WAR</span><span class="chip-stamp">SEASON 01</span></div><a class="gang-row gang-meter-link" href="#/balaks"><div class="gang-line"><span>🔴 BALAK METER</span><strong>${short(g.balaks)} CP</strong></div><div class="meter"><i class="meter-red" style="width:${a}%"></i></div></a><a class="gang-row gang-meter-link" href="#/bataks"><div class="gang-line"><span>🔵 BATAK METER</span><strong>${short(g.bataks)} CP</strong></div><div class="meter"><i class="meter-blue" style="width:${b}%"></i></div></a><div class="gang-verdict">${a === b ? 'THE WAR IS CONFUSED' : a > b ? 'BALAKS ARE ACTING UNBEARABLE 😭' : 'BATAKS ARE QUACKING LOUDER 🦆'}</div><a href="#/leaderboard" class="text-link">Full gang nonsense ↗</a></section>`;
}
function topYappers() {
  const list = rankings().authors.slice(0, 3);
  return `<section class="widget"><div class="widget-heading"><span>🏆 TOP NALLE</span><span class="sticker-small">HALL OF FAME</span></div>${list.length ? list.map((u, i) => `<a class="rank-mini" href="#/u/${esc(u.handle)}"><span class="rank-emoji">${['🥇', '🥈', '🥉'][i]}</span>${cssAvatar(u, 'mini-avatar')}<span class="rank-name">@${esc(u.handle)}</span><strong>${u.points}</strong></a>`).join('') : '<p class="muted">No kalesh, no champions. Tragic.</p>'}<a href="#/leaderboard" class="text-link">View full leaderboard ↗</a></section>`;
}
function miniMeme() { const m = dailyMeme(); return `<section class="widget meme-day-widget"><div class="widget-heading"><span>🐈 MEME OF THE DAY</span><span class="sticker-small">TODAY ONLY</span></div><div class="meme-day-visual"><span>${esc(m[0])}</span><b>${esc(m[1])}</b></div><p>${esc(m[2])}</p><button type="button" data-action="daily-meme" class="text-link button-link">OPEN OFFICIAL MEME ↗</button></section>`; }
function newsWidget() { return `<section class="widget"><div class="widget-heading"><span>📺 KALESH TAK</span><span class="sticker-small">● LIVE</span></div><p class="news-mini-line">${esc(pick(newsHeadlines()))}</p><a href="#/news" class="text-link">Watch the mahabahas ↗</a></section>`; }
function sidebar() { return `<aside class="sidebar">${gangMeters()}${topYappers()}<section class="meme-bomb"><div class="bomb-rays"></div><span class="bomb-icon">💣</span><h3>MEME BOMB</h3><p>Iss button pe bharosa mat karna.</p><button type="button" data-action="bomb" class="button button-black">💥 PHOD DO</button><small>May cause unnecessary happiness.</small></section>${newsWidget()}${miniMeme()}<div class="sidebar-stamp">✦ DEPARTMENT OF<br/>USELESS DRAMA ✦</div></aside>`; }
function reactionFor(post) {
  const hash = [...String(post.id)].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 0);
  return matchedMeme(post, hash) || media[hash % media.length];
}
function posterMedia(p) {
  const upload = safeImg(p.image_url);
  const reaction = reactionFor(p);
  return `<figure class="case-media"><img loading="lazy" src="${esc(upload || memeImage(reaction, true))}" alt="${esc(upload ? 'Submitted meme image' : reaction[1])}"><figcaption>${upload ? 'Submitted image' : 'Reaction meme · ' + esc(reaction[1])}</figcaption></figure>`;
}
function xStatusId(url) {
  if (!url || !isXURL(url)) return '';
  const parsed = new URL(url);
  return parsed.protocol === 'https:' ? parsed.pathname.match(/\/status\/(\d{1,25})(?:\/|$)/)?.[1] || '' : '';
}
let xWidget;
function loadXWidget() {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr.widgets);
  if (xWidget) return xWidget;
  xWidget = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error('X widget unavailable'));
    };
    const timeout = setTimeout(fail, 9000);
    script.onerror = fail;
    script.onload = () => window.twttr?.ready(api => {
      clearTimeout(timeout);
      resolve(api.widgets);
    });
    document.head.append(script);
  }).catch(error => { xWidget = null; throw error; });
  return xWidget;
}
async function openXMedia(post) {
  const url = safeURL(post?.x_url);
  const status = xStatusId(url);
  if (!status) return;
  overlay(dialog('Original X post', '𝕏 ORIGINAL POST', `<div class="dialog-body x-media-dialog"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">Open on X ↗</a><p class="x-media-state" role="status">Loading the original post and its media…</p><div class="x-media-host"></div></div>`));
  const host = $('.x-media-host'), state = $('.x-media-state');
  const timeout = setTimeout(() => { state.textContent = 'Preview unavailable. Try opening the post on X.'; }, 12000);
  try {
    const widgets = await loadXWidget();
    if (!host.isConnected) return;
    const embed = await widgets.createTweet(status, host, { theme: 'dark', conversation: 'none', dnt: true });
    if (embed) state.hidden = true;
    else state.textContent = 'Preview unavailable. Try opening the post on X.';
  } catch {
    state.textContent = 'Preview unavailable. Try opening the post on X.';
  } finally {
    clearTimeout(timeout);
  }
}
/* ── tweet snapshots (public.post_tweets rows, or demo rows of the same shape) ── */
const tweetMediaURL = v => { const s = String(v || ''); return /^https:\/\/(pbs|video)\.twimg\.com\/[^\s"'<>]+$/.test(s) || /^assets\/memes\/[a-z]+\.(?:jpe?g|png|gif)$/.test(s) ? s : ''; };
const tweetAvatarURL = v => { const s = String(v || ''); return /^https:\/\/(pbs|abs)\.twimg\.com\/[^\s"'<>]+$/.test(s) ? s : ''; };
const tweetsOf = p => (Array.isArray(p.tweets) ? p.tweets : []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
function tweetMetrics(m) {
  const parts = [['💬', 'replies', m?.replies], ['🔁', 'reposts', m?.retweets], ['❤️', 'likes', m?.likes], ['👁', 'views', m?.views]].filter(([, , n]) => n > 0);
  return parts.length ? `<div class="tw-metrics">${parts.map(([i, label, n]) => `<span title="${label}">${i} ${short(n)}</span>`).join('')}</div>` : '';
}
function tweetMediaHTML(media) {
  const items = (Array.isArray(media) ? media : []).map(m => ({ ...m, src: tweetMediaURL(m?.url), poster: tweetMediaURL(m?.thumb) })).filter(m => m.src).slice(0, 4);
  if (!items.length) return '';
  return `<div class="tw-media n${items.length}">${items.map(m => m.type === 'video' || (m.type === 'gif' && /\.mp4(\?|$)/.test(m.src))
    ? `<video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} ${m.type === 'gif' && !reducedMotion() ? 'autoplay loop muted' : 'controls'} playsinline preload="none"></video>`
    : `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(m.src)}" alt="Media from the X post">`).join('')}</div>`;
}
function tweetCard(t) {
  const handle = /^[A-Za-z0-9_]{1,15}$/.test(t.author_handle || '') ? t.author_handle : '';
  const url = t.snapshot_source === 'demo' ? '' : safeURL(t.url), av = tweetAvatarURL(t.author_avatar);
  return `<blockquote class="tw-card"><header>${av ? `<img class="tw-av" src="${esc(av)}" referrerpolicy="no-referrer" alt="">` : '<span class="tw-av" aria-hidden="true">𝕏</span>'}<div class="tw-who"><b>${esc(t.author_name || handle || 'X user')}</b><small>@${esc(handle || 'unknown')}${t.tweeted_at ? ' · ' + relTime(t.tweeted_at) : ''}</small></div>${url ? `<a class="tw-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Open on X">𝕏 ↗</a>` : ''}</header>${t.text ? `<p>${esc(t.text)}</p>` : ''}${tweetMediaHTML(t.media)}${tweetMetrics(t.metrics)}${{ demo: 'Fictional demo snapshot', stub: 'Demo mode: the full snapshot is saved once the site is live', oembed: 'Text-only snapshot' }[t.snapshot_source] ? `<small class="tw-note">${{ demo: 'Fictional demo snapshot', stub: 'Demo mode: the full snapshot is saved once the site is live', oembed: 'Text-only snapshot' }[t.snapshot_source]}</small>` : ''}</blockquote>`;
}
function tweetStack(p) {
  const tweets = tweetsOf(p);
  if (!tweets.length) return '';
  return `<div class="tweet-stack ${tweets.length > 1 ? 'is-thread' : ''}">${tweets.length > 1 ? `<div class="tw-thread-label">🧵 THREAD · ${tweets.length} POSTS</div>` : ''}${tweets.map(tweetCard).join('')}</div>`;
}
function postCard(p, prefix = '') {
  const a = authorOf(p), g = postGang(p), v = voteInfo(p), pending = p.status === 'pending', mine = liked(p), id = esc(p.id);
  const url = p.x_url && !String(p.id).startsWith('demo-') ? safeURL(p.x_url) : '';
  const title = titleFor(lifetimePoints(p.user_id), a.title);
  const lead = tweetsOf(p)[0];
  const media = lead ? tweetStack(p) + (safeImg(p.image_url) ? posterMedia(p) : '') : posterMedia(p);
  // Desk descriptions are "note + tweet text"; the snapshot already shows the text, so don't repeat it.
  const desc = lead?.text && (p.description || '').includes(lead.text) ? p.description.replace(lead.text, '').trim() : (p.description || '');
  return `<article class="post-card case-card ${g === 'balaks' ? 'case-balak' : 'case-batak'} ${isDeskPost(p) ? 'desk-post' : ''}" id="${prefix}post-${id}"><div class="post-top"><a class="post-author" href="#/u/${esc(a.handle)}">${cssAvatar(a, 'post-avatar')}<div><strong>@${esc(a.handle || 'anonymous')}</strong><div class="post-subline"><span class="tiny-gang ${g === 'balaks' ? 'red-gang' : 'blue-gang'}">${g === 'balaks' ? '🔴 BALAK' : '🔵 BATAK'}</span><span class="tiny-title">${esc(title)}</span><span>· ${relTime(p.created_at)}</span></div></div></a><div class="post-stamps"><span class="case-label">${pending ? '⏳ Under review' : isDeskPost(p) ? '📡 KALESH DESK' : url ? '𝕏 Timeline' : 'Kalesh file'}</span></div></div><h3>${esc(p.title)}</h3>${desc ? `<p class="post-description">${esc(desc)}</p>` : ''}${xStatusId(url) ? `<button type="button" class="x-preview-button" data-action="x-media" data-id="${id}">𝕏 Preview original post &amp; media</button>` : ''}${media}${url ?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" class="x-source">𝕏 VIEW ORIGINAL POST <span>↗</span></a>` : `<div class="fiction-tag">${p.id.startsWith('demo-') ? '🎭 FICTIONAL DEMO POST' : '🖼 ORIGINAL MEME POST'}</div>`}${xBadge(a) ? `<div class="post-xline">${xBadge(a)}</div>` : ''}<div class="post-tags">${postTopics(p).filter(t => /^[\p{L}\p{N}_-]{1,24}$/u.test(t)).slice(0, 5).map(t => `<a class="topic-chip" href="#/topic/${esc(t)}">#${esc(t)}</a>`).join('')}</div><div class="post-actions"><button type="button" data-action="toggle-spice" data-id="${id}" aria-controls="${prefix}spice-${id}" class="spice-button" ${pending || !me() ? 'disabled' : ''} aria-expanded="false"><span>🌶️</span> ${v.mine ? `Your rating: ${v.mine}/10` : 'Rate this'} <small>${v.count ? `${v.avg.toFixed(1)} avg · ${v.count}` : 'No ratings yet'}</small><span class="vote-chevron">▾</span></button><button type="button" class="action-pill ${mine ? 'is-liked' : ''}" data-action="like" data-id="${id}" ${pending || !me() ? 'disabled' : ''} aria-pressed="${mine}">🔥 ${short(likeCount(p))}</button><button type="button" class="action-pill" data-action="share" data-id="${id}" title="Share kalesh">↗ SHARE</button><button type="button" class="action-pill action-report" data-action="report" data-id="${id}" ${!me() ? 'disabled' : ''} aria-label="Report this post" title="Report this post">⚑</button></div><div class="spice-options" id="${prefix}spice-${id}" hidden><div class="spice-options-title">KITNA MASALEDAR? ${v.mine ? `<small>Your vote: ${v.mine}</small>` : ''}</div><div class="spice-grid">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-action="vote" data-id="${id}" data-value="${i + 1}" aria-label="Rate ${i + 1} out of 10" class="${v.mine === i + 1 ? 'voted' : ''}">${i + 1}</button>`).join('')}</div><small>Rate the absurdity, not harassment. One vote per account.</small></div></article>`;
}
function highlights() {
  const p = controversyOfDay(), m = dailyMeme();
  return `<section class="features-row daily-awards" aria-label="Daily awards"><button class="feature feature-yellow" type="button" data-action="daily-meme"><img class="feature-meme" loading="lazy" src="${esc((memeImage(m, true) || 'assets/memes/monkey.jpg'))}" alt=""><span><small>Daily pick</small><strong>Meme of the day</strong><em>${esc(m[1])}</em></span></button><button class="feature feature-red" type="button" data-action="scroll-post" data-id="${esc(p?.id || '')}"><span class="feature-icon">🏆</span><span><small>Rashtriya Kalesh Puraskar</small><strong>Controversy of the day</strong><em>${esc(p?.title || 'No community pick yet')}</em></span></button></section>`;
}
function filters() {
  const o = (v, l) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="feed-toolbar"><div class="feed-toolbar-title"><span class="feed-star">✷</span><h2>THE KALESH FEED</h2><span class="live-tag">THE INTERNET IS COOKING</span></div><div class="filters"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search internet stupidity..." value="${esc(S.search)}" autocomplete="off" aria-label="Search controversy feed" /></label><label class="sort-wrap">SORT BY <select id="sort" aria-label="Sort controversies">${o('newest', 'Newest first ↓')}${o('oldest', 'Oldest first ↑')}${o('trending', 'Trending 🔥')}${o('spicy', 'Spiciest 🌶️')}${o('relevant', 'Relevance ✦')}${o('az', 'Alphabetical A–Z')}${o('za', 'Alphabetical Z–A')}${o('balaks', 'Balaks only 🔴')}${o('bataks', 'Bataks only 🔵')}</select></label></div></div>`;
}
const TOPICS = [
  ['bangalore', '☕ Bangalore Anna Battles', /\b(bengaluru|bangalor(?:e|ean)|bangaloreans|namma|tech park)\b/i],
  ['biryani', '🍚 Hyderabadi Biryani', /\b(biryani|biriyani|hyderabad(?:i)?)\b/i],
  ['cinema', '🎬 Cinema & fandom', /\b(cinema|fandom|bollywood|movie|trailer)\b/i],
  ['discourse', '📢 Timeline drama', /\b(discourse|drama|groupchat|group chat|apology|threads?)\b/i]
];
const topicOf = () => route().match(/^\/topic\/([\p{L}\p{N}_-]{1,24})$/u)?.[1] || '';
function postTopics(p) {
  const tags = p.tags || [];
  const copy = [p.title, p.description, ...tags].join(' ');
  return [...new Set([...tags, ...TOPICS.filter(([, , test]) => test.test(copy)).map(([id]) => id)])];
}
function topicsNav() {
  const selected = topicOf();
  const options = [['', '✦ All topics'], ...TOPICS];
  if (selected && !options.some(([id]) => id === selected)) options.push([selected, '#' + selected]);
  return `<nav class="topic-strip" aria-label="Topics">${options.map(([id, label]) => `<a href="#${id ? '/topic/' + id : '/'}" ${id === selected ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>`;
}
function sortedPosts() {
  const q = S.search.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  let list = allPosts().filter(p => p.status !== 'rejected' && (p.status === 'published' || p.user_id === me()?.id));
  const topic = topicOf();
  if (topic) list = list.filter(p => postTopics(p).includes(topic));
  if (q) list = list.filter(p => { const a = authorOf(p); const hay = [p.title, p.description, a.handle, a.x_username, a.x_claimed, ...(p.tags || [])].join(' ').toLowerCase(); return hay.includes(q) || words.every(w => hay.includes(w)); });
  if (S.sort === 'balaks' || S.sort === 'bataks') list = list.filter(p => postGang(p) === S.sort);
  const rel = p => { let s = 0; for (const w of words) { if (p.title.toLowerCase().includes(w)) s += 5; if (p.description.toLowerCase().includes(w)) s += 2; if ((p.tags || []).some(t => t.includes(w))) s += 3; } return s + voteInfo(p).avg * 0.1; };
  const by = { oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at), az: (a, b) => a.title.localeCompare(b.title), za: (a, b) => b.title.localeCompare(a.title), spicy: (a, b) => voteInfo(b).avg - voteInfo(a).avg, trending: (a, b) => trendScore(b) - trendScore(a), relevant: (a, b) => rel(b) - rel(a) };
  return list.sort(by[S.sort] || ((a, b) => new Date(b.created_at) - new Date(a.created_at)));
}
function trendScore(p) {
  const v = voteInfo(p), age = Math.max(0, Date.now() - new Date(p.created_at)) / 36e5;
  return (8 + v.avg * v.count + likeCount(p) * 0.05) / Math.pow(age + 2, 0.8);
}
function gangSpotlight(gang) {
  const leaders = rankings().authors.filter(u => u.gang === gang).slice(0, 3);
  return `<header class="gang-spotlight ${gang}"><a href="#/${gang}">${gang.toUpperCase()}</a><ol>${leaders.map((u, i) => `<li><a class="winner-name" href="#/u/${esc(u.handle)}">${['🥇','🥈','🥉'][i]} @${esc(u.handle)}</a> <small>${u.points} CP</small></li>`).join('') || '<li>No ranked contributors yet</li>'}</ol></header>`;
}
function feedHTML() {
  const activeGang = ['/balaks', '/bataks'].includes(route()) ? route().slice(1) : null;
  const selectedGang = ['balaks', 'bataks'].includes(S.sort) ? S.sort : null;
  const gangs = activeGang ? [activeGang] : selectedGang ? [selectedGang] : ['balaks', 'bataks'];
  const posts = sortedPosts();
  return `<div class="gang-feed ${gangs.length === 1 ? 'one-gang' : ''}">${gangs.map(gang => `<section>${gangSpotlight(gang)}<div class="feed-list">${posts.filter(p => postGang(p) === gang).map(p => postCard(p)).join('') || `<p class="empty">${esc(C.fourthWall.empty[(topicOf().length + Number(gang === 'bataks')) % C.fourthWall.empty.length])}</p>`}</div></section>`).join('')}</div>`;
}
function home() {
  const topic = topicOf();
  const label = TOPICS.find(([id]) => id === topic)?.[1] || '#' + topic;
  return shell(`<section class="cinema-masthead ${topic ? 'topic-masthead' : ''}"><div><p class="cinema-kicker">Aaj ka tamasha</p>${topic ? `<h1>${esc(label)}</h1>` : '<h1>THE KALESH<br><em>SHOW.</em></h1>'}</div><button class="cinema-bomb" type="button" data-action="bomb">💣 Meme Bomb</button></section>
  ${topicsNav()}${topicOf() ? '' : xDesk() + warDesk() + '<div id="trending-reel">' + memeStrip(true) + '</div>'}${highlights()}<div class="content-grid"><div class="main-column">${filters()}<div id="feed" class="feed-list">${feedHTML()}</div></div>${sidebar()}</div>`);
}
const warMoments = [
  'Treaty collapsed after someone ordered pineapple on the biryani.',
  'Both gangs agreed to a ceasefire. Nobody agreed on whose screenshot came first.',
  'Balaks sent a voice note. Bataks are waiting for the transcript.',
  'Live from the group chat: both admins have gone “offline” at the same time.',
  'Neutral cat has seized both gangs’ snacks pending investigation.'
];
let warMoment = Math.floor(Math.random() * warMoments.length);
function warDesk(compact = false) {
  return `<section class="war-desk ${compact ? 'war-compact' : ''}"><div><h2>Balaks vs Bataks</h2><p class="war-line" role="status">${esc(warMoments[warMoment])}</p></div><div class="war-actions"><button type="button" data-action="war-taunt" data-id="balaks">🔴 Taunt Balaks</button><button type="button" data-action="war-taunt" data-id="bataks">🦆 Taunt Bataks</button><button type="button" data-action="war-next">📡 Next dispatch</button></div></section>`;
}
function nextWarMoment() {
  warMoment = (warMoment + 1 + Math.floor(Math.random() * (warMoments.length - 1))) % warMoments.length;
  document.querySelectorAll('.war-line').forEach(line => { line.textContent = warMoments[warMoment]; });
}
const gangTaunts = {
  balaks: ['Balaks brought a spreadsheet to a meme fight.', 'Balaks called for backup. Mummy answered.'],
  bataks: ['Bataks held a press conference. Full transcript: quack.', 'Bataks union demands bread before further negotiations.']
};
const gangReplies = {
  balaks: ['Balaks appeal on the grounds of “mummy, woh pehle shuru hua.”', 'Balaks hereby rename the loss a strategy meeting.'],
  bataks: ['Bataks respond with one wet screenshot and six voice notes.', 'Bataks are putting this in the pond group chat.']
};
function gangRound(gang) {
  if (!Object.hasOwn(gangTaunts, gang)) return;
  nextWarMoment();
  SFX.play('hit');
  overlay(dialog('Gang rivalry', '📡 GANG WAR BULLETIN', `<div class="dialog-body"><h2>Taunt ${gang === 'balaks' ? 'Balaks' : 'Bataks'}</h2><p id="war-play" role="status">${esc(pick(gangTaunts[gang]))}</p><div class="council-actions"><button type="button" class="button button-red" data-action="war-reply" data-id="${gang}">Hear their comeback</button><button type="button" class="button button-black" data-action="close">Declare chai break</button></div></div>`));
}
const endings = {
  wifi: 'Wi-Fi saved. Earth got one extra day because the router refused to restart.',
  mummy: 'Mummy postponed the apocalypse until you put the clothes away.',
  cats: 'The cats inherited Earth. They immediately knocked the moon off the table.'
};
function prophecy() {
  overlay(dialog('Pick a 2026 ending', '🌎 26 ME DUNIYA KHATAM.EXE', `<div class="dialog-body"><h2>One minute left. Kisko bachayega?</h2><p id="prophecy-result" role="status">Choose what survives the end of the internet.</p><div class="council-actions"><button type="button" class="button button-red" data-action="ending" data-id="wifi">Save the Wi-Fi</button><button type="button" class="button button-black" data-action="ending" data-id="mummy">Call Mummy</button><button type="button" class="button button-black" data-action="ending" data-id="cats">Hand Earth to the cats</button></div></div>`));
}
const playfulActions = new Set(['bomb', 'siren', 'prophecy', 'cat-rain', 'war-taunt', 'war-next', 'war-reply', 'ending', 'court-plea']);
const actionTaps = new Map();
function spammed(action) {
  if (!playfulActions.has(action)) return false;
  const now = performance.now();
  const tap = actionTaps.get(action) || { started: now, count: 0, until: 0 };
  if (tap.until > now) return true;
  if (now - tap.started > 2500) Object.assign(tap, { started: now, count: 0 });
  actionTaps.set(action, tap);
  if (++tap.count < 5) return false;
  tap.until = now + 3000;
  notice('✋ Button ne mummy ko call kar diya. Chai break for 3 seconds.');
  return true;
}
let lastActivity = Date.now();
function markActivity() { lastActivity = Date.now(); }
for (const event of ['pointerdown', 'keydown', 'scroll', 'input', 'visibilitychange', 'focusin']) {
  document.addEventListener(event, markActivity, { passive: true, capture: true });
}
setInterval(() => {
  if (document.hidden || !Chaos.on || !me() || $('#overlays').firstChild || document.activeElement?.matches('input, textarea, select, [contenteditable]') || Date.now() - lastActivity < 120000) return;
  overlay(dialog('Chai break', '☕ STILL HERE?', `<div class="dialog-body"><h2>${esc(pick(['Mummy ko pata hai tu kya kar raha hai?', 'Bhai, screen time ka bhi lunch break hota hai.', 'The cat has been covering your shift.']))}</h2><button type="button" class="button button-red" data-action="close">Haan bhai, I’m back</button></div>`));
  markActivity();
}, 5000);

function xDesk() {
  const recent = recentReports();
  const linked = [...new Set([...recent.filter(p => xStatusId(p.x_url)), ...recent])].slice(0, 6);
  return `<section class="x-desk"><div class="x-desk-cover"><span>𝕏 · THE TIMELINE</span><h2>Internet pe kya kalesh hai?</h2><p>The community desk for controversies from X.</p><button type="button" data-action="open-post" class="button button-red">Add an X post</button></div>
    <div class="x-desk-list"><nav aria-label="Jump to a section"><a href="#/balaks">Balaks</a><a href="#/bataks">Bataks</a><a href="#/news">Kalesh Tak</a><a href="#/cat-council">Cat Courtroom</a></nav>
    ${linked.map(p => `<button type="button" data-action="scroll-post" data-id="${esc(p.id)}">${esc(p.title)}</button>`).join('') || '<p>Got a public X link? Drop it here to start the coverage.</p>'}
    <button type="button" data-action="surprise" class="x-ticket">🎟 Mystery ticket</button></div></section>`;
}

/* ───────────────────────── news page (KALESH TAK) ───────────────────────── */
function newsPage() {
  const top = recentReports()[0];
  const list = allPosts().filter(p => p.status === 'published').slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg).slice(0, 6);
  return shell(`<section class="news-studio">
    <div class="studio-top"><div class="channel-logo">KALESH<span>TAK</span></div><div class="studio-slogan">SABSE PEHLE · SABSE TEZ · SABSE FALTU</div><div class="live-badge"><i></i> LIVE</div></div>
    <div class="studio-main">
      <div class="anchor-desk"><div class="anchor">🎙️</div><div class="anchor-bubble" id="anchor-line">DESH JAANNA CHAHTA HAI!</div></div>
      <div class="studio-headline"><span class="sh-label">SABSE BADI KHABAR</span><h1>${top ? esc(top.title) : 'AAJ KOI KALESH NAHI HUA. YEH APNE AAP MEIN KHABAR HAI.'}</h1>${top ? `<p>— @${esc(authorOf(top).handle)} ki report · 🌶️ ${voteInfo(top).avg.toFixed(1)}/10</p>` : ''}
        <div class="studio-actions"><button type="button" class="btn btn-hot" data-action="siren">🚨 SIREN BAJAO</button><button type="button" class="btn btn-gold" data-action="breaking">📢 BREAKING NEWS DO</button><button type="button" class="btn btn-ink" data-action="drama">📺 DRAMATIC ZOOM</button></div></div>
    </div>
    ${broadcastDesk()}
    ${top && matchedMeme(top) ? `<figure class="news-meme"><img src="${esc(memeImage(matchedMeme(top)))}" alt=""><figcaption>${esc(matchedMeme(top)[1])} · ${esc(top.title)}</figcaption></figure>` : ''}
    <div class="lower-third"><span>MAHABAHAS</span><b>AAJ KA SAWAAL: KYA YEH KALESH ZAROORI THA?</b></div>
    <div class="debate-grid">${C.panel.map((p, i) => `<div class="debate-box" data-i="${i}"><div class="db-face">${p.emoji}</div><div class="db-name">${esc(p.name)}<small>${esc(p.role)}</small></div><div class="db-bubble" id="db-${i}">${esc(p.lines[0])}</div></div>`).join('')}</div>
    <div class="news-list"><div class="panel-head red"><span>📰 TOP KHABREIN</span><span class="pixel">AUTO-GENERATED BAKCHODI</span></div>
      ${list.map((p, i) => `<button type="button" class="news-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="nr-num">${i + 1}</span><span class="nr-text"><small>SOOTRON KE HAWALE SE · @${esc(authorOf(p).handle)}</small>${esc(p.title)}</span><b>🌶️ ${voteInfo(p).avg.toFixed(1)}</b></button>`).join('') || '<p class="padded">Koi khabar nahi. Anchor bore ho raha hai.</p>'}
    </div>
  </section>`);
}
function broadcastDesk() {
  return `<section class="broadcast-desk" aria-label="Soundboard and meme references">
    <div class="broadcast-cover"><div><small>KALESH TAK · CONTROL ROOM</small><h2>Mic check, bhai.</h2></div></div>
    <div class="broadcast-controls"><h3>Channel shuffle</h3><p>Ek click. Random meme, random sound. Awaaz on karo to hear it.</p><button type="button" class="button button-red" data-action="bomb">Shuffle broadcast</button></div></section>`;
}
function startPanel() {
  clearInterval(S.panelTimer);
  if (route() !== '/news') return;
  let round = 0;
  const update = () => {
    const reports = recentReports();
    C.panel.forEach((person, i) => {
      const el = document.getElementById('db-' + i);
      if (!el) return;
      const post = reports[(round + i) % reports.length];
      el.textContent = post ? `${person.lines[round % person.lines.length]} “${post.title}”` : person.lines[round % person.lines.length];
    });
    const anchor = $('#anchor-line');
    if (anchor && reports.length) anchor.textContent = `Ab baat karte hain: ${reports[round % reports.length].title}`;
    round++;
  };
  update();
  S.panelTimer = setInterval(update, 11000);
}

/* ───────────────────────── leaderboard (v1 layout + titles + week/all) ───────────────────────── */
function leaderboard() {
  const r = rankings(S.board), sum = r.gangs.balaks + r.gangs.bataks || 1;
  const hot = allPosts().filter(p => p.status === 'published').slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg).slice(0, 5);
  return shell(`<div class="page-title editorial-heading"><span class="title-badge">★ CERTIFIED FALTU COMPETITION ★</span><h1>Kalesh <span>leaderboard</span></h1><p>Hundreds of opinions. Zero trophies worth explaining to your parents.</p></div>
  <div class="board-tabs" role="tablist"><button type="button" role="tab" aria-selected="${S.board === 'week'}" data-action="board" data-board="week" class="${S.board === 'week' ? 'on' : ''}">IS HAFTE</button><button type="button" role="tab" aria-selected="${S.board === 'all'}" data-action="board" data-board="all" class="${S.board === 'all' ? 'on' : ''}">ALL TIME</button></div>
  <section class="war-banner"><div class="war-side balak-war"><span>🔴 GANG 01</span><h2>BALAKS</h2><strong>${r.gangs.balaks} <small>CP</small></strong></div><div class="vs-burst">VS</div><div class="war-side batak-war"><span>🔵 GANG 02</span><h2>BATAKS</h2><strong>${r.gangs.bataks} <small>CP</small></strong></div><div class="war-progress"><i style="width:${Math.round(r.gangs.balaks / sum * 100)}%"></i></div></section>
  <div class="leader-grid"><section class="leader-board"><div class="section-ribbon">🏅 TOP CONTRIBUTORS — NALLA SUPREME</div>${r.authors.length ? r.authors.slice(0, 25).map((u, i) => `<a class="leader-row" href="#/u/${esc(u.handle)}"><span class="leader-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : ('#' + (i + 1))}</span>${cssAvatar(u)}<div class="leader-user"><strong>@${esc(u.handle)}</strong><small>${u.gang === 'balaks' ? '🔴 BALAK' : '🔵 BATAK'} · ${esc(titleFor(lifetimePoints(u.id), u.title))} · ${u.posts} posts</small></div><span class="leader-points">${u.points} CP</span></a>`).join('') : '<p class="muted padded">No contributors yet. Become the first.</p>'}</section><section class="leader-board"><div class="section-ribbon section-ribbon-blue">🌶️ SPICIEST CONTROVERSIES</div>${hot.length ? hot.map((p, i) => `<button type="button" class="hot-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="hot-rank">${i + 1}.</span><span class="hot-name">${esc(p.title)}</span><strong>${voteInfo(p).avg.toFixed(1)} 🌶️</strong></button>`).join('') : '<p class="muted padded">Nobody has posted any kalesh yet.</p>'}</section></div><div class="leader-footnote">Scores = 10 per approved original post + up to 40 spice points after 3 unique votes. Gang war resets every Monday (UTC). Titles: ${C.titles.map(t => `${t[0]}+ ${t[1]}`).join(' · ')}.</div>`);
}

/* ───────────────────────── my profile (v1 layout + handles/titles/X/bio) ───────────────────────── */
function profilePage() {
  const u = me(), mine = allPosts().filter(p => p.user_id === u.id), score = lifetimePoints(u.id);
  const link = location.href.split('#')[0] + '#/u/' + u.handle;
  const secret = k => ['cat', 'typist', 'lost'].includes(k);
  return shell(`<div class="page-title editorial-heading"><span class="title-badge">✦ DEPARTMENT OF PERSONAL NONSENSE ✦</span><h1>Apna <span>profile</span></h1><p>Your gang, your posts, your internet ka record.</p></div>
  <div class="profile-grid"><section class="profile-panel"><div class="profile-banner ${esc(u.gang)}"><span class="fake-stamp">CERTIFIED NALLA</span></div><div class="profile-body"><div class="profile-big-avatar">${cssAvatar(u)}</div><h2>@${esc(u.handle)}</h2><span class="gang-profile ${u.gang === 'balaks' ? 'red-gang' : 'blue-gang'}">${u.gang === 'balaks' ? '🔴 TEAM BALAKS' : '🔵 TEAM BATAKS'}</span><div class="profile-title-line">🎖 ${esc(titleFor(score, u.title))}</div>${xBadge(u) ? `<div class="post-xline">${xBadge(u)}</div>` : ''}<p>${u.bio ? esc(u.bio) : 'Officially contributing to the downfall of meaningful conversation since 2026.'}</p>
    ${warDesk(true)}<div class="profile-actions"><a class="button button-black" href="#/u/${esc(u.handle)}">Open public profile &amp; guestbook</a><button type="button" class="button button-black" data-action="edit-avatar">😼 EDIT MEME AVATAR</button><button type="button" class="button button-black" data-action="edit-bio">✍️ EDIT BIO${u.x_username ? '' : ' &amp; X HANDLE'}</button><button type="button" class="button button-red" data-action="copy-link" data-link="${esc(link)}">🔗 COPY PROFILE LINK</button><button type="button" class="button button-black" data-action="betray">🐍 SWITCH GANG</button></div>
    <button type="button" class="link-logout" data-action="logout">${S.mode === 'demo' ? 'Exit demo' : 'Sign out'} ↗</button></div></section>
  <section class="profile-stats"><div class="stat-grid"><div><span>CONTRIBUTION POINTS</span><strong>${score}</strong><small>internet money (worth ₹0)</small></div><div><span>POSTS SUBMITTED</span><strong>${mine.length}</strong><small>hours you won't get back</small></div></div><div class="profile-achievements"><div class="widget-heading">🎖 YOUR FAKE AWARDS · ${Object.keys(ach).length}/${Object.keys(ACH).length}</div><div class="achievements">${Object.entries(ACH).map(([k, [e, t, d]]) => ach[k] ? `<div>${e} <b>${t}</b><small>${d}</small></div>` : `<div class="locked">🔒 <b>${secret(k) ? 'SECRET ACHIEVEMENT' : t}</b><small>${secret(k) ? 'Something smells like cat...' : d}</small></div>`).join('')}</div></div></section></div>
  <section class="my-posts"><div class="section-ribbon">MY CONTRIBUTIONS TO INTERNET NONSENSE</div>${mine.length ? mine.map(p => `<div class="my-post-row"><span>${esc(p.title)}</span><small>${p.status === 'pending' ? '⏳ Pending review' : p.status === 'rejected' ? '❌ Rejected' : postPoints(p) + ' CP'}</small></div>`).join('') : '<div class="empty-small">🐈 You have posted nothing. The internet thanks you.</div>'}</section>`);
}

/* ───────────────────────── public profiles (film poster, dark page) ───────────────────────── */
function profilePoster(a, { points = 0, posts = 0, reserved = false } = {}) {
  const title = titleFor(points, a.title);
  return `<div class="profile-poster ${a.gang || 'nogang'}">
    <div class="pp-cert">CBFC · CERTIFIED NALLA · ${a.gang ? a.gang.toUpperCase() : 'UNALIGNED'}</div>
    <div class="pp-presents">KALESH.EXE PRESENTS</div>
    <div class="pp-avatar">${avatar(a)}</div>
    <div class="pp-name">@${esc(a.handle)}</div>
    <div class="pp-as">IN &amp; AS</div>
    <div class="pp-title">${esc(title)}</div>
    ${a.bio ? `<p class="pp-bio">${esc(a.bio)}</p>` : ''}
    <div class="pp-x">${xBadge(a)}</div>
    <div class="pp-stats"><div><b>${points}</b><small>KALESH POINTS</small></div><div><b>${posts}</b><small>KALESH FILED</small></div><div><b>${a.gang ? (a.gang === 'balaks' ? '🔴' : '🔵') : '—'}</b><small>${a.gang ? a.gang.toUpperCase() : 'NO GANG'}</small></div></div>
    <div class="pp-credits">MUSIC <b>MOYE MOYE</b> · STORY <b>THE TIMELINE</b> · DIRECTED BY <b>UNEMPLOYMENT</b>${reserved ? '' : ' · IN CINEMAS NEVER'}</div>
  </div>`;
}
function publicProfile(handle) {
  const pp = S.publicProfile;
  if (!pp || pp.handle !== handle) return shell(`<div class="loading-block"><img src="assets/cat.svg" class="spin-fast" alt=""><p>${esc(pick(C.loading))}</p></div>`);
  if (pp.error) return shell(`<div class="kpage-title"><h1 class="masala-title">SERVER <span>SO GAYA</span></h1><p>Profile load nahi hua. Thodi der baad try karo.</p><a class="btn btn-hot" href="#/">FEED PE WAPAS</a></div>`);
  if (pp.missing) return shell(`<div class="kpage-title"><h1 class="masala-title">@${esc(handle)} <span>NAHI MILA</span></h1><p>Ye nalla abhi tak paida nahi hua. Handle available ho sakta hai.</p><a class="btn btn-hot" href="#/">FEED PE WAPAS</a></div>`);
  if (pp.reserved) {
    const r = pp.reserved, mine = me()?.x_username && me().x_username.toLowerCase() === (r.x_username || '').toLowerCase();
    return shell(`<div class="kprofile-grid">${profilePoster({ handle: r.handle, avatar_emoji: r.avatar_emoji, title: r.title, bio: r.bio }, { reserved: true })}
      <section class="panel claim-panel"><div class="panel-head red"><span>🎟 RESERVED PROFILE</span></div>
        <h2>YE POSTER @${esc(r.x_username)} KE LIYE BANA HAI.</h2>
        <p>Handle <b>@${esc(r.handle)}</b> aur title <b>“${esc(r.title || 'VIP Nalla')}”</b> reserved hai. Sirf X account <b>@${esc(r.x_username)}</b> se login karke hi claim ho sakta hai.</p>
        ${mine ? '<button type="button" class="btn btn-hot btn-wide" data-action="claim-reserved">👑 CLAIM KARO</button>' : S.mode === 'live' && !S.session ? '<button type="button" class="btn btn-ink btn-wide" data-action="login-x">𝕏 IS THIS YOU? LOGIN WITH X TO CLAIM</button>' : S.mode === 'demo' || !configured ? '<p class="fine">Demo mode: X claiming needs live mode with X login configured.</p>' : '<p class="fine">Aap is X account se logged in nahi ho.</p>'}
      </section></div>${warDesk(true)}`);
  }
  const a = pp.profile, posts = allPosts().filter(p => p.user_id === a.id && p.status === 'published');
  return shell(`<div class="kprofile-grid">${profilePoster(a, { points: lifetimePoints(a.id), posts: posts.length })}
    <section class="panel"><div class="panel-head red"><span>📼 FILMOGRAPHY</span><button type="button" class="link-btn" data-action="copy-link" data-link="${esc(location.href)}">🔗 COPY LINK</button></div>
    ${posts.map(p => `<button type="button" class="news-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="nr-text">${esc(p.title)}</span><b>🌶️ ${voteInfo(p).avg.toFixed(1)}</b></button>`).join('') || '<p class="padded">Abhi tak koi kalesh nahi. Shareef aadmi lagta hai.</p>'}</section></div>${warDesk(true)}${guestbook(pp)}`);
}
function guestbook(pp) {
  if (!pp.profile) return '';
  const notes = pp.notes || [];
  const myId = me()?.id;
  return `<section class="profile-guestbook"><h2>Guestbook</h2>${pp.notesError ? '<p>Guestbook unavailable.</p>' : `
    ${notes.map(n => `<article><strong>@${esc(n.author?.handle || 'guest')}</strong><p>${esc(n.message)}</p>${myId && [n.author_id, pp.profile.id].includes(myId) ? `<button type="button" data-action="delete-note" data-id="${esc(n.id)}">Remove note</button>` : ''}</article>`).join('') || '<p>Abhi tak koi note nahi.</p>'}
    ${myId && myId !== pp.profile.id && !notes.some(n => n.author_id === myId) ? '<form id="guestbook-form"><label>Leave a note <textarea name="note" required minlength="2" maxlength="180"></textarea></label><button type="submit" class="button button-red">Sign guestbook</button></form>' : ''}`}</section>`;
}
async function changeGuestbook(message, deleteId) {
  const pp = S.publicProfile, u = me();
  if (!pp?.profile || !u || pp.notesError) return;
  if (S.mode === 'demo') {
    store.notes ||= [];
    if (deleteId) store.notes = store.notes.filter(n => n.id !== deleteId || (n.author_id !== u.id && n.profile_id !== u.id));
    else if (!store.notes.some(n => n.profile_id === pp.profile.id && n.author_id === u.id) && pp.profile.id !== u.id) {
      store.notes.unshift({ id: makeId(), profile_id: pp.profile.id, author_id: u.id, author: { handle: u.handle }, message });
    }
    saveStore();
  } else if (S.mode === 'live') {
    const { error } = await (deleteId ? S.sb.from('profile_notes').delete().eq('id', deleteId) :
      S.sb.from('profile_notes').insert({ profile_id: pp.profile.id, author_id: u.id, message }));
    if (error) return notice('Guestbook update failed. Try again.');
  }
  if (route() === '/u/' + pp.handle) await loadPublicProfile(pp.handle);
}
async function loadPublicProfile(handle) {
  S.publicProfile = null;
  let profile = null, reserved = null, error = false;
  if (S.mode === 'demo' || !S.sb) {
    profile = Object.values(peopleById()).find(p => p.handle === handle) || null;
    if (!profile) reserved = (store.reserved || DEMO_RESERVED).find(r => r.handle === handle && !r.claimed_by) || null;
  } else {
    const res = await S.sb.from('profiles').select('id,handle,x_username,x_claimed,avatar_emoji,avatar_url,gang,title,bio').eq('handle', handle).maybeSingle();
    if (res.error) error = true; profile = res.data;
    if (!profile && !error) { const r = await S.sb.from('reserved_handles').select('*').eq('handle', handle).is('claimed_by', null).maybeSingle(); if (r.error) error = true; reserved = r.data; }
  }
  let notes = [], notesError = false;
  if (profile && S.sb && S.mode !== 'demo') {
    const result = await S.sb.from('profile_notes').select('id,author_id,message,author:profiles!profile_notes_author_id_fkey(handle)').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(50);
    notes = result.data || []; notesError = !!result.error;
  } else if (profile) notes = (store.notes || []).filter(n => n.profile_id === profile.id);
  if (route() !== '/u/' + handle) return;
  S.publicProfile = { handle, profile, reserved, error, notes, notesError, missing: !error && !profile && !reserved };
  if (route() === '/u/' + handle) render();
}

/* ───────────────────────── onboarding screens ───────────────────────── */
function authPanel() {
  const signup = S.authTab !== 'login', live = !!S.sb;
  return `<section class="login-panel"><div class="login-panel-inner">
      <p class="cinema-kicker">Entry pass</p>
      <h2>Enter the<br><span>kand.</span></h2>
      <div class="auth-tabs" role="tablist" aria-label="Sign up or log in">
        <button type="button" role="tab" aria-selected="${signup}" class="${signup ? 'on' : ''}" data-action="auth-tab" data-id="signup">Naya khiladi</button>
        <button type="button" role="tab" aria-selected="${!signup}" class="${signup ? '' : 'on'}" data-action="auth-tab" data-id="login">Wapas aaya</button>
      </div>
      <form id="pass-form" class="pass-form" data-mode="${signup ? 'signup' : 'login'}" autocomplete="on" novalidate>
        <label for="user-in">USERNAME</label>
        <div class="pass-handle"><span>@</span><input id="user-in" name="username" required maxlength="20" autocapitalize="none" spellcheck="false" autocomplete="username" placeholder="billi_ceo" value="${esc(S.authUser || '')}"></div>
        <label for="pass-in">PASSWORD</label>
        <input id="pass-in" name="password" type="password" required minlength="8" maxlength="72" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'kam se kam 8 characters' : '••••••••'}">
        ${signup ? `<label for="pass2-in">PASSWORD PHIR SE</label><input id="pass2-in" name="password2" type="password" required minlength="8" maxlength="72" autocomplete="new-password">` : ''}
        <p id="pass-status" class="pass-status" role="status">${signup ? 'Username 3–20 chars · a-z 0-9 _ · permanent hai, soch ke rakhna' : ''}</p>
        <button type="submit" class="button button-red button-wide">${signup ? '▶ Account banao' : '▶ Andar aao'}</button>
      </form>
      ${signup && live ? '<p class="login-footnote">Password bhool gaye toh recovery email nahi hai, admin se reset karwana padega. Yaad rakhna.</p>' : ''}
      ${live ? `<div class="auth-or">ya phir</div><button type="button" class="button button-black button-wide" data-action="login-x">𝕏 Continue with X</button>` : `<p class="login-footnote">${configured ? 'Server se connect nahi hua. Demo chal raha hai.' : 'Preview mode: account sirf is browser mein banega.'}</p>`}
      <button type="button" class="auth-demo" data-action="enter-demo">🐈 Sirf dekhna hai? Demo mein ghuso</button>
    </div></section>`;
}
function loginPage() {
  const panel = authPanel();
  return `<main class="cinema-entrance">
    <header class="cinema-bar"><a href="#/" class="cinema-wordmark">KALESH<span>.EXE</span></a><div><button type="button" data-action="intermission">▶ Intermission</button><button type="button" data-action="sound" aria-pressed="${SFX.enabled}">${soundLabel()}</button></div></header>
    <div class="cinema-grid">
      <section class="cinema-poster" aria-label="Kalesh cinema poster"><div class="cinema-billing"><p class="cinema-kicker">Balaks vs Bataks</p><h1>KALESH<span>.EXE</span></h1><p>Two gangs. Infinite kalesh.</p></div></section>
      <div class="cinema-side">${panel}<button type="button" class="cinema-bomb" data-action="bomb">💣 Drop a meme bomb</button></div>
    </div>
    ${memeStrip()}<footer class="cinema-prophecy">26 me to duniya khatam h</footer>
  </main>`;
}
function claimPage() {
  const u = me(), suggest = cleanHandle(u.x_username || u.suggested || '').replace(/[^a-z0-9_]/g, '').slice(0, 20);
  return `<div class="center-page arcade-bg"><section class="name-entry">
    <div class="ne-top">NEW CHALLENGER APPROACHING!</div>
    <h1>ENTER YOUR NAME</h1>
    <p>Pick your KALESH.EXE handle. Ye permanent hai, soch samajh ke.</p>
    <form id="claim-form" autocomplete="off">
      <div class="ne-input"><span>@</span><input id="handle-in" name="handle" value="${esc(suggest)}" maxlength="20" required pattern="[a-z0-9_]{3,20}" aria-describedby="handle-status" autofocus></div>
      <div id="handle-status" class="ne-status">3–20 chars · a-z 0-9 _</div>
      ${u.x_username ? `<div class="ne-x">𝕏 @${esc(u.x_username)} ✓ <small>verified from your X login</small></div>` : `<label class="ne-xlabel">YOUR X HANDLE <small>(optional · shown as unverified)</small><input name="x_claimed" maxlength="16" placeholder="@yourhandle" value="${esc(u.x_claimed || '')}"></label>`}
      <button type="submit" class="btn btn-hot btn-wide btn-big">▶ CLAIM KARO</button>
    </form>
    <div class="ne-blink blink">PRESS START</div>
  </section></div>`;
}
function gangPage() { return `<div class="onboard-page"><div class="onboard-top">KALESH.EXE <span>CHARACTER SELECTION · LEVEL 01</span></div><h1>CHOOSE YOUR <em>PROBLEM.</em></h1><p>One choice. One gang. Lifetime of pointless arguments. Choose wisely (matlab random).</p><div class="gang-cards"><button class="gang-poster gang-poster-red" data-action="choose-gang" data-gang="balaks" type="button"><span class="gang-poster-top">PLAYER 01 · THE LOUD ONES</span><span class="gang-mascot">🦁</span><strong>BALAKS</strong><em>JOSH 100. LOGIC 0.</em><span class="gang-choose">JOIN BALAKS ↗</span></button><div class="gang-middle-vs">VS</div><button class="gang-poster gang-poster-blue" data-action="choose-gang" data-gang="bataks" type="button"><span class="gang-poster-top">PLAYER 02 · THE QUACK ONES</span><span class="gang-mascot">🦆</span><strong>BATAKS</strong><em>QUACK HARD. THINK LATER.</em><span class="gang-choose">JOIN BATAKS ↗</span></button></div><small class="gang-note">⚠ Gang selection is permanent in this build. No betrayal appeals will be entertained.</small></div>`; }
function notFound() { return `<div class="error-page"><div class="error-system">⚠ CRITICAL INTERNET FAILURE ⚠</div><div class="explosion-stack" aria-hidden="true"><span class="boom b1">💥</span><span class="boom b2">💥</span><span class="boom b3">💥</span><span class="boom b4">💥</span></div><span class="err-number">404</span><h1>YEH PAGE TOH<br/><span>PHAT GAYA.</span></h1><p>Aap galat jagah aa gaye hain. Internet ka map bhi unemployed hai.</p><div class="error-actions"><button class="button button-red" type="button" data-action="go-home">🏠 GHAR BHEJ DO</button><button class="button button-black" type="button" data-action="explode">💥 PHIR SE PHODO</button></div><span class="error-footer">KALESH.EXE HAS STOPPED PRETENDING TO WORK</span></div>`; }
const councilVerdicts = [
  'Guilty of saying “last post” four posts ago.',
  'The Council acquits you. Mummy has appealed.',
  'Sentenced to touch grass. Bail accepted in samosas.',
  'Evidence inconclusive. The judge sat on the case file.',
  'You may leave. Your screen-time report has been subpoenaed.',
  'Case dismissed. The prosecution saw a cardboard box.'
];
let councilIndex = Math.floor(Math.random() * councilVerdicts.length);
let councilTaps = 0;
function catCouncil() {
  const exhibits = media.filter(m => ['K0002', 'K0016', 'K0365', 'G004'].includes(m[7]));
  return shell(`<section class="cat-chamber" aria-labelledby="council-title">
    <div class="council-mast"><div><p class="cinema-kicker">In session · Mummy has been informed</p>
      <h1 id="council-title">Cat Council<br>of Kalesh</h1><p>Accused of one more scroll. Tried by a jury of your peers, if your peers are cats.</p></div>
      <button type="button" class="council-stamp" data-action="council-stamp" aria-label="Inspect the Council seal">🐾<span>PAWTHORIZED</span></button>
    </div>
    <div class="council-evidence" aria-label="Meme evidence">${exhibits.map(m => `<button type="button" data-action="meme-frame" data-id="${media.indexOf(m)}"><img src="${esc(memeImage(m, true))}" alt=""><span>${esc(m[1])}</span></button>`).join('')}</div>
    <section class="council-ruling" aria-labelledby="council-ruling-title"><h2 id="council-ruling-title">The verdict</h2>
      <p id="council-verdict" aria-live="polite">${esc(councilVerdicts[councilIndex])}</p>
      <div class="council-actions"><button type="button" class="button button-red" data-action="council-appeal">⚖️ Appeal to Mummy</button><button type="button" class="button button-black" data-action="cat-rain">🐈 Receive the blessing</button><button type="button" class="button" data-action="council-share">Copy verdict</button></div>
    </section>
    <section class="court-docket"><h2>On the docket</h2><p id="court-result" role="status">The charge: declaring “last post” four posts ago.</p><div class="council-actions"><button type="button" class="button button-red" data-action="court-plea" data-id="guilty">Plead guilty</button><button type="button" class="button button-black" data-action="court-plea" data-id="deny">Call a cat witness</button></div></section>
    <p class="council-exit"><a href="#/">Back to the feed</a> <span>·</span> <button type="button" data-action="council-stamp">Lost property</button></p>
  </section>`);
}

/* ───────────────────────── modals (v1 dialogs) ───────────────────────── */
const dialog = (label, title, body, cls = '') => `<div class="modal-backdrop" data-action="backdrop"><div class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="dialog-bar"><span>${title}</span><button type="button" data-action="close" aria-label="Close">✕</button></div>${body}</div></div>`;
function postModal() {
  return dialog('Post a controversy', '🎬 POST KALESH', `<form id="post-form" class="dialog-body"><h2>Drop the kalesh.</h2><label>YOUR POST<textarea name="text" maxlength="700" rows="3" placeholder="What happened? (optional if you paste an X link)"></textarea></label><label>PUBLIC X LINK<input name="x_url" type="url" placeholder="https://x.com/user/status/123" /></label><details><summary>Add topics or a meme image</summary><label>Tags <input name="tags" maxlength="140" placeholder="bangalore, food, cinema"></label><label class="upload-label">PNG, JPEG, WEBP or GIF · max 3 MB<input name="meme" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label></details><p class="post-guideline">Text-only is fine. X links get a saved snapshot of the post. No doxxing, threats or pile-ons.${S.mode === 'live' ? ' Posts are reviewed before publication.' : ''}</p><button type="submit" id="submit-post" class="button button-red button-wide submit-post">Post kalesh</button></form>`, 'post-dialog');
}
function avatarModal() {
  const u = me();
  return dialog('Edit meme avatar', '😼 MEME AVATAR WORKSHOP', `<div class="dialog-body"><h2>Apni shakal chuno.</h2><p>Pick a cursed avatar. Your internet reputation depends on absolutely none of this.</p><div class="gif-avatar-picker">${media.map((m, i) => m[4] === m[5] ? '' : `<button type="button" data-action="pick-gif" data-id="${i}"><img src="${esc(memeImage(m))}" alt=""><span>${esc(m[1])}</span></button>`).join('')}</div><div class="avatar-picker">${C.avatars.map(a => `<button type="button" data-action="pick-avatar" data-avatar="${a}" class="avatar-option ${!u.avatar_url && u.avatar_emoji === a ? 'chosen' : ''}" aria-label="Choose ${a} avatar">${a}</button>`).join('')}</div><div class="avatar-upload"><label class="upload-label">📸 Upload your own GIF or photo<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label><small>PNG, JPEG, WEBP or GIF. Maximum 3MB. Keep it appropriate.</small></div></div>`, 'avatar-dialog');
}
function bioModal() {
  const u = me();
  return dialog('Edit bio', '✍️ BIO EDITOR', `<form id="bio-form" class="dialog-body"><h2>APNE BAARE MEIN.</h2><label>BIO <small>(max 160)</small><textarea name="bio" maxlength="160" rows="3" placeholder="Professional opinion distributor.">${esc(u.bio || '')}</textarea></label>${u.x_username ? '' : `<label>X HANDLE <small>(unverified until you log in with X)</small><input name="x_claimed" maxlength="16" value="${esc(u.x_claimed || '')}" placeholder="@handle" /></label>`}${S.mode === 'live' && usesPassword() ? '<label>NAYA PASSWORD <small>(optional · 8+ characters)</small><input name="new_password" type="password" minlength="8" maxlength="72" autocomplete="new-password" /></label>' : ''}<button type="submit" class="button button-red button-wide">💾 SAVE</button></form>`, 'post-dialog');
}
function memeModal(m) {
  const image = memeImage(m);
  const source = safeURL(m[6]);
  const station = pick(['DRAMA', 'MASALA', 'BILLI', 'TAMASHA', 'SIGNAL', 'INTERVAL']);
  return dialog('Meme bomb', `${station}_${Math.floor(100 + Math.random() * 900)}.EXE`, `<div class="meme-dialog-inner">${image ? `<img class="vault-img" src="${esc(image)}" alt="${esc(m[1])}">` : `<span class="meme-dialog-emoji">${esc(m[0])}</span>`}<h2>${esc(m[1])}</h2><p>${esc(m[2])}</p>${source ? `<a class="meme-source" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Meme source</a>` : ''}<div class="meme-actions"><button data-action="bomb" type="button" class="button button-red">Another meme</button></div></div>`, 'meme-dialog');
}

/* ───────────────────────── render ───────────────────────── */
function needsLogin() { return S.mode === 'guest'; }
const isDarkRoute = r => r === '/news' || r.startsWith('/u/');
function render() {
  const r = route();
  closeOverlayIfRouteChanged();
  document.body.classList.toggle('dark', isDarkRoute(r));
  if (r === '/404') { app().innerHTML = notFound(); achieve('lost'); return; }
  if (r.startsWith('/u/')) {
    const h = cleanHandle(decodeURIComponent(r.slice(3)));
    if (!S.publicProfile || S.publicProfile.handle !== h) loadPublicProfile(h);
    if (needsLogin()) { app().innerHTML = shellGuest(publicProfile(h)); return; }
    if (me() && me().handle && me().gang) { app().innerHTML = publicProfile(h); return; }
  }
  if (r.startsWith('/post/')) { const id = decodeURIComponent(r.slice(6)); history.replaceState(null, '', location.pathname + location.search + '#/'); setTimeout(() => openPost(id), 60); }
  const known = ['/', '/balaks', '/bataks', '/news', '/leaderboard', '/profile', '/cat-council'];
  if (!known.includes(route()) && !route().startsWith('/u/') && !topicOf()) { app().innerHTML = notFound(); achieve('lost'); return; }
  document.body.classList.toggle('dark', isDarkRoute(route()));
  if (needsLogin()) { app().innerHTML = loginPage(); return; }
  if (!me()) { app().innerHTML = `<div class="loading-block"><img src="assets/cat.svg" class="spin-fast" alt=""><p>${esc(pick(C.loading))}</p></div>`; return; }
  if (!me().handle) { app().innerHTML = claimPage(); return; }
  if (!me().gang) { app().innerHTML = gangPage(); return; }
  const rr = route();
  document.body.dataset.page = rr.slice(1);
  app().innerHTML = rr === '/leaderboard' ? leaderboard() : rr === '/profile' ? profilePage() : rr === '/news' ? newsPage() : rr === '/cat-council' ? catCouncil() : home();
  startPanel();
}
// Guests can view public/reserved profile pages (shareable marketing links).
function shellGuest(html) { return html.replace(/<div class="news-bar"[\s\S]*?<\/header>/, m => m.replace(/<header class="site-header">[\s\S]*<\/header>/, `<header class="kguest-header"><a class="kguest-brand" href="#/"><span class="brand-main">KALESH<b>.EXE</b></span><span class="brand-hindi">कलेश</span></a><a class="btn btn-hot" href="#/">ENTER THE KAND ▶</a></header>`)).replace(/<nav class="mobile-nav"[\s\S]*?<\/nav>/, ''); }
let lastRoute = null;
function closeOverlayIfRouteChanged() { if (lastRoute !== route()) closeOverlay(); lastRoute = route(); }
const app = () => $('#app');
function renderFeed() { const f = $('#feed'); if (f) f.innerHTML = feedHTML(); }

/* ───────────────────────── boot loader (v1 CAT.EXE) ───────────────────────── */
function matchedMeme(post, seed = 0) {
  const text = (post.title + ' ' + (post.description || '')).toLowerCase();
  const aliases = m => m[1].toLowerCase().split(/\s*\/\s*/);
  const has = phrase => new RegExp('\\b' + phrase.replace(/[^a-z ]/g, '') + '\\b').test(text);
  const exact = media.filter(m => aliases(m).some(has));
  const related = exact.length ? exact : media.filter(m => aliases(m).some(name =>
    name.split(/\s+/).some(word => word.length >= 4 && !['woman', 'pain'].includes(word) && has(word))
  ));
  return related[seed % related.length];
}
function memeStrip(trending = false) {
  const posts = trending ? allPosts().filter(p => p.status === 'published').sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 5) : [];
  if (posts.length) return `<section class="cinema-reel trending-reel" aria-label="Trending posts">${posts.map((post, i) => `<button type="button" data-action="scroll-post" data-id="${esc(post.id)}"><img src="${esc(safeImg(post.image_url) || memeImage(matchedMeme(post) || media[(Number(post.id.slice(-1)) || i) % media.length], true))}" alt=""><span>${esc(post.title)}</span></button>`).join('')}</section>`;
  const captions = ['Smudge has had enough', 'Meanwhile, in the group chat', 'This will end well', 'Balaks vs Bataks'];
  return `<section class="cinema-reel" aria-label="Meme reel">${['K0365', 'K0384', 'K0203', 'K0375'].map((id, n) => { const i = media.findIndex(m => m[7] === id); return `<button type="button" data-action="meme-frame" data-id="${i}"><img src="${esc(memeImage(media[i], true))}" alt=""><span>${captions[n]}</span></button>`; }).join('')}</section>`;
}

function bootCat(ms = 1900) {
  if (document.getElementById('boot-screen')) return;
  const div = document.createElement('dialog');
  div.id = 'boot-screen'; div.className = 'boot-screen';
  div.setAttribute('aria-label', 'Meme intermission');
  div.innerHTML = `<div class="boot-inner"><div class="boot-top">KALESH TV <span>INTERMISSION</span></div>
    <div class="crt-screen"><img alt=""></div><p class="crt-title" aria-live="polite"></p>
    <div class="crt-controls"><button type="button" class="button" data-tune>Change channel</button>
    <button type="button" class="button" data-action="sound" aria-pressed="${SFX.enabled}">${soundLabel()}</button>
    <button type="button" class="button button-red" autofocus data-skip>Continue</button></div></div>`;
  const channels = media.filter(m => m[4] !== m[5]);
  let channel = Math.floor(Math.random() * channels.length);
  function tune() {
    const m = channels[channel];
    $('.crt-screen img', div).src = memeImage(m);
    $('.crt-title', div).textContent = m[1];
  }
  tune();
  const timer = ms ? setTimeout(() => div.close(), reducedMotion() ? Math.min(ms, 1100) : ms) : null;
  div.addEventListener('close', () => { clearTimeout(timer); div.remove(); Chaos.schedulePopups(); }, { once: true });
  $('[data-tune]', div).onclick = () => {
    clearTimeout(timer);
    if (channels.length > 1) channel = (channel + 1 + Math.floor(Math.random() * (channels.length - 1))) % channels.length;
    tune();
    SFX.play('pop');
  };
  $('[data-skip]', div).onclick = () => div.close();
  document.body.append(div);
  div.showModal();
}

/* ───────────────────────── data: live (Supabase) ───────────────────────── */
async function initSupabase() {
  const lib = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
  S.sb = lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { detectSessionInUrl: true, persistSession: true, flowType: 'pkce' } });
  const { data: { session }, error } = await S.sb.auth.getSession();
  if (error) liveError(error);
  S.sb.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_OUT') { S.session = null; S.profile = null; S.mode = 'guest'; render(); }
    else if (s && (!S.session || S.session.user.id !== s.user.id)) setTimeout(() => applySession(s).then(render).catch(liveError), 0);
  });
  if (session) await applySession(session);
  loadVault();
}
function liveError(e) { console.error(e); notice('Server ne kalesh kar diya: ' + String(e?.message || e).slice(0, 90)); }
async function applySession(session) {
  const uid = session.user.id;
  let { data, error } = await S.sb.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  if (!data) { // trigger should have created it; create if the trigger is missing
    const ins = await S.sb.from('profiles').insert({ id: uid }).select().single();
    if (ins.error) throw ins.error; data = ins.data;
  }
  if (!data.handle) { // sync verified X username + auto-claim a handle reserved for this X account
    const { data: synced } = await S.sb.rpc('claim_reserved_profile');
    if (synced) { if (synced.handle) notice(`👑 RESERVED PROFILE CLAIMED: @${synced.handle}`); data = synced; }
  }
  S.session = session; S.mode = 'live';
  S.profile = { ...data, suggested: session.user.email?.split('@')[0] };
  await refreshLive();
}
async function refreshLive() {
  if (!S.sb || !S.session) return;
  const userId = S.session.user.id;
  const [p, v, l] = await Promise.all([
    postQuery(q => q.order('created_at', { ascending: false }).limit(300)),
    S.sb.from('spice_votes').select('post_id,user_id,spice').limit(5000),
    S.sb.from('post_likes').select('post_id,user_id').limit(5000)
  ]);
  if (S.session?.user.id !== userId) return;
  if (p.error || v.error || l.error) { liveError(p.error || v.error || l.error); return; }
  S.posts = p.data.map(x => ({ ...x, author: x.author || { handle: 'deleted', avatar_emoji: '👻' } }));
  S.votes = v.data; S.likes = l.data; bump();
  startRealtime();
}
/* Posts + author + tweet snapshots (migration 002). Falls back to the plain select if post_tweets isn't deployed yet. */
const POST_AUTHOR = 'author:profiles!controversies_user_id_fkey(id,handle,x_username,x_claimed,avatar_emoji,avatar_url,gang,title)';
const POST_TWEETS = 'tweets:post_tweets(position,tweet_id,url,author_handle,author_name,author_avatar,text,media,metrics,tweeted_at,snapshot_source)';
let tweetsTable = true;
async function postQuery(build) {
  if (tweetsTable) {
    const res = await build(S.sb.from('controversies').select(`*,${POST_AUTHOR},${POST_TWEETS}`));
    if (!res.error || !/post_tweets|relationship/i.test(res.error.message || '')) return res;
    tweetsTable = false; console.warn('post_tweets not available; run supabase/migrations/002_content_pipeline.sql');
  }
  return build(S.sb.from('controversies').select(`*,${POST_AUTHOR}`));
}
/* New published posts (desk, apify, approved users) arrive without a refresh and get the BREAKING slam. */
let feedChannel = null;
function startRealtime() {
  if (feedChannel || !S.sb || S.mode !== 'live') return;
  const onChange = payload => {
    const row = payload.new;
    if (!row?.id || row.status !== 'published') return;
    const known = S.posts.find(p => p.id === row.id);
    if (known?.status === 'published') return;
    // Short delay so the pipeline's tweet snapshots (inserted before the publish flip) are readable.
    setTimeout(async () => {
      const { data, error } = await postQuery(q => q.eq('id', row.id).maybeSingle());
      if (error || !data || S.mode !== 'live') return;
      deliverPost({ ...data, author: data.author || { handle: 'deleted', avatar_emoji: '👻' } });
    }, 400);
  };
  feedChannel = S.sb.channel('kalesh-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'controversies', filter: 'status=eq.published' }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'controversies', filter: 'status=eq.published' }, onChange)
    .subscribe();
}
/* Shared by live Realtime and the demo wire: add a post to the feed, re-render in place, slam BREAKING NEWS. */
function deliverPost(post) {
  const list = S.mode === 'demo' ? store.posts : S.posts;
  const i = list.findIndex(p => p.id === post.id);
  if (i >= 0) list.splice(i, 1);
  list.unshift(post);
  if (S.mode === 'demo') saveStore(); else bump();
  if (!me()?.gang) return;
  renderFeed();
  const reel = $('#trending-reel'); if (reel) reel.innerHTML = memeStrip(true);
  if (post.user_id === me().id) return;
  Chaos.breaking((isDeskPost(post) ? '📡 KALESH DESK: ' : '') + post.title, false, matchedMeme(post), true);
  notice('📡 Naya kalesh aaya: ' + post.title.slice(0, 80));
}
/* Demo stand-in for Realtime: drop the next DEMO_WIRE post while the feed is open (once per browser). */
function demoWireTick() {
  if (S.mode !== 'demo' || document.hidden || $('#overlays').firstChild || !$('#feed')) return;
  store.wire ||= [];
  const next = DEMO_WIRE.map(make => make()).find(p => !store.wire.includes(p.id));
  if (!next) return;
  store.wire.push(next.id);
  next.created_at = new Date().toISOString();
  next.tweets.forEach(t => { t.tweeted_at = next.created_at; });
  deliverPost(next);
}
setTimeout(() => { demoWireTick(); setInterval(demoWireTick, 75000); }, 25000);
window.KALESH_DEMO_WIRE = demoWireTick;
let refreshingNews = false;
setInterval(async () => {
  if (refreshingNews || S.mode !== 'live' || route() !== '/news' || document.hidden || $('#overlays').firstChild) return;
  refreshingNews = true;
  const previous = recentReports()[0]?.id;
  try {
    await refreshLive();
    if (route() === '/news' && S.mode === 'live' && !$('#overlays').firstChild && recentReports()[0]?.id !== previous) render();
  } finally { refreshingNews = false; }
}, 30000);
async function loadVault() {
  if (!S.sb) return;
  const [m, n] = await Promise.all([S.sb.from('memes').select('emoji,title,caption,sound,image_url').eq('active', true).limit(200), S.sb.from('news_flashes').select('text').eq('active', true).limit(50)]);
  if (!m.error) S.vaultMemes = m.data.map(r => [r.emoji || '🐈', r.title, r.caption || '', r.sound || 'pop', r.image_url || '']);
  if (!n.error) S.vaultNews = n.data.map(r => r.text);
}
async function uploadImage(file, purpose) {
  if (!file) return '';
  if (file.size > 3 * 1024 * 1024) throw new Error('Image 3MB se chhoti honi chahiye.');
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Sirf PNG, JPEG, WEBP, GIF.');
  if (S.mode === 'demo') return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Image read nahi hui')); r.readAsDataURL(file); });
  const path = `${S.session.user.id}/${purpose}-${makeId()}.${file.type.split('/')[1].replace('jpeg', 'jpg')}`;
  const { error } = await S.sb.storage.from('kalesh-media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return S.sb.storage.from('kalesh-media').getPublicUrl(path).data.publicUrl;
}

/* ───────────────────────── actions ───────────────────────── */
async function handleTaken(h) {
  if (BANNED_HANDLES.includes(h)) return 'Ye handle sarkar ne reserve kiya hai.';
  if (S.mode === 'demo') {
    if (DEMO_PEOPLE.some(p => p.handle === h)) return 'Ye handle kisi aur nalle ka hai.';
    if ((store.reserved || []).some(r => r.handle === h && !r.claimed_by)) return 'Ye handle kisi X account ke liye reserved hai.';
    return '';
  }
  const [a, b] = await Promise.all([S.sb.from('profiles').select('id').eq('handle', h).neq('id', S.session.user.id).maybeSingle(), S.sb.from('reserved_handles').select('x_username').eq('handle', h).is('claimed_by', null).maybeSingle()]);
  if (a.data) return 'Ye handle kisi aur nalle ka hai.';
  if (b.data && (b.data.x_username || '').toLowerCase() !== (me().x_username || '').toLowerCase()) return 'Ye handle kisi X account ke liye reserved hai.';
  return '';
}
async function claimHandle(form) {
  const fd = new FormData(form), h = cleanHandle(fd.get('handle')), xc = String(fd.get('x_claimed') || '').trim().replace(/^@/, '');
  const st = $('#handle-status');
  if (!HANDLE_RE.test(h)) { st.textContent = '❌ 3–20 chars, sirf a-z 0-9 _'; st.className = 'ne-status bad'; SFX.play('error'); return; }
  if (xc && !X_RE.test(xc)) { st.textContent = '❌ X handle galat lag raha hai.'; st.className = 'ne-status bad'; return; }
  const taken = await handleTaken(h);
  if (taken) { st.textContent = '❌ ' + taken; st.className = 'ne-status bad'; SFX.play('error'); return; }
  if (S.mode === 'demo') { store.profile = { ...store.profile, handle: h, x_claimed: xc || null }; S.profile = store.profile; saveStore(); }
  else {
    const { data, error } = await S.sb.rpc('claim_handle', { p_handle: h, p_x_claimed: xc || null });
    if (error) { st.textContent = '❌ ' + error.message; st.className = 'ne-status bad'; return; }
    S.profile = { ...S.profile, ...data };
  }
  SFX.play('coin'); notice(`🎮 PLAYER @${h} REGISTERED.`); render();
}
async function chooseGang(g) {
  if (!['balaks', 'bataks'].includes(g)) return;
  if (S.mode === 'demo') { store.profile = { ...store.profile, gang: g }; S.profile = store.profile; saveStore(); }
  else {
    const { data, error } = await S.sb.from('profiles').update({ gang: g }).eq('id', S.session.user.id).is('gang', null).select().single();
    if (error) return notice('Gang select nahi hua: ' + error.message.slice(0, 80));
    S.profile = { ...S.profile, ...data };
  }
  SFX.play(g === 'balaks' ? 'roar' : 'quack');
  go('/'); render();
}
// Snapshot an X link through the `unfurl` Edge Function (live) or a local stub (demo, offline).
async function unfurlLink(x_url, post_id) {
  if (S.mode !== 'live') {
    const [, handle, tweet_id] = new URL(x_url).pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,25})/) || [];
    return tweet_id ? [{ tweet_id, url: x_url, author_handle: handle === 'i' ? '' : handle, author_name: '', text: '', media: [], metrics: {}, tweeted_at: null, snapshot_source: 'stub' }] : [];
  }
  const { data, error } = await S.sb.functions.invoke('unfurl', { body: post_id ? { urls: [x_url], post_id } : { urls: [x_url] } });
  if (error) throw error;
  return Array.isArray(data?.tweets) ? data.tweets : [];
}
async function submitPost(form) {
  const fd = new FormData(form);
  let description = String(fd.get('text') || '').trim();
  const x_url = String(fd.get('x_url') || '').trim();
  const tags = String(fd.get('tags') || '').split(',').map(t => t.trim().toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24)).filter(Boolean).slice(0, 5);
  const file = fd.get('meme')?.size ? fd.get('meme') : null;
  const poster_text = String(fd.get('poster_text') || '').trim().slice(0, 40) || pick(['ABSOLUTE CINEMA', 'KHAO POPCORN', 'BRO IS COOKED', 'PICTURE ABHI BAAKI HAI', '+999 AURA']);
  const poster_emoji = String(fd.get('poster_emoji') || '🎬').slice(0, 8);
  if (x_url && !isXURL(x_url)) return notice('Link x.com/…/status/… wala hona chahiye.');
  // Text-only posts are fine. With an X link the text is optional (live mode borrows the tweet's text).
  if (description ? [...description].length < 10 : !(x_url && S.mode === 'live')) return notice(x_url ? 'Demo mode X fetch nahi karta. Ek line likh do (10+ characters).' : 'Write at least 10 characters about what happened.');
  const norm = u => u.toLowerCase().replace('twitter.com', 'x.com').replace('www.', '').replace('mobile.', '').split('?')[0];
  if (x_url && allPosts().some(p => p.x_url && norm(p.x_url) === norm(x_url))) return notice('Duplicate kalesh! Ye pehle hi post ho chuka hai.');
  const btn = $('#submit-post'); btn.disabled = true; btn.textContent = 'UPLOADING KAND…';
  SFX.upload();
  let title = '';
  try {
    let tweets = [];
    if (x_url && (S.mode !== 'live' || !description)) tweets = await unfurlLink(x_url);
    if (!description) description = [...String(tweets[0]?.text || '').trim()].slice(0, 700).join('');
    if ([...description].length < 10) throw new Error('Tweet ka text nahi mila. Ek line khud likh do.');
    title = [...description.replace(/\s+/g, ' ')].slice(0, 150).join('').trim();
    if (title.length < 8) throw new Error('Write at least 10 characters about what happened.');
    const image_url = await uploadImage(file, 'kalesh');
    if (S.mode === 'demo') {
      store.posts.unshift({ id: makeId(), user_id: me().id, title, description, x_url: x_url || null, tags, tweets, image_url: image_url || null, poster_text, poster_emoji, created_at: new Date().toISOString(), status: 'published', seed: { spice: 0, count: 0, likes: 0 } });
      saveStore();
    } else {
      const { data: row, error } = await S.sb.from('controversies').insert({ user_id: S.session.user.id, title, description, x_url: x_url || null, tags, image_url: image_url || null, poster_text, poster_emoji }).select('id').single();
      if (error) throw error;
      // Save the tweet snapshot server-side (users can't write post_tweets). Not fatal: the link still works.
      if (x_url) await unfurlLink(x_url, row.id).catch(e => console.warn('unfurl failed', e));
      await refreshLive();
    }
    closeOverlay(); go('/'); render();
    Chaos.breaking(title, false, matchedMeme({ title, description }), false);
    notice('💥 ' + pick(C.submitLines) + (S.mode === 'live' ? ' (Moderator approval pending.)' : ''));
    achieve('first_post');
  } catch (e) { notice('Post nahi hua: ' + String(e.message || e).slice(0, 100)); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = '💥 INTERNET PE CHHOD DO'; } }
}
async function vote(id, spice, el) {
  const p = allPosts().find(x => x.id === id); if (!p || p.status !== 'published' || !(spice >= 1 && spice <= 10)) return;
  if (S.mode === 'demo') { store.votes[id] = spice; saveStore(); }
  else { const { error } = await S.sb.from('spice_votes').upsert({ post_id: id, user_id: S.session.user.id, spice }, { onConflict: 'post_id,user_id' }); if (error) return notice('Vote fail: ' + error.message.slice(0, 80)); await refreshLive(); }
  const now = Date.now(); S.combo.n = now - S.combo.t < 9000 ? S.combo.n + 1 : 1; S.combo.t = now;
  const r = el?.getBoundingClientRect();
  if (S.combo.n >= 2 && r) Chaos.sticker(r.left + r.width / 2, r.top, `COMBO x${S.combo.n}!`);
  if (S.combo.n >= 3) achieve('combo');
  SFX.play(spice >= 9 ? 'airhorn' : spice <= 2 ? 'bruh' : 'coin');
  refreshPostCards(p);
  notice(`🌶️ ${spice}/10 — ${pick(C.voteLines)}`);
  const n = S.mode === 'demo' ? Object.keys(store.votes).length : S.votes.filter(v => v.user_id === S.session.user.id).length;
  if (n >= 5) achieve('judge');
}
async function toggleLike(id) {
  const p = allPosts().find(x => x.id === id); if (!p || p.status !== 'published') return;
  if (S.mode === 'demo') { store.likes[id] = !store.likes[id]; saveStore(); }
  else {
    const q = liked(p) ? S.sb.from('post_likes').delete().eq('post_id', id).eq('user_id', S.session.user.id) : S.sb.from('post_likes').insert({ post_id: id, user_id: S.session.user.id });
    const { error } = await q; if (error) return notice('Reaction fail.'); await refreshLive();
  }
  SFX.play('pop');
  refreshPostCards(p);
}
const reportReasons = {
  harassment: 'Harassment or private information',
  spam: 'Spam',
  misleading: 'Misleading context',
  other: 'Something else'
};
function report(id) {
  if (!me()) return;
  if (S.mode === 'demo' && store.reports[id]) return notice('⚑ Already in the Cat Clerk’s inbox.');
  overlay(dialog('Report this post', '⚑ PRIVATE REPORT', `<form id="report-form" class="dialog-body" data-id="${esc(id)}"><label>Why are you reporting this?<select name="reason" required><option value="">Choose a reason</option>${Object.entries(reportReasons).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label><button type="submit" class="button button-red">Send private report</button></form>`));
}
async function submitReport(form) {
  const id = form.dataset.id;
  const reason = new FormData(form).get('reason');
  if (!Object.hasOwn(reportReasons, reason) || !me()) return;
  const submit = form.querySelector('button');
  submit.disabled = true;
  try {
    if (S.mode === 'demo') {
      store.reports[id] = reason;
      saveStore();
      closeOverlay();
      notice(pick(['⚑ Demo report saved. Cat Clerk has the file.', '⚑ Demo report filed under “bhai, enough.”']));
      return;
    }
    const { error } = await S.sb.from('reports').insert({ post_id: id, reporter_id: S.session.user.id, reason: reportReasons[reason] });
    if (error && error.code !== '23505') return notice('Could not send the report. Try again.');
    if (form.isConnected) closeOverlay();
    notice(error ? '⚑ You already reported this post.' : '⚑ Private report sent to the moderators.');
  } finally {
    submit.disabled = false;
  }
}
async function updateProfile(fields, file) {
  try {
    if (file) fields = { avatar_url: await uploadImage(file, 'avatar') };
    if (S.mode === 'demo') { store.profile = { ...store.profile, ...fields }; S.profile = store.profile; saveStore(); }
    else { const { data, error } = await S.sb.from('profiles').update(fields).eq('id', S.session.user.id).select().single(); if (error) throw error; S.profile = { ...S.profile, ...data }; await refreshLive(); }
    bump(); closeOverlay(); render(); SFX.play('coin'); notice('😼 PROFILE UPDATED. INTERNET CAREER BEGINS.');
  } catch (e) { notice('Update fail: ' + String(e.message || e).slice(0, 90)); }
}
function share(id) {
  const url = location.href.split('#')[0] + '#/post/' + encodeURIComponent(id);
  if (navigator.share) navigator.share({ title: 'Kalesh spotted on KALESH.EXE', url }).catch(error => { if (error.name !== 'AbortError') copy(url); });
  else copy(url);
}
function copy(text) { navigator.clipboard?.writeText(text).then(() => notice('📋 Link copied! Ab group mein daal.')).catch(() => notice(text)); }
async function openPost(id) {
  let post = allPosts().find(p => p.id === id && (p.status === 'published' || p.user_id === me()?.id));
  if (!post && S.mode === 'guest' && !configured) post = DEMO_POSTS.find(p => p.id === id);
  if (!post && S.sb && /^[a-f\d-]{36}$/i.test(id)) {
    const here = route();
    const { data } = await postQuery(q => q.eq('id', id).eq('status','published').maybeSingle());
    if (route() !== here) return;
    post = data;
  }
  if (!post) return notice('Post nahi mila.');
  overlay(dialog('Read post', 'KALESH · POST', postCard(post, 'detail-'), 'post-detail'));
}
function refreshPostCards(post) {
  for (const prefix of ['', 'detail-']) {
    const card = document.getElementById(prefix + 'post-' + post.id);
    if (card) card.outerHTML = postCard(post, prefix);
  }
}
function bomb() {
  S.bombClicks++;
  showMeme(randomMedia());
  if (S.bombClicks >= 10) achieve('bomber');
}
function showMeme(m) {
  overlay(memeModal(m));
  const img = $('.meme-dialog img');
  img?.addEventListener('error', () => { img.src = 'assets/memes/monkey.jpg'; }, { once: true });
  randomSound();
}
function revealCouncil() { achieve('cat'); closeOverlay(); go('/cat-council'); SFX.play('tada'); }
function explode() {
  const s = $('.explosion-stack'); if (!s) return;
  s.classList.remove('detonate'); void s.offsetWidth; s.classList.add('detonate');
  Chaos.shake($('.error-page')); SFX.play('dhamaka'); notice('💥 WEBSITE KA INSURANCE NAHI HAI.');
}
async function logout() {
  if (S.mode === 'demo') { try { sessionStorage.removeItem('kalesh-demo'); } catch {} S.mode = 'guest'; S.profile = null; go('/'); render(); }
  else if (S.sb) await S.sb.auth.signOut();
}
function enterDemo() {
  S.mode = 'demo';
  try { sessionStorage.setItem('kalesh-demo', 'yes'); } catch {}
  if (!store.profile) store.profile = { id: 'me-' + makeId().slice(0, 8), handle: null, avatar_emoji: '🐈', gang: null, suggested: 'naya_nalla' };
  S.profile = store.profile; saveStore(); SFX.play('coin'); render();
}

/* Username + password login. Supabase Auth needs an email, so each username maps to a
   never-mailed address <username>@<authEmailDomain>. "Confirm email" must be OFF in Supabase. */
const authDomain = () => String(cfg.authEmailDomain || 'users.kalesh.app').trim().replace(/^@/, '').toLowerCase();
const authEmail = u => `${u}@${authDomain()}`;
const usesPassword = () => (S.session?.user?.email || '').toLowerCase().endsWith('@' + authDomain());
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function friendlyAuthError(e) {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return 'Username ya password galat hai.';
  if (/already (been )?registered|already exists/i.test(m)) return 'Ye username le liya gaya hai. Dusra try karo.';
  if (/KALESH_USERNAME|database error saving new user/i.test(m)) return 'Ye username nahi mil sakta. Dusra try karo.';
  if (e?.status === 429 || /rate limit|too many/i.test(m)) return 'Bahut try kar liya. 5 minute baad aao.';
  if (/password/i.test(m) && /(weak|short|least|characters)/i.test(m)) return 'Password thoda strong rakho (8+ characters).';
  if (/signups? not allowed|signup.*disabled/i.test(m)) return 'Abhi naye account band hain.';
  return m.slice(0, 100) || 'Kuch toh gadbad hai.';
}
async function passwordAuth(f) {
  const fd = new FormData(f), signup = f.dataset.mode === 'signup';
  const u = cleanHandle(fd.get('username')), pw = String(fd.get('password') || ''), pw2 = String(fd.get('password2') || '');
  const st = $('#pass-status', f), btn = $('button[type=submit]', f);
  const fail = msg => { st.textContent = '❌ ' + msg; st.className = 'pass-status bad'; SFX.play('error'); };
  S.authUser = u;
  if (!HANDLE_RE.test(u)) return fail('Username 3–20 chars, sirf a-z 0-9 _');
  if (pw.length < 8 || pw.length > 72) return fail('Password 8–72 characters ka ho.');
  if (signup && pw !== pw2) return fail('Dono password match nahi kar rahe.');
  if (signup && BANNED_HANDLES.includes(u)) return fail('Ye username sarkar ne reserve kiya hai.');
  btn.disabled = true; st.textContent = '⏳ Ruko zara…'; st.className = 'pass-status';
  try {
    if (!S.sb) { // preview/demo: one local account per browser, password kept as a salted hash
      const hash = await sha256('kalesh:' + u + ':' + pw);
      if (signup) {
        if (store.profile?.handle && store.profile.handle !== u) return fail(`Is browser mein @${store.profile.handle} ka account hai. "Wapas aaya" se login karo.`);
        S.mode = 'demo'; const taken = await handleTaken(u); S.mode = 'guest';
        if (taken) return fail(taken);
        store.profile = { ...(store.profile || {}), id: store.profile?.id || 'me-' + makeId().slice(0, 8), handle: u, avatar_emoji: store.profile?.avatar_emoji || '🐈', gang: store.profile?.gang || null };
        store.demoPass = hash;
      } else if (store.profile?.handle !== u || store.demoPass !== hash) return fail('Username ya password galat hai.');
      saveStore(); enterDemo(); if (signup) notice(`🎮 PLAYER @${u} REGISTERED.`); return;
    }
    if (signup) {
      const { data: problem, error: checkError } = await S.sb.rpc('username_available', { p_username: u });
      if (checkError) throw checkError;
      if (problem) return fail(problem);
      const { data, error } = await S.sb.auth.signUp({ email: authEmail(u), password: pw, options: { data: { username: u } } });
      if (error) throw error;
      if (!data.session) return fail('Server pe "Confirm email" ON hai, isliye login nahi hua. Admin ko bolo band kare.');
      SFX.play('coin'); notice(`🎮 PLAYER @${u} REGISTERED.`);
    } else {
      const { error } = await S.sb.auth.signInWithPassword({ email: authEmail(u), password: pw });
      if (error) throw error;
      SFX.play('coin');
    }
    S.authUser = ''; // onAuthStateChange → applySession → render
  } catch (e) { fail(friendlyAuthError(e)); }
  finally { btn.disabled = false; }
}
async function changePassword(pw) {
  if (pw.length < 8 || pw.length > 72) { notice('Password 8–72 characters ka ho.'); return false; }
  const { error } = await S.sb.auth.updateUser({ password: pw });
  if (error) { notice('Password change nahi hua: ' + friendlyAuthError(error)); return false; }
  notice('🔑 Naya password set ho gaya.'); return true;
}

/* ───────────────────────── events ───────────────────────── */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action, id = el.dataset.id;
  if (a === 'backdrop') { if (e.target === el) closeOverlay(); return; }
  if (spammed(a)) { e.preventDefault(); return; }
  if (el.tagName !== 'A') e.preventDefault(); // real links still navigate
  switch (a) {
    case 'enter-demo': enterDemo(); break;
    case 'login-x': {
      if (!S.sb) return notice('X login abhi configured nahi hai. Demo try karo.');
      const { error } = await S.sb.auth.signInWithOAuth({ provider: cfg.xProvider || 'twitter', options: { redirectTo: location.origin + location.pathname } });
      if (error) notice('X login error: ' + error.message); break;
    }
    case 'auth-tab': S.authTab = id === 'login' ? 'login' : 'signup'; S.authUser = $('#user-in')?.value || S.authUser; render(); $('#user-in')?.focus(); break;
    case 'choose-gang': await chooseGang(el.dataset.gang); break;
    case 'go-home': go('/'); break;
    case 'go-profile': go('/profile'); break;
    case 'open-post': overlay(postModal()); SFX.play('pop'); break;
    case 'edit-avatar': overlay(avatarModal()); break;
    case 'edit-bio': overlay(bioModal()); break;
    case 'pick-avatar': await updateProfile({ avatar_emoji: el.dataset.avatar, avatar_url: null }); break;
    case 'pick-gif': { const m = media[Number(id)]; if (m && m[4] !== m[5]) await updateProfile({ avatar_url: m[4] }); break; }
    case 'close': closeOverlay(); break;
    case 'bomb': bomb(); break;
    case 'surprise': {
      const posts = recentReports();
      const draw = Math.random();
      if (draw < 0.3) notice('🎟 ' + pick(C.fourthWall.ticket));
      else if (posts.length && draw < 0.65) openPost(pick(posts).id);
      else bomb();
      break;
    }
    case 'delete-note': await changeGuestbook(null, id); break;
    case 'meme-frame': if (media[Number(id)]) showMeme(media[Number(id)]); break;
    case 'intermission': bootCat(0); break;
    case 'daily-meme': { const m = dailyMeme(); overlay(memeModal(m)); SFX.play(m[3] || 'boom'); break; }
    case 'scroll-post': if (id) openPost(id); else notice('Abhi koi post nahi hai.'); break;
    case 'news-intro': if (SFX.enabled) SFX.clip('assets/sounds/news-intro.mp3'); else notice('Pehle Awaaz on karo.'); break;
    case 'tuna-clip': {
      const clip = window.KALESH_TUNA[Number(id)];
      if (!SFX.enabled) notice('Pehle Awaaz on karo.');
      else if (clip) SFX.clip('assets/sounds/tuna/kalesh-tuna-sounds/' + encodeURIComponent(clip[0]));
      break;
    }
    case 'stop-clip': SFX.stopClip(); break;
    case 'toggle-spice': {
      const panel = document.getElementById(el.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !panel.hidden;
        el.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) ($('.voted', panel) || $('button', panel))?.focus();
      }
      break;
    }
    case 'vote': await vote(id, Number(el.dataset.value), el); break;
    case 'like': await toggleLike(id); break;
    case 'report': report(id); break;
    case 'x-media': await openXMedia(allPosts().find(p => p.id === id)); break;
    case 'share': share(id); break;
    case 'tag': S.search = el.dataset.tag; S.sort = 'relevant'; render(); $('#search')?.scrollIntoView({ block: 'center' }); break;
    case 'clear-search': S.search = ''; renderFeed(); { const s = $('#search'); if (s) s.value = ''; } break;
    case 'board': S.board = el.dataset.board; render(); break;
    case 'explode': explode(); break;
    case 'siren':
    case 'breaking': {
      const reports = recentReports();
      const post = reports[S.breakingCount++ % Math.min(reports.length, 5)];
      if (a === 'siren') {
        S.sirenCount++;
        const stings = window.KALESH_TUNA.filter(([file]) => /Aaj.Tak/i.test(file));
        const sting = stings[S.sirenCount % stings.length];
        if (sting) SFX.clip(tunaPath(sting), 5);
        if (S.sirenCount >= 3) achieve('siren');
      }
      const aside = a === 'siren' ? C.fourthWall.siren[(S.sirenCount - 1) % C.fourthWall.siren.length] : '';
      Chaos.breaking(post?.title || pick(newsHeadlines()), false, post && matchedMeme(post), a !== 'siren', aside);
      break;
    }
    case 'drama': Chaos.serialZoom(); achieve('drama'); break;
    case 'sound': { const on = SFX.toggle(); document.querySelectorAll('[data-action="sound"]').forEach(b => { b.textContent = soundLabel(); b.setAttribute('aria-pressed', on); }); notice(on ? 'Sound on' : 'Sound off'); break; }
    case 'chaos': { const on = Chaos.toggle(); el.textContent = 'CHAOS: ' + (on ? 'ON 💥' : 'OFF 😇'); notice(on ? '💥 Chaos wapas aa gaya.' : '😇 Sanskari mode activated.'); break; }
    case 'secret': if (Math.random() < 0.3) revealCouncil(); else bomb(); break;
    case 'prophecy': prophecy(); break;
    case 'ending': if (Object.hasOwn(endings, id)) { $('#prophecy-result').textContent = endings[id]; SFX.play('coin'); } break;
    case 'war-next': nextWarMoment(); break;
    case 'war-taunt': gangRound(id); break;
    case 'war-reply': if (Object.hasOwn(gangReplies, id)) { $('#war-play').textContent = pick(gangReplies[id]); nextWarMoment(); SFX.play('pop'); } break;
    case 'court-plea': {
      const result = $('#court-result');
      result.textContent = id === 'guilty'
        ? pick(['Sentenced to one glass of water and touching grass.', 'Bail set at two biscuits. The clerk accepts Parle-G.'])
        : pick(['Exhibit A: Billi Ji sat on the keyboard. The court has accepted “jjjjjjjj” into evidence.', 'The witness knocked the gavel off the desk and left. Case adjourned.']);
      const oldWitness = $('.court-witness');
      oldWitness?.remove();
      if (id === 'deny') {
        const witness = pick(media.filter(m => ['K0002', 'K0016', 'K0365', 'G004'].includes(m[7])));
        const img = document.createElement('img');
        img.className = 'court-witness';
        img.src = memeImage(witness);
        img.alt = witness[1];
        result.after(img);
      }
      SFX.play('hit');
      break;
    }
    case 'cat': S.catClicks++; Chaos.shake(el); SFX.play('pop'); if (S.catClicks >= 7) { S.catClicks = 0; revealCouncil(); } break;
    case 'cat-rain': Chaos.rain(['🐈', '😼', '🐱', '😹', '🙀']); break;
    case 'council-appeal': {
      councilIndex = (councilIndex + 1 + Math.floor(Math.random() * (councilVerdicts.length - 1))) % councilVerdicts.length;
      $('#council-verdict').textContent = councilVerdicts[councilIndex];
      SFX.play('hit');
      break;
    }
    case 'council-share': copy(`Cat Council verdict: ${councilVerdicts[councilIndex]} ${location.href}`); break;
    case 'council-stamp': {
      councilTaps++;
      if (councilTaps % 3 === 0) {
        const cat = media.find(m => m[7] === 'G004');
        overlay(dialog('Secret case file', 'SEALED EVIDENCE.EXE', `<div class="meme-dialog-inner"><img class="vault-img" src="${esc(memeImage(cat))}" alt="Pop Cat"><h2>The judge ate the evidence.</h2><p>Case closed. Mouth open.</p></div>`, 'meme-dialog'));
        randomSound();
      } else notice(councilTaps % 3 === 1 ? '🐾 The seal moved. Legally, you saw nothing.' : '🐾 One more knock. The clerk is pretending not to hear.');
      break;
    }
    case 'logo': S.logoClicks++; if (S.logoClicks >= 5) { S.logoClicks = 0; Chaos.serialZoom(); achieve('drama'); } break;
    case 'copy-link': copy(el.dataset.link); break;
    case 'betray': achieve('traitor'); Chaos.breaking('GADDAR PAKDA GAYA! @' + me().handle + ' NE GANG BADALNE KI KOSHISH KI', true); setTimeout(() => notice('🐍 Just kidding. Gang permanent hai. Sabko bata diya gaya hai.'), 2700); break;
    case 'claim-reserved': { const { data, error } = await S.sb.rpc('claim_reserved_profile'); if (error || !data?.handle) notice('Claim fail: ' + (error?.message || 'reserved row match nahi hua')); else { S.profile = { ...S.profile, ...data }; SFX.play('tada'); go('/profile'); } break; }
    case 'logout': await logout(); break;
  }
});
document.addEventListener('submit', async e => {
  const f = e.target; e.preventDefault();
  if (f.id === 'report-form') await submitReport(f);
  else if (f.id === 'post-form') await submitPost(f);
  else if (f.id === 'guestbook-form') {
    const message = String(new FormData(f).get('note') || '').trim();
    if (message.length >= 2 && message.length <= 180) await changeGuestbook(message);
  }
  else if (f.id === 'claim-form') await claimHandle(f);
  else if (f.id === 'bio-form') { const fd = new FormData(f), xc = String(fd.get('x_claimed') || '').trim().replace(/^@/, ''); if (xc && !X_RE.test(xc)) return notice('X handle galat hai.'); const fields = { bio: String(fd.get('bio') || '').trim().slice(0, 160) || null }; if (!me().x_username) fields.x_claimed = xc || null; const np = String(fd.get('new_password') || ''); if (np && !(await changePassword(np))) return; await updateProfile(fields); }
  else if (f.id === 'pass-form') await passwordAuth(f);
});
document.addEventListener('change', async e => {
  if (e.target.id === 'sort') { S.sort = e.target.value; renderFeed(); }
  if (e.target.id === 'avatar-file' && e.target.files?.[0]) await updateProfile(null, e.target.files[0]);
});
let searchEgg = '';
document.addEventListener('input', e => {
  if (e.target.id === 'search') {
    S.search = e.target.value; renderFeed();
    const q = S.search.toLowerCase().trim();
    if (q !== searchEgg && (q === 'gta' || q === 'gta6' || q === 'gta 6')) { searchEgg = q; notice('🎮 Ye search result GTA 6 se pehle aa gaya.'); }
    if (q !== searchEgg && q === '26') { searchEgg = q; notice('🌍 26 me to duniya khatam h. Search karke kya hi milega.'); }
    if (q !== searchEgg && ['interval', 'remote', 'picture abhi baaki hai'].includes(q)) { searchEgg = q; notice('🎟 Secret channel unlocked.'); bomb(); }
    if (q !== searchEgg && ['meow meow', 'cat council'].includes(q)) { searchEgg = q; S.search = ''; revealCouncil(); }
  }
  if (e.target.id === 'handle-in') { const v = cleanHandle(e.target.value); const st = $('#handle-status'); if (st) { st.textContent = HANDLE_RE.test(v) ? '✓ Format sahi hai. CLAIM dabao.' : '3–20 chars · a-z 0-9 _'; st.className = 'ne-status' + (HANDLE_RE.test(v) ? ' ok' : ''); } }
});
const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kp = 0;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOverlay();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (e.key === konami[kp]) { if (++kp === konami.length) { kp = 0; document.body.classList.toggle('arcade-mode'); SFX.force('powerup'); notice(document.body.classList.contains('arcade-mode') ? '🕹️ ARCADE MODE: CRT ON' : '🕹️ ARCADE MODE OFF'); } }
  else kp = e.key === konami[0] ? 1 : 0;
});
addEventListener('hashchange', () => { if (route() !== '/news') SFX.stopClip(); render(); scrollTo({ top: 0 }); });

/* ───────────────────────── init ───────────────────────── */
async function init() {
  const firstVisit = (() => { try { const v = sessionStorage.getItem('kalesh-booted'); sessionStorage.setItem('kalesh-booted', '1'); return !v; } catch { return false; } })();
  if (firstVisit && !route().startsWith('/post/')) bootCat();
  if (configured) {
    try { await initSupabase(); }
    catch (e) { console.error('Supabase init failed', e); notice('Live server se connect nahi hua. Demo ready hai.'); }
  }
  if (S.mode === 'guest') { try { if (sessionStorage.getItem('kalesh-demo') === 'yes' && store.profile) { S.mode = 'demo'; S.profile = store.profile; } } catch {} }
  render();
  Chaos.schedulePopups();
}
init();
})();
