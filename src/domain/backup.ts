import {
  type AnswerAttemptRow,
  type AnswerSource,
  type ExamResultRow,
  type ExamSessionRow,
  type ExamSubmissionReason,
  type ExamType,
  type LearningDayRow,
  type PracticeAnswerSource,
  type PracticeResultRow,
  type PracticeSessionAnswer,
  type PracticeSessionRow,
  type SettingRow,
  type B1MockSessionRow,
  type B1PdfRegistrationMetadata,
  type B1PracticeSessionRow,
} from '../database/types';
import { gradeExam } from './exam';
import {
  isFontSizePreference,
  isReducedMotionPreference,
  isThemePreference,
  normalizeDisplaySettings,
  type DisplaySettings,
} from '../features/settings/displaySettings';
import { getPracticeModeForAnswerStatus } from './learning';
import type { PracticeFilters, PracticeQuestionCount } from './practice';
import type { ChoiceId, Difficulty, Question } from '../types/question';
import { getSubjectConfig, isSubjectId, type SubjectId } from './subject';

export const BACKUP_FORMAT = 'nw-a1-dojo-backup';
export const BACKUP_FORMAT_VERSION = 3;
export const MAX_BACKUP_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface FavoriteBackupEntry {
  subjectId: SubjectId;
  code: string;
  favoriteAt?: string;
}

export interface BackupQuestionDataIdentity {
  questionCount: number;
  fingerprint: string;
  schemaVersion: number;
}

export interface BackupData {
  answerHistory: readonly AnswerAttemptRow[];
  favorites: readonly FavoriteBackupEntry[];
  normalPracticeSessions: readonly PracticeSessionRow[];
  normalPracticeResults: readonly PracticeResultRow[];
  mockExamSessions: readonly ExamSessionRow[];
  mockExamResults: readonly ExamResultRow[];
  learningDays: readonly LearningDayRow[];
  settings: readonly SettingRow[];
  b1: B1BackupData;
}

export interface B1BackupData {
  practiceSessions: readonly B1PracticeSessionRow[];
  mockSessions: readonly B1MockSessionRow[];
  pdfRegistrations: readonly B1PdfRegistrationMetadata[];
}

interface B1ValidationCatalog {
  getCase: (caseId: string) => { caseId: string; year: number } | undefined;
  getUnitIds: (caseIds: readonly string[]) => readonly string[];
  hasAnswerField: (questionId: string, fieldId: string) => boolean;
}

export interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  backupVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  appVersion: string;
  databaseSchemaVersion: number;
  questionData: BackupQuestionDataIdentity;
  data: BackupData;
}

export interface BackupCreateInput extends Omit<BackupData, 'b1'> {
  b1?: B1BackupData;
  exportedAt: string;
  appVersion: string;
  databaseSchemaVersion: number;
  questionData: BackupQuestionDataIdentity;
}

export interface BackupValidationIssue {
  code:
    | 'file_too_large'
    | 'invalid_json'
    | 'invalid_format'
    | 'unsupported_version'
    | 'missing_required_field'
    | 'invalid_data';
  message: string;
}

export interface BackupPreview {
  exportedAt: string;
  appVersion: string;
  questionDataMatches: boolean;
  answerHistoryCount: number;
  favoriteCount: number;
  normalPracticeSessionCount: number;
  normalPracticeResultCount: number;
  mockExamSessionCount: number;
  mockExamResultCount: number;
  b1PracticeSessionCount: number;
  b1MockSessionCount: number;
  b1PdfRegistrationCount: number;
  learningDayCount: number;
  settings: DisplaySettings;
  unknownQuestionIdCount: number;
  excludedRecordCount: number;
}

export interface ValidatedBackup {
  document: BackupDocument;
  preview: BackupPreview;
}

export type BackupValidationResult =
  | { ok: true; value: ValidatedBackup; warnings: readonly string[] }
  | { ok: false; errors: readonly BackupValidationIssue[] };

interface ValidationCollector {
  readonly questionsByCode: ReadonlyMap<string, Question>;
  readonly categoryIds: ReadonlySet<string>;
  readonly domainIds: ReadonlySet<string>;
  readonly unknownCodes: Set<string>;
  excludedRecordCount: number;
  readonly warnings: string[];
}

const choiceIds = new Set<ChoiceId>(['A', 'B', 'C', 'D']);
const difficulties = new Set<Difficulty>(['基礎', '標準', '応用']);
const practiceModes = new Set<PracticeAnswerSource>([
  'normal_practice',
  'review_unanswered',
  'review_incorrect',
  'review_favorite',
]);
const answerModes = new Set<AnswerSource>([
  ...practiceModes,
  'exam',
  'mock_exam_fixed_1',
  'mock_exam_fixed_2',
  'mock_exam_random',
]);
const examTypes = new Set<ExamType>(['fixed_1', 'fixed_2', 'random']);
const submissionReasons = new Set<ExamSubmissionReason>(['manual', 'timeout']);
const practiceQuestionCounts = new Set<PracticeQuestionCount>([5, 10, 20, 30, 'all']);

export function createQuestionDataIdentity(
  questions: readonly Pick<Question, 'code'>[],
  schemaVersion: number,
): BackupQuestionDataIdentity {
  const codes = questions
    .map((question) => question.code)
    .slice()
    .sort((left, right) => left.localeCompare(right));

  return {
    questionCount: codes.length,
    fingerprint: `fnv1a-32:${fnv1a(codes.join('\n'))}`,
    schemaVersion,
  };
}

