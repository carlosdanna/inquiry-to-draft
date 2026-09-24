import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { proposalesFetch } from "./client";
import { ProposalesError } from "./errors";

const ItemsSchema = z.object({ data: z.array(z.object({ id: z.number() })) });

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function mockFetch(implementation: (...args: unknown[]) => Promise<Response>) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function captureError(promise: Promise<unknown>): Promise<ProposalesError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProposalesError);
    return error as ProposalesError;
  }
  throw new Error("Expected the call to fail");
}

beforeEach(() => {
  vi.stubEnv("PROPOSALES_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("proposalesFetch", () => {
  it("sends the bearer token, query string and JSON body", async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ data: [] }));

    await proposalesFetch("/v3/content", {
      method: "POST",
      query: { company_id: 42, include_archived: true, skipped: undefined },
      body: { title: "Boardroom" },
      schema: ItemsSchema,
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://api.proposales.com/v3/content?company_id=42&include_archived=true",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "Boardroom" }));
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
  });

  it("returns the body parsed by the schema", async () => {
    mockFetch(async () => jsonResponse({ data: [{ id: 1, extra: "ignored" }] }));

    const result = await proposalesFetch("/v3/content", { schema: ItemsSchema });

    expect(result).toEqual({ data: [{ id: 1 }] });
  });

  it("turns a documented error response into a typed error", async () => {
    const issues = [{ code: "invalid_type", path: ["title"], message: "Required" }];
    mockFetch(async () =>
      jsonResponse({ error: { message: "Invalid request", issues } }, { status: 400 }),
    );

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("http");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Invalid request");
    expect(error.issues).toEqual(issues);
    expect(error.path).toBe("/v3/content");
  });

  it("falls back to the status when the error body is not JSON", async () => {
    mockFetch(
      async () =>
        new Response("<html>Bad gateway</html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
    );

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("http");
    expect(error.status).toBe(502);
    expect(error.message).toBe("Proposales responded with 502 Bad Gateway.");
  });

  it("reads the retry delay from a rate limit response", async () => {
    mockFetch(async () =>
      jsonResponse(
        { error: { message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "3" } },
      ),
    );

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(3);
  });

  it("reports a timeout", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("timeout");
    expect(error.message).toContain("10 seconds");
  });

  it("aborts the request with a 10 second timeout signal", async () => {
    // AbortSignal.timeout uses a native timer, so we fire it by hand.
    const controller = new AbortController();
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const { signal } = init as RequestInit;
          signal?.addEventListener("abort", () => reject(signal.reason));
        }),
    );

    const pending = captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );
    controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
    const error = await pending;

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    expect(error.kind).toBe("timeout");
    timeoutSpy.mockRestore();
  });

  it("reports a network failure", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("network");
  });

  it("rejects a success body in an unexpected shape", async () => {
    mockFetch(async () => jsonResponse({ items: "nope" }));

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("invalid_response");
    expect(error.status).toBe(200);
  });

  it("fails before calling out when the key is missing", async () => {
    vi.stubEnv("PROPOSALES_API_KEY", "");
    const fetchMock = mockFetch(async () => jsonResponse({ data: [] }));

    const error = await captureError(
      proposalesFetch("/v3/content", { schema: ItemsSchema }),
    );

    expect(error.kind).toBe("config");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
