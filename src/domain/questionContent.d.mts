import type { Choice, ChoiceId, QuestionStimulus } from '../types/question';

export type HashableQuestionContent = {
  question: string;
  choices: readonly Choice[];
  stimulus?: readonly QuestionStimulus[];
} & ({ correct_choice: ChoiceId } | { correctChoice: ChoiceId });
export function normalizeContentText(value: string): string;
export function canonicalQuestionContent(question: HashableQuestionContent): string;
export function calculateQuestionContentHash(question: HashableQuestionContent): string;
export function sha256(text: string): string;