export function createBackupDocument(input: BackupCreateInput): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    backupVersion: BACKUP_FORMAT_VERSION,
    exportedAt: input.exportedAt,
    appVersion: input.appVersion,
    databaseSchemaVersion: input.databaseSchemaVersion,
    questionData: input.questionData,
    data: {
      answerHistory: input.answerHistory,
      favorites: input.favorites,
      normalPracticeSessions: input.normalPracticeSessions,
      normalPracticeResults: input.normalPracticeResults,
      mockExamSessions: input.mockExamSessions,
      mockExamResults: input.mockExamResults,
      learningDays: input.learningDays,
      settings: input.settings,
      b1: input.b1 ?? emptyB1BackupData(),
    },
  };
}

export function serializeBackup(document: BackupDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function createBackupFileName(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `nw-a1-dojo-backup-${parts.get('year')}${parts.get('month')}${parts.get('day')}-${parts.get('hour')}${parts.get('minute')}${parts.get('second')}.json`;
}

export function parseBackupJson(
  serialized: string,
  questions: readonly Question[],
  questionData: BackupQuestionDataIdentity,
): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return failure(
      'invalid_json',
      'JSONとして読み込めませんでした。別のバックアップファイルを選んでください。',
    );
  }
  return validateBackupDocument(parsed, questions, questionData);
}

export async function parseBackupJsonWithB1(
  serialized: string,
  questions: readonly Question[],
  questionData: BackupQuestionDataIdentity,
): Promise<BackupValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return failure(
      'invalid_json',
      'JSONとして読み込めませんでした。正しいバックアップファイルを選んでください。',
    );
  }
  return validateBackupDocumentWithB1(parsed, questions, questionData);
}

export function validateBackupFileSize(size: number): BackupValidationResult | undefined {
  if (!Number.isFinite(size) || size < 0 || size > MAX_BACKUP_FILE_SIZE_BYTES) {
    return failure(
      'file_too_large',
      `バックアップファイルは${Math.floor(MAX_BACKUP_FILE_SIZE_BYTES / 1024 / 1024)}MB以下を選んでください。`,
    );
  }
  return undefined;
}

export function validateBackupDocument(
  source: unknown,
  questions: readonly Question[],
  currentQuestionData: BackupQuestionDataIdentity,
): BackupValidationResult {
  return validateBackupDocumentInternal(source, questions, currentQuestionData);
}

export async function validateBackupDocumentWithB1(
  source: unknown,
  questions: readonly Question[],
  currentQuestionData: BackupQuestionDataIdentity,
): Promise<BackupValidationResult> {
  const b1 = await import('../data/b1');
  return validateBackupDocumentInternal(source, questions, currentQuestionData, {
    getCase: b1.getB1Case,
    getUnitIds: b1.getB1UnitIds,
    hasAnswerField: b1.hasB1AnswerField,
  });
}

