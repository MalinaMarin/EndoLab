import { NextResponse } from "next/server";
import { revokeAdminSessionByToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.split(";").map((p) => p.trim()).find((c) => c.startsWith("admin_token="));
    const token = match ? match.split("=").slice(1).join("=") : null;
    // best-effort revoke
    await revokeAdminSessionByToken(token);

    const cookie = `admin_token=; Path=/; HttpOnly; SameSite=Lax; Expires=${expired}`;
    const publicEmail = `reviewer_email=; Path=/; SameSite=Lax; Expires=${expired}`;
    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", cookie);
    res.headers.append("Set-Cookie", publicEmail);
    return res;
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
