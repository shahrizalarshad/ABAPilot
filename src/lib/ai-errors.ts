import "server-only";
import { APICallError, RetryError } from "ai";

/** Turn an Anthropic / AI SDK error into a message the user can act on. Never includes the API key. */
export function describeAiError(err: unknown): {
  message: string;
  status: number;
} {
  let e: unknown = err;
  if (RetryError.isInstance(e)) e = e.lastError;
  const status = APICallError.isInstance(e) ? (e.statusCode ?? 0) : 0;
  const body = APICallError.isInstance(e)
    ? `${e.responseBody ?? ""} ${e.message}`
    : String((e as Error)?.message ?? e);
  const text = body.toLowerCase();

  if (text.includes("credit balance") || text.includes("billing"))
    return {
      status: 402,
      message:
        "Your Anthropic account has no credit. Add funds at console.anthropic.com → Billing, then try again.",
    };
  if (
    status === 401 ||
    text.includes("invalid x-api-key") ||
    text.includes("authentication")
  )
    return {
      status: 401,
      message:
        "The Anthropic API key is invalid or was revoked. Check ANTHROPIC_API_KEY in Vercel (or the key in Settings).",
    };
  if (status === 403 || text.includes("permission"))
    return {
      status: 403,
      message:
        "The Anthropic API key isn't allowed to use this model or workspace.",
    };
  if (status === 404 || text.includes("not_found") || text.includes("model:"))
    return {
      status: 404,
      message:
        "The AI model isn't available on this Anthropic account. Check ANTHROPIC_MODEL / ANTHROPIC_PREFILL_MODEL.",
    };
  if (
    status === 413 ||
    text.includes("too long") ||
    text.includes("prompt is too long")
  )
    return {
      status: 413,
      message:
        "The FSD and code are too long for the AI. Compact the code or remove old FSD versions.",
    };
  if (status === 429 || text.includes("rate limit"))
    return {
      status: 429,
      message: "Anthropic rate limit reached. Wait a minute and try again.",
    };
  if (status === 529 || status >= 500 || text.includes("overloaded"))
    return {
      status: 503,
      message: "Anthropic is busy right now. Try again in a minute.",
    };
  return {
    status: 502,
    message:
      "The AI request failed. Try again; if it keeps failing, check the Vercel function logs.",
  };
}
