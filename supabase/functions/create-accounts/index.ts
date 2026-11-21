// POST /functions/v1/create-accounts   header  x-kalesh-secret: <KALESH_INGEST_SECRET>
// body: { accounts: [{ username, password?, gang?, title?, bio?, x_handle?, avatar_emoji?, ref? }] }
// Creates ready-to-use username+password accounts to hand over to people (VIPs, friends, early testers).
// - username becomes their permanent handle (same rules as signup)
// - password: use the one given (8-72 chars) or a generated one, returned ONLY in this response
// - the person must pick their own new password on first login (user_metadata.must_change_password)
// - gang / title / bio / unverified X handle / avatar are pre-filled so they land straight in the feed
// → { results: [{ ref, ok, username, user_id?, password?, error? }] }
import { CORS, errMsg, json, requireSecret } from "../_shared/http.ts";
import { serviceClient } from "../_shared/posts.ts";

type Account = {
  username?: unknown; password?: unknown; gang?: unknown; title?: unknown; bio?: unknown;
  x_handle?: unknown; avatar_emoji?: unknown; ref?: unknown;
};
const MAX = 25;
const DOMAIN = (Deno.env.get("KALESH_AUTH_EMAIL_DOMAIN") ?? "users.kalesh.app").trim().replace(/^@/, "").toLowerCase();
const str = (v: unknown, max: number) => (v == null ? "" : String(v).trim()).slice(0, max);

// Readable temp password: 3 short chunks from an alphabet without look-alikes (no 0/O, 1/l/I).
function tempPassword(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = [...bytes].map((b) => abc[b % abc.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const denied = requireSecret(req);
  if (denied) return denied;

  let body: { accounts?: Account[] } & Account;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
  const accounts: Account[] = Array.isArray(body.accounts) ? body.accounts : body.username ? [body] : [];
  if (!accounts.length) return json({ error: "Send { accounts: [{ username }] }" }, 400);
  if (accounts.length > MAX) return json({ error: `Max ${MAX} accounts per call` }, 413);

  const db = serviceClient();
  const results = [];
  for (const [i, a] of accounts.entries()) {
    const ref = a.ref == null ? String(i) : String(a.ref).slice(0, 100);
    const username = str(a.username, 40).replace(/^@/, "").toLowerCase();
    try {
      const { data: problem, error: checkErr } = await db.rpc("username_available", { p_username: username });
      if (checkErr) throw checkErr;
      if (problem) { results.push({ ref, ok: false, username, error: problem }); continue; }

      const given = str(a.password, 100);
      if (given && (given.length < 8 || given.length > 72)) {
        results.push({ ref, ok: false, username, error: "Password must be 8-72 characters (or leave it blank)" });
        continue;
      }
      const password = given || tempPassword();

      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email: `${username}@${DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { username, must_change_password: true, handed_over: true },
      });
      if (createErr) throw createErr;
      const id = created.user.id;

      // Pre-fill the profile (the signup trigger already created it with the handle).
      const gang = str(a.gang, 10).toLowerCase();
      const x = str(a.x_handle, 20).replace(/^@/, "");
      const fields: Record<string, unknown> = {};
      if (gang === "balaks" || gang === "bataks") fields.gang = gang;
      if (str(a.title, 60)) fields.title = str(a.title, 60);
      if (str(a.bio, 160)) fields.bio = str(a.bio, 160);
      if (/^[A-Za-z0-9_]{1,15}$/.test(x)) fields.x_claimed = x;
      if (str(a.avatar_emoji, 16)) fields.avatar_emoji = str(a.avatar_emoji, 16);
      if (Object.keys(fields).length) {
        const { error: upErr } = await db.from("profiles").update(fields).eq("id", id);
        if (upErr) throw upErr;
      }
      results.push({ ref, ok: true, username, user_id: id, password: given ? undefined : password });
    } catch (e) {
      const m = errMsg(e);
      results.push({ ref, ok: false, username, error: /already|registered|exists/i.test(m) ? "Username already taken" : m });
    }
  }
  return json({ results });
});
