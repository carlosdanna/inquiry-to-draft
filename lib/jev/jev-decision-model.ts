import "server-only";

import { jevFetch } from "./client";
import type {
  Decision,
  DecisionModel,
  Decisions,
  Question,
  QuestionSet,
} from "./decision-model";
import { JevError } from "./errors";
import type { JevAnswer, JevQuestion } from "./schemas";

// The DecisionModel backed by Jev. All questions go in a single request.
export function createJevDecisionModel(): DecisionModel {
  return {
    async decide<Questions extends QuestionSet>(text: string, questions: Questions) {
      const response = await jevFetch({
        state: text,
        questions: mapValues(questions, toJevQuestion),
      });

      const decisions: Partial<Record<keyof Questions, Decision>> = {};
      for (const id of Object.keys(questions) as (keyof Questions & string)[]) {
        const answer = response.answers[id];
        if (!answer) {
          throw new JevError({
            kind: "invalid_response",
            message: `Jev did not answer the question "${id}".`,
          });
        }
        decisions[id] = toDecision(answer);
      }
      return decisions as Decisions<Questions>;
    },
  };
}

export function toJevQuestion(question: Question): JevQuestion {
  switch (question.type) {
    case "choice":
      return { type: "choice", instructions: question.instructions, criteria: question.options };
    case "score":
      return { type: "score", instructions: question.instructions, criteria: question.levels };
    case "yes_no":
      return {
        type: "noul",
        instructions: question.instructions,
        criteria:
          question.whenYes || question.whenNo
            ? { true: question.whenYes, false: question.whenNo }
            : undefined,
      };
  }
}

export function toDecision(answer: JevAnswer): Decision {
  switch (answer.type) {
    case "choice":
      return {
        type: "choice",
        value: answer.choice,
        confidence: answer.confidence ?? highestProbability(answer.probabilities),
        probabilities: answer.probabilities,
      };
    case "score":
      return {
        type: "score",
        value: answer.score,
        label: mostLikely(answer.probabilities),
        confidence: answer.confidence ?? highestProbability(answer.probabilities),
        probabilities: answer.probabilities,
      };
    case "noul":
      return {
        type: "yes_no",
        value: answer.noul >= 0.5,
        probability: answer.noul,
        confidence: yesNoConfidence(answer.noul),
      };
  }
}

// Jev gives no confidence for yes or no answers, only the probability of yes.
// We use how far that probability is from an even 0.5, stretched to 0 to 1:
// 0.5 gives 0, while 0 or 1 gives 1. A confidence of 0.8 needs 0.9 or 0.1.
export function yesNoConfidence(probability: number): number {
  return Math.abs(probability - 0.5) * 2;
}

// Used when Jev leaves out the confidence of a choice or score answer:
// the probability of the most likely option.
export function highestProbability(probabilities: Record<string, number>): number {
  return Math.max(0, ...Object.values(probabilities));
}

function mostLikely(probabilities: Record<string, number>): string | undefined {
  let best: string | undefined;
  for (const [key, value] of Object.entries(probabilities)) {
    if (best === undefined || value > probabilities[best]) best = key;
  }
  return best;
}

function mapValues<In, Out>(
  record: Record<string, In>,
  map: (value: In) => Out,
): Record<string, Out> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, map(value)]),
  );
}
