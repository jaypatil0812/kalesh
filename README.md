# KALESH.EXE v2 — Balaks vs Bataks

Bollywood night-show posters × early-2000s arcade × Indian news-channel chaos. Vanilla JS/CSS, no build step.
v1 files are kept in `_v1_backup/`.

## Run it

```bash
python -m http.server 4173
```
Open http://localhost:4173. With `config.js` empty you get **demo mode** (everything in this browser's localStorage).

## What's in v2

- **Look:** the original v1 design (yellow poster paper, raised poster buttons) is kept exactly for login, gang select, feed, leaderboard, profile, 404 and Cat Council. The top of `styles.css` is v1 untouched; everything new sits below the `v2 ADDITIONS` marker under its own `--k-*` variables. Kalesh Tak and the shareable public profiles (film posters) use the dark night-show style, and the giant "26 me to duniya khatam h" footer is on every page.
- **Meme sounds** (`js/sound.js`): boom, air horn, bruh, sad trombone, Indian-news siren, TV-serial "dhum dhum", coin, quack, roar, dhamaka. All synthesized with WebAudio, so there are no copyrighted clips. Sound is off by default; turn it on with 🔇/🔊 in the header.
- **Meme spawns** (`js/chaos.js`): stickers pop on random clicks, a meme popup window appears every 45–85s, and posts trigger a BREAKING NEWS slam. Toggle with CHAOS ON/OFF in the footer.
- **Kalesh Tak** (`#/news`): news studio, shouting anchor, a 6-box *mahabahas* debate grid, siren button, and top stories built from the feed. The breaking-news ticker runs on every page.
- **Identity:** username + password signup (the username is your permanent handle), or X login followed by the arcade "ENTER YOUR NAME" screen. Verified 𝕏 handle from X login or a self-reported one for email users (marked *unverified*), titles from a points ladder or assigned by an admin.
- **Profiles as film posters** (`#/profile`, public at `#/u/<handle>`), with fake awards (achievements).
- **Reserved VIP handles:** pre-create a profile for an X account; only that X account can claim it by logging in with X. Share `#/u/<handle>`; logged-out visitors can see it.
- **Easter eggs:** type `kalesh`, `billi`, `quack`, `siren`, `drama` or `aura` anywhere. Konami code → arcade CRT mode. Click the logo 5× → dramatic zoom. Poke the cat 7× → Cat Council. Search `gta` or `26`. Use the gang-switch button on your profile. Click the 26 footer. Press the meme bomb 10×. Doom-scroll for a while.
- **404** (`#/anything`): looping cartoon explosions with "PHIR SE PHODO".

All the jokes live in `js/memes.js`. Edit that file to refresh memes, news lines, debate dialogue, loading lines and titles.

The poster redesign uses a curated set from the supplied meme CSV. The media list, CSV IDs and sources are in `js/meme-media.js`. The local GIFs have static alternatives for reduced-motion visitors. The intermission can be replayed from the entrance, and the sound switch controls all effects.

## Go live (Supabase: username/password + X login)

1. Create a Supabase project. In the SQL editor, run `supabase-schema.sql` once (written for a **fresh** project).
2. **Username + password login:** run `supabase/migrations/001_username_auth.sql`. Then go to Authentication → Providers → Email: keep it **on** and turn **"Confirm email" off**. Each username is stored in Supabase Auth as `<username>@<authEmailDomain>` (set in `config.js`; pick it once and never change it). No mail is sent, so there's no "forgot password". Reset passwords with the SQL at the bottom of that migration. Users can change their own password in the bio editor.
3. **X login:** create an app in the X developer portal, then enable the Twitter / X provider in Supabase → Authentication → Providers with the X client ID and secret. Set the X app's callback URL to the one Supabase shows (`https://<ref>.supabase.co/auth/v1/callback`). If your Supabase shows the "X / Twitter (OAuth 2.0)" provider, set `xProvider: 'x'` in `config.js`.
4. Authentication → URL Configuration: add `http://localhost:4173` and your production domain to the redirect allow-list.
5. Put the project URL and **anon/publishable** key in `config.js`. Never put the service_role key or the X secret there.
6. Deploy the folder as a static site (e.g. Vercel; `vercel.json` is included).

