# Task: connect "Sign in with X" on KALESH.EXE

Hand this whole file to the agent (Claude Cowork). It is self-contained.

## Goal

The KALESH.EXE site already has a working **"𝕏 Continue with X"** button and all the code behind it.
The button doesn't work yet because X login is not configured. Finish the configuration so that:

1. Clicking **Continue with X** on the login page sends the user to X, and after they approve they come back to the site logged in.
2. A first-time X user lands on the **"ENTER YOUR NAME"** screen, which shows `𝕏 @theirhandle ✓ verified from your X login`. They pick a KALESH username, pick a gang, and reach the feed.
3. Their profile shows the verified 𝕏 badge.

No app code should need to change. The only file edit is one line in `config.js`.

## Facts you need

| Thing | Value |
|---|---|
| Project folder | `C:\Users\jaypa\OneDrive\Desktop\kalesh` (git repo, GitHub `jaypatil0812/kalesh`, branch `main`) |
| Supabase project | **kalesh**, ref `xfbjwvwwgvptpvygauul`, dashboard `https://supabase.com/dashboard/project/xfbjwvwwgvptpvygauul` |
| Supabase callback URL (goes into X) | `https://xfbjwvwwgvptpvygauul.supabase.co/auth/v1/callback` |
| Local site | `http://localhost:4173`. Start it from the project folder with `python -m http.server 4173` |
| Website URL for the X app (until the site has a real domain) | `https://github.com/jaypatil0812/kalesh` |
| Where the site reads the provider name | `config.js` → `xProvider` (currently `'twitter'`) |
| Login code (reference only, don't edit) | `app.js`: `case 'login-x'` calls `S.sb.auth.signInWithOAuth({ provider: cfg.xProvider, redirectTo: location.origin + location.pathname })` |
| Database side (already deployed) | The `handle_new_user` trigger copies the X username for providers `'twitter'` or `'x'`. `verified_x_username()` reads it from `auth.identities`. |

## Ground rules

- **Never put a secret in a file, a commit or a chat message.** The X **Client Secret** goes only into the Supabase dashboard field. `config.js` is public, so it only ever holds the public Supabase URL, the anon key and `xProvider`.
- **The human types secrets and passwords.** Ask Jay to sign in to developer.x.com and Supabase himself. Ask him to copy the X Client ID and Client Secret into the Supabase fields himself (you can open the pages and point at the fields).
- Don't change any other Supabase setting than the ones listed below. In particular, leave "Confirm email" **off**, because username/password signups depend on it.
- Don't edit `app.js`, the SQL files or the Edge Functions. If something doesn't work, stop and report what you saw (the exact error text and URL) instead of changing code.

## Steps

### 1. Create the X app (developer.x.com)

1. Open `https://developer.x.com/en/portal/dashboard`. Jay signs in with the X account that should own the app. Any account works.
2. If there's no developer account yet, choose the **Free** plan. X may ask for a use-case description; use something like: *"Sign in with X for KALESH.EXE, a community meme site. We only read the user's public profile (username, name, avatar) to show it on their profile. We don't post, read DMs or store tweets."*
3. In **Projects & Apps**, open the default project's app, or create one named `KALESH.EXE`.
4. Open the app → **User authentication settings** → **Set up** (or Edit) and set:
   - **App permissions:** Read
   - **Type of App:** Web App, Automated App or Bot (a confidential client)
   - **Callback URI / Redirect URL:** `https://xfbjwvwwgvptpvygauul.supabase.co/auth/v1/callback`
   - **Website URL:** `https://github.com/jaypatil0812/kalesh`
   - Terms of service and privacy policy URLs, if asked: use the same GitHub URL for now.
   - Save.
5. Open **Keys and tokens** → **OAuth 2.0 Client ID and Client Secret**. Generate them if needed. X shows the secret **only once**, so Jay should keep that tab open for the next step (or regenerate it later).

### 2. Turn on the X provider in Supabase

1. Open `https://supabase.com/dashboard/project/xfbjwvwwgvptpvygauul/auth/providers`.
2. Find **X / Twitter (OAuth 2.0)**. Turn it on, and Jay pastes in the **Client ID** and **Client Secret** from step 1.5. Save.
   - If that provider isn't listed, use the older **Twitter** provider instead. It needs the OAuth 1.0a **API Key and Secret** (Keys and tokens → Consumer Keys), and in X's user authentication settings, **OAuth 1.0a** must be on with "Request email from users" enabled. In that case `xProvider` stays `'twitter'` in step 4.
3. Don't touch the other providers. Email must stay **on** with "Confirm email" **off**.

### 3. Allow the site's address as a redirect

1. Open `https://supabase.com/dashboard/project/xfbjwvwwgvptpvygauul/auth/url-configuration`.
2. Set **Site URL** to `http://localhost:4173`. Change it to the real domain later, when the site is deployed.
3. Under **Redirect URLs**, add `http://localhost:4173/**` and `http://127.0.0.1:4173/**`. Save.

Without this, X login works but Supabase sends people back to its default address (`localhost:3000`) instead of the site.

### 4. Point the site at the right provider

In `config.js`, change one line:

```js
  xProvider: 'x',
```

Use `'x'` for the **X / Twitter (OAuth 2.0)** provider, or keep `'twitter'` if you used the older Twitter provider in step 2. Change nothing else in that file.

### 5. Test it for real

1. In the project folder, run `python -m http.server 4173` (skip this if it's already running). Open `http://localhost:4173` in a normal browser window.
2. If you're already logged in to the site, log out first: Profile → Exit / logout.
3. Click **𝕏 Continue with X**, and Jay approves on X.
4. Expected results:
   - The site comes back and shows **ENTER YOUR NAME** with `𝕏 @<his X handle> ✓ verified from your X login`.
   - He picks a username → gang page → feed.
   - Profile page: the X handle shows as verified (no "unverified" label).
5. Log out, then **Continue with X** again. He should go straight to the feed, with no username screen this time.

**If it fails**, report the exact error and the address bar URL. Common causes:

| What you see | Likely cause |
|---|---|
| X says "Something went wrong" / callback mismatch | The callback URI in X doesn't exactly match `https://xfbjwvwwgvptpvygauul.supabase.co/auth/v1/callback` |
| Lands on `localhost:3000` or "redirect not allowed" | Step 3 wasn't saved |
| "Unsupported provider" / "provider is not enabled" | Step 2 wasn't saved, or `xProvider` doesn't match the provider that's on (`'x'` vs `'twitter'`) |
| "Error getting user email from external provider" | Older Twitter provider without "Request email from users" turned on in X (see step 2.2) |
| Username screen shows an empty, unverified X field | Login worked but the X username didn't come through. Report it, don't change code. |

### 6. Save the change

1. `git add config.js`
2. `git commit -m "Enable Sign in with X (X OAuth 2.0 provider)"`
3. Push only if Jay says so: `git push origin main`.

## Done when

- [ ] An X app exists with the Supabase callback URL.
- [ ] Supabase has the X provider on, with the client ID and secret, entered by Jay.
- [ ] Supabase Site URL and redirect URLs include `http://localhost:4173`.
- [ ] `config.js` has the right `xProvider`, committed.
- [ ] A real X login reached the feed, and the profile shows the verified 𝕏 handle.
- [ ] No secret appears in any file, commit or message.

## Later, when the site has a real domain

- Add the domain to Supabase Site URL and Redirect URLs (e.g. `https://kalesh.example/**`).
- Change the X app's Website URL to the domain.
- The callback URI stays the same (it's Supabase's address, not the site's).
