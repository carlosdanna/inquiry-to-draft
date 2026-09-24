// Seeds the Proposales content library with the "Hotel Skeppsholmen Demo" catalog.
//
//   npm run seed              creates catalog items that do not exist yet
//   npm run seed -- --cleanup archives every active item whose title is in the catalog
//
// Items are matched by title, so running the seed twice creates nothing new.

import {
  archiveContent,
  createContent,
  isProposalesError,
  listContent,
  pickText,
  resolveCompanyId,
  type ContentItem,
} from "@/lib/proposales";
import {
  CATALOG,
  CATALOG_LANGUAGE,
  CATALOG_NAME,
  CATEGORY_IMAGE_URLS,
  catalogDescription,
  findCatalogItem,
  normalizeTitle,
  type CatalogItem,
} from "@/lib/proposales/catalog";

type Outcome =
  | { title: string; status: "created"; productId: number; withImage: boolean }
  | { title: string; status: "skipped"; reason: string }
  | { title: string; status: "failed"; reason: string };

async function main() {
  const cleanup = process.argv.includes("--cleanup");
  const companyId = await resolveCompanyId();
  console.log(`${CATALOG_NAME}: using company ${companyId}.`);

  const existing = await listContent({ companyId, includeArchived: true });
  const ok = cleanup
    ? await runCleanup(existing)
    : await runSeed(companyId, existing);
  process.exitCode = ok ? 0 : 1;
}

async function runSeed(companyId: number, existing: ContentItem[]) {
  const byTitle = new Map(
    existing.map((item) => [normalizeTitle(pickText(item.title)), item]),
  );

  const outcomes: Outcome[] = [];
  for (const item of CATALOG) {
    const found = byTitle.get(normalizeTitle(item.title));
    if (found) {
      const reason = found.is_archived
        ? "exists but is archived, not restored"
        : "already exists";
      outcomes.push({ title: item.title, status: "skipped", reason });
    } else {
      outcomes.push(await createItem(companyId, item));
    }
    printOutcome(outcomes[outcomes.length - 1]);
  }

  printSummary(outcomes);
  return outcomes.every((outcome) => outcome.status !== "failed");
}

async function createItem(
  companyId: number,
  item: CatalogItem,
): Promise<Outcome> {
  const input = {
    company_id: companyId,
    language: CATALOG_LANGUAGE,
    title: item.title,
    description: catalogDescription(item),
  };

  try {
    const created = await withRateLimitRetry(() => createContent(input));
    return { title: item.title, status: "created", productId: created.product_id, withImage: false };
  } catch (error) {
    if (!isMissingImageError(error)) return failed(item, error);
  }

  // Proposales wants an image: retry once with a stock photo for the category.
  try {
    const images = [{ uuid: "", url: CATEGORY_IMAGE_URLS[item.category] }];
    const created = await withRateLimitRetry(() =>
      createContent({ ...input, images }),
    );
    return { title: item.title, status: "created", productId: created.product_id, withImage: true };
  } catch (error) {
    return failed(item, error);
  }
}

function isMissingImageError(error: unknown): boolean {
  return (
    isProposalesError(error) &&
    error.status === 400 &&
    /image/i.test(error.message)
  );
}

// Rate limits are not documented. If Proposales answers 429, wait as long
// as it asks (or 5 seconds) and try once more.
async function withRateLimitRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!isProposalesError(error) || error.status !== 429) throw error;
    const seconds = error.retryAfterSeconds ?? 5;
    console.log(`  rate limited, waiting ${seconds} seconds`);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return call();
  }
}

async function runCleanup(existing: ContentItem[]) {
  const toArchive = existing.filter(
    (item) => !item.is_archived && findCatalogItem(pickText(item.title)),
  );

  if (toArchive.length === 0) {
    console.log("\nNothing to archive. No active catalog items were found.");
    return true;
  }

  for (const item of toArchive) {
    console.log(`  archiving  ${pickText(item.title)} (product ${item.product_id})`);
  }
  const result = await archiveContent(toArchive.map((item) => item.product_id));
  console.log(`\nSummary: archived ${result.archived_count} of ${toArchive.length} items.`);
  return true;
}

function failed(item: CatalogItem, error: unknown): Outcome {
  return { title: item.title, status: "failed", reason: describeError(error) };
}

function describeError(error: unknown): string {
  if (!isProposalesError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  const issues = (error.issues ?? [])
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  const status = error.status ? ` (${error.status})` : "";
  return `${error.message}${status}${issues ? ` [${issues}]` : ""}`;
}

function printOutcome(outcome: Outcome) {
  if (outcome.status === "created") {
    const note = outcome.withImage ? ", with stock image" : "";
    console.log(`  created    ${outcome.title} (product ${outcome.productId}${note})`);
  } else {
    console.log(`  ${outcome.status.padEnd(10)} ${outcome.title}: ${outcome.reason}`);
  }
}

function printSummary(outcomes: Outcome[]) {
  const count = (status: Outcome["status"]) =>
    outcomes.filter((outcome) => outcome.status === status).length;
  console.log(
    `\nSummary: ${count("created")} created, ${count("skipped")} skipped, ${count("failed")} failed, ${outcomes.length} in catalog.`,
  );
}

main().catch((error) => {
  console.error(`Seed failed: ${describeError(error)}`);
  process.exitCode = 1;
});