7. Run `supabase/migrations/002_content_pipeline.sql` in the SQL editor too (tweet snapshots, KALESH DESK, Realtime). See "Content pipeline" below.

**Moderation:** new posts are `pending` until approved. The SQL file ends with a cheat-sheet: approve posts, assign titles, add vault memes and news lines, reserve VIP handles.

## Content pipeline (tweets land on the site automatically)

```
Google Sheet ──(Apps Script, every 5 min)──► ingest ─┐
Apify X scraper ──(webhook / pg_cron)──► apify-sync ─┼─► unfurl (fxtwitter → oEmbed) ─► controversies + post_tweets ─► Realtime ─► open feeds
User submit form ──────────────────────► unfurl ─────┘                                  (as KALESH DESK)                (BREAKING slam)
```

- **Snapshots:** every X link is saved in `post_tweets` (author, text, media URLs, likes/reposts/views, date), so a post still shows the tweet if it gets deleted. Several links in one post make a **thread**. Media is hotlinked from X's CDN (`pbs.twimg.com` / `video.twimg.com`), never re-hosted.
- **KALESH DESK** is a system profile (`@kalesh_desk`, no login) that owns automated posts. Desk posts carry their own `side` (balaks/bataks), count for the gang war, and never top the people leaderboard.
- **Text-only posts** are allowed (no X link or image needed). With an X link the text is optional: the tweet's text is used.
- **Reports:** 3 reports since the last review send a published post back to `pending`. Re-publishing starts a fresh count.
- **Realtime:** new published posts appear in open feeds without a refresh and fire the BREAKING NEWS slam. In demo mode two fictional "wire" posts arrive the same way (25 s after load, then every 75 s, once per browser).

Files: `supabase/migrations/002_content_pipeline.sql`, `supabase/functions/{unfurl,ingest,apify-sync}`, `supabase/functions/_shared/`, `integrations/google-sheet/`, `tweets.css`.

### 1. Database
Run `supabase/migrations/002_content_pipeline.sql` in the SQL editor (after `supabase-schema.sql`). It is idempotent.

