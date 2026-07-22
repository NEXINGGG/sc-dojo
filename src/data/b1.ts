import b1CasesPayload from '../../data/b1-cases-2023-2025-ready.json';
import b1CategoriesPayload from '../../data/b1-categories.json';

export type B1InputKind =
  | 'term'
  | 'description'
  | 'multi_select'
  | 'device_name'
  | 'number'
  | 'sequence'
  | 'cidr'
  | 'symbol'
  | 'url_or_fqdn'
  | 'ip_address';

export type B1GradingMode = 'automatic' | 'concept_assisted_self_grade' | 'self_grade';

export interface B1AnswerField {
  fieldId: string;
  label: string;
  inputKind: B1InputKind;
  maxLength: number | null;
  acceptedAnswers: readonly string[];
  orderMatters: boolean;
  expectedCount: number;
  notes: string | null;
}

export interface B1QuestionUnit {
  questionId: string;
  label: string;
  promptSummary: string;
  answerType: string;
  answerConcepts: readonly string[];
  gradingMode: B1GradingMode;
  readyForApp: true;
  promptTextIncluded: false;
  sourcePromptLocator: {
    pdfPageZeroBased: number;
    printedPage: number | readonly number[];
    underlineRefs: readonly string[];
    figureRefs: readonly string[];
    tableRefs: readonly string[];
  };
  answerFields: readonly B1AnswerField[];
  grading: {
    mode: B1GradingMode;
    exactAutomaticEligible: boolean;
    officialAnswerConcepts: readonly string[];
    notice: string;
    caution: string | null;
  };
  commentaryInsight: string | null;
}

export interface B1Case {
  caseId: string;
  subjectId: 'b1';
  year: number;
  questionNumber: number;
  title: string;
  categoryIds: readonly string[];
  topics: readonly string[];
  estimatedMinutes: number;
  source: {
    provider: 'IPA';
    questionPdfUrl: string;
    answerPdfUrl: string;
    commentaryPdfUrl: string;
    yearPageUrl: string;
  };
  purposeSummary: string;
  commentarySummary: string;
  body: {
    fullTextIncluded: false;
    figuresIncluded: false;
    offlineAvailability: string;
  };
  questionUnits: readonly B1QuestionUnit[];
}

export interface B1Category {
  categoryId: string;
  name: string;
  order: number;
}

interface B1Payload {
  schemaVersion: 2;
  subjectId: 'b1';
  cases: readonly B1Case[];
}

interface B1CategoriesPayload {
  schemaVersion: 1;
  categories: readonly B1Category[];
}

const payload = b1CasesPayload as B1Payload;
const categoriesPayload = b1CategoriesPayload as B1CategoriesPayload;

export const b1DataVersion = payload.schemaVersion;
export const b1Cases = payload.cases;
export const b1Categories = categoriesPayload.categories
  .slice()
  .sort((left, right) => left.order - right.order);
export const b1CategoriesById = new Map(
  b1Categories.map((category) => [category.categoryId, category]),
);
export const b1QuestionUnits = b1Cases.flatMap((caseItem) => caseItem.questionUnits);
export const b1CasesById = new Map(b1Cases.map((caseItem) => [caseItem.caseId, caseItem]));
export const b1QuestionUnitsById = new Map(
  b1QuestionUnits.map((unit) => [unit.questionId, unit]),
);

export function getB1Case(caseId: string): B1Case | undefined {
  return b1CasesById.get(caseId);
}

export function getB1QuestionUnit(questionId: string): B1QuestionUnit | undefined {
  return b1QuestionUnitsById.get(questionId);
}

export function getB1CasesForYear(year: number): readonly B1Case[] {
  return b1Cases.filter((caseItem) => caseItem.year === year);
}

export function getB1CategoryName(categoryId: string): string {
  return b1CategoriesById.get(categoryId)?.name ?? categoryId;
}

export function getB1UnitIds(caseIds: readonly string[]): string[] {
  return caseIds.flatMap((caseId) => getB1Case(caseId)?.questionUnits.map((unit) => unit.questionId) ?? []);
}
