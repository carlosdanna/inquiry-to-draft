import { z } from "zod";

// A decision model reads free text and answers typed questions about it.
// Jev is the only implementation today. Keeping the question and answer
// shapes here, free of Jev's own field names, lets us swap it later.

export const ChoiceQuestionSchema = z.object({
  type: z.literal("choice"),
  instructions: z.string().min(1),
  // Option key to a short description that helps the model pick.
  options: z.record(z.string(), z.string()),
});

export const ScoreQuestionSchema = z.object({
  type: z.literal("score"),
  instructions: z.string().min(1),
  // Ordered from lowest to highest. Jev accepts 2 to 10 levels.
  levels: z.array(z.string()).min(2).max(10),
});

export const YesNoQuestionSchema = z.object({
  type: z.literal("yes_no"),
  instructions: z.string().min(1),
  whenYes: z.string().optional(),
  whenNo: z.string().optional(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  ChoiceQuestionSchema,
  ScoreQuestionSchema,
  YesNoQuestionSchema,
]);

export type ChoiceQuestion = z.infer<typeof ChoiceQuestionSchema>;
export type ScoreQuestion = z.infer<typeof ScoreQuestionSchema>;
export type YesNoQuestion = z.infer<typeof YesNoQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionSet = Record<string, Question>;

// Every answer keeps its confidence, from 0 (a guess) to 1 (certain).
export type Decision =
  | { type: "choice"; value: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; value: number; label?: string; confidence: number; probabilities: Record<string, number> }
  | { type: "yes_no"; value: boolean; probability: number; confidence: number };

export type Decisions<Questions extends QuestionSet> = {
  [Id in keyof Questions]: Decision;
};

export interface DecisionModel {
  decide<Questions extends QuestionSet>(
    text: string,
    questions: Questions,
  ): Promise<Decisions<Questions>>;
}
