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
const safeImg = v => /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(String(v)) ? String(v) : safeURL(v);
const isXURL = v => { try { const u = new URL(v); return ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'mobile.x.com'].includes(u.hostname) && /\/status\/\d+/.test(u.pathname); } catch { return false; } };
const makeId = () => globalThis.crypto?.randomUUID?.() || 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2);
const pick = a => a[Math.floor(Math.random() * a.length)];
const cleanHandle = v => String(v || '').trim().replace(/^@/, '').toLowerCase();
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const X_RE = /^[A-Za-z0-9_]{1,15}$/;
const BANNED_HANDLES = ['admin', 'administrator', 'kalesh', 'kaleshexe', 'mod', 'moderator', 'root', 'support', 'system', 'official', 'null', 'undefined'];
const C = window.KALESH_CONTENT;
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
  { id: 'seed-8', handle: 'duckzilla', avatar_emoji: '🤡', gang: 'bataks' }
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
  P('demo-8', 'seed-8', 33, 'Someone ranked traffic jams by cinematic universe. Twitter took it personally.', 'The roundabout has entered its villain arc. Reviews are mixed.', ['traffic', 'gta6'], 8.2, 20, 199, '🚗', 'GTA 6 SE PEHLE TRAFFIC')
];

/* ───────────────────────── state ───────────────────────── */
const STORE_KEY = 'kalesh-exe-demo-v2';
function loadStore() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.posts)) return s; } catch {} return { profile: null, posts: DEMO_POSTS, votes: {}, likes: {}, reports: {}, reserved: DEMO_RESERVED }; }
let store = loadStore();
const saveStore = () => { bump(); if (S.mode === 'demo') try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { notice('Browser storage full. Demo images might not save.'); } };
let ach = {}; try { ach = JSON.parse(localStorage.getItem('kalesh-achievements')) || {}; } catch {}

const S = {
  mode: 'guest',           // guest | demo | live
  sb: null, session: null, profile: null,
  posts: [], votes: [], likes: [],
  vaultMemes: [], vaultNews: [],
  search: '', sort: 'newest', board: 'week',
  pendingEmail: '', bombClicks: 0, logoClicks: 0, catClicks: 0, sirenCount: 0,
  combo: { n: 0, t: 0 }, publicProfile: null, panelTimer: null
};

const memes = () => [...S.vaultMemes, ...C.memes];
// Data version + memo so scoring isn't recomputed per card (posts × votes gets expensive fast)
let dataVer = 0; const bump = () => { dataVer++; };
const memo = {};
function cached(key, fn) { const m = memo[key]; if (m && m.v === dataVer) return m.val; const val = fn(); memo[key] = { v: dataVer, val }; return val; }
function groupBy(arr, k) { const m = {}; for (const x of arr) (m[x[k]] ||= []).push(x); return m; }
window.KALESH_MEMES = memes;

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
function notice(txt, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = txt; $('#toast-zone').append(t); setTimeout(() => t.remove(), 3800); }
window.KALESH_TOAST = notice;
function overlay(html) { $('#overlays').innerHTML = html; document.body.classList.add('modal-open'); $('#overlays [autofocus]')?.focus(); }
function closeOverlay() { $('#overlays').innerHTML = ''; document.body.classList.remove('modal-open'); }