function validateBackupDocumentInternal(
  source: unknown,
  questions: readonly Question[],
  currentQuestionData: BackupQuestionDataIdentity,
  b1Catalog?: B1ValidationCatalog,
): BackupValidationResult {
  if (!isRecord(source)) {
    return failure(
      'invalid_format',
      'バックアップの形式が正しくありません。現在のデータは変更されません。',
    );
  }
  if (source.format !== BACKUP_FORMAT) {
    return failure(
      'invalid_format',
      'このアプリのバックアップ形式ではありません。別のファイルを選んでください。',
    );
  }
  if (
    (source.formatVersion !== 1 &&
      source.formatVersion !== 2 &&
      source.formatVersion !== BACKUP_FORMAT_VERSION) ||
    (source.backupVersion !== 1 &&
      source.backupVersion !== 2 &&
      source.backupVersion !== BACKUP_FORMAT_VERSION)
  ) {
    return failure('unsupported_version', 'このバックアップ形式のバージョンには対応していません。');
  }
  if (
    !isIsoDate(source.exportedAt) ||
    !isNonEmptyString(source.appVersion) ||
    !isPositiveInteger(source.databaseSchemaVersion) ||
    !isRecord(source.questionData) ||
    !isNonNegativeInteger(source.questionData.questionCount) ||
    !isNonEmptyString(source.questionData.fingerprint) ||
    !isNonNegativeInteger(source.questionData.schemaVersion) ||
    !isRecord(source.data)
  ) {
    return failure(
      'missing_required_field',
      'バックアップの必須項目が不足しているか、形式が正しくありません。',
    );
  }

  const data = source.data;
  const answerHistoryInput = data.answerHistory;
  const favoritesInput = data.favorites;
  const normalPracticeSessionsInput = data.normalPracticeSessions;
  const normalPracticeResultsInput = data.normalPracticeResults;
  const mockExamSessionsInput = data.mockExamSessions;
  const mockExamResultsInput = data.mockExamResults;
  const learningDaysInput = data.learningDays;
  const settingsInput = data.settings;
  if (
    !Array.isArray(answerHistoryInput) ||
    !Array.isArray(favoritesInput) ||
    !Array.isArray(normalPracticeSessionsInput) ||
    !Array.isArray(normalPracticeResultsInput) ||
    !Array.isArray(mockExamSessionsInput) ||
    !Array.isArray(mockExamResultsInput) ||
    !Array.isArray(learningDaysInput) ||
    !Array.isArray(settingsInput)
  ) {
    return failure(
      'missing_required_field',
      'バックアップのデータ一覧に不足または形式の不正があります。',
    );
  }

  const questionsByCode = new Map(questions.map((question) => [question.code, question]));
  const collector: ValidationCollector = {
    questionsByCode,
    categoryIds: new Set(questions.map((question) => question.categoryId)),
    domainIds: new Set(questions.map((question) => question.domainId)),
    unknownCodes: new Set(),
    excludedRecordCount: 0,
    warnings: [],
  };

  const answerHistory = parseAnswerHistory(answerHistoryInput, collector);
  const favorites = parseFavorites(favoritesInput, collector);
  const normalPracticeSessions = parsePracticeSessions(normalPracticeSessionsInput, collector);
  const normalPracticeResults = parsePracticeResults(normalPracticeResultsInput, collector);
  const mockExamSessions = parseExamSessions(mockExamSessionsInput, collector);
  const mockExamResults = parseExamResults(mockExamResultsInput, collector);
  const learningDays = parseLearningDays(learningDaysInput, collector);
  const settings = parseSettings(settingsInput, collector, source.exportedAt);
  const b1 = parseB1BackupData(data.b1, collector, b1Catalog);

  if (collector.unknownCodes.size > 0) {
    collector.warnings.push(
      `現在存在しない問題IDが${collector.unknownCodes.size}件あり、関連するデータは復元しません。`,
    );
  }
  if (collector.excludedRecordCount > 0) {
    collector.warnings.push(
      `形式が不正または重複しているデータを${collector.excludedRecordCount}件、復元対象から除外します。`,
    );
  }

  const questionData: BackupQuestionDataIdentity = {
    questionCount: source.questionData.questionCount,
    fingerprint: source.questionData.fingerprint,
    schemaVersion: source.questionData.schemaVersion,
  };
  const document = createBackupDocument({
    exportedAt: source.exportedAt,
    appVersion: source.appVersion,
    databaseSchemaVersion: source.databaseSchemaVersion,
    questionData,
    answerHistory,
    favorites,
    normalPracticeSessions,
    normalPracticeResults,
    mockExamSessions,
    mockExamResults,
    learningDays,
    settings,
    b1,
  });
  const preview: BackupPreview = {
    exportedAt: document.exportedAt,
    appVersion: document.appVersion,
    questionDataMatches:
      questionData.questionCount === currentQuestionData.questionCount &&
      questionData.fingerprint === currentQuestionData.fingerprint,
    answerHistoryCount: answerHistory.length,
    favoriteCount: favorites.length,
    normalPracticeSessionCount: normalPracticeSessions.length,
    normalPracticeResultCount: normalPracticeResults.length,
    mockExamSessionCount: mockExamSessions.length,
    mockExamResultCount: mockExamResults.length,
    b1PracticeSessionCount: b1.practiceSessions.length,
    b1MockSessionCount: b1.mockSessions.length,
    b1PdfRegistrationCount: b1.pdfRegistrations.length,
    learningDayCount: learningDays.length,
    settings: normalizeDisplaySettings(settings[0]),
    unknownQuestionIdCount: collector.unknownCodes.size,
    excludedRecordCount: collector.excludedRecordCount,
  };

  return { ok: true, value: { document, preview }, warnings: collector.warnings };
}

function parseAnswerHistory(value: unknown[], collector: ValidationCollector): AnswerAttemptRow[] {
  const entries: AnswerAttemptRow[] = [];
  const ids = new Set<number>();
  const sessionQuestionKeys = new Set<string>();

  for (const item of value) {
    if (!isRecord(item) || !isPositiveInteger(item.id) || !isNonEmptyString(item.code)) {
      exclude(collector);
      continue;
    }
    const question = collector.questionsByCode.get(item.code);
    if (question === undefined) {
      unknown(collector, item.code);
      continue;
    }
    const duplicateKey = `${item.sessionId}\u0000${item.code}`;
    if (
      ids.has(item.id) ||
      !isNonEmptyString(item.sessionId) ||
      sessionQuestionKeys.has(duplicateKey) ||
      !isChoiceId(item.selectedChoice) ||
      !isChoiceId(item.correctChoice) ||
      !isBoolean(item.isCorrect) ||
      !isAnswerSource(item.mode) ||
      item.version !== 1 ||
      !isIsoDate(item.answeredAt) ||
      item.correctChoice !== question.correctChoice ||
      item.isCorrect !== (item.selectedChoice === question.correctChoice)
    ) {
      exclude(collector);
      continue;
    }
    ids.add(item.id);
    sessionQuestionKeys.add(duplicateKey);
    entries.push({
      id: item.id,
      subjectId: question.subjectId,
      code: item.code,
      selectedChoice: item.selectedChoice,
      correctChoice: item.correctChoice,
      isCorrect: item.isCorrect,
      answeredAt: item.answeredAt,
      mode: item.mode,
      sessionId: item.sessionId,
      version: 1,
    });
  }
  return entries;
}

