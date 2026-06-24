import { createSupabaseServerClient } from "./supabase-server";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { randomBytes } from "crypto";

const SECRET = process.env.ADMIN_AUTH_SECRET ?? process.env.ADMIN_REVIEWER_SECRET ?? "";
const encoder = new TextEncoder();
const key = encoder.encode(SECRET);

export async function createAdminSession(email: string, scopes: string[] = ["export:read", "export:write", "analytics:read"]) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 7; // 7 days
  const jti = cryptoRandomHex(12);

  const jwt = await new SignJWT({ scopes, role: "reviewer" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(key as unknown as CryptoKey);

  try {
    const supabase = createSupabaseServerClient();
    await supabase.from("admin_sessions").insert([{ jti, email, scopes: JSON.stringify(scopes), expires_at: new Date(exp * 1000).toISOString(), status: "active" }]);
  } catch {
    // ignore DB errors; session persistence is best-effort
  }

  return jwt;
}

export async function revokeAdminSessionByToken(token: string | null) {
  if (!token) return false;
  try {
    const payload = decodeJwt(token) as any;
    const jti = payload.jti;
    if (!jti) return false;
    const supabase = createSupabaseServerClient();
    await supabase.from("admin_sessions").update({ status: "revoked" }).eq("jti", jti);
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminToken(token: string | null) {
  if (!token || !SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, key as unknown as CryptoKey);
    const p = payload as any;
    // check revocation in DB if jti present
    if (p.jti) {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase.from("admin_sessions").select("status, expires_at").eq("jti", p.jti).limit(1);
      if (error) return null;
      const row = data?.[0] as any;
      if (!row) return null;
      if (row.status === "revoked") return null;
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
    }
    return { email: p.sub, role: p.role, scopes: p.scopes, jti: p.jti, exp: p.exp };
  } catch {
    return null;
  }
}

function cryptoRandomHex(bytes: number) {
  try {
    return randomBytes(bytes).toString("hex");
  } catch {
    const arr = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
    return Buffer.from(arr).toString("hex");
  }
}