/* ───────────────────────── scoring / identity ───────────────────────── */
const me = () => S.profile;
const peopleById = () => { const m = {}; for (const p of DEMO_PEOPLE) m[p.id] = p; if (S.mode === 'demo' && store.profile) m[store.profile.id] = store.profile; return m; };
function authorOf(p) { if (p.author) return p.author; return peopleById()[p.user_id] || { handle: 'anonymous', avatar_emoji: '🐈', gang: 'balaks' }; }
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
    const a = authorOf(p);
    const row = authors.get(p.user_id) || { id: p.user_id, ...a, points: 0, posts: 0 };
    row.points += pts; row.posts++; authors.set(p.user_id, row);
    if (gangs[a.gang] != null) gangs[a.gang] += pts;
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
  return [...S.vaultNews, ...C.news, ...fromFeed];
}
function ticker() {
  const items = newsHeadlines().map(h => `<span>${esc(h)}</span><i>✦</i>`).join('');
  return `<div class="news-bar" role="region" aria-label="Kalesh Tak breaking news">
    <div class="news-label"><span class="live-dot"></span>BREAKING</div>
    <div class="news-track-wrap"><div class="news-track">${items}${items}</div></div>
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
    <p class="kfooter-sub">Tab tak kalesh dekh le. 🐈 💥 🦆 💥 🐈</p>
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
const dailyMeme = () => { const m = memes(); return m[dailyIdx() % m.length]; };
function controversyOfDay() {
  const pub = allPosts().filter(p => p.status === 'published');
  const recent = pub.filter(p => Date.now() - new Date(p.created_at) < 864e5);
  return (recent.length ? recent : pub).slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg)[0];
}
function gangMeters() {
  const g = rankings().gangs, total = g.balaks + g.bataks; const a = total ? Math.round(g.balaks / total * 100) : 50, b = 100 - a;
  return `<section class="widget gang-widget" aria-label="Gang standings"><div class="widget-heading"><span>⚔️ GANG WAR</span><span class="chip-stamp">SEASON 01</span></div><div class="gang-row"><div class="gang-line"><span>🔴 BALAK METER</span><strong>${short(g.balaks)} CP</strong></div><div class="meter"><i class="meter-red" style="width:${a}%"></i></div></div><div class="gang-row"><div class="gang-line"><span>🔵 BATAK METER</span><strong>${short(g.bataks)} CP</strong></div><div class="meter"><i class="meter-blue" style="width:${b}%"></i></div></div><div class="gang-verdict">${a === b ? 'THE WAR IS CONFUSED' : a > b ? 'BALAKS ARE ACTING UNBEARABLE 😭' : 'BATAKS ARE QUACKING LOUDER 🦆'}</div><a href="#/leaderboard" class="text-link">Full gang nonsense ↗</a></section>`;
}
function topYappers() {
  const list = rankings().authors.slice(0, 3);
  return `<section class="widget"><div class="widget-heading"><span>🏆 TOP NALLE</span><span class="sticker-small">HALL OF FAME</span></div>${list.length ? list.map((u, i) => `<a class="rank-mini" href="#/u/${esc(u.handle)}"><span class="rank-emoji">${['🥇', '🥈', '🥉'][i]}</span>${cssAvatar(u, 'mini-avatar')}<span class="rank-name">@${esc(u.handle)}</span><strong>${u.points}</strong></a>`).join('') : '<p class="muted">No kalesh, no champions. Tragic.</p>'}<a href="#/leaderboard" class="text-link">View full leaderboard ↗</a></section>`;
}
function miniMeme() { const m = dailyMeme(); return `<section class="widget meme-day-widget"><div class="widget-heading"><span>🐈 MEME OF THE DAY</span><span class="sticker-small">TODAY ONLY</span></div><div class="meme-day-visual"><span>${esc(m[0])}</span><b>${esc(m[1])}</b></div><p>${esc(m[2])}</p><button type="button" data-action="daily-meme" class="text-link button-link">OPEN OFFICIAL MEME ↗</button></section>`; }
function newsWidget() { return `<section class="widget"><div class="widget-heading"><span>📺 KALESH TAK</span><span class="sticker-small">● LIVE</span></div><p class="news-mini-line">${esc(pick(newsHeadlines()))}</p><a href="#/news" class="text-link">Watch the mahabahas ↗</a></section>`; }
function sidebar() { return `<aside class="sidebar">${gangMeters()}${topYappers()}<section class="meme-bomb"><div class="bomb-rays"></div><span class="bomb-icon">💣</span><h3>MEME BOMB</h3><p>Iss button pe bharosa mat karna.</p><button type="button" data-action="bomb" class="button button-black">💥 PHOD DO</button><small>May cause unnecessary happiness.</small></section>${newsWidget()}${miniMeme()}<div class="sidebar-stamp">✦ DEPARTMENT OF<br/>USELESS DRAMA ✦</div></aside>`; }
function posterMedia(p) {
  if (p.image_url && safeImg(p.image_url)) return `<div class="post-photo-wrap"><img class="post-photo" loading="lazy" src="${esc(safeImg(p.image_url))}" alt="Submitted meme image"/></div>`;
  return `<div class="post-poster poster-color-${(p.title.length % 4) + 1}"><span class="poster-side">KALESH CERTIFIED</span><span class="poster-emoji">${esc(p.poster_emoji || '🎬')}</span><strong>${esc(p.poster_text || 'ABSOLUTE INTERNET CINEMA')}</strong><span class="poster-corner">★ 2026 EDITION ★</span></div>`;
}
function postCard(p) {
  const a = authorOf(p), v = voteInfo(p), pending = p.status === 'pending', mine = liked(p), url = p.x_url ? safeURL(p.x_url) : '', id = esc(p.id);
  const title = titleFor(lifetimePoints(p.user_id), a.title);
  return `<article class="post-card" id="post-${id}"><div class="post-top"><a class="post-author" href="#/u/${esc(a.handle)}">${cssAvatar(a, 'post-avatar')}<div><strong>@${esc(a.handle || 'anonymous')}</strong><div class="post-subline"><span class="tiny-gang ${a.gang === 'balaks' ? 'red-gang' : 'blue-gang'}">${a.gang === 'balaks' ? '🔴 BALAK' : '🔵 BATAK'}</span><span class="tiny-title">${esc(title)}</span><span>· ${relTime(p.created_at)}</span></div></div></a><div class="post-stamps"><span class="stamp-verified">${pending ? '⏳ UNDER REVIEW' : '✓ KALESH VERIFIED'}</span></div></div><h3>${esc(p.title)}</h3><p class="post-description">${esc(p.description || '')}</p>${posterMedia(p)}${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow" class="x-source">𝕏 VIEW ORIGINAL POST <span>↗</span></a>` : `<div class="fiction-tag">${p.id.startsWith('demo-') ? '🎭 FICTIONAL DEMO POST' : '🖼 ORIGINAL MEME POST'}</div>`}${xBadge(a) ? `<div class="post-xline">${xBadge(a)}</div>` : ''}<div class="post-tags">${(p.tags || []).slice(0, 4).map(t => `<span role="button" tabindex="0" data-action="tag" data-tag="${esc(t)}">#${esc(t)}</span>`).join('')}</div><div class="post-actions"><button type="button" data-action="toggle-spice" data-id="${id}" class="spice-button" ${pending ? 'disabled' : ''} aria-expanded="false"><span>🌶️</span> ${v.count ? v.avg.toFixed(1) : '--'}/10 <small>(${v.count})</small><span class="vote-chevron">▾</span></button><button type="button" class="action-pill ${mine ? 'is-liked' : ''}" data-action="like" data-id="${id}" ${pending ? 'disabled' : ''} aria-pressed="${mine}">🔥 ${short(likeCount(p))}</button><button type="button" class="action-pill" data-action="share" data-id="${id}" title="Share kalesh">↗ SHARE</button><button type="button" class="action-pill action-report" data-action="report" data-id="${id}" title="Report problematic content">⚑</button></div><div class="spice-options" id="spice-${id}" hidden><div class="spice-options-title">KITNA MASALEDAR? ${v.mine ? `<small>Your vote: ${v.mine}</small>` : ''}</div><div class="spice-grid">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-action="vote" data-id="${id}" data-value="${i + 1}" aria-label="Rate ${i + 1} out of 10" class="${v.mine === i + 1 ? 'voted' : ''}">${i + 1}</button>`).join('')}</div><small>Rate the absurdity, not harassment. One vote per account.</small></div></article>`;
}
function highlights() { const p = controversyOfDay(), m = dailyMeme(); return `<section class="features-row"><button class="feature feature-yellow" type="button" data-action="daily-meme"><span class="feature-icon">${esc(m[0])}</span><span><small>🏵 AJA KA BRAINROT</small><strong>MEME OF THE DAY</strong><em>${esc(m[1])} ↗</em></span></button><button class="feature feature-red" type="button" data-action="scroll-post" data-id="${esc(p?.id || '')}"><span class="feature-icon">🌶️</span><span><small>🏆 RASHTRIYA KALESH PURASKAR</small><strong>CONTROVERSY OF THE DAY</strong><em>${p ? esc(p.title.slice(0, 45)) + '…' : 'Vacancy hai bhai'} ↗</em></span></button></section>`; }
function filters() {
  const o = (v, l) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="feed-toolbar"><div class="feed-toolbar-title"><span class="feed-star">✷</span><h2>THE KALESH FEED</h2><span class="live-tag">THE INTERNET IS COOKING</span></div><div class="filters"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search internet stupidity..." value="${esc(S.search)}" autocomplete="off" aria-label="Search controversy feed" /></label><label class="sort-wrap">SORT BY <select id="sort" aria-label="Sort controversies">${o('newest', 'Newest first ↓')}${o('oldest', 'Oldest first ↑')}${o('trending', 'Trending 🔥')}${o('spicy', 'Spiciest 🌶️')}${o('relevant', 'Relevance ✦')}${o('az', 'Alphabetical A–Z')}${o('za', 'Alphabetical Z–A')}${o('balaks', 'Balaks only 🔴')}${o('bataks', 'Bataks only 🔵')}</select></label></div></div>`;
}
function sortedPosts() {
  const q = S.search.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);
  let list = allPosts().filter(p => p.status !== 'rejected' && (p.status === 'published' || p.user_id === me()?.id));
  if (q) list = list.filter(p => { const a = authorOf(p); const hay = [p.title, p.description, a.handle, a.x_username, a.x_claimed, ...(p.tags || [])].join(' ').toLowerCase(); return hay.includes(q) || words.every(w => hay.includes(w)); });
  if (S.sort === 'balaks' || S.sort === 'bataks') list = list.filter(p => authorOf(p).gang === S.sort);
  const rel = p => { let s = 0; for (const w of words) { if (p.title.toLowerCase().includes(w)) s += 5; if (p.description.toLowerCase().includes(w)) s += 2; if ((p.tags || []).some(t => t.includes(w))) s += 3; } return s + voteInfo(p).avg * 0.1; };
  const trend = p => { const v = voteInfo(p), age = (Date.now() - new Date(p.created_at)) / 36e5; return (v.avg * v.count + likeCount(p) * 0.05) / Math.pow(age + 2, 0.8); };
  const by = { oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at), az: (a, b) => a.title.localeCompare(b.title), za: (a, b) => b.title.localeCompare(a.title), spicy: (a, b) => voteInfo(b).avg - voteInfo(a).avg, trending: (a, b) => trend(b) - trend(a), relevant: (a, b) => rel(b) - rel(a) };
  return list.sort(by[S.sort] || ((a, b) => new Date(b.created_at) - new Date(a.created_at)));
}
function feedHTML() { const list = sortedPosts(); return list.length ? list.map(postCard).join('') : `<div class="empty"><img src="assets/cat.svg" alt="Confused cat"/><h3>FOR THE FIRST TIME, EVERYONE HAS SHUT UP.</h3><p>${S.search ? 'Your search returned zero kalesh. This is suspicious.' : 'Post the first controversy and make history for no reason.'}</p>${S.search ? '<button class="button button-black" data-action="clear-search">CLEAR SEARCH</button>' : '<button class="button button-red" data-action="open-post">POST FIRST KALESH</button>'}</div>`; }
function home() { return shell(`<section class="hero-strip"><div class="hero-copy"><div class="hero-eyebrow"><span class="red-dot"></span> LIVE FROM THE DEPARTMENT OF USELESS DRAMA</div><h1>THE INTERNET<br/><span>IS A CIRCUS.</span><em>WELCOME HOME.</em></h1><p>2 gangs. Infinite kalesh. <b>0 productive outcomes.</b> 🐈</p><div class="hero-mini"><span>★ NO REFUNDS FOR BRAIN CELLS</span><span>★ EST. 2026</span></div></div><div class="hero-graphic" data-action="cat"><div class="hero-burst">KALESH<br/>KA<br/>MAHA<br/>MUQABLA!</div><img src="assets/cat.svg" alt=""/><div class="hero-seal">100%<br/>FALTU</div></div></section>${highlights()}<div class="content-grid"><div class="main-column">${filters()}<div id="feed" class="feed-list">${feedHTML()}</div><div class="end-feed">BAS BHAI, ITNA HI KALESH THA. 🐈</div></div>${sidebar()}</div>`); }