function parseFavorites(value: unknown[], collector: ValidationCollector): FavoriteBackupEntry[] {
  const entries: FavoriteBackupEntry[] = [];
  const codes = new Set<string>();
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.code)) {
      exclude(collector);
      continue;
    }
    const question = collector.questionsByCode.get(item.code);
    if (question === undefined) {
      unknown(collector, item.code);
      continue;
    }
    if (codes.has(item.code) || (item.favoriteAt !== undefined && !isIsoDate(item.favoriteAt))) {
      exclude(collector);
      continue;
    }
    codes.add(item.code);
    entries.push({
      subjectId: question.subjectId,
      code: item.code,
      ...(isIsoDate(item.favoriteAt) ? { favoriteAt: item.favoriteAt } : {}),
    });
  }
  return entries;
}

function emptyB1BackupData(): B1BackupData {
  return { practiceSessions: [], mockSessions: [], pdfRegistrations: [] };
}

function parseB1BackupData(
  value: unknown,
  collector: ValidationCollector,
  b1Catalog?: B1ValidationCatalog,
): B1BackupData {
  if (value === undefined) {
    return emptyB1BackupData();
  }
  if (
    !isRecord(value) ||
    !Array.isArray(value.practiceSessions) ||
    !Array.isArray(value.mockSessions) ||
    !Array.isArray(value.pdfRegistrations)
  ) {
    collector.warnings.push('B-1のバックアップ形式が不正だったため、B-1データは復元しません。');
    collector.excludedRecordCount += 1;
    return emptyB1BackupData();
  }
  const practiceSessions = value.practiceSessions.flatMap((item) => {
    const parsed = parseB1PracticeSession(item, b1Catalog);
    if (parsed === undefined) {
      exclude(collector);
      return [];
    }
    return [parsed];
  });
  const mockSessions = value.mockSessions.flatMap((item) => {
    const parsed = parseB1MockSession(item, b1Catalog);
    if (parsed === undefined) {
      exclude(collector);
      return [];
    }
    return [parsed];
  });
  const pdfRegistrations = value.pdfRegistrations.flatMap((item) => {
    const parsed = parseB1PdfRegistration(item);
    if (parsed === undefined) {
      exclude(collector);
      return [];
    }
    return [parsed];
  });
  return {
    practiceSessions: uniqueBy(practiceSessions, (session) => session.id),
    mockSessions: uniqueBy(mockSessions, (session) => session.id),
    pdfRegistrations: uniqueBy(pdfRegistrations, (registration) => String(registration.year)),
  };
}

function parseB1PracticeSession(
  value: unknown,
  b1Catalog?: B1ValidationCatalog,
): B1PracticeSessionRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.version !== 1 ||
    !isB1PracticeStatus(value.status) ||
    !isNonEmptyString(value.caseId) ||
    !Array.isArray(value.unitIds) ||
    !isRecord(value.answers) ||
    !isRecord(value.selfGrades) ||
    !Array.isArray(value.reviewQuestionIds) ||
    !isIndex(value.currentIndex, value.unitIds.length) ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt)
  )
    return undefined;
  const caseItem = b1Catalog?.getCase(value.caseId);
  if (
    (b1Catalog !== undefined &&
      (caseItem === undefined ||
        !sameStringList(value.unitIds, b1Catalog.getUnitIds([caseItem.caseId])))) ||
    !validB1SessionPayload(value, value.unitIds, b1Catalog)
  )
    return undefined;
  if (value.status === 'completed' && !isIsoDate(value.completedAt)) return undefined;
  const completedAt = isIsoDate(value.completedAt) ? value.completedAt : undefined;
  return {
    id: value.id,
    subjectId: 'b1',
    version: 1,
    status: value.status,
    caseId: value.caseId,
    unitIds: [...value.unitIds],
    answers: copyB1Answers(value.answers),
    selfGrades: copyB1SelfGrades(value.selfGrades),
    reviewQuestionIds: [...value.reviewQuestionIds],
    currentIndex: value.currentIndex,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(completedAt === undefined ? {} : { completedAt }),
  };
}

function parseB1MockSession(
  value: unknown,
  b1Catalog?: B1ValidationCatalog,
): B1MockSessionRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.version !== 1 ||
    !isB1MockStatus(value.status) ||
    !isPositiveInteger(value.year) ||
    !Array.isArray(value.caseIds) ||
    !Array.isArray(value.unitIds) ||
    !isRecord(value.answers) ||
    !isRecord(value.selfGrades) ||
    !Array.isArray(value.reviewQuestionIds) ||
    !isIndex(value.currentIndex, value.unitIds.length) ||
    !isIsoDate(value.startedAt) ||
    !isIsoDate(value.deadlineAt) ||
    !isIsoDate(value.updatedAt)
  )
    return undefined;
  const cases = value.caseIds.map((caseId) =>
    isNonEmptyString(caseId) ? b1Catalog?.getCase(caseId) : undefined,
  );
  if (
    value.caseIds.length !== 2 ||
    new Set(value.caseIds).size !== 2 ||
    (b1Catalog !== undefined &&
      (cases.some((item) => item === undefined || item.year !== value.year) ||
        !sameStringList(value.unitIds, b1Catalog.getUnitIds(value.caseIds)))) ||
    !validB1SessionPayload(value, value.unitIds, b1Catalog) ||
    new Date(value.deadlineAt).getTime() <= new Date(value.startedAt).getTime()
  )
    return undefined;
  if (
    value.status !== 'in_progress' &&
    (!isIsoDate(value.submittedAt) || !isSubmissionReason(value.submissionReason))
  )
    return undefined;
  if (value.status === 'completed' && !isIsoDate(value.completedAt)) return undefined;
  const submittedAt = isIsoDate(value.submittedAt) ? value.submittedAt : undefined;
  const submissionReason = isSubmissionReason(value.submissionReason)
    ? value.submissionReason
    : undefined;
  const completedAt = isIsoDate(value.completedAt) ? value.completedAt : undefined;
  return {
    id: value.id,
    subjectId: 'b1',
    version: 1,
    status: value.status,
    year: value.year,
    caseIds: [...value.caseIds],
    unitIds: [...value.unitIds],
    answers: copyB1Answers(value.answers),
    selfGrades: copyB1SelfGrades(value.selfGrades),
    reviewQuestionIds: [...value.reviewQuestionIds],
    currentIndex: value.currentIndex,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    updatedAt: value.updatedAt,
    ...(submittedAt === undefined || submissionReason === undefined
      ? {}
      : { submittedAt, submissionReason }),
    ...(completedAt === undefined ? {} : { completedAt }),
  };
}

