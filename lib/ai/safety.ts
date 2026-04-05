import { createHash } from "crypto";

/**
 * Hash a user or session identifier for OpenAI safety tracking.
 * OpenAI recommends sending hashed IDs (never raw PII) to detect abuse.
 * Blocked identifiers return "identifier_blocked" errors on GPT-5 models.
 */
export function hashIdentifier(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 32);
}

/**
 * Returns the appropriate safety identifier for the request.
 * - Authenticated users: hashed user ID (stable across sessions)
 * - Guests: hashed session ID (per-session, as recommended by OpenAI)
 */
export function getSafetyIdentifier(
  userId: string,
  isGuest: boolean,
  sessionId?: string,
): string {
  if (isGuest && sessionId) {
    return hashIdentifier(`guest:${sessionId}`);
  }
  return hashIdentifier(userId);
}

/**
 * Check if an API error indicates the user's safety identifier was blocked by OpenAI.
 */
export function isIdentifierBlocked(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("identifier_blocked") || error.message.includes("identifier blocked");
  }
  return false;
}
