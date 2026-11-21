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

**Moderation:** new posts are `pending` until approved. The SQL file ends with a cheat-sheet: approve posts, assign titles, add vault memes and news lines, reserve VIP handles.

## Security model

- Users can update only `avatar_emoji`, `avatar_url`, `gang`, `bio` and `x_claimed` (column grants). `handle` goes through `claim_handle()`. `x_username` (verified) comes only from the X identity. `title` and `is_admin` are admin-only.
- Gang is permanent (trigger). Posts limited to 10/day/user. Duplicate X links are blocked by a unique index.
- Votes, likes and reports are restricted to your own user and published posts via RLS.

## Known limits

- Leaderboards are calculated in the browser from the latest 300 posts / 5,000 votes. Move to SQL views/RPCs when it grows.
- Achievements are cosmetic and stored per browser.
- X posts are linked, not embedded.
