import { validateScBDataset } from '../domain/b1DatasetValidation';
import a2Payload from '../../data/a2-questions.json';
import scPilotPayload from '../../data/sc-b-pilot.json';
import sc2025PilotPayload from '../../data/sc-b-pilot-2025-fall.json';
import scReleasePayload from '../../data/sc-b-cases-2023-2025-ready.json';
import scReleaseCategories from '../../data/sc-b-categories.json';
import releaseGate from '../../data/sc-b-v1-release-gate.json';
import scCategoriesPayload from '../../data/sc-b-categories-draft.json';
import { isScBPilot, isScBFoundationPilot } from './pilotMode';
import { calculateB1ContentHash } from '../domain/b1Identity';
import type { B1QuestionGuidance } from '../domain/b1LearningSupport';
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
  officialAnswer?: string;
  acceptableAnswers?: readonly string[];
  requiredKeywords?: readonly string[];
  scoringPoints?: readonly string[];
  gradingNote?: string;
  choices?: readonly string[];
  gradingExcluded?: boolean;
  answerFormat?: 'diagram';
  officialAnswerAsset?: { assetUrl: string; assetHash: string; alt: string };
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
  promptTextIncluded: boolean;
  requiresManualPromptTranscription: boolean;
  sourcePromptLocator: {
    pdfPageZeroBased: number | readonly number[];
    printedPage: number | readonly number[];
    underlineRefs: readonly string[];
    figureRefs: readonly string[];
    tableRefs: readonly string[];
    paragraphIds?: readonly string[];
    sectionIds?: readonly string[];
    materialIds?: readonly string[];
  };
  answerFields: readonly B1AnswerField[];
  grading: {
    mode: B1GradingMode;
    exactAutomaticEligible: boolean;
    officialAnswerConcepts: readonly string[];
    notice: string;
    caution: string | null;
  };
  promptText?: string;
  guidance?: B1QuestionGuidance;
  relatedA2QuestionIds?: readonly string[];
  relatedA2Categories?: readonly string[];
  relatedTerms?: readonly string[];
  commentaryInsight: string | null;
  legacyQuestionIds?: readonly string[];
  evidenceRefs?: readonly string[];
  explanation?: {
    asked: string;
    lookAt: string;
    reasoning: string;
    officialAnswerReason: string;
    commonMistakes: string;
    necessaryKnowledge?: string;
  };
  answerStrategy?: readonly string[];
  difficultyNotes?: string;
  promptSourceImages?: readonly { assetUrl: string; alt: string; printedPage: number }[];
}

export interface B1Paragraph {
  id: string;
  sectionId?: string;
  paragraphId?: string;
  text: string;
  printedPage?: number;
  underlines?: readonly { label: string; text: string }[];
}

export interface B1Material {
  id: string;
  kind: 'table' | 'log' | 'code' | 'figure' | 'text' | 'image';
  caption: string;
  text: string;
  assetUrl?: string;
  assetHash?: string;
  printedPage?: number;
  renderText?: boolean;
  classification?: 'A' | 'B' | 'C' | 'D' | 'E';
  headers?: readonly string[];
  rows?: readonly (readonly string[])[];
  tableNotes?: readonly string[];
  cellSpans?: readonly { row: number; column: number; rowSpan?: number; colSpan?: number }[];
  underlines?: readonly { label: string; text: string }[];
}