function parseB1PdfRegistration(value: unknown): B1PdfRegistrationMetadata | undefined {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value.year) ||
    !isNonEmptyString(value.fileName) ||
    !isNonEmptyString(value.mimeType) ||
    !isNonNegativeInteger(value.size) ||
    !isIsoDate(value.updatedAt)
  )
    return undefined;
  return {
    subjectId: 'b1',
    year: value.year,
    fileName: value.fileName,
    mimeType: value.mimeType,
    size: value.size,
    updatedAt: value.updatedAt,
  };
}

function validB1SessionPayload(
  value: Record<string, unknown>,
  unitIds: unknown[],
  b1Catalog?: B1ValidationCatalog,
): boolean {
  if (
    !unitIds.every(isNonEmptyString) ||
    new Set(unitIds).size !== unitIds.length ||
    !Array.isArray(value.reviewQuestionIds) ||
    !value.reviewQuestionIds.every(isNonEmptyString) ||
    value.reviewQuestionIds.some((id) => !unitIds.includes(id)) ||
    !isRecord(value.answers) ||
    !isRecord(value.selfGrades)
  )
    return false;
  return (
    Object.entries(value.answers).every(
      ([questionId, answers]) =>
        unitIds.includes(questionId) &&
        isRecord(answers) &&
        Object.entries(answers).every(
          ([fieldId, answer]) =>
            (b1Catalog === undefined || b1Catalog.hasAnswerField(questionId, fieldId)) &&
            isString(answer),
        ),
    ) &&
    Object.entries(value.selfGrades).every(
      ([questionId, grade]) =>
        unitIds.includes(questionId) &&
        (grade === 'correct' || grade === 'partial' || grade === 'review'),
    )
  );
}

function copyB1Answers(value: Record<string, unknown>): B1PracticeSessionRow['answers'] {
  return Object.fromEntries(
    Object.entries(value).map(([questionId, answers]) => [
      questionId,
      { ...(answers as Record<string, string>) },
    ]),
  );
}

function copyB1SelfGrades(value: Record<string, unknown>): B1PracticeSessionRow['selfGrades'] {
  return Object.fromEntries(
    Object.entries(value).map(([questionId, grade]) => [
      questionId,
      grade as 'correct' | 'partial' | 'review',
    ]),
  );
}

function sameStringList(value: unknown[], expected: readonly string[]): value is string[] {
  return value.length === expected.length && value.every((item, index) => item === expected[index]);
}

