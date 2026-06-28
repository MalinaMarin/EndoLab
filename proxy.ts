import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/demo", "/patient", "/patient/specialists", "/pricing", "/privacy", "/terms", "/login", "/signup", "/forgot-password", "/reset-password"];
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/signup", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/stripe/webhook", "/api/health"];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.includes(path) ||
    PUBLIC_API_PATHS.includes(path) ||
    path.startsWith("/patient/specialists/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/_next/") ||
    path === "/favicon.ico";
}

function isAllowedRequestOrigin(origin: string, request: NextRequest) {
  if (origin === request.nextUrl.origin) return true;

  const host = request.headers.get("host");
  if (host && origin === `${request.nextUrl.protocol}//${host}`) return true;

  if (process.env.NODE_ENV !== "production") {
    try {
      const originUrl = new URL(origin);
      const appUrl = new URL(`${request.nextUrl.protocol}//${host ?? request.nextUrl.host}`);
      const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
      return localHosts.has(originUrl.hostname) &&
        localHosts.has(appUrl.hostname) &&
        originUrl.port === appUrl.port;
    } catch {
      return false;
    }
  }

  return false;
}

async function hasValidToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let accountUser = null;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    accountUser = data.user;
  }

  if (path.startsWith("/admin") && path !== "/admin/login") {
    const validAdmin = await hasValidToken(
      request.cookies.get("admin_token")?.value,
      process.env.ADMIN_AUTH_SECRET ?? process.env.ADMIN_REVIEWER_SECRET ?? "",
    );
    if (!validAdmin) {
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  if (path.startsWith("/api/admin")) {
    return response;
  }

  if (!isPublicPath(path) && !path.startsWith("/admin") && !accountUser) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Account authentication required." }, { status: 401 });
    }
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && path.startsWith("/api/") && !PUBLIC_API_PATHS.includes(path)) {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedRequestOrigin(origin, request)) {
      return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
    }
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
