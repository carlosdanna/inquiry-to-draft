import "server-only";

import { JevError } from "./errors";
import {
  JevErrorResponseSchema,
  JevResponseSchema,
  type JevRequest,
  type JevResponse,
} from "./schemas";

// Jev is reached through the Vercel model gateway, which accepts TypeSafe's
// own request and response shapes at this address. JEV_API_KEY holds the
// gateway key. See https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe
export const JEV_URL = "https://ai-gateway.vercel.sh/typesafe/v1/systemone";
export const JEV_MODEL = "typesafe-ai/jev";
export const JEV_TIMEOUT_MS = 10_000;

// Sends one request to Jev with the bearer token and a 10 second timeout,
// validates the response, and turns every failure into a JevError.
export async function jevFetch(
  request: Omit<JevRequest, "model">,
  signal?: AbortSignal,
): Promise<JevResponse> {
  const apiKey = readApiKey();
  const response = await send({ model: JEV_MODEL, ...request }, apiKey, signal);
  const body = await readJson(response);

  if (!response.ok) {
    throw toHttpError(response, body);
  }

  const parsed = JevResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new JevError({
      kind: "invalid_response",
      message: "Jev returned a response in an unexpected shape.",
      status: response.status,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function readApiKey(): string {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) {
    throw new JevError({
      kind: "config",
      message: "JEV_API_KEY is not set on the server.",
    });
  }
  return apiKey;
}

async function send(
  request: JevRequest,
  apiKey: string,
  callerSignal?: AbortSignal,
): Promise<Response> {
  const timeout = AbortSignal.timeout(JEV_TIMEOUT_MS);
  const signal = callerSignal ? AbortSignal.any([timeout, callerSignal]) : timeout;

  try {
    return await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    throw toFetchFailure(error);
  }
}

function toFetchFailure(error: unknown): JevError {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new JevError({
      kind: "timeout",
      message: `Jev did not respond within ${JEV_TIMEOUT_MS / 1000} seconds.`,
      cause: error,
    });
  }
  return new JevError({
    kind: "network",
    message: "Could not reach Jev.",
    cause: error,
  });
}

// Returns the parsed body, or undefined when the body is empty or not JSON.
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "The model gateway rejected the key. Check JEV_API_KEY.",
  429: "Jev is rate limiting this app. Try again shortly.",
  529: "Jev is overloaded. Try again shortly.",
};

// Our own message for the common statuses, then the gateway's message,
// then the bare status.
function toHttpError(response: Response, body: unknown): JevError {
  const parsed = JevErrorResponseSchema.safeParse(body);
  return new JevError({
    kind: "http",
    message:
      STATUS_MESSAGES[response.status] ??
      (parsed.success ? parsed.data.message : `Jev responded with ${response.status}.`),
    status: response.status,
    retryAfterSeconds: readRetryAfter(response),
  });
}

function readRetryAfter(response: Response): number | undefined {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