function isB1PracticeStatus(value: unknown): value is B1PracticeSessionRow['status'] {
  return value === 'in_progress' || value === 'completed';
}
function isB1MockStatus(value: unknown): value is B1MockSessionRow['status'] {
  return value === 'in_progress' || value === 'submitted' || value === 'completed';
}
function uniqueBy<T>(items: readonly T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePracticeSessions(
  value: unknown[],
  collector: ValidationCollector,
): PracticeSessionRow[] {
  const sessions: PracticeSessionRow[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    const parsed = parsePracticeSession(item, collector);
    if (parsed === undefined || ids.has(parsed.id)) {
      exclude(collector);
      continue;
    }
    ids.add(parsed.id);
    sessions.push(parsed);
  }
  return sessions;
}

function parsePracticeSession(
  value: unknown,
  collector: ValidationCollector,
): PracticeSessionRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.version !== 1 ||
    value.status !== 'in_progress'
  ) {
    return undefined;
  }
  const filters = parsePracticeFilters(value.filters, collector);
  const questionCodes = parseKnownCodes(value.questionCodes, collector);
  if (
    filters === undefined ||
    questionCodes === undefined ||
    questionCodes.length === 0 ||
    !isIndex(value.currentIndex, questionCodes.length) ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt) ||
    !isRecord(value.answers)
  ) {
    return undefined;
  }
  const answers = parsePracticeAnswers(value.answers, questionCodes, collector);
  const subjectId = inferSubjectId(questionCodes, collector);
  const mode =
    value.mode === undefined ? getPracticeModeForAnswerStatus(filters.answerStatus) : value.mode;
  if (answers === undefined || subjectId === undefined || !isPracticeMode(mode)) {
    return undefined;
  }
  return {
    id: value.id,
    subjectId,
    version: 1,
    status: 'in_progress',
    mode,
    filters,
    questionCodes,
    currentIndex: value.currentIndex,
    answers,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parsePracticeResults(
  value: unknown[],
  collector: ValidationCollector,
): PracticeResultRow[] {
  const results: PracticeResultRow[] = [];
  const ids = new Set<string>();
  const sessionIds = new Set<string>();
  for (const item of value) {
    const parsed = parsePracticeResult(item, collector);
    if (parsed === undefined || ids.has(parsed.id) || sessionIds.has(parsed.sessionId)) {
      exclude(collector);
      continue;
    }
    ids.add(parsed.id);
    sessionIds.add(parsed.sessionId);
    results.push(parsed);
  }
  return results;
}

function parsePracticeResult(
  value: unknown,
  collector: ValidationCollector,
): PracticeResultRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sessionId) ||
    value.version !== 1 ||
    !isPracticeMode(value.mode) ||
    !isIsoDate(value.startedAt) ||
    !isIsoDate(value.completedAt)
  ) {
    return undefined;
  }
  const filters = parsePracticeFilters(value.filters, collector);
  const questionCodes = parseKnownCodes(value.questionCodes, collector);
  const confirmedQuestionCodes = parseKnownCodes(value.confirmedQuestionCodes, collector);
  const subjectId =
    questionCodes === undefined ? undefined : inferSubjectId(questionCodes, collector);
  if (
    filters === undefined ||
    subjectId === undefined ||
    questionCodes === undefined ||
    questionCodes.length === 0 ||
    confirmedQuestionCodes === undefined ||
    confirmedQuestionCodes.some((code) => !questionCodes.includes(code)) ||
    !isNonNegativeInteger(value.correct) ||
    !isNonNegativeInteger(value.incorrect) ||
    !isNonNegativeInteger(value.unanswered) ||
    value.total !== questionCodes.length ||
    value.correct + value.incorrect + value.unanswered !== value.total ||
    !isRate(value.correctRate) ||
    !isNonNegativeInteger(value.elapsedSeconds)
  ) {
    return undefined;
  }
  return {
    id: value.id,
    subjectId,
    version: 1,
    sessionId: value.sessionId,
    mode: value.mode,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    filters,
    questionCodes,
    confirmedQuestionCodes,
    total: value.total,
    correct: value.correct,
    incorrect: value.incorrect,
    unanswered: value.unanswered,
    correctRate: value.correctRate,
    elapsedSeconds: value.elapsedSeconds,
  };
}

function parseExamSessions(value: unknown[], collector: ValidationCollector): ExamSessionRow[] {
  const sessions: ExamSessionRow[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    const parsed = parseExamSession(item, collector);
    if (parsed === undefined || ids.has(parsed.id)) {
      exclude(collector);
      continue;
    }
    ids.add(parsed.id);
    sessions.push(parsed);
  }
  return sessions;
}

function parseExamSession(
  value: unknown,
  collector: ValidationCollector,
): ExamSessionRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    value.version !== 1 ||
    value.status !== 'in_progress' ||
    !isExamType(value.examType) ||
    !isRecord(value.answers) ||
    !isIsoDate(value.startedAt) ||
    !isIsoDate(value.deadlineAt) ||
    !isIsoDate(value.updatedAt)
  ) {
    return undefined;
  }
  const questionCodes = parseKnownCodes(value.questionCodes, collector);
  const reviewCodes = parseKnownCodes(value.reviewCodes, collector);
  const subjectId =
    questionCodes === undefined ? undefined : inferSubjectId(questionCodes, collector);
  if (
    questionCodes === undefined ||
    subjectId === undefined ||
    questionCodes.length !== getSubjectConfig(subjectId).exam.questionCount ||
    reviewCodes === undefined ||
    reviewCodes.some((code) => !questionCodes.includes(code)) ||
    !isIndex(value.currentIndex, questionCodes.length) ||
    new Date(value.deadlineAt).getTime() <= new Date(value.startedAt).getTime()
  ) {
    return undefined;
  }
  const answers = parseExamAnswers(value.answers, questionCodes, collector);
  if (answers === undefined) {
    return undefined;
  }
  return {
    id: value.id,
    subjectId,
    version: 1,
    status: 'in_progress',
    examType: value.examType,
    questionCodes,
    answers,
    reviewCodes,
    currentIndex: value.currentIndex,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    updatedAt: value.updatedAt,
  };
}

function parseExamResults(value: unknown[], collector: ValidationCollector): ExamResultRow[] {
  const results: ExamResultRow[] = [];
  const ids = new Set<string>();
  const sessionIds = new Set<string>();
  for (const item of value) {
    const parsed = parseExamResult(item, collector);
    if (parsed === undefined || ids.has(parsed.id) || sessionIds.has(parsed.examSessionId)) {
      exclude(collector);
      continue;
    }
    ids.add(parsed.id);
    sessionIds.add(parsed.examSessionId);
    results.push(parsed);
  }
  return results;
}

