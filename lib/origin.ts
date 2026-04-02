import "server-only";

const ALLOWED_ORIGINS = [
  "https://cannaguia.com",
  "https://www.cannaguia.com",
  "https://cannaguia.vercel.app",
];

export function isValidOrigin(request: Request): boolean {
  // Skip in development
  if (process.env.NODE_ENV === "development") return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) return true;
  if (referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) return true;

  return false;
}
