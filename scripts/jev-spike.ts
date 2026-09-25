// Runs every inquiry question against each sample email and prints the answers.
//
//   npm run jev-spike           one table of answers with confidence values
//   npm run jev-spike -- --raw  also prints Jev's raw answers for each sample
//
// Needs JEV_API_KEY in .env.local. This calls the live Jev service.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  createJevDecisionModel,
  INQUIRY_QUESTIONS,
  isJevError,
  jevFetch,
  type Decision,
} from "@/lib/jev";
import { toJevQuestion } from "@/lib/jev/jev-decision-model";

const SAMPLES_DIR = path.join(process.cwd(), "samples");
const LOW_CONFIDENCE = 0.8;

function formatDecision(decision: Decision): string {
  const flag = decision.confidence < LOW_CONFIDENCE ? " *" : "";
  const confidence = decision.confidence.toFixed(2);
  switch (decision.type) {
    case "choice":
      return `${decision.value} (${confidence})${flag}`;
    case "score":
      return `${decision.value.toFixed(2)} ${shortLabel(decision.label)} (${confidence})${flag}`;
    case "yes_no":
      return `${decision.value ? "yes" : "no"} p=${decision.probability.toFixed(2)} (${confidence})${flag}`;
  }
}

// "Soon: the event is within..." becomes "soon".
function shortLabel(label: string | undefined): string {
  return label ? label.split(":")[0].toLowerCase() : "?";
}

async function printRaw(text: string) {
  const questions = Object.fromEntries(
    Object.entries(INQUIRY_QUESTIONS).map(([id, question]) => [id, toJevQuestion(question)]),
  );
  const response = await jevFetch({ state: text, questions });
  console.dir(response, { depth: null });
}

async function main() {
  const raw = process.argv.includes("--raw");
  const model = createJevDecisionModel();
  const files = (await readdir(SAMPLES_DIR)).filter((file) => file.endsWith(".txt")).sort();
  const rows: Record<string, Record<string, string>> = {};

  for (const file of files) {
    const text = await readFile(path.join(SAMPLES_DIR, file), "utf8");
    const started = Date.now();
    const decisions = await model.decide(text, INQUIRY_QUESTIONS);
    const row: Record<string, string> = {};
    for (const [id, decision] of Object.entries(decisions)) {
      row[id] = formatDecision(decision);
    }
    row.milliseconds = String(Date.now() - started);
    rows[file.replace(/\.txt$/, "")] = row;

    if (raw) {
      console.log(`\n=== ${file}`);
      await printRaw(text);
    }
  }

  console.table(rows);
  console.log(`* confidence below ${LOW_CONFIDENCE}`);
}

main().catch((error) => {
  if (isJevError(error)) {
    console.error(`Jev failed (${error.kind}${error.status ? ` ${error.status}` : ""}): ${error.message}`);
    if (error.cause) console.error(error.cause);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