### 2. Deploy the Edge Functions
Needs the [Supabase CLI](https://supabase.com/docs/guides/cli). `supabase/config.toml` turns the gateway JWT check off for these three functions (they check their own secret header or user token).

```bash
supabase login
supabase link --project-ref <project-ref>
supabase secrets set KALESH_INGEST_SECRET=$(openssl rand -hex 24)
supabase secrets set APIFY_TOKEN=<apify api token>
supabase functions deploy unfurl --no-verify-jwt
supabase functions deploy ingest --no-verify-jwt
supabase functions deploy apify-sync --no-verify-jwt
```

Optional Apify tuning (all have defaults):

```bash
supabase secrets set APIFY_ACTOR_ID=apidojo~tweet-scraper APIFY_MIN_ENGAGEMENT=500 APIFY_MAX_ITEMS=60 APIFY_MAX_PUBLISH=10 APIFY_SINCE_HOURS=48
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically. Keep `KALESH_INGEST_SECRET` somewhere safe: the Sheet script and the Apify webhook need it. Never commit it, and never put it in `config.js`.

| Function | Who calls it | Auth | What it does |
|---|---|---|---|
| `unfurl` | the submit form | none for a preview; user JWT to save a snapshot to your own post | X link → snapshot (api.fxtwitter.com, fallback publish.twitter.com/oembed) |
| `ingest` | Google Sheet, any automation | `x-kalesh-secret` header | rows `{links[], title?, side?, tags?, note?}` → unfurl, dedupe by tweet id, meme title if blank, **published** as KALESH DESK |
| `apify-sync` | pg_cron or an Apify webhook | `x-kalesh-secret` header | scrapes the `watchlist`, dedupes, **publishes** tweets with engagement ≥ threshold, the rest go to `pending` |

Engagement = likes + 2×reposts + replies + 2×quotes. Each run publishes at most `APIFY_MAX_PUBLISH` posts; the rest wait in `pending`.

### 3. Google Sheet
See [`integrations/google-sheet/README.md`](integrations/google-sheet/README.md): sheet template (`links | title | side | tags | note | status | post_id`), Apps Script install, the 5-minute trigger, and how tools such as Instant, Muse, Zapier or a Claude chat with the Google Sheets connector can feed it by appending rows.

### 4. Apify (X scraping)
1. Create an Apify account and copy the API token (Settings → Integrations) into `APIFY_TOKEN` (above).
2. Add what to watch:
   ```sql
   insert into public.watchlist (kind, value, side, tags) values ('account', 'some_x_handle', 'balaks', '{tech}');
   insert into public.watchlist (kind, value, min_engagement) values ('search', '"bengaluru traffic" lang:en', 2000);
   ```
   Accounts become `from:<handle>` searches. `min_engagement` overrides the global threshold for that row.
3. Trigger it in **one** of these ways:

   **A. pg_cron (recommended).** Supabase starts the run; Apify calls `apify-sync` back when it finishes (an ad-hoc webhook that carries the secret header). In the SQL editor:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select vault.create_secret('<KALESH_INGEST_SECRET>', 'kalesh_ingest_secret');
   select cron.schedule('kalesh-apify-sync', '*/30 * * * *', $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/apify-sync',
       headers := jsonb_build_object('content-type', 'application/json', 'x-kalesh-secret',
         (select decrypted_secret from vault.decrypted_secrets where name = 'kalesh_ingest_secret')),
       body := '{}'::jsonb, timeout_milliseconds := 30000);
   $$);
   -- stop it: select cron.unschedule('kalesh-apify-sync');
   ```

   **B. Apify Schedule + webhook.** In Apify, create a Task for the actor (`apidojo/tweet-scraper`) with your `searchTerms`, add a Schedule (e.g. every 30 min), then on the Task add an Integration → **Webhook**: event *Run succeeded*, URL `https://<project-ref>.supabase.co/functions/v1/apify-sync`, headers template `{"x-kalesh-secret": "<KALESH_INGEST_SECRET>"}`, default payload. The Task input decides what's scraped. The watchlist is then only used to assign side and tags.

   To import an existing dataset by hand, POST `{"datasetId": "..."}` to `apify-sync` with the secret header.

4. Check what happened: `select created_at, channel, outcome, url, message from public.ingest_log order by id desc limit 50;`
   Approve a pending Apify post: `update public.controversies set status = 'published' where id = '...';`

Other actors: set `APIFY_ACTOR_ID` and, if its input differs, `APIFY_INPUT_JSON` (merged into the input). The importer understands the apidojo item shape and legacy Twitter API field names.

## Handed-over accounts (ready-made logins)

Make accounts for people so they can get in straight away, without signing up:

1. In the KALESH Desk Inbox sheet, open the **`accounts`** tab (run `setup` once after updating the script to create it).
2. Fill **username**, plus optional **gang** (balaks/bataks), **title**, **bio**, **x_handle** (shown as unverified) and **avatar** (an emoji). Leave **password** blank to get a generated one like `zkxx-5rqg-7z4n`.
3. **KALESH → Create accounts.** Each row gets `created ✅`, and generated passwords are written into column B.
4. Send each person their username and password. On first login they must set their own password, and with a gang pre-set they land straight in the feed.

Under the hood this calls the `create-accounts` Edge Function (same `x-kalesh-secret` as `ingest`). Temp passwords sit in the sheet, so keep the sheet private and clear column B once people have logged in.

## Security model

- Users can update only `avatar_emoji`, `avatar_url`, `gang`, `bio` and `x_claimed` (column grants). `handle` goes through `claim_handle()`. `x_username` (verified) comes only from the X identity. `title` and `is_admin` are admin-only.
- Gang is permanent (trigger). Posts limited to 10/day/user. Duplicate X links are blocked by a unique index.
- Votes, likes and reports are restricted to your own user and published posts via RLS.

## Known limits

- Leaderboards are calculated in the browser from the latest 300 posts / 5,000 votes. Move to SQL views/RPCs when it grows.
- Achievements are cosmetic and stored per browser.
- X posts are shown from saved snapshots (plus an optional live embed). Hotlinked media can disappear if X removes it.
- Pipeline tables (`post_tweets`, `ingest_log`, `watchlist`) are written only by Edge Functions with the service role. Admins can read the log and watchlist.