function parseExamResult(
  value: unknown,
  collector: ValidationCollector,
): ExamResultRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.examSessionId) ||
    value.id !== value.examSessionId ||
    value.version !== 1 ||
    !isExamType(value.examType) ||
    !isRecord(value.questionResults) ||
    !isSubmissionReason(value.submissionReason) ||
    !isIsoDate(value.startedAt) ||
    !isIsoDate(value.submittedAt) ||
    !isIsoDate(value.deadlineAt)
  ) {
    return undefined;
  }
  const questionCodes = parseKnownCodes(value.questionCodes, collector);
  const reviewCodes = parseKnownCodes(value.reviewCodes, collector);
  const subjectId =
    questionCodes === undefined ? undefined : inferSubjectId(questionCodes, collector);
  if (
    questionCodes === undefined ||
    subjectId === undefined ||
    questionCodes.length !== getSubjectConfig(subjectId).exam.questionCount ||
    reviewCodes === undefined ||
    reviewCodes.some((code) => !questionCodes.includes(code)) ||
    new Date(value.deadlineAt).getTime() <= new Date(value.startedAt).getTime() ||
    new Date(value.submittedAt).getTime() < new Date(value.startedAt).getTime()
  ) {
    return undefined;
  }
  const answers = parseExamQuestionResults(
    value.questionResults,
    questionCodes,
    reviewCodes,
    collector,
  );
  if (answers === undefined) {
    return undefined;
  }
  const generated = gradeExam(
    {
      id: value.examSessionId,
      subjectId,
      version: 1,
      status: 'in_progress',
      examType: value.examType,
      questionCodes,
      answers,
      reviewCodes,
      currentIndex: 0,
      startedAt: value.startedAt,
      deadlineAt: value.deadlineAt,
      updatedAt: value.submittedAt,
    },
    collector.questionsByCode,
    value.submittedAt,
    value.submissionReason,
  );
  if (
    value.total !== generated.total ||
    value.correct !== generated.correct ||
    value.incorrect !== generated.incorrect ||
    value.unanswered !== generated.unanswered ||
    value.score !== generated.score ||
    value.correctRate !== generated.correctRate ||
    value.passed !== generated.passed ||
    value.elapsedSeconds !== generated.elapsedSeconds
  ) {
    return undefined;
  }
  return generated;
}

function parseLearningDays(value: unknown[], collector: ValidationCollector): LearningDayRow[] {
  const entries: LearningDayRow[] = [];
  const dates = new Set<string>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isTokyoDate(item.date) ||
      !isNonNegativeInteger(item.answerCount) ||
      !isIsoDate(item.updatedAt) ||
      !isSubjectId(item.subjectId ?? 'a1') ||
      dates.has(`${item.subjectId ?? 'a1'}:${item.date}`)
    ) {
      exclude(collector);
      continue;
    }
    const subjectId = (item.subjectId ?? 'a1') as SubjectId;
    dates.add(`${subjectId}:${item.date}`);
    entries.push({
      subjectId,
      date: item.date,
      answerCount: item.answerCount,
      updatedAt: item.updatedAt,
    });
  }
  return entries;
}

function parseSettings(
  value: unknown[],
  collector: ValidationCollector,
  fallbackUpdatedAt: string,
): SettingRow[] {
  const entries: SettingRow[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      exclude(collector);
      continue;
    }
    if (item.key !== 'appearance') {
      continue;
    }
    if (entries.length > 0) {
      exclude(collector);
      continue;
    }
    const validValues =
      isThemePreference(item.theme) &&
      isFontSizePreference(item.fontSize) &&
      isReducedMotionPreference(item.reducedMotion) &&
      isBoolean(item.shuffleChoices) &&
      isIsoDate(item.updatedAt);
    if (!validValues) {
      collector.warnings.push('表示設定に不正な値があったため、初期値へ安全に補正します。');
    }
    const settings = normalizeDisplaySettings(item);
    entries.push({
      key: 'appearance',
      selectedSubject: isSubjectId(item.selectedSubject) ? item.selectedSubject : 'a1',
      ...settings,
      updatedAt: isIsoDate(item.updatedAt) ? item.updatedAt : fallbackUpdatedAt,
    });
  }
  return entries;
}

function parsePracticeFilters(
  value: unknown,
  collector: ValidationCollector,
): PracticeFilters | undefined {
  if (!isRecord(value) || !isString(value.domainId) || !Array.isArray(value.categoryIds)) {
    return undefined;
  }
  const categories = value.categoryIds;
  if (
    !categories.every(isNonEmptyString) ||
    new Set(categories).size !== categories.length ||
    (value.domainId !== 'all' && !collector.domainIds.has(value.domainId)) ||
    !categories.every((categoryId) => collector.categoryIds.has(categoryId)) ||
    (value.difficulty !== 'all' && !isDifficulty(value.difficulty)) ||
    !isPracticeAnswerStatus(value.answerStatus) ||
    !isPracticeQuestionCount(value.questionCount) ||
    (value.order !== 'registered' && value.order !== 'random')
  ) {
    return undefined;
  }
  return {
    domainId: value.domainId,
    categoryIds: [...categories],
    difficulty: value.difficulty,
    answerStatus: value.answerStatus,
    questionCount: value.questionCount,
    order: value.order,
  };
}