export interface B1Case {
  dataset_version?: string;
  source_id?: string;
  content_hash?: string;
  examCode?: 'SC' | 'NW';
  term?: string;
  originalSection?: 'pm' | 'pm1' | 'pm2' | 'b';
  examSetId?: string;
  difficulty?: string;
  primaryCategory?: string;
  secondaryCategories?: readonly string[];
  caseId: string;
  subjectId: 'b1';
  year: number;
  questionNumber: number;
  title: string;
  categoryIds: readonly string[];
  topics: readonly string[];
  estimatedMinutes: number;
  source: {
    provider: 'IPA' | 'development';
    questionDocumentHash?: string;
    localQuestionPdfUrl?: string;
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
    fullTextIncluded: boolean;
    figuresIncluded: boolean;
    offlineAvailability: string;
    sections?: readonly { id: string; heading: string; paragraphs: readonly B1Paragraph[] }[];
    materials?: readonly B1Material[];
    readingOrder?: readonly { kind: 'heading' | 'paragraph' | 'material'; id: string }[];
    originalPages?: readonly { printedPage: number; assetUrl: string; assetHash: string }[];
    originalPageMode?: boolean;
    figureTableInventory?: readonly { id: string; label: string; caption: string; pageRef: string; printedPage: number }[];
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
  officialAnswer?: string;
  acceptableAnswers?: readonly string[];
  requiredKeywords?: readonly string[];
  scoringPoints?: readonly string[];
  gradingNote?: string;
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
  promptTextIncluded?: boolean;
  requiresManualPromptTranscription?: boolean;
  sourcePromptLocator: B1QuestionUnit['sourcePromptLocator'];
  answerFields: readonly B1RawAnswerField[];
  grading?: Partial<B1QuestionUnit['grading']> & { mode: B1GradingMode };
  promptText?: string;
  guidance?: B1QuestionGuidance;
  relatedA2QuestionIds?: readonly string[];
  relatedA2Categories?: readonly string[];
  relatedTerms?: readonly string[];
  commentaryInsight?: string | null;
  legacyQuestionIds?: readonly string[];
  evidenceRefs?: B1QuestionUnit['evidenceRefs'];
  explanation?: B1QuestionUnit['explanation'];
  answerStrategy?: B1QuestionUnit['answerStrategy'];
  difficultyNotes?: string;
  promptSourceImages?: B1QuestionUnit['promptSourceImages'];
}

interface B1RawCase {
  dataset_version?: string;
  source_id?: string;
  content_hash?: string;
  examCode?: 'SC' | 'NW';
  term?: string;
  originalSection?: 'pm' | 'pm1' | 'pm2' | 'b';
  examSetId?: string;
  difficulty?: string;
  primaryCategory?: string;
  secondaryCategories?: readonly string[];
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

export function normalizeB1Case(rawCase: B1RawCase): B1Case {
  const questionPdfPages = rawCase.source.questionPdfPagesZeroBased ?? rawCase.body.pageRangeZeroBased;
  return {
    dataset_version: rawCase.dataset_version ?? 'nw-b1-v4',
    content_hash: rawCase.content_hash,
    source_id: rawCase.source_id ?? `NW-${rawCase.year}-SPRING-PM1-Q${String(rawCase.questionNumber).padStart(2, '0')}`,
    examCode: rawCase.examCode ?? 'NW', term: rawCase.term ?? 'spring',
    originalSection: rawCase.originalSection ?? 'pm1',
    examSetId: rawCase.examSetId ?? `NW-${rawCase.year}-SPRING-PM1`,
    difficulty: rawCase.difficulty,
    primaryCategory: rawCase.primaryCategory,
    secondaryCategories: rawCase.secondaryCategories,
    caseId: rawCase.caseId,
    subjectId: 'b1',
    year: rawCase.year,
    questionNumber: rawCase.questionNumber,
    title: rawCase.title,
    categoryIds: rawCase.categoryIds,
    topics: rawCase.topics,
    estimatedMinutes: rawCase.estimatedMinutes,
    source: {
      provider: rawCase.source.provider ?? 'IPA',
      questionDocumentHash: rawCase.source.questionDocumentHash,
      localQuestionPdfUrl: rawCase.source.localQuestionPdfUrl,
      exam: rawCase.source.exam ?? 'ネットワークスペシャリスト',
      sectionAtTime: rawCase.source.sectionAtTime ?? '午後Ⅰ',
      currentEquivalent: rawCase.source.currentEquivalent ?? '科目B',
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
      fullTextIncluded: rawCase.body.fullTextIncluded ?? false,
      figuresIncluded: rawCase.body.figuresIncluded ?? false,
      sections: rawCase.body.sections,
      materials: rawCase.body.materials,
      readingOrder: rawCase.body.readingOrder,
      originalPages: rawCase.body.originalPages,
      originalPageMode: rawCase.body.originalPageMode,
      figureTableInventory: rawCase.body.figureTableInventory,
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
      promptTextIncluded: unit.promptTextIncluded ?? false,
      promptText: unit.promptText,
      guidance: unit.guidance,
      evidenceRefs: unit.evidenceRefs,
      explanation: unit.explanation,
      answerStrategy: unit.answerStrategy,
      difficultyNotes: unit.difficultyNotes,
      promptSourceImages: unit.promptSourceImages,
      relatedA2QuestionIds: unit.relatedA2QuestionIds,
      relatedA2Categories: unit.relatedA2Categories,
      relatedTerms: unit.relatedTerms,
      requiresManualPromptTranscription: unit.requiresManualPromptTranscription ?? false,
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
export const nwB1Cases = [...legacyPayload.cases, ...phase1Payload.cases].map(normalizeB1Case);
export const scB1PilotCases = (isScBPilot
  ? ((isScBFoundationPilot ? scPilotPayload : sc2025PilotPayload) as unknown as B1RawPayload).cases
  : []).map(normalizeB1Case);
export const isScBRelease = !isScBPilot &&
  !(import.meta.env.DEV && import.meta.env.VITE_SC_B_LEGACY === '1') &&
  (releaseGate.approved || import.meta.env.VITE_SC_B_RELEASE_CANDIDATE === '1');
export const scBReleaseCases = (isScBRelease ? (scReleasePayload as unknown as B1RawPayload).cases : []).map(normalizeB1Case);
if (isScBPilot) {
  const errors = validateScBDataset(scB1PilotCases, new Set(a2Payload.questions.map((q) => q.code)), new Set(scCategoriesPayload.categories.map((category) => category.id)));
  if (errors.length) throw new Error(errors.join('\n'));
}
export const b1Cases = (isScBPilot ? scB1PilotCases : isScBRelease ? scBReleaseCases : nwB1Cases)
  .map((item) => ({ ...item, content_hash: calculateB1ContentHash(item) }))
  .sort((left, right) => right.year - left.year || (left.term === right.term ? 0 : left.term === 'fall' ? -1 : 1) || left.questionNumber - right.questionNumber);
export const b1AvailableYears = [...new Set(b1Cases.map((caseItem) => caseItem.year))].sort(
  (left, right) => right - left,
);
export const b1Categories = (isScBPilot || isScBRelease
  ? (isScBRelease ? scReleaseCategories : scCategoriesPayload).categories.map((item, index) => ({ categoryId: item.id, name: item.name, order: index }))
  : categoriesPayload.categories)
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
  if (entry === undefined) return getB1Case(caseId)?.examCode === 'SC'
    ? { label: 'current_core', displayLabel: '現行形式', reason: 'SC科目Bの現行形式教材', currentTopics: [], reviewedAt: '', sourceRefs: [] }
    : undefined;
  const override = questionId === undefined ? undefined : entry.questionUnitOverrides?.[questionId];
  return override === undefined
      ? getB1CaseRelevance(caseId)
    : override;
}

export function findB1CasesWithoutRelevance(): readonly string[] {
  return b1Cases.filter((caseItem) => !b1RelevanceByCaseId.has(caseItem.caseId)).map((caseItem) => caseItem.caseId);
}
