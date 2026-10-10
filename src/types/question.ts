export const choiceIds = ['A', 'B', 'C', 'D'] as const;
export const difficulties = ['基礎', '標準', '応用'] as const;
export const priorities = ['S', 'A', 'B'] as const;

export type ChoiceId = (typeof choiceIds)[number];
export type Difficulty = (typeof difficulties)[number];
export type Priority = (typeof priorities)[number];

export interface Choice {
  id: ChoiceId;
  text: string;
  stimulus?: readonly QuestionStimulus[];
}

export type QuestionStimulus =
  | {
      type: 'table';
      headers: readonly string[];
      rows: readonly (readonly string[])[];
      caption?: string;
    }
  | { type: 'code'; content: string; language?: string; caption?: string }
  | { type: 'image'; src: string; alt: string; caption?: string; asset_sha256: string };

export type QuestionTerm = 'spring' | 'fall' | 'october';

export interface QuestionSet {
  id: string;
  number: number | null;
  sequence: number | null;
}

export interface QuestionSource {
  basis: string;
  type: string;
  verbatim_past_question: boolean;
  source_id?: string;
  exam?: string;
  year?: number;
  term?: QuestionTerm;
  question_number?: number;
  official_question_url?: string;
  official_answer_url?: string;
  official_answer?: string;
  official_answer_choice_id?: ChoiceId;
}

export interface Question {
  subjectId: SubjectId;
  id: string;
  code: string;
  sourceId?: string;
  contentHash?: string;
  datasetVersion?: string;
  stimulus?: readonly QuestionStimulus[];
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
  choiceExplanations?: Readonly<Record<ChoiceId, string>>;
  examTip?: string;
  relatedTerms?: readonly string[];
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
import type { SubjectId } from '../domain/subject';
