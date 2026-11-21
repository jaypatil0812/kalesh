export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-kalesh-secret",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });

export const env = (name: string, fallback?: string): string => {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing env ${name}`);
  return v;
};

/** Constant-time comparison so the shared secret can't be guessed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Checks the x-kalesh-secret header against KALESH_INGEST_SECRET. Returns an error Response or null. */
export function requireSecret(req: Request): Response | null {
  const expected = Deno.env.get("KALESH_INGEST_SECRET") ?? "";
  if (expected.length < 16) return json({ error: "Server misconfigured: KALESH_INGEST_SECRET must be set (16+ chars)" }, 500);
  const got = req.headers.get("x-kalesh-secret") ?? "";
  return safeEqual(got, expected) ? null : json({ error: "Unauthorized" }, 401);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