/* ───────────────────────── news page (KALESH TAK) ───────────────────────── */
function newsPage() {
  const top = controversyOfDay();
  const list = allPosts().filter(p => p.status === 'published').slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg).slice(0, 6);
  return shell(`<section class="news-studio">
    <div class="studio-top"><div class="channel-logo">KALESH<span>TAK</span></div><div class="studio-slogan">SABSE PEHLE · SABSE TEZ · SABSE FALTU</div><div class="live-badge"><i></i> LIVE</div></div>
    <div class="studio-main">
      <div class="anchor-desk"><div class="anchor">🎙️</div><div class="anchor-bubble" id="anchor-line">DESH JAANNA CHAHTA HAI!</div></div>
      <div class="studio-headline"><span class="sh-label">SABSE BADI KHABAR</span><h1>${top ? esc(top.title) : 'AAJ KOI KALESH NAHI HUA. YEH APNE AAP MEIN KHABAR HAI.'}</h1>${top ? `<p>— @${esc(authorOf(top).handle)} ki report · 🌶️ ${voteInfo(top).avg.toFixed(1)}/10</p>` : ''}
        <div class="studio-actions"><button type="button" class="btn btn-hot" data-action="siren">🚨 SIREN BAJAO</button><button type="button" class="btn btn-gold" data-action="breaking">📢 BREAKING NEWS DO</button><button type="button" class="btn btn-ink" data-action="drama">📺 DRAMATIC ZOOM</button></div></div>
    </div>
    <div class="lower-third"><span>MAHABAHAS</span><b>AAJ KA SAWAAL: KYA YEH KALESH ZAROORI THA?</b></div>
    <div class="debate-grid">${C.panel.map((p, i) => `<div class="debate-box" data-i="${i}"><div class="db-face">${p.emoji}</div><div class="db-name">${esc(p.name)}<small>${esc(p.role)}</small></div><div class="db-bubble" id="db-${i}">${esc(p.lines[0])}</div></div>`).join('')}</div>
    <div class="news-list"><div class="panel-head red"><span>📰 TOP KHABREIN</span><span class="pixel">AUTO-GENERATED BAKCHODI</span></div>
      ${list.map((p, i) => `<button type="button" class="news-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="nr-num">${i + 1}</span><span class="nr-text"><small>SOOTRON KE HAWALE SE · @${esc(authorOf(p).handle)}</small>${esc(p.title)}</span><b>🌶️ ${voteInfo(p).avg.toFixed(1)}</b></button>`).join('') || '<p class="padded">Koi khabar nahi. Anchor bore ho raha hai.</p>'}
    </div>
  </section>`);
}
function startPanel() {
  clearInterval(S.panelTimer);
  if (route() !== '/news') return;
  S.panelTimer = setInterval(() => {
    if (route() !== '/news') return clearInterval(S.panelTimer);
    const i = Math.floor(Math.random() * C.panel.length), el = document.getElementById('db-' + i);
    if (el) { el.textContent = pick(C.panel[i].lines); el.parentElement.classList.remove('shouting'); void el.offsetWidth; el.parentElement.classList.add('shouting'); }
    const a = document.getElementById('anchor-line'); if (a && Math.random() < 0.4) a.textContent = pick(C.panel[5].lines);
  }, 1300);
}

/* ───────────────────────── leaderboard (v1 layout + titles + week/all) ───────────────────────── */
function leaderboard() {
  const r = rankings(S.board), sum = r.gangs.balaks + r.gangs.bataks || 1;
  const hot = allPosts().filter(p => p.status === 'published').slice().sort((a, b) => voteInfo(b).avg - voteInfo(a).avg).slice(0, 5);
  return shell(`<div class="page-title"><span class="title-badge">★ CERTIFIED FALTU COMPETITION ★</span><h1>HALL OF <span>SHAME</span> 🏆</h1><p>Hundreds of opinions. Zero trophies worth explaining to your parents.</p></div>
  <div class="board-tabs" role="tablist"><button type="button" role="tab" aria-selected="${S.board === 'week'}" data-action="board" data-board="week" class="${S.board === 'week' ? 'on' : ''}">IS HAFTE</button><button type="button" role="tab" aria-selected="${S.board === 'all'}" data-action="board" data-board="all" class="${S.board === 'all' ? 'on' : ''}">ALL TIME</button></div>
  <section class="war-banner"><div class="war-side balak-war"><span>🔴 GANG 01</span><h2>BALAKS</h2><strong>${r.gangs.balaks} <small>CP</small></strong></div><div class="vs-burst">VS</div><div class="war-side batak-war"><span>🔵 GANG 02</span><h2>BATAKS</h2><strong>${r.gangs.bataks} <small>CP</small></strong></div><div class="war-progress"><i style="width:${Math.round(r.gangs.balaks / sum * 100)}%"></i></div></section>
  <div class="leader-grid"><section class="leader-board"><div class="section-ribbon">🏅 TOP CONTRIBUTORS — NALLA SUPREME</div>${r.authors.length ? r.authors.slice(0, 25).map((u, i) => `<a class="leader-row" href="#/u/${esc(u.handle)}"><span class="leader-pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : ('#' + (i + 1))}</span>${cssAvatar(u)}<div class="leader-user"><strong>@${esc(u.handle)}</strong><small>${u.gang === 'balaks' ? '🔴 BALAK' : '🔵 BATAK'} · ${esc(titleFor(lifetimePoints(u.id), u.title))} · ${u.posts} posts</small></div><span class="leader-points">${u.points} CP</span></a>`).join('') : '<p class="muted padded">No contributors yet. Become the first.</p>'}</section><section class="leader-board"><div class="section-ribbon section-ribbon-blue">🌶️ SPICIEST CONTROVERSIES</div>${hot.length ? hot.map((p, i) => `<button type="button" class="hot-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="hot-rank">${i + 1}.</span><span class="hot-name">${esc(p.title)}</span><strong>${voteInfo(p).avg.toFixed(1)} 🌶️</strong></button>`).join('') : '<p class="muted padded">Nobody has posted any kalesh yet.</p>'}</section></div><div class="leader-footnote">Scores = 10 per approved original post + up to 40 spice points after 3 unique votes. Gang war resets every Monday (UTC). Titles: ${C.titles.map(t => `${t[0]}+ ${t[1]}`).join(' · ')}.</div>`);
}

/* ───────────────────────── my profile (v1 layout + handles/titles/X/bio) ───────────────────────── */
function profilePage() {
  const u = me(), mine = allPosts().filter(p => p.user_id === u.id), score = lifetimePoints(u.id);
  const link = location.href.split('#')[0] + '#/u/' + u.handle;
  const secret = k => ['cat', 'typist', 'lost'].includes(k);
  return shell(`<div class="page-title"><span class="title-badge">✦ DEPARTMENT OF PERSONAL NONSENSE ✦</span><h1>YOUR <span>CRIMINAL</span> PROFILE <small>(NOT REALLY)</small></h1><p>Aapke internet achievements, in full embarrassing detail.</p></div>
  <div class="profile-grid"><section class="profile-panel"><div class="profile-banner"><span class="fake-stamp">CERTIFIED NALLA</span></div><div class="profile-body"><div class="profile-big-avatar">${cssAvatar(u)}</div><h2>@${esc(u.handle)}</h2><span class="gang-profile ${u.gang === 'balaks' ? 'red-gang' : 'blue-gang'}">${u.gang === 'balaks' ? '🔴 TEAM BALAKS' : '🔵 TEAM BATAKS'}</span><div class="profile-title-line">🎖 ${esc(titleFor(score, u.title))}</div>${xBadge(u) ? `<div class="post-xline">${xBadge(u)}</div>` : ''}<p>${u.bio ? esc(u.bio) : 'Officially contributing to the downfall of meaningful conversation since 2026.'}</p>
    <div class="profile-actions"><button type="button" class="button button-black" data-action="edit-avatar">😼 EDIT MEME AVATAR</button><button type="button" class="button button-black" data-action="edit-bio">✍️ EDIT BIO${u.x_username ? '' : ' &amp; X HANDLE'}</button><button type="button" class="button button-red" data-action="copy-link" data-link="${esc(link)}">🔗 COPY PROFILE LINK</button><button type="button" class="button button-black" data-action="betray">🐍 SWITCH GANG</button></div>
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
      </section></div>`);
  }
  const a = pp.profile, posts = allPosts().filter(p => p.user_id === a.id && p.status === 'published');
  return shell(`<div class="kprofile-grid">${profilePoster(a, { points: lifetimePoints(a.id), posts: posts.length })}
    <section class="panel"><div class="panel-head red"><span>📼 FILMOGRAPHY</span><button type="button" class="link-btn" data-action="copy-link" data-link="${esc(location.href)}">🔗 COPY LINK</button></div>
    ${posts.map(p => `<button type="button" class="news-row" data-action="scroll-post" data-id="${esc(p.id)}"><span class="nr-text">${esc(p.title)}</span><b>🌶️ ${voteInfo(p).avg.toFixed(1)}</b></button>`).join('') || '<p class="padded">Abhi tak koi kalesh nahi. Shareef aadmi lagta hai.</p>'}</section></div>`);
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
  S.publicProfile = { handle, profile, reserved, error, missing: !error && !profile && !reserved };
  if (route() === '/u/' + handle) render();
}

/* ───────────────────────── onboarding screens ───────────────────────── */
function loginWindow() {
  return `<section class="win98 login-window">
    <div class="win-bar"><span>🔐 USER_AUTHENTICATION.EXE</span><span class="win-btns"><i>_</i><i>□</i><i>✕</i></span></div>
    <div class="win-body">
      <div class="panel-badge">🚨 OFFICIAL KHAALI-PEELI PORTAL</div>
      <h2>WELCOME TO<br><span>THE KAND.</span></h2>
      <p>People are fighting on X. You are here to rate the spice and earn imaginary points. Society has peaked.</p>
      <button type="button" class="btn btn-ink btn-wide btn-big" data-action="login-x">𝕏 CONTINUE WITH X</button>
      <div class="or">— YA PHIR —</div>
      <form id="email-form" class="email-form"><label for="email-in">EMAIL SE AAO <small>(magic link, no password)</small></label><div class="email-row"><input id="email-in" name="email" type="email" required placeholder="nalla@example.com" autocomplete="email"><button type="submit" class="btn btn-hot">📧 LINK BHEJO</button></div></form>
      <div class="or">— YA SIRF DEKHNA HAI —</div>
      <button type="button" class="btn btn-gold btn-wide" data-action="enter-demo">🐈 DEMO MEIN GHUSO</button>
      <div class="login-steps">✦ LOGIN ✦ CLAIM HANDLE ✦ PICK GANG ✦ KALESH ✦</div>
      <p class="fine">By entering you agree to rate the absurdity, never the person. No doxxing, threats or pile-ons.</p>
    </div>
  </section>`;
}
function loginPage() {
  const panel = configured ? loginWindow() : `<section class="login-panel"><div class="fake-window-bar"><span class="window-lights"><i></i><i></i><i></i></span> USER_AUTHENTICATION.EXE <span>✕</span></div><div class="login-panel-inner"><div class="panel-badge">🚨 OFFICIAL KHAALI-PEELI PORTAL</div><h2>WELCOME TO<br/><span>THE KAND.</span></h2><p>People are fighting on X. You are here to give them a spice rating and earn imaginary points. Society has peaked.</p><div class="login-options"><div class="setup-note">𝕏 X LOGIN NEEDS API SETUP <small>Add your Supabase + X OAuth credentials in config.js to enable real login.</small></div><button type="button" data-action="enter-demo" class="button button-red button-wide">🐈 ENTER THE LIVE DEMO ↗</button></div><div class="login-trust">✦ PICK A GANG ✦ RATE THE KALESH ✦ BECOME A NALLA</div><div class="login-footnote">No real X posts or accounts are loaded in demo mode. Demo data stays in your browser.</div></div></section>`;
  return `<div class="login-page"><div class="login-ticker">✸ GOVERNMENT OF INTERNET NONSENSE ✸ DEPARTMENT OF FULL-TIME KALESH ✸ ATTENTION ALL UNEMPLOYED SCROLLERS ✸</div><div class="login-grid"><section class="login-hero"><div class="login-stamp">AS SEEN ON ABSOLUTELY NO REPUTABLE NEWS CHANNEL</div><div class="login-huge">KALESH<span>.EXE</span></div><div class="login-slogan">THE INTERNET<br/><span>IS A CIRCUS.</span></div><div class="login-explainer">AUR TUM VIP PASS LEKE AAYE HO. <span>🐈</span></div><div class="login-poster-row"><div class="login-burst">2<br/>GANGS!</div><div class="login-cat" data-action="cat"><img src="assets/cat.svg" alt="Cheeky orange cat"/></div><div class="login-burst alt-burst">0<br/>BRAIN CELLS!</div></div><div class="login-footer-tags"><span>✸ RETRO MASALA INTERNET ARCADE</span><span>✸ NO REFUNDS</span></div></section>${panel}</div><div class="login-bottom">2026 MEIN TOH DUNIYA KHATAM HAI. TAB TAK SCROLL KAR LE.</div></div>`;
}
function checkEmailPage() {
  return `<div class="center-page"><section class="win98 small-win"><div class="win-bar"><span>📧 MAIL_SENT.EXE</span><span class="win-btns"><i>✕</i></span></div><div class="win-body center">
    <div class="big-emoji">📬</div><h2>INBOX CHECK KARO.</h2><p>Magic link bheja hai <b>${esc(S.pendingEmail)}</b> pe. Usse click karo aur seedha andar.</p>
    <p class="fine">Spam folder bhi dekh lena. Wahan bhi kalesh hota hai.</p>
    <button type="button" class="btn btn-ink" data-action="back-login">← GALAT EMAIL? WAPAS JAO</button></div></section></div>`;
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
function catCouncil() { return shell(`<div class="secret-room"><img src="assets/cat.svg" alt="Supreme Cat Council mascot"/><span class="title-badge">TOP SECRET · ABSOLUTELY USELESS</span><h1>CAT COUNCIL<br/>OF KALESH</h1><p>Congratulations. You found the secret room. The cats have reviewed your internet history and are deeply confused.</p><div class="secret-quote">"MEOW MEOW. GUILTY OF TOO MUCH SCROLLING."</div><button class="button button-red" type="button" data-action="cat-rain">🐈 RECEIVE THE BLESSING</button></div>`); }

/* ───────────────────────── modals (v1 dialogs) ───────────────────────── */
const dialog = (label, title, body, cls = '') => `<div class="modal-backdrop" data-action="backdrop"><div class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="dialog-bar"><span>${title}</span><button type="button" data-action="close" aria-label="Close">✕</button></div>${body}</div></div>`;
function postModal() {
  const emojis = ['🎬', '🍿', '💀', '🗿', '🔥', '🤡', '📢', '🐈', '🦆', '⚔️', '📉', '👑'];
  return dialog('Post a controversy', '🎬 FILE A NEW KALESH', `<form id="post-form" class="dialog-body"><div class="dialog-topline">📢 BREAKING BAKCHODI NEWS DESK</div><h2>POST KALESH.</h2><p>Original meme post or link an actual public X post. Make it funny, not harmful.</p><label>ORIGINAL X LINK <small>(optional for an original meme)</small><input name="x_url" type="url" placeholder="https://x.com/user/status/123..." /></label><label>MEMEIFIED HEADLINE <small>(required)</small><input name="title" maxlength="150" required placeholder="Bro wrote a dissertation over a meme..." /></label><label>CONTEXT / THE TEA <small>(required)</small><textarea name="description" maxlength="700" rows="3" required placeholder="Tell us what happened. Context beats made-up accusations."></textarea></label><label>POSTER TAGLINE <small>(shown if no image)</small><input name="poster_text" maxlength="40" placeholder="ABSOLUTE CINEMA" /></label><label>POSTER EMOJI <select name="poster_emoji">${emojis.map(e => `<option>${e}</option>`).join('')}</select></label><label>TAGS <small>(comma separated, optional)</small><input name="tags" maxlength="100" placeholder="fandom, cinema, brainrot" /></label><label class="upload-label">🖼️ ADD AN OPTIONAL MEME IMAGE <input name="meme" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /><small>Up to 3 MB. Only upload images you may use.</small></label><div class="post-guideline">⚠ No doxxing, threats, personal targeting, or impersonation. Public figures can be discussed, but let's keep the jokes about the posts, not people's private lives.${S.mode === 'live' ? ' New posts go to moderation first.' : ''}</div><button type="submit" id="submit-post" class="button button-red button-wide submit-post">💥 INTERNET PE CHHOD DO ↗</button></form>`, 'post-dialog');
}
function avatarModal() {
  const u = me();
  return dialog('Edit meme avatar', '😼 MEME AVATAR WORKSHOP', `<div class="dialog-body"><h2>APNI SHAKAL CHUNO.</h2><p>Pick a cursed avatar. Your internet reputation depends on absolutely none of this.</p><div class="avatar-picker">${C.avatars.map(a => `<button type="button" data-action="pick-avatar" data-avatar="${a}" class="avatar-option ${!u.avatar_url && u.avatar_emoji === a ? 'chosen' : ''}" aria-label="Choose ${a} avatar">${a}</button>`).join('')}</div><div class="avatar-upload"><label class="upload-label">📸 OR UPLOAD YOUR OWN MEME AVATAR<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label><small>PNG, JPEG, WEBP or GIF. Maximum 3MB. Keep it appropriate.</small></div></div>`, 'avatar-dialog');
}
function bioModal() {
  const u = me();
  return dialog('Edit bio', '✍️ BIO EDITOR', `<form id="bio-form" class="dialog-body"><h2>APNE BAARE MEIN.</h2><label>BIO <small>(max 160)</small><textarea name="bio" maxlength="160" rows="3" placeholder="Professional opinion distributor.">${esc(u.bio || '')}</textarea></label>${u.x_username ? '' : `<label>X HANDLE <small>(unverified until you log in with X)</small><input name="x_claimed" maxlength="16" value="${esc(u.x_claimed || '')}" placeholder="@handle" /></label>`}<button type="submit" class="button button-red button-wide">💾 SAVE</button></form>`, 'post-dialog');
}
function memeModal(m) {
  return dialog('Meme bomb', '💣 KALESH RANDOMIZER.EXE', `<div class="meme-dialog-inner">${m[4] ? `<img class="vault-img" src="${esc(safeImg(m[4]))}" alt="">` : `<span class="meme-dialog-emoji">${esc(m[0])}</span>`}<h2>${esc(m[1])}</h2><p>${esc(m[2])}</p><div class="meme-actions"><button data-action="bomb" type="button" class="button button-red">💣 PHIR SE PHODO</button><button data-action="close" type="button" class="button button-black">BAS KAR BHAI</button></div></div>`, 'meme-dialog');
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
  if (r.startsWith('/post/')) { const id = decodeURIComponent(r.slice(6)); history.replaceState(null, '', location.pathname + location.search + '#/'); setTimeout(() => scrollToPost(id), 60); }
  const known = ['/', '/news', '/leaderboard', '/profile', '/cat-council'];
  if (!known.includes(route()) && !route().startsWith('/u/')) { app().innerHTML = notFound(); achieve('lost'); return; }
  document.body.classList.toggle('dark', isDarkRoute(route()));
  if (S.pendingEmail && needsLogin()) { app().innerHTML = checkEmailPage(); return; }
  if (needsLogin()) { app().innerHTML = loginPage(); return; }
  if (!me()) { app().innerHTML = `<div class="loading-block"><img src="assets/cat.svg" class="spin-fast" alt=""><p>${esc(pick(C.loading))}</p></div>`; return; }
  if (!me().handle) { app().innerHTML = claimPage(); return; }
  if (!me().gang) { app().innerHTML = gangPage(); return; }
  const rr = route();
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
function bootCat(ms = 900) {
  if (document.getElementById('boot-screen')) return;
  const div = document.createElement('div');
  div.id = 'boot-screen'; div.className = 'boot-screen';
  div.innerHTML = `<div class="boot-inner"><div class="boot-top">KALESH.EXE <span>STARTING NONSENSE...</span></div><div class="boot-cat-wrap"><img src="assets/cat.svg" alt="Fast dancing loading cat" /></div><h2>BILLI SERVER CHALA RAHI HAI.</h2><p>${esc(pick(C.loading))}</p><div class="boot-progress"><i></i></div><small>PLEASE DO NOT FEED THE SERVER CAT · CLICK TO SKIP</small></div>`;
  div.onclick = () => div.remove();
  document.body.append(div);
  const reduced = reducedMotion();
  setTimeout(() => { div.classList.add('boot-out'); setTimeout(() => div.remove(), reduced ? 10 : 260); }, reduced ? 90 : ms);
}

/* ───────────────────────── data: live (Supabase) ───────────────────────── */
async function initSupabase() {
  const lib = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
  S.sb = lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { detectSessionInUrl: true, persistSession: true, flowType: 'pkce' } });
  const { data: { session } } = await S.sb.auth.getSession();
  S.sb.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_OUT') { S.session = null; S.profile = null; S.mode = 'guest'; render(); }
    else if (s && (!S.session || S.session.user.id !== s.user.id)) setTimeout(() => applySession(s).then(render).catch(liveError), 0);
  });
  if (session) await applySession(session);
  loadVault();
}
function liveError(e) { console.error(e); notice('Server ne kalesh kar diya: ' + String(e?.message || e).slice(0, 90)); }
async function applySession(session) {
  S.session = session; S.mode = 'live'; S.pendingEmail = '';
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
  S.profile = { ...data, suggested: session.user.email?.split('@')[0] };
  await refreshLive();
}
async function refreshLive() {
  if (!S.sb || !S.session) return;
  const [p, v, l] = await Promise.all([
    S.sb.from('controversies').select('*,author:profiles!controversies_user_id_fkey(id,handle,x_username,x_claimed,avatar_emoji,avatar_url,gang,title)').order('created_at', { ascending: false }).limit(300),
    S.sb.from('spice_votes').select('post_id,user_id,spice').limit(5000),
    S.sb.from('post_likes').select('post_id,user_id').limit(5000)
  ]);
  if (p.error || v.error || l.error) { liveError(p.error || v.error || l.error); return; }
  S.posts = p.data.map(x => ({ ...x, author: x.author || { handle: 'deleted', avatar_emoji: '👻' } }));
  S.votes = v.data; S.likes = l.data; bump();
}
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
  go('/'); render(); bootCat(1000);
  setTimeout(() => { Chaos.breaking(`EK AUR NALLA ${g.toUpperCase()} MEIN SHAMIL — DESH SADME MEIN`); }, 1400);
}
async function submitPost(form) {
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim(), description = String(fd.get('description') || '').trim(), x_url = String(fd.get('x_url') || '').trim();
  const tags = String(fd.get('tags') || '').split(',').map(t => t.trim().toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 24)).filter(Boolean).slice(0, 5);
  const file = fd.get('meme')?.size ? fd.get('meme') : null;
  const poster_text = String(fd.get('poster_text') || '').trim().slice(0, 40) || pick(['ABSOLUTE CINEMA', 'KHAO POPCORN', 'BRO IS COOKED', 'PICTURE ABHI BAAKI HAI', '+999 AURA']);
  const poster_emoji = String(fd.get('poster_emoji') || '🎬').slice(0, 8);
  if (title.length < 8 || description.length < 10) return notice('Headline (8+) aur tea (10+) chahiye, bhai.');
  if (x_url && !isXURL(x_url)) return notice('Link x.com/…/status/… wala hona chahiye.');
  if (!x_url && !file) return notice('X link ya original meme image — kuch toh do.');
  const norm = u => u.toLowerCase().replace('twitter.com', 'x.com').replace('www.', '').replace('mobile.', '').split('?')[0];
  if (x_url && allPosts().some(p => p.x_url && norm(p.x_url) === norm(x_url))) return notice('Duplicate kalesh! Ye pehle hi post ho chuka hai.');
  const btn = $('#submit-post'); btn.disabled = true; btn.textContent = 'UPLOADING KAND…';
  try {
    const image_url = await uploadImage(file, 'kalesh');
    if (S.mode === 'demo') {
      store.posts.unshift({ id: makeId(), user_id: me().id, title, description, x_url: x_url || null, tags, image_url: image_url || null, poster_text, poster_emoji, created_at: new Date().toISOString(), status: 'published', seed: { spice: 0, count: 0, likes: 0 } });
      saveStore();
    } else {
      const { error } = await S.sb.from('controversies').insert({ user_id: S.session.user.id, title, description, x_url: x_url || null, tags, image_url: image_url || null, poster_text, poster_emoji });
      if (error) throw error;
      await refreshLive();
    }
    closeOverlay(); go('/'); render();
    Chaos.breaking(title.toUpperCase().slice(0, 80));
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
  const card = document.getElementById('post-' + id); if (card) card.outerHTML = postCard(p);
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
  const card = document.getElementById('post-' + id); if (card) card.outerHTML = postCard(p);
}
async function report(id) {
  if (!confirm('Report this post to the moderators?')) return;
  if (S.mode === 'demo') { store.reports[id] = true; saveStore(); return notice('⚑ Demo report saved locally.'); }
  const { error } = await S.sb.from('reports').insert({ post_id: id, reporter_id: S.session.user.id, reason: 'User report' });
  notice(error ? 'Already reported, ya report fail ho gaya.' : '⚑ Report moderators tak pahuncha diya.');
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
  if (navigator.share) navigator.share({ title: 'Kalesh spotted on KALESH.EXE', url }).catch(() => {});
  else copy(url);
}
function copy(text) { navigator.clipboard?.writeText(text).then(() => notice('📋 Link copied! Ab group mein daal.')).catch(() => notice(text)); }
function scrollToPost(id) {
  if (route() !== '/') { go('/'); }
  setTimeout(() => { const el = document.getElementById('post-' + id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } else notice('Post nahi mila.'); }, 160);
}
function bomb() {
  S.bombClicks++;
  const m = S.bombClicks % 10 === 0 ? ['🛑', 'BHAI BAS KAR', 'Server ki bhi family hai.', 'bruh'] : pick(memes());
  overlay(memeModal(m)); SFX.play(m[3] || 'boom');
  if (S.bombClicks >= 10) achieve('bomber');
}
function revealCouncil() { achieve('cat'); closeOverlay(); go('/cat-council'); SFX.play('tada'); notice('🐈 YOU FOUND THE CAT COUNCIL. MEOW.'); }
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

/* ───────────────────────── events ───────────────────────── */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  const a = el.dataset.action, id = el.dataset.id;
  if (a === 'backdrop') { if (e.target === el) closeOverlay(); return; }
  if (el.tagName !== 'A') e.preventDefault(); // real links still navigate
  switch (a) {
    case 'enter-demo': enterDemo(); break;
    case 'login-x': {
      if (!S.sb) return notice('X login abhi configured nahi hai. Demo try karo.');
      const { error } = await S.sb.auth.signInWithOAuth({ provider: cfg.xProvider || 'twitter', options: { redirectTo: location.origin + location.pathname } });
      if (error) notice('X login error: ' + error.message); break;
    }
    case 'back-login': S.pendingEmail = ''; render(); break;
    case 'choose-gang': await chooseGang(el.dataset.gang); break;
    case 'go-home': go('/'); break;
    case 'go-profile': go('/profile'); break;
    case 'open-post': overlay(postModal()); SFX.play('pop'); break;
    case 'edit-avatar': overlay(avatarModal()); break;
    case 'edit-bio': overlay(bioModal()); break;
    case 'pick-avatar': await updateProfile({ avatar_emoji: el.dataset.avatar, avatar_url: null }); break;
    case 'close': closeOverlay(); break;
    case 'bomb': bomb(); break;
    case 'daily-meme': { const m = dailyMeme(); overlay(memeModal(m)); SFX.play(m[3] || 'boom'); break; }
    case 'scroll-post': if (id) scrollToPost(id); else notice('Kalesh vacancy hai.'); break;
    case 'toggle-spice': { const p = document.getElementById('spice-' + id); if (p) { p.hidden = !p.hidden; el.setAttribute('aria-expanded', String(!p.hidden)); } break; }
    case 'vote': await vote(id, Number(el.dataset.value), el); break;
    case 'like': await toggleLike(id); break;
    case 'report': await report(id); break;
    case 'share': share(id); break;
    case 'tag': S.search = el.dataset.tag; S.sort = 'relevant'; render(); $('#search')?.scrollIntoView({ block: 'center' }); break;
    case 'clear-search': S.search = ''; renderFeed(); { const s = $('#search'); if (s) s.value = ''; } break;
    case 'board': S.board = el.dataset.board; render(); break;
    case 'explode': explode(); break;
    case 'siren': S.sirenCount++; Chaos.breaking(pick(newsHeadlines()), true); if (S.sirenCount >= 3) achieve('siren'); break;
    case 'breaking': Chaos.breaking(pick(newsHeadlines()), false); SFX.force('hit'); break;
    case 'drama': Chaos.serialZoom(); achieve('drama'); break;
    case 'sound': { const on = SFX.toggle(); el.textContent = soundLabel(); el.setAttribute('aria-pressed', on); notice(on ? '🔊 AWAAZ ON. Ab har cheez pe drama.' : '🔇 Shanti.'); break; }
    case 'chaos': { const on = Chaos.toggle(); el.textContent = 'CHAOS: ' + (on ? 'ON 💥' : 'OFF 😇'); notice(on ? '💥 Chaos wapas aa gaya.' : '😇 Sanskari mode activated.'); break; }
    case 'secret': if (Math.random() < 0.3) revealCouncil(); else bomb(); break;
    case 'prophecy': Chaos.shake(el); SFX.play('boom'); if (Math.random() < 0.5) Chaos.rain(['🌍', '💥', '☄️', '🔥']); else Chaos.popup(); break;
    case 'cat': S.catClicks++; Chaos.shake(el); SFX.play('pop'); if (S.catClicks >= 7) { S.catClicks = 0; revealCouncil(); } break;
    case 'cat-rain': Chaos.rain(['🐈', '😼', '🐱', '😹', '🙀']); break;
    case 'logo': S.logoClicks++; if (S.logoClicks >= 5) { S.logoClicks = 0; Chaos.serialZoom(); achieve('drama'); } break;
    case 'copy-link': copy(el.dataset.link); break;
    case 'betray': achieve('traitor'); Chaos.breaking('GADDAR PAKDA GAYA! @' + me().handle + ' NE GANG BADALNE KI KOSHISH KI', true); setTimeout(() => notice('🐍 Just kidding. Gang permanent hai. Sabko bata diya gaya hai.'), 2700); break;
    case 'claim-reserved': { const { data, error } = await S.sb.rpc('claim_reserved_profile'); if (error || !data?.handle) notice('Claim fail: ' + (error?.message || 'reserved row match nahi hua')); else { S.profile = { ...S.profile, ...data }; SFX.play('tada'); go('/profile'); } break; }
    case 'logout': await logout(); break;
  }
});
document.addEventListener('submit', async e => {
  const f = e.target; e.preventDefault();
  if (f.id === 'post-form') await submitPost(f);
  else if (f.id === 'claim-form') await claimHandle(f);
  else if (f.id === 'bio-form') { const fd = new FormData(f), xc = String(fd.get('x_claimed') || '').trim().replace(/^@/, ''); if (xc && !X_RE.test(xc)) return notice('X handle galat hai.'); const fields = { bio: String(fd.get('bio') || '').trim().slice(0, 160) || null }; if (!me().x_username) fields.x_claimed = xc || null; await updateProfile(fields); }
  else if (f.id === 'email-form') {
    const email = String(new FormData(f).get('email') || '').trim();
    const btn = f.querySelector('button'); btn.disabled = true;
    const { error } = await S.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    btn.disabled = false;
    if (error) return notice('Email nahi gaya: ' + error.message.slice(0, 90));
    S.pendingEmail = email; render();
  }
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
addEventListener('hashchange', () => { render(); scrollTo({ top: 0 }); });

/* ───────────────────────── init ───────────────────────── */
async function init() {
  const firstVisit = (() => { try { const v = sessionStorage.getItem('kalesh-booted'); sessionStorage.setItem('kalesh-booted', '1'); return !v; } catch { return false; } })();
  if (firstVisit) bootCat(900);
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
