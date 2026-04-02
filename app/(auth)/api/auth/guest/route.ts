import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";

// Rate limit: max 3 guest accounts per IP per hour
const guestIpLimits = new Map<string, { count: number; resetAt: number }>();
const GUEST_RATE_WINDOW = 3_600_000;
const GUEST_RATE_MAX = 3;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of guestIpLimits) {
    if (now > entry.resetAt) guestIpLimits.delete(ip);
  }
}, 1_800_000);

function checkGuestRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = guestIpLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    guestIpLimits.set(ip, { count: 1, resetAt: now + GUEST_RATE_WINDOW });
    return true;
  }
  if (entry.count >= GUEST_RATE_MAX) return false;
  entry.count++;
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRedirect = searchParams.get("redirectUrl") || "/";
  const redirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) || "unknown";
  if (!checkGuestRateLimit(ip)) {
    return NextResponse.json(
      { error: "Limite de contas guest atingido. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
