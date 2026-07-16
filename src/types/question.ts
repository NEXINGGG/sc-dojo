export const choiceIds = ['A', 'B', 'C', 'D'] as const;
export const difficulties = ['基礎', '標準', '応用'] as const;
export const priorities = ['S', 'A', 'B'] as const;

export type ChoiceId = (typeof choiceIds)[number];
export type Difficulty = (typeof difficulties)[number];
export type Priority = (typeof priorities)[number];

export interface Choice {
  id: ChoiceId;
  text: string;
}

export interface QuestionSet {
  id: string;
  number: number;
  sequence: number;
}

export interface QuestionSource {
  basis: string;
  type: string;
  verbatim_past_question: boolean;
}

export interface Question {
  id: string;
  code: string;
  domainId: string;
  categoryId: string;
  subcategoryId: string;
  subcategory: string;
  difficulty: Difficulty;
  priority: Priority;
  question: string;
  choices: readonly Choice[];
  correctChoice: ChoiceId;
  explanation: string;
  memoryPoint: string;
  questionSet: QuestionSet;
  source: QuestionSource;
  status: string;
  schemaVersion: number;
  originalCategoryLabel: string;
}

export interface Domain {
  id: string;
  name: string;
  order: number;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  defaultDomain: string;
  priority: Priority;
  description: string;
  subcategories: readonly Subcategory[];
}
