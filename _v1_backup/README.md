# KALESH.EXE — Balaks vs Bataks

**A functional, chaotic retro-Bollywood meme arcade.** Vanilla JS, CSS, and original SVG cat art. No build chain or required dependency for the offline demo.

## What works immediately

1. Open `index.html` in a browser, or serve the folder using `npx http-server . -p 4173` (or `python3 -m http.server 4173`).
2. Select **ENTER THE LIVE DEMO**. The demo never accesses real X accounts.
3. Pick **Balaks** or **Bataks** (one-time per browser profile).
4. Browse fictional sample controversies; search; sort by newest, oldest, relevance, trending, spice, or alphabetical order; vote spice 1–10; give reactions; view live-in-browser gang meters and leaderboard.
5. Post your own meme controversy by uploading an image and/or supplying a valid X link; update your emoji/photo avatar; discover cat council Easter eggs and random Meme Bombs.
6. Open `#/404` to see the cartoon explosion error page. An unknown `#/whatever` route also shows 404.
7. Data for the demo persists in browser `localStorage`, while the demo session persists in `sessionStorage`. **Demo scores and sample controversies are fictional and do not sync between users.**

## Connect real X sign-in, data, and uploads (required for production)

**No X OAuth credentials or Supabase project were supplied, so real login cannot already be live.** This frontend has the real authentication + data integration ready, but YOU must connect the services:

1. Create a Supabase project (supabase.com).
2. Open **SQL Editor** and run `supabase-schema.sql` once in a *new project*. RLS prevents users changing their team, approving their own posts, or submitting someone else's vote.
3. In Supabase **Authentication → Providers**, enable **Twitter (X) OAuth 2.0**. Create your own X developer app and supply the X Client ID and Client Secret to Supabase's provider settings. Provider availability and any X plan requirements are determined by X.
4. Set the X developer app's OAuth callback / redirect URI to the callback URL displayed in Supabase's Twitter provider settings (commonly `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`). Add the production domain and local development URL to **Supabase → Authentication → URL Configuration** (redirect allow list).
5. In `config.js`, set your **Supabase project URL** and **publishable/anon key**:
   ```js
   window.KALESH_CONFIG = {
     supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
     supabaseAnonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
   };
   ```
   These are public client-side values. **NEVER paste your Supabase service_role key or X Client Secret into this file.**
6. Upload/serve the folder on a static host (e.g. Vercel). `vercel.json` includes a catch-all rewrite. The app imports a pinned Supabase JS ESM bundle via jsDelivr only when the project is configured. Production access requires network availability for that library.
7. Confirm a real test X account completes sign-in, picks a team, submits a pending post, and uploads to `kalesh-media`; a moderator must approve the post in Supabase's dashboard by setting `status='published'`.

## Production moderation

New submissions are **pending** by default. They are only visible to their author until a moderator approves them in the Supabase Table Editor. Reports are recorded in `reports`, accessible in the Supabase dashboard. The public feed is sorted and ranked using published entries. The original X post is linked, not scraped. Do not copy or redistribute third-party media without permission.

**Current limitations:** New posts require manual moderator approval; there is no account self-service deletion screen, administrator UI, analytics service, real-time multiuser subscription, or automated X post embedding. Live scores are calculated from the latest 300 controversies and 5,000 votes/reactions loaded in the browser, so pagination/aggregate RPCs are recommended as the community grows. Demo uploads are limited to 3MB but large images may exceed the browser's localStorage quota; use live storage for production.

## Brand / UX

- Old Indian internet cafe / Windows 98 window chrome / retro Bollywood mass-masala posters, original cat mascot and cartoon explosion effects.
- Warm paper background, masala red, duck blue, poster yellow, bold poster typography, playful Hinglish copy.
- Simple feed-centered layout; on mobile: four-item bottom navigation and stacked widgets.
- Fast animated cat boot on first team choice; reduced-motion support. No autoplay audio or forced loading.
- Daily meme is deterministic by UTC day. Meme bombs sample from a curated array in `app.js` (`MEMES` constant), easy to update at any time.
- Footer phrase is **26 me to duniya khatam h**.

## Files

- `index.html` — entry page
- `styles.css` — responsive original visual system
- `app.js` — complete frontend including Supabase integration and demo data
- `config.js` — public runtime settings (empty by default)
- `supabase-schema.sql` — database, Row Level Security, image storage policies
- `vercel.json` — static host configuration
- `assets/` — original locally-authored SVG cat and favicon

## Tests

Open `index.html`, enter demo, pick a team, click an individual spice score, submit a meme, check scoreboard updates, edit avatar, use search and sorts, test `#/404`, and reload to verify persistence. A screenshot/test harness can be run with Chromium/Playwright.

## Security note

UI validation is for user experience, not a security boundary. Supabase RLS is the server-side boundary. Server-side content scanning, rate limits, dedicated moderator workflows, account deletion, and server-calculated leaderboard aggregates should be added before a public scale launch. Run the SQL only in a new Supabase project, or reconcile existing schemas/policies manually.
