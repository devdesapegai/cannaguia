/**
 * Retry with exponential backoff, jitter, Retry-After header respect,
 * and circuit breaker pattern for OpenAI API resilience.
 *
 * Per OpenAI docs:
 * - Only retry on 429, 408, 500, 502, 503 (not 400, 401, 403)
 * - Respect Retry-After header
 * - Add jitter to prevent thundering herd
 * - Circuit breaker to stop sending requests when API is unstable
 */

// --- Circuit Breaker ---

type CircuitState = "closed" | "open" | "half-open";

const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30_000;
const HALF_OPEN_MAX_ATTEMPTS = 1;

let circuitState: CircuitState = "closed";
let failureCount = 0;
let lastFailureTime = 0;
let halfOpenAttempts = 0;

export function getCircuitState(): CircuitState {
  if (circuitState === "open" && Date.now() - lastFailureTime >= RECOVERY_TIMEOUT_MS) {
    circuitState = "half-open";
    halfOpenAttempts = 0;
  }
  return circuitState;
}

function recordSuccess() {
  failureCount = 0;
  circuitState = "closed";
  halfOpenAttempts = 0;
}

function recordFailure() {
  failureCount++;
  lastFailureTime = Date.now();
  if (circuitState === "half-open") {
    halfOpenAttempts++;
    if (halfOpenAttempts >= HALF_OPEN_MAX_ATTEMPTS) {
      circuitState = "open";
    }
  } else if (failureCount >= FAILURE_THRESHOLD) {
    circuitState = "open";
  }
}

export function resetCircuitBreaker() {
  circuitState = "closed";
  failureCount = 0;
  lastFailureTime = 0;
  halfOpenAttempts = 0;
}

// --- Retry Logic ---

const RETRIABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

function isRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    for (const code of RETRIABLE_STATUS_CODES) {
      if (msg.includes(String(code))) return true;
    }
    const cause = (error as any).cause;
    if (cause?.status && RETRIABLE_STATUS_CODES.has(cause.status)) return true;
    if (cause?.statusCode && RETRIABLE_STATUS_CODES.has(cause.statusCode)) return true;
  }
  return false;
}

function getRetryAfterMs(error: unknown): number | null {
  const headers = (error as any)?.cause?.headers ?? (error as any)?.headers;
  if (!headers) return null;

  const retryAfter = typeof headers.get === "function"
    ? headers.get("retry-after")
    : headers["retry-after"];

  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (!isNaN(seconds)) return seconds * 1000;

  const date = Date.parse(retryAfter);
  if (!isNaN(date)) return Math.max(0, date - Date.now());

  return null;
}

function calculateDelay(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) return retryAfterMs;
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * 0.5;
  return exponential + jitter;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  retriesUsed: number;
}

/**
 * Execute an async function with retry, backoff, jitter, and circuit breaker.
 * Throws immediately for non-retriable errors (400, 401, 403).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label = "api-call",
): Promise<RetryResult<T>> {
  const state = getCircuitState();
  if (state === "open") {
    throw new Error(`Circuit breaker is OPEN for ${label}. Requests blocked for ${RECOVERY_TIMEOUT_MS / 1000}s.`);
  }

  let lastError: unknown;
  const maxAttempts = state === "half-open" ? 1 : MAX_RETRIES + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();
      recordSuccess();
      return { result, attempts: attempt + 1, retriesUsed: attempt };
    } catch (error) {
      lastError = error;

      if (!isRetriable(error)) {
        throw error;
      }

      recordFailure();

      if (attempt < maxAttempts - 1) {
        const retryAfterMs = getRetryAfterMs(error);
        const delay = calculateDelay(attempt, retryAfterMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
