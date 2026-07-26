import b1Phase1Payload from '../../data/b1-cases-2016-2022-ready.json';
import b1CasesPayload from '../../data/b1-cases-2023-2025-ready.json';
import b1CategoriesPayload from '../../data/b1-categories.json';
import b1RelevancePayload from '../../data/b1-relevance.json';

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
export interface B1LegacyAnswerSource {
  questionId: string;
  fieldId: string;
}
export type B1RelevanceLabel =
  | 'current_core'
  | 'modern_successor'
  | 'historical_context'
  | 'low_current_priority';

export function isB1RelevanceLabel(value: string): value is B1RelevanceLabel {
  return [
    'current_core',
    'modern_successor',
    'historical_context',
    'low_current_priority',
  ].includes(value as B1RelevanceLabel);
}

export interface B1AnswerField {
  fieldId: string;
  label: string;
  inputKind: B1InputKind;
  maxLength: number | null;
  acceptedAnswers: readonly string[];
  orderMatters: boolean;
  expectedCount: number;
  notes: string | null;
  legacyAnswerSource?: B1LegacyAnswerSource;
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
  requiresManualPromptTranscription: false;
  sourcePromptLocator: {
    pdfPageZeroBased: number | readonly number[];
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
  legacyQuestionIds?: readonly string[];
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
    exam: string;
    sectionAtTime: string;
    currentEquivalent: string;
    questionPdfUrl: string;
    answerPdfUrl: string;
    commentaryPdfUrl: string;
    yearPageUrl: string;
    questionPdfPagesZeroBased: readonly number[];
    modified: true;
    modificationNote: string;
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

export interface B1Relevance {
  label: B1RelevanceLabel;
  displayLabel: string;
  reason: string;
  currentTopics: readonly string[];
  reviewedAt: string;
  sourceRefs: readonly string[];
}

interface B1RawAnswerField {
  fieldId: string;
  label: string;
  inputKind: B1InputKind;
  maxLength: number | null;
  acceptedAnswers: readonly string[];
  orderMatters?: boolean;
  expectedCount?: number;
  notes?: string | null;
  legacyAnswerSource?: B1LegacyAnswerSource;
}

interface B1RawQuestionUnit {
  questionId: string;
  label: string;
  promptSummary: string;
  answerType: string;
  answerConcepts: readonly string[];
  gradingMode?: B1GradingMode;
  readyForApp?: true;
  promptTextIncluded?: false;
  requiresManualPromptTranscription?: false;
  sourcePromptLocator: B1QuestionUnit['sourcePromptLocator'];
  answerFields: readonly B1RawAnswerField[];
  grading?: Partial<B1QuestionUnit['grading']> & { mode: B1GradingMode };
  commentaryInsight?: string | null;
  legacyQuestionIds?: readonly string[];
}

interface B1RawCase {
  caseId: string;
  subjectId?: 'b1';
  year: number;
  questionNumber: number;
  title: string;
  categoryIds: readonly string[];
  topics: readonly string[];
  estimatedMinutes: number;
  source: Partial<B1Case['source']> & {
    questionPdfUrl: string;
    answerPdfUrl: string;
    commentaryPdfUrl: string;
    yearPageUrl: string;
  };
  purposeSummary: string;
  commentarySummary: string;
  body: Partial<B1Case['body']> & { pageRangeZeroBased?: readonly number[] };
  questionUnits: readonly B1RawQuestionUnit[];
}

interface B1RawPayload {
  schemaVersion: number;
  cases: readonly B1RawCase[];
}

interface B1CategoriesPayload {
  schemaVersion: 1;
  categories: readonly B1Category[];
}

interface B1RelevanceEntry {
  caseId: string;
  caseRelevance: B1Relevance;
  questionUnitOverrides?: Readonly<Record<string, B1Relevance>>;
}

interface B1RelevancePayload {
  schemaVersion: 1;
  entries: readonly B1RelevanceEntry[];
}

const legacyPayload = b1CasesPayload as B1RawPayload;
const phase1Payload = b1Phase1Payload as B1RawPayload;
const categoriesPayload = b1CategoriesPayload as B1CategoriesPayload;
const relevancePayload = b1RelevancePayload as B1RelevancePayload;
const gradingNotice = 'アプリの判定は学習用の参考判定であり、IPAの正式採点ではない。';

function normalizeCase(rawCase: B1RawCase): B1Case {
  const questionPdfPages = rawCase.source.questionPdfPagesZeroBased ?? rawCase.body.pageRangeZeroBased;
  return {
    caseId: rawCase.caseId,
    subjectId: 'b1',
    year: rawCase.year,
    questionNumber: rawCase.questionNumber,
    title: rawCase.title,
    categoryIds: rawCase.categoryIds,
    topics: rawCase.topics,
    estimatedMinutes: rawCase.estimatedMinutes,
    source: {
      provider: 'IPA',
      exam: rawCase.source.exam ?? 'ネットワークスペシャリスト',
      sectionAtTime: rawCase.source.sectionAtTime ?? '午後Ⅰ',
      currentEquivalent: rawCase.source.currentEquivalent ?? '科目B-1',
      questionPdfUrl: rawCase.source.questionPdfUrl,
      answerPdfUrl: rawCase.source.answerPdfUrl,
      commentaryPdfUrl: rawCase.source.commentaryPdfUrl,
      yearPageUrl: rawCase.source.yearPageUrl,
      questionPdfPagesZeroBased: questionPdfPages ?? [],
      modified: true,
      modificationNote:
        rawCase.source.modificationNote ?? '問題文全文は収録せず、設問の趣旨・解答概念・出典位置を要約構造化。',
    },
    purposeSummary: rawCase.purposeSummary,
    commentarySummary: rawCase.commentarySummary,
    body: {
      fullTextIncluded: false,
      figuresIncluded: false,
      offlineAvailability:
        rawCase.body.offlineAvailability ?? '公式PDFを利用者が端末へ登録した場合に利用可能',
    },
    questionUnits: rawCase.questionUnits.map((unit) => ({
      questionId: unit.questionId,
      label: unit.label,
      promptSummary: unit.promptSummary,
      answerType: unit.answerType,
      answerConcepts: unit.answerConcepts,
      gradingMode: unit.gradingMode ?? unit.grading?.mode ?? 'concept_assisted_self_grade',
      readyForApp: true,
      promptTextIncluded: false,
      requiresManualPromptTranscription: false,
      sourcePromptLocator: unit.sourcePromptLocator,
      answerFields: unit.answerFields.map((field) => ({
        ...field,
        orderMatters: field.orderMatters ?? true,
        expectedCount: field.expectedCount ?? 1,
        notes: field.notes ?? null,
        legacyAnswerSource: field.legacyAnswerSource,
      })),
      grading: {
        mode: unit.grading?.mode ?? unit.gradingMode ?? 'concept_assisted_self_grade',
        exactAutomaticEligible:
          unit.grading?.exactAutomaticEligible ?? (unit.grading?.mode ?? unit.gradingMode) === 'automatic',
        officialAnswerConcepts: unit.grading?.officialAnswerConcepts ?? unit.answerConcepts,
        notice: unit.grading?.notice ?? gradingNotice,
        caution: unit.grading?.caution ?? null,
      },
      commentaryInsight: unit.commentaryInsight ?? null,
      legacyQuestionIds: unit.legacyQuestionIds,
    })),
  };
}

export const b1DataVersion = 4;
export const b1Cases = [...legacyPayload.cases, ...phase1Payload.cases]
  .map(normalizeCase)
  .sort((left, right) => right.year - left.year || left.questionNumber - right.questionNumber);
export const b1AvailableYears = [...new Set(b1Cases.map((caseItem) => caseItem.year))].sort(
  (left, right) => right - left,
);
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
const b1LegacyAnswerFieldTargets = new Map<string, { questionId: string; fieldId: string }>(
  b1QuestionUnits.flatMap((unit) =>
    unit.answerFields.flatMap((field) =>
      field.legacyAnswerSource === undefined
        ? []
        : [
            [
              `${field.legacyAnswerSource.questionId}:${field.legacyAnswerSource.fieldId}`,
              { questionId: unit.questionId, fieldId: field.fieldId },
            ] as const,
          ],
    ),
  ),
);
export const b1RelevanceByCaseId = new Map(
  relevancePayload.entries.map((entry) => [entry.caseId, entry]),
);

export function getB1Case(caseId: string): B1Case | undefined {
  return b1CasesById.get(caseId);
}

export function getB1QuestionUnit(questionId: string): B1QuestionUnit | undefined {
  return b1QuestionUnitsById.get(questionId);
}

export function getB1LegacyAnswerFieldTarget(
  questionId: string,
  fieldId: string,
): { questionId: string; fieldId: string } | undefined {
  return b1LegacyAnswerFieldTargets.get(`${questionId}:${fieldId}`);
}

export function getB1LegacyQuestionUnitTargets(questionId: string): readonly string[] {
  return b1QuestionUnits
    .filter((unit) => unit.legacyQuestionIds?.includes(questionId) ?? false)
    .map((unit) => unit.questionId);
}

export function hasB1AnswerField(questionId: string, fieldId: string): boolean {
  return (
    getB1QuestionUnit(questionId)?.answerFields.some((field) => field.fieldId === fieldId) === true ||
    b1LegacyAnswerFieldTargets.has(`${questionId}:${fieldId}`)
  );
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

export function getB1CaseRelevance(caseId: string): B1Relevance | undefined {
  const entry = b1RelevanceByCaseId.get(caseId);
  return entry?.caseRelevance;
}

export function getEffectiveB1Relevance(caseId: string, questionId?: string): B1Relevance | undefined {
  const entry = b1RelevanceByCaseId.get(caseId);
  if (entry === undefined) return undefined;
  const override = questionId === undefined ? undefined : entry.questionUnitOverrides?.[questionId];
  return override === undefined
      ? getB1CaseRelevance(caseId)
    : override;
}

export function findB1CasesWithoutRelevance(): readonly string[] {
  return b1Cases.filter((caseItem) => !b1RelevanceByCaseId.has(caseItem.caseId)).map((caseItem) => caseItem.caseId);
}