function parsePracticeAnswers(
  value: Record<string, unknown>,
  questionCodes: readonly string[],
  collector: ValidationCollector,
): Record<string, PracticeSessionAnswer> | undefined {
  const answers: Record<string, PracticeSessionAnswer> = {};
  for (const [code, item] of Object.entries(value)) {
    if (
      !questionCodes.includes(code) ||
      !isRecord(item) ||
      !isChoiceId(item.selectedChoice) ||
      !isBoolean(item.confirmed) ||
      !isIsoDate(item.selectedAt)
    ) {
      return undefined;
    }
    const question = collector.questionsByCode.get(code);
    if (question === undefined) {
      return undefined;
    }
    if (item.confirmed) {
      if (
        !isBoolean(item.isCorrect) ||
        !isIsoDate(item.confirmedAt) ||
        item.isCorrect !== (item.selectedChoice === question.correctChoice)
      ) {
        return undefined;
      }
      answers[code] = {
        selectedChoice: item.selectedChoice,
        confirmed: true,
        selectedAt: item.selectedAt,
        isCorrect: item.isCorrect,
        confirmedAt: item.confirmedAt,
      };
    } else {
      answers[code] = {
        selectedChoice: item.selectedChoice,
        confirmed: false,
        selectedAt: item.selectedAt,
      };
    }
  }
  return answers;
}

function parseExamAnswers(
  value: Record<string, unknown>,
  questionCodes: readonly string[],
  collector: ValidationCollector,
): Record<string, ChoiceId> | undefined {
  const answers: Record<string, ChoiceId> = {};
  for (const [code, choice] of Object.entries(value)) {
    if (!questionCodes.includes(code) || !isChoiceId(choice)) {
      return undefined;
    }
    const question = collector.questionsByCode.get(code);
    if (question === undefined || !question.choices.some((item) => item.id === choice)) {
      return undefined;
    }
    answers[code] = choice;
  }
  return answers;
}

function parseExamQuestionResults(
  value: Record<string, unknown>,
  questionCodes: readonly string[],
  reviewCodes: readonly string[],
  collector: ValidationCollector,
): Record<string, ChoiceId> | undefined {
  if (Object.keys(value).length !== questionCodes.length) {
    return undefined;
  }
  const answers: Record<string, ChoiceId> = {};
  for (const code of questionCodes) {
    const result = value[code];
    const question = collector.questionsByCode.get(code);
    if (
      question === undefined ||
      !isRecord(result) ||
      result.code !== code ||
      result.correctChoice !== question.correctChoice ||
      !isBoolean(result.review) ||
      result.review !== reviewCodes.includes(code)
    ) {
      return undefined;
    }
    if (result.selectedChoice === undefined) {
      if (result.isCorrect !== undefined) {
        return undefined;
      }
      continue;
    }
    if (
      !isChoiceId(result.selectedChoice) ||
      !isBoolean(result.isCorrect) ||
      result.isCorrect !== (result.selectedChoice === question.correctChoice)
    ) {
      return undefined;
    }
    answers[code] = result.selectedChoice;
  }
  return answers;
}

function parseKnownCodes(
  value: unknown,
  collector: ValidationCollector,
  expectedCount?: number,
): string[] | undefined {
  if (
    !Array.isArray(value) ||
    !value.every(isNonEmptyString) ||
    new Set(value).size !== value.length
  ) {
    return undefined;
  }
  if (expectedCount !== undefined && value.length !== expectedCount) {
    return undefined;
  }
  const unknownCodes = value.filter((code) => !collector.questionsByCode.has(code));
  if (unknownCodes.length > 0) {
    for (const code of unknownCodes) {
      unknown(collector, code);
    }
    return undefined;
  }
  return [...value];
}

function inferSubjectId(
  codes: readonly string[],
  collector: ValidationCollector,
): SubjectId | undefined {
  const subjects = new Set(
    codes
      .map((code) => collector.questionsByCode.get(code)?.subjectId)
      .filter((subjectId): subjectId is SubjectId => subjectId !== undefined),
  );
  return subjects.size === 1 ? [...subjects][0] : undefined;
}

function failure(code: BackupValidationIssue['code'], message: string): BackupValidationResult {
  return { ok: false, errors: [{ code, message }] };
}

function exclude(collector: ValidationCollector): void {
  collector.excludedRecordCount += 1;
}

function unknown(collector: ValidationCollector, code: string): void {
  collector.unknownCodes.add(code);
  collector.excludedRecordCount += 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isChoiceId(value: unknown): value is ChoiceId {
  return typeof value === 'string' && choiceIds.has(value as ChoiceId);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && difficulties.has(value as Difficulty);
}

function isPracticeMode(value: unknown): value is PracticeAnswerSource {
  return typeof value === 'string' && practiceModes.has(value as PracticeAnswerSource);
}

function isAnswerSource(value: unknown): value is AnswerSource {
  return typeof value === 'string' && answerModes.has(value as AnswerSource);
}

function isExamType(value: unknown): value is ExamType {
  return typeof value === 'string' && examTypes.has(value as ExamType);
}

function isSubmissionReason(value: unknown): value is ExamSubmissionReason {
  return typeof value === 'string' && submissionReasons.has(value as ExamSubmissionReason);
}

function isPracticeAnswerStatus(value: unknown): value is PracticeFilters['answerStatus'] {
  return value === 'all' || value === 'unanswered' || value === 'incorrect' || value === 'favorite';
}

function isPracticeQuestionCount(value: unknown): value is PracticeQuestionCount {
  return (
    (typeof value === 'number' || value === 'all') &&
    practiceQuestionCounts.has(value as PracticeQuestionCount)
  );
}

function isIndex(value: unknown, length: number): value is number {
  return isNonNegativeInteger(value) && value < length;
}

function isRate(value: unknown): value is number {
  return isNonNegativeInteger(value) && value <= 100;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' && value.includes('T') && Number.isFinite(new Date(value).getTime())
  );
}

function isTokyoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
