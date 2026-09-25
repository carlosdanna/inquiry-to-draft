import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jevFetch } from "./client";
import { JevError } from "./errors";
import { createJevDecisionModel, yesNoConfidence } from "./jev-decision-model";

const REQUEST = {
  state: "Dinner for 16 this Friday.",
  questions: { catering: { type: "noul" as const, instructions: "Food wanted?" } },
};

const ANSWERS = {
  model: "jev-1.13.0",
  answers: { catering: { type: "noul", noul: 0.97 } },
  usage: { input_tokens: 40, output_tokens: 0 },
};

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

async function captureError(promise: Promise<unknown>): Promise<JevError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(JevError);
    return error as JevError;
  }
  throw new Error("Expected the call to fail");
}

beforeEach(() => {
  vi.stubEnv("JEV_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("jevFetch", () => {
  it("posts the model, state and questions with the bearer token", async () => {
    const fetchMock = mockFetch(async () => jsonResponse(ANSWERS));

    const result = await jevFetch(REQUEST);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ai-gateway.vercel.sh/typesafe/v1/systemone");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ model: "typesafe-ai/jev", ...REQUEST });
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(result.answers.catering).toEqual({ type: "noul", noul: 0.97 });
  });

  it("explains a rejected key", async () => {
    mockFetch(async () => jsonResponse({}, { status: 401 }));

    const error = await captureError(jevFetch(REQUEST));

    expect(error.kind).toBe("http");
    expect(error.status).toBe(401);
    expect(error.message).toContain("JEV_API_KEY");
  });

  it("passes on the gateway's message for a rejected request", async () => {
    mockFetch(async () =>
      jsonResponse(
        { message: "questions.catering.type: expected one of 'noul', 'choice', 'score'", error_type: "invalid_request" },
        { status: 422 },
      ),
    );

    const error = await captureError(jevFetch(REQUEST));

    expect(error.status).toBe(422);
    expect(error.message).toContain("expected one of");
  });

  it("reads the retry delay from a rate limit response", async () => {
    mockFetch(async () =>
      jsonResponse({}, { status: 429, headers: { "Retry-After": "2" } }),
    );

    const error = await captureError(jevFetch(REQUEST));

    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(2);
  });

  it("reports a timeout", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });

    const error = await captureError(jevFetch(REQUEST));

    expect(error.kind).toBe("timeout");
    expect(error.message).toContain("10 seconds");
  });

  it("reports a network failure", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const error = await captureError(jevFetch(REQUEST));

    expect(error.kind).toBe("network");
  });

  it("rejects a success body in an unexpected shape", async () => {
    mockFetch(async () => jsonResponse({ answers: { catering: { type: "noul" } } }));

    const error = await captureError(jevFetch(REQUEST));

    expect(error.kind).toBe("invalid_response");
  });

  it("fails before calling out when the key is missing", async () => {
    vi.stubEnv("JEV_API_KEY", "");
    const fetchMock = mockFetch(async () => jsonResponse(ANSWERS));

    const error = await captureError(jevFetch(REQUEST));

    expect(error.kind).toBe("config");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createJevDecisionModel", () => {
  it("translates questions to Jev and answers back with confidence", async () => {
    const fetchMock = mockFetch(async () =>
      jsonResponse({
        model: "jev-1.13.0",
        answers: {
          language: {
            type: "choice",
            choice: "swedish",
            probabilities: { english: 0.05, swedish: 0.95 },
            confidence: 0.9,
          },
          urgency: {
            type: "score",
            score: 0.2,
            probabilities: { low: 0.8, high: 0.2 },
            confidence: 0.6,
          },
          rooms: { type: "noul", noul: 0.3 },
        },
      }),
    );

    const decisions = await createJevDecisionModel().decide("Hej!", {
      language: { type: "choice", instructions: "Language?", options: { english: "", swedish: "" } },
      urgency: { type: "score", instructions: "Urgency?", levels: ["low", "high"] },
      rooms: { type: "yes_no", instructions: "Rooms?", whenYes: "Stays overnight" },
    });

    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.questions.urgency.criteria).toEqual(["low", "high"]);
    expect(sent.questions.rooms).toEqual({
      type: "noul",
      instructions: "Rooms?",
      criteria: { true: "Stays overnight" },
    });
    expect(decisions.language).toMatchObject({ value: "swedish", confidence: 0.9 });
    expect(decisions.urgency).toMatchObject({ value: 0.2, label: "low", confidence: 0.6 });
    expect(decisions.rooms).toMatchObject({ value: false, probability: 0.3 });
    expect(decisions.rooms.confidence).toBeCloseTo(0.4);
  });

  it("falls back to the highest probability when confidence is missing", async () => {
    mockFetch(async () =>
      jsonResponse({
        model: "typesafe-ai/jev",
        answers: {
          route: { type: "choice", choice: "billing", probabilities: { billing: 0.7, other: 0.3 } },
        },
      }),
    );

    const decisions = await createJevDecisionModel().decide("text", {
      route: { type: "choice", instructions: "Route?", options: { billing: "", other: "" } },
    });

    expect(decisions.route).toMatchObject({ value: "billing", confidence: 0.7 });
  });

  it("fails when Jev leaves a question unanswered", async () => {
    mockFetch(async () => jsonResponse({ model: "jev-1.13.0", answers: {} }));

    const error = await captureError(
      createJevDecisionModel().decide("text", {
        rooms: { type: "yes_no", instructions: "Rooms?" },
      }),
    );

    expect(error.kind).toBe("invalid_response");
  });
});

describe("yesNoConfidence", () => {
  it("is 0 at an even split and 1 at either end", () => {
    expect(yesNoConfidence(0.5)).toBe(0);
    expect(yesNoConfidence(1)).toBe(1);
    expect(yesNoConfidence(0)).toBe(1);
    expect(yesNoConfidence(0.9)).toBeCloseTo(0.8);
  });
});
