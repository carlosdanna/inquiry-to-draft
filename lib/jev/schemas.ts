import { z } from "zod";

// Schemas for the TypeSafe System One interface (POST /v1/systemone), as
// served by the Vercel model gateway. See https://docs.typesafe.ai/api.md.
// Zod drops keys we do not read.

export type JevQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } };

export type JevRequest = {
  model: string;
  state: string;
  questions: Record<string, JevQuestion>;
};

const ProbabilitiesSchema = z.record(z.string(), z.number());

export const JevChoiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  probabilities: ProbabilitiesSchema,
  // TypeSafe documents this field, but the gateway examples leave it out.
  confidence: z.number().optional(),
});

export const JevScoreAnswerSchema = z.object({
  type: z.literal("score"),
  score: z.number(),
  probabilities: ProbabilitiesSchema,
  confidence: z.number().optional(),
  legend: z.record(z.string(), z.string()).optional(),
});

// A yes or no answer is a single probability of "yes", with no confidence.
export const JevNoulAnswerSchema = z.object({
  type: z.literal("noul"),
  noul: z.number().min(0).max(1),
});

export const JevAnswerSchema = z.discriminatedUnion("type", [
  JevChoiceAnswerSchema,
  JevScoreAnswerSchema,
  JevNoulAnswerSchema,
]);

export const JevResponseSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), JevAnswerSchema),
  usage: z
    .object({ input_tokens: z.number(), output_tokens: z.number() })
    .optional(),
});

export const JevErrorResponseSchema = z.object({
  message: z.string(),
  error_type: z.string().optional(),
});

export type JevAnswer = z.infer<typeof JevAnswerSchema>;
export type JevResponse = z.infer<typeof JevResponseSchema>;
