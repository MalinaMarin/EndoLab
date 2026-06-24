import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, secret } = body as { email?: string; secret?: string };
    const expected = process.env.ADMIN_REVIEWER_SECRET ?? "";

    if (!secret || secret !== expected) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const reviewerEmail = String(email ?? "").replace(/\r|\n/g, "");
    const token = await createAdminSession(reviewerEmail);

    const secureFlag = (process.env.NEXT_PUBLIC_URL ?? "").startsWith("https://") ? "; Secure" : "";

    const cookie = `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${60 * 60 * 24 * 7}`;
    const publicEmail = `reviewer_email=${encodeURIComponent(reviewerEmail)}; Path=/; SameSite=Lax${secureFlag}; Max-Age=${60 * 60 * 24 * 7}`;

    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", cookie);
    res.headers.append("Set-Cookie", publicEmail);
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
