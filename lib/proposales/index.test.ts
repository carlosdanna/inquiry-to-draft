import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG, priceInCents } from "./catalog";
import { listCompanyTemplates } from "./index";

beforeEach(() => {
  vi.stubEnv("PROPOSALES_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("listCompanyTemplates", () => {
  it("calls the templates path for the company and returns the list", async () => {
    const template = {
      uuid: "8f14e45f-ceea-467a-9575-0a1d2b3c4d5e",
      language: "en",
      title: "Conference",
      background_image_uuid: null,
    };
    const fetchMock = vi.fn(async () =>
      Response.json({ data: [template], extra_key: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const templates = await listCompanyTemplates(42);

    const [url] = fetchMock.mock.calls[0] as unknown as [URL];
    expect(url.toString()).toBe(
      "https://api.proposales.com/v3/companies/42/templates",
    );
    expect(templates).toEqual([template]);
  });
});

describe("priceInCents", () => {
  it("converts whole kronor to öre", () => {
    const boardroom = CATALOG.find((item) => item.title === "Boardroom")!;
    expect(boardroom.priceSek).toBe(6500);
    expect(priceInCents(boardroom)).toBe(650000);
  });
});
