import "server-only";

import type { z } from "zod";
import { ProposalesError } from "./errors";
import { ErrorResponseSchema } from "./schemas";

export const PROPOSALES_BASE_URL = "https://api.proposales.com";
export const PROPOSALES_TIMEOUT_MS = 10_000;

type QueryValue = string | number | boolean | undefined;

export type ProposalesRequest<Schema extends z.ZodType> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  schema: Schema;
  signal?: AbortSignal;
};

// Calls the Proposales interface with the bearer token and a 10 second
// timeout, validates the response with the given schema, and turns every
// failure into a ProposalesError.
export async function proposalesFetch<Schema extends z.ZodType>(
  path: string,
  request: ProposalesRequest<Schema>,
): Promise<z.infer<Schema>> {
  const apiKey = readApiKey(path);
  const response = await send(path, request, apiKey);
  const body = await readJson(response);

  if (!response.ok) {
    throw toHttpError(path, response, body);
  }

  const parsed = request.schema.safeParse(body);
  if (!parsed.success) {
    throw new ProposalesError({
      kind: "invalid_response",
      message: "Proposales returned a response in an unexpected shape.",
      path,
      status: response.status,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function readApiKey(path: string): string {
  const apiKey = process.env.PROPOSALES_API_KEY;
  if (!apiKey) {
    throw new ProposalesError({
      kind: "config",
      message: "PROPOSALES_API_KEY is not set on the server.",
      path,
    });
  }
  return apiKey;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(path, PROPOSALES_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

async function send(
  path: string,
  request: ProposalesRequest<z.ZodType>,
  apiKey: string,
): Promise<Response> {
  const timeout = AbortSignal.timeout(PROPOSALES_TIMEOUT_MS);
  const signal = request.signal
    ? AbortSignal.any([timeout, request.signal])
    : timeout;

  try {
    return await fetch(buildUrl(path, request.query), {
      method: request.method ?? "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    throw toFetchFailure(path, error);
  }
}

function toFetchFailure(path: string, error: unknown): ProposalesError {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new ProposalesError({
      kind: "timeout",
      message: `Proposales did not respond within ${PROPOSALES_TIMEOUT_MS / 1000} seconds.`,
      path,
      cause: error,
    });
  }
  return new ProposalesError({
    kind: "network",
    message: "Could not reach Proposales.",
    path,
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

function toHttpError(
  path: string,
  response: Response,
  body: unknown,
): ProposalesError {
  const parsed = ErrorResponseSchema.safeParse(body);
  const fallback = `Proposales responded with ${response.status}${
    response.statusText ? ` ${response.statusText}` : ""
  }.`;

  return new ProposalesError({
    kind: "http",
    message: parsed.success ? parsed.data.error.message : fallback,
    path,
    status: response.status,
    issues: parsed.success ? parsed.data.error.issues : undefined,
    retryAfterSeconds: readRetryAfter(response),
  });
}

function readRetryAfter(response: Response): number | undefined {
  const value = Number(response.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
