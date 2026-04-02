import "server-only";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY ?? "";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // Skip if not configured
  if (!token) return false;

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
      }),
    });

    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
