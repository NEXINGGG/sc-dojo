import type { B1DatasetArchive } from '../database/b1DatasetMigration';
import type { B1ContentIdentity, B1DatasetManifest } from './b1Identity';
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
  type B1AnswerAttemptRow,
  type B1LearnerEvidenceRow,
  type B1LearningReflectionRow,
  type B1PdfRegistrationMetadata,
  type B1PracticeSessionRow,
  type B1RemediationProgressRow,
  type B1PreferenceRow,
} from '../database/types';
import { isB1FailureCauseId, type B1FailureCauseId } from './b1LearningSupport';
import { getSubjectCatalog } from '../data/catalog';
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
import { createQuestionFingerprint, type IdentityQuestion } from './questionDataIdentity';
import { a1LegacyManifest } from './questionManifest';
import { calculateQuestionContentHash } from './questionContent.mjs';
import { changedQuestionCodes, type QuestionDatasetManifest } from './questionManifest';

export const BACKUP_FORMAT = 'sc-dojo-backup';
export const BACKUP_FORMAT_VERSION = 7;
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
  a2Manifest?: QuestionDatasetManifest;
  a1Manifest?: QuestionDatasetManifest;
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
  datasetArchives?: readonly B1DatasetArchive[];
  practiceSessions: readonly B1PracticeSessionRow[];
  mockSessions: readonly B1MockSessionRow[];
  pdfRegistrations: readonly B1PdfRegistrationMetadata[];
  learnerEvidence: readonly B1LearnerEvidenceRow[];
  learningReflections: readonly B1LearningReflectionRow[];
  remediationProgress: readonly B1RemediationProgressRow[];
  answerAttempts?: readonly B1AnswerAttemptRow[];
  preferences?: readonly B1PreferenceRow[];
}

interface B1ValidationCatalog {
  getCase: (caseId: string) => { caseId: string; year: number } | undefined;
  getUnitIds: (caseIds: readonly string[]) => readonly string[];
  hasQuestion: (questionId: string) => boolean;
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
  b1LearnerEvidenceCount: number;
  b1LearningReflectionCount: number;
  b1RemediationProgressCount: number;
  b1AnswerAttemptCount: number;
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
  readonly fatalErrors: string[];
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
  questions: readonly IdentityQuestion[],
  schemaVersion: number,
): BackupQuestionDataIdentity {
  const a1 = questions.filter((q) => q.subjectId === 'a1' && q.sourceId && q.contentHash);
  const formalA2 = questions.filter(
    (q) =>
      q.subjectId === 'a2' &&
      q.sourceId &&
      q.contentHash &&
      /^sc-a2-v[0-9]+$/.test(q.datasetVersion ?? ''),
  );
  return {
    questionCount: questions.length,
    fingerprint: createQuestionFingerprint(questions),
    schemaVersion,
    ...(a1.length
      ? {
          a1Manifest: {
            key: 'a1' as const,
            manifestVersion: 1 as const,
            datasetVersion: a1[0].datasetVersion ?? 'legacy-sc-a1-v0',
            entries: a1
              .map((q) => ({
                code: q.code,
                sourceId: q.sourceId!,
                contentHash:
                  q.question !== undefined &&
                  q.choices !== undefined &&
                  q.correctChoice !== undefined
                    ? calculateQuestionContentHash({
                        question: q.question,
                        choices: q.choices,
                        correctChoice: q.correctChoice,
                        stimulus: q.stimulus,
                      })
                    : q.contentHash!,
              }))
              .sort((a, b) => a.code.localeCompare(b.code)),
          },
        }
      : {}),
    ...(formalA2.length
      ? {
          a2Manifest: {
            key: 'a2' as const,
            manifestVersion: 1 as const,
            datasetVersion: formalA2[0].datasetVersion!,
            entries: formalA2
              .map((q) => ({ code: q.code, sourceId: q.sourceId!, contentHash: q.contentHash! }))
              .sort((a, b) => a.code.localeCompare(b.code)),
          },
        }
      : {}),
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
  return `${BACKUP_FORMAT}-${parts.get('year')}${parts.get('month')}${parts.get('day')}-${parts.get('hour')}${parts.get('minute')}${parts.get('second')}.json`;
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
  const cases = new Map([...b1.nwB1Cases, ...b1.b1Cases].map((item) => [item.caseId, item]));
  const units = new Map(
    [...cases.values()].flatMap((item) =>
      item.questionUnits.map((unit) => [unit.questionId, unit] as const),
    ),
  );
  return validateBackupDocumentInternal(source, questions, currentQuestionData, {
    getCase: (id) => cases.get(id),
    getUnitIds: (ids) =>
      ids.flatMap((id) => cases.get(id)?.questionUnits.map((unit) => unit.questionId) ?? []),
    hasQuestion: (id) => units.has(id),
    hasAnswerField: (id, fieldId) =>
      units.get(id)?.answerFields.some((field) => field.fieldId === fieldId) === true,
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
      source.formatVersion !== 3 &&
      source.formatVersion !== 4 &&
      source.formatVersion !== 5 &&
      source.formatVersion !== 6 &&
      source.formatVersion !== BACKUP_FORMAT_VERSION) ||
    (source.backupVersion !== 1 &&
      source.backupVersion !== 2 &&
      source.backupVersion !== 3 &&
      source.backupVersion !== 4 &&
      source.backupVersion !== 5 &&
      source.backupVersion !== 6 &&
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

  const backupManifestInput = source.questionData.a2Manifest;
  let backupManifest: QuestionDatasetManifest | undefined;
  if (backupManifestInput !== undefined) {
    if (
      !isRecord(backupManifestInput) ||
      backupManifestInput.key !== 'a2' ||
      backupManifestInput.manifestVersion !== 1 ||
      !isNonEmptyString(backupManifestInput.datasetVersion) ||
      !Array.isArray(backupManifestInput.entries) ||
      backupManifestInput.entries.some(
        (e) =>
          !isRecord(e) ||
          !isNonEmptyString(e.code) ||
          !isNonEmptyString(e.sourceId) ||
          typeof e.contentHash !== 'string' ||
          !/^sha256:[a-f0-9]{64}$/.test(e.contentHash),
      ) ||
      new Set(backupManifestInput.entries.map((e) => (e as Record<string, unknown>).code)).size !==
        backupManifestInput.entries.length
    ) {
      return failure(
        'missing_required_field',
        'A-2の教材識別情報が不正です。既存データは変更しません。',
      );
    }
    backupManifest = backupManifestInput as unknown as QuestionDatasetManifest;
  }
  const changedA2 = currentQuestionData.a2Manifest
    ? changedQuestionCodes(backupManifest, currentQuestionData.a2Manifest)
    : new Set<string>();
  const backupA1Input = source.questionData.a1Manifest;
  if (backupA1Input !== undefined && !isValidA1Manifest(backupA1Input)) {
    return failure(
      'missing_required_field',
      'A-1の教材識別情報が不正です。既存データは変更しません。',
    );
  }
  const backupA1Manifest = backupA1Input as QuestionDatasetManifest | undefined;
  const changedA1 = currentQuestionData.a1Manifest
    ? changedQuestionCodes(backupA1Manifest ?? a1LegacyManifest, currentQuestionData.a1Manifest)
    : new Set<string>();
  const questionsByCode = new Map(
    questions
      .filter((q) => !changedA1.has(q.code) && !changedA2.has(q.code))
      .map((question) => [question.code, question]),
  );
  const collector: ValidationCollector = {
    questionsByCode,
    categoryIds: new Set(questions.map((question) => question.categoryId)),
    domainIds: new Set(questions.map((question) => question.domainId)),
    unknownCodes: new Set(),
    excludedRecordCount: 0,
    warnings: [],
    fatalErrors: [],
  };
  if (changedA2.size)
    collector.warnings.push(
      '教材の出典・内容を確認できない旧A-2データを復元対象から除外します。A-1・科目Bは通常どおり検証します。',
    );
  if (changedA1.size)
    collector.warnings.push(
      '内容が変わった旧A-1問題のデータを復元対象から除外します。変更のない問題の履歴は復元できます。元のバックアップを保管してください。',
    );

  const answerHistory = parseAnswerHistory(answerHistoryInput, collector);
  const favorites = parseFavorites(favoritesInput, collector);
  const normalPracticeSessions = parsePracticeSessions(normalPracticeSessionsInput, collector);
  const normalPracticeResults = parsePracticeResults(normalPracticeResultsInput, collector);
  const mockExamSessions = parseExamSessions(mockExamSessionsInput, collector);
  const mockExamResults = parseExamResults(mockExamResultsInput, collector);
  const learningDays = parseLearningDays(learningDaysInput, collector).filter(
    (day) =>
      (day.subjectId !== 'a2' || changedA2.size === 0) &&
      (day.subjectId !== 'a1' || changedA1.size === 0),
  );
  const settings = parseSettings(settingsInput, collector, source.exportedAt);
  const b1 = parseB1BackupData(data.b1, collector, b1Catalog);

  if (collector.fatalErrors.length > 0) {
    return failure('invalid_data', collector.fatalErrors[0]);
  }

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
    ...(backupManifest ? { a2Manifest: backupManifest } : {}),
    ...(backupA1Manifest ? { a1Manifest: backupA1Manifest } : {}),
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
    b1LearnerEvidenceCount: b1.learnerEvidence.length,
    b1LearningReflectionCount: b1.learningReflections.length,
    b1RemediationProgressCount: b1.remediationProgress.length,
    b1AnswerAttemptCount: b1.answerAttempts?.length ?? 0,
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
  return {
    practiceSessions: [],
    mockSessions: [],
    pdfRegistrations: [],
    learnerEvidence: [],
    learningReflections: [],
    remediationProgress: [],
    answerAttempts: [],
    preferences: [],
  };
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
    collector.warnings.push('科目Bのバックアップ形式が不正だったため、科目Bデータは復元しません。');
    collector.excludedRecordCount += 1;
    return emptyB1BackupData();
  }
  if (
    value.practiceSessions.some(
      (row) => isRecord(row) && row.identity !== undefined && !isB1ContentIdentity(row.identity),
    ) ||
    value.mockSessions.some(
      (row) =>
        isRecord(row) && row.caseIdentities !== undefined && !isB1IdentityMap(row.caseIdentities),
    )
  ) {
    collector.fatalErrors.push('科目Bの教材識別情報が不正です。現在のデータは変更しません。');
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
  const learnerEvidence = parseB1LearnerEvidence(value.learnerEvidence, collector, b1Catalog);
  const learningReflections = parseB1LearningReflections(
    value.learningReflections,
    collector,
    b1Catalog,
  );
  const remediationProgress = parseB1RemediationProgress(
    value.remediationProgress,
    collector,
    b1Catalog,
  );
  const answerAttempts = parseB1AnswerAttempts(value.answerAttempts, collector, b1Catalog);
  const preferences = parseB1Preferences(value.preferences, collector);
  return {
    practiceSessions: uniqueBy(practiceSessions, (session) => session.id),
    mockSessions: uniqueBy(mockSessions, (session) => session.id),
    pdfRegistrations: uniqueBy(
      pdfRegistrations,
      (registration) => registration.documentId ?? String(registration.year),
    ),
    datasetArchives: parseB1DatasetArchives(value.datasetArchives, collector),
    learnerEvidence: uniqueBy(learnerEvidence, (entry) => entry.id),
    learningReflections: uniqueBy(learningReflections, (entry) => entry.id),
    remediationProgress: uniqueBy(remediationProgress, (entry) => entry.id),
    answerAttempts: uniqueBy(answerAttempts, (entry) => entry.id),
    preferences: uniqueBy(preferences, (entry) => entry.key),
  };
}

function parseB1LearnerEvidence(
  value: unknown,
  collector: ValidationCollector,
  b1Catalog?: B1ValidationCatalog,
): B1LearnerEvidenceRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    invalidB1SupportData(collector, '科目B根拠記録の形式が正しくありません。');
    return [];
  }
  const ids = new Set<string>();
  const entries: B1LearnerEvidenceRow[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      (item.version !== 1 && item.version !== 2) ||
      !isNonEmptyString(item.sessionId) ||
      !isNonEmptyString(item.questionId) ||
      !isNonEmptyString(item.note) ||
      !isIsoDate(item.createdAt) ||
      !isIsoDate(item.updatedAt) ||
      (item.evidenceId !== undefined && !isNonEmptyString(item.evidenceId))
    ) {
      invalidB1SupportData(collector, '科目B根拠記録に不正なID又は日時があります。');
      continue;
    }
    if (b1Catalog !== undefined && !b1Catalog.hasQuestion(item.questionId)) {
      invalidB1SupportData(collector, '存在しない科目B設問を含む根拠記録は復元できません。');
      continue;
    }
    if (ids.has(item.id)) {
      invalidB1SupportData(collector, '科目B根拠記録に重複があります。');
      continue;
    }
    ids.add(item.id);
    entries.push({
      id: item.id,
      version: item.version,
      sessionId: item.sessionId,
      ...(isB1ContentIdentity(item.identity) ? { identity: item.identity } : {}),
      questionId: item.questionId,
      ...(isB1EvidenceSourceType(item.sourceType) ? { sourceType: item.sourceType } : {}),
      ...(isPositiveInteger(item.printedPage) ? { printedPage: item.printedPage } : {}),
      ...(isNonEmptyString(item.location) ? { location: item.location } : {}),
      ...(isNonEmptyString(item.evidenceId) ? { evidenceId: item.evidenceId } : {}),
      note: item.note,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  return entries;
}

function parseB1LearningReflections(
  value: unknown,
  collector: ValidationCollector,
  b1Catalog?: B1ValidationCatalog,
): B1LearningReflectionRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    invalidB1SupportData(collector, '科目B振返りの形式が正しくありません。');
    return [];
  }
  const ids = new Set<string>();
  const sessionQuestionKeys = new Set<string>();
  const entries: B1LearningReflectionRow[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      (item.version !== 1 && item.version !== 2) ||
      !isNonEmptyString(item.sessionId) ||
      !isNonEmptyString(item.questionId) ||
      !Array.isArray(item.failureCauseIds) ||
      (item.failureCauseIds.length === 0 &&
        !['understood', 'correct'].includes(String(item.selfAssessment))) ||
      !item.failureCauseIds.every(isB1FailureCauseId) ||
      !['understood', 'partial', 'review_needed', 'correct', 'incorrect'].includes(
        String(item.selfAssessment),
      ) ||
      (item.note !== undefined && !isString(item.note)) ||
      !isIsoDate(item.createdAt) ||
      !isIsoDate(item.updatedAt) ||
      (b1Catalog !== undefined && !b1Catalog.hasQuestion(item.questionId))
    ) {
      invalidB1SupportData(collector, '科目B振返りに不正な失点原因、設問ID又は日時があります。');
      continue;
    }
    const key = `${item.sessionId}\u0000${item.questionId}`;
    if (ids.has(item.id) || sessionQuestionKeys.has(key)) {
      invalidB1SupportData(collector, '科目B振返りに重複があります。');
      continue;
    }
    ids.add(item.id);
    sessionQuestionKeys.add(key);
    entries.push({
      id: item.id,
      version: item.version,
      sessionId: item.sessionId,
      ...(isB1ContentIdentity(item.identity) ? { identity: item.identity } : {}),
      questionId: item.questionId,
      failureCauseIds: [...new Set(item.failureCauseIds)] as B1FailureCauseId[],
      selfAssessment: item.selfAssessment as B1LearningReflectionRow['selfAssessment'],
      ...(isString(item.note) && item.note.trim() ? { note: item.note.trim() } : {}),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  return entries;
}

function parseB1RemediationProgress(
  value: unknown,
  collector: ValidationCollector,
  b1Catalog?: B1ValidationCatalog,
): B1RemediationProgressRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    invalidB1SupportData(collector, '科目BからA2への復習進捗の形式が正しくありません。');
    return [];
  }
  const a2QuestionIds = new Set(getSubjectCatalog('a2').questions.map((question) => question.code));
  const ids = new Set<string>();
  const entries: B1RemediationProgressRow[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      (item.version !== 1 && item.version !== 2) ||
      !isNonEmptyString(item.originQuestionId) ||
      !isNonEmptyString(item.originSessionId) ||
      !Array.isArray(item.failureCauseIds) ||
      item.failureCauseIds.length === 0 ||
      !item.failureCauseIds.every(isB1FailureCauseId) ||
      !isStringArray(item.a2QuestionIds) ||
      item.a2QuestionIds.length === 0 ||
      new Set(item.a2QuestionIds).size !== item.a2QuestionIds.length ||
      !item.a2QuestionIds.every((id) => a2QuestionIds.has(id)) ||
      !isStringArray(item.completedA2QuestionIds) ||
      !isStringArraySubset(item.completedA2QuestionIds, item.a2QuestionIds) ||
      new Set(item.completedA2QuestionIds).size !== item.completedA2QuestionIds.length ||
      !['in_progress', 'completed', 'cancelled'].includes(String(item.status)) ||
      !isIsoDate(item.createdAt) ||
      !isIsoDate(item.updatedAt) ||
      (item.completedAt !== undefined && !isIsoDate(item.completedAt)) ||
      (item.cancelledAt !== undefined && !isIsoDate(item.cancelledAt)) ||
      (b1Catalog !== undefined && !b1Catalog.hasQuestion(item.originQuestionId))
    ) {
      invalidB1SupportData(
        collector,
        '科目BからA2への復習進捗に不正な参照、失点原因又は日時があります。',
      );
      continue;
    }
    const remediationQuestionIds = item.a2QuestionIds as string[];
    const completedQuestionIds = item.completedA2QuestionIds as string[];
    if (
      (item.status === 'completed' &&
        (!isIsoDate(item.completedAt) ||
          completedQuestionIds.length !== remediationQuestionIds.length)) ||
      (item.status === 'cancelled' && !isIsoDate(item.cancelledAt)) ||
      (item.status === 'in_progress' &&
        (item.completedAt !== undefined || item.cancelledAt !== undefined)) ||
      ids.has(item.id)
    ) {
      invalidB1SupportData(collector, '科目BからA2への復習進捗の状態が正しくありません。');
      continue;
    }
    ids.add(item.id);
    entries.push({
      id: item.id,
      version: item.version,
      ...(isB1ContentIdentity(item.identity) ? { identity: item.identity } : {}),
      originQuestionId: item.originQuestionId,
      originSessionId: item.originSessionId,
      ...(isNonEmptyString(item.originCaseId) ? { originCaseId: item.originCaseId } : {}),
      failureCauseIds: [...new Set(item.failureCauseIds)] as B1FailureCauseId[],
      a2QuestionIds: remediationQuestionIds,
      completedA2QuestionIds: completedQuestionIds,
      status: item.status as B1RemediationProgressRow['status'],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(isIsoDate(item.completedAt) ? { completedAt: item.completedAt } : {}),
      ...(isIsoDate(item.cancelledAt) ? { cancelledAt: item.cancelledAt } : {}),
    });
  }
  return entries;
}

function invalidB1SupportData(collector: ValidationCollector, message: string): void {
  collector.fatalErrors.push(message);
}

function parseB1AnswerAttempts(
  value: unknown,
  collector: ValidationCollector,
  b1Catalog?: B1ValidationCatalog,
): B1AnswerAttemptRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    invalidB1SupportData(collector, '科目B答案履歴の形式が正しくありません。');
    return [];
  }
  const entries: B1AnswerAttemptRow[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      item.version !== 1 ||
      !isNonEmptyString(item.sessionId) ||
      !isNonEmptyString(item.questionId) ||
      !isPositiveInteger(item.attemptNumber) ||
      !isRecord(item.answers) ||
      !isNonNegativeInteger(item.characterCount) ||
      !Array.isArray(item.failureCauseIds) ||
      !item.failureCauseIds.every(isB1FailureCauseId) ||
      (item.selfGrade !== undefined &&
        !['correct', 'partial', 'incorrect', 'review'].includes(String(item.selfGrade))) ||
      (item.remediationCompletedBefore !== undefined &&
        !isBoolean(item.remediationCompletedBefore)) ||
      !isIsoDate(item.createdAt) ||
      !isIsoDate(item.updatedAt) ||
      (b1Catalog !== undefined && !b1Catalog.hasQuestion(item.questionId)) ||
      ids.has(item.id)
    ) {
      invalidB1SupportData(collector, '科目B答案履歴に不正な内容があります。');
      continue;
    }
    if (
      !Object.entries(item.answers).every(
        ([fieldId, answer]) =>
          isString(answer) &&
          (b1Catalog === undefined || b1Catalog.hasAnswerField(item.questionId as string, fieldId)),
      )
    ) {
      invalidB1SupportData(collector, '科目B答案履歴に存在しない答案欄があります。');
      continue;
    }
    ids.add(item.id);
    entries.push({
      id: item.id,
      version: 1,
      sessionId: item.sessionId,
      ...(isB1ContentIdentity(item.identity) ? { identity: item.identity } : {}),
      questionId: item.questionId,
      attemptNumber: item.attemptNumber,
      answers: { ...(item.answers as Record<string, string>) },
      characterCount: item.characterCount,
      failureCauseIds: [...new Set(item.failureCauseIds)] as B1FailureCauseId[],
      ...(item.selfGrade === undefined
        ? {}
        : { selfGrade: item.selfGrade as B1AnswerAttemptRow['selfGrade'] }),
      ...(item.remediationCompletedBefore === undefined
        ? {}
        : { remediationCompletedBefore: item.remediationCompletedBefore }),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  return entries;
}

function parseB1Preferences(value: unknown, collector: ValidationCollector): B1PreferenceRow[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    invalidB1SupportData(collector, '科目B現在性フィルターの形式が正しくありません。');
    return [];
  }
  const row = value.find(isB1PreferenceRecord);
  if (value.some((entry) => !isB1PreferenceRecord(entry))) {
    invalidB1SupportData(collector, '科目Bのお気に入り・設定の形式が正しくありません。');
    return [];
  }
  if (row === undefined) return [];
  return [
    {
      key: 'b1-learning-preferences',
      version: 1,
      relevanceFilter: {
        current_core: row.relevanceFilter.current_core,
        modern_successor: row.relevanceFilter.modern_successor,
        historical_context: row.relevanceFilter.historical_context,
        low_current_priority: row.relevanceFilter.low_current_priority,
      },
      updatedAt: row.updatedAt,
      ...(row.favoriteCaseIds === undefined ? {} : { favoriteCaseIds: [...row.favoriteCaseIds] }),
    },
  ];
}

function isB1PreferenceRecord(value: unknown): value is {
  key: 'b1-learning-preferences';
  version: 1;
  relevanceFilter: B1PreferenceRow['relevanceFilter'];
  updatedAt: string;
  favoriteCaseIds?: string[];
} {
  if (
    !isRecord(value) ||
    value.key !== 'b1-learning-preferences' ||
    value.version !== 1 ||
    !isIsoDate(value.updatedAt) ||
    !isRecord(value.relevanceFilter) ||
    (value.favoriteCaseIds !== undefined && !isStringArray(value.favoriteCaseIds))
  )
    return false;
  const relevanceFilter = value.relevanceFilter;
  return ['current_core', 'modern_successor', 'historical_context', 'low_current_priority'].every(
    (key) => isBoolean(relevanceFilter[key]),
  );
}

function isB1EvidenceSourceType(value: unknown): value is B1LearnerEvidenceRow['sourceType'] {
  return [
    'log',
    'paragraph',
    'figure',
    'table',
    'calculation',
    'configuration',
    'sequence',
    'general_knowledge',
  ].includes(String(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isStringArraySubset(values: unknown, candidates: unknown): boolean {
  return (
    isStringArray(values) &&
    isStringArray(candidates) &&
    values.every((value) => candidates.includes(value))
  );
}

function parseB1PracticeSession(
  value: unknown,
  b1Catalog?: B1ValidationCatalog,
): B1PracticeSessionRow | undefined {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3) ||
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
    version: value.version,
    status: value.status,
    ...(value.mode === 'training' || value.mode === 'practical' ? { mode: value.mode } : {}),
    ...(isB1ContentIdentity(value.identity) ? { identity: value.identity } : {}),
    caseId: value.caseId,
    unitIds: [...value.unitIds],
    answers: copyB1Answers(value.answers),
    ...(value.unitConfirmations !== undefined &&
    isB1UnitConfirmationMap(value.unitConfirmations, value.unitIds, b1Catalog)
      ? { unitConfirmations: copyB1UnitConfirmations(value.unitConfirmations) }
      : {}),
    selfGrades: copyB1SelfGrades(value.selfGrades),
    ...(value.selfGradeUpdatedAt !== undefined &&
    isB1SelfGradeUpdatedAtMap(value.selfGradeUpdatedAt, value.selfGrades, value.unitIds)
      ? { selfGradeUpdatedAt: { ...value.selfGradeUpdatedAt } }
      : {}),
    reviewQuestionIds: [...value.reviewQuestionIds],
    ...(isStringArray(value.requirementDisclosureQuestionIds)
      ? { requirementDisclosureQuestionIds: [...value.requirementDisclosureQuestionIds] }
      : {}),
    ...(isB1AttemptIdMap(value.attemptIdsByQuestion)
      ? { attemptIdsByQuestion: value.attemptIdsByQuestion }
      : {}),
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
    (value.version !== 1 && value.version !== 2 && value.version !== 3) ||
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
      (cases.some(
        (item) =>
          item === undefined ||
          ((value.mockType === undefined || value.mockType === 'official_year') &&
            item.year !== value.year),
      ) ||
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
    version: value.version,
    status: value.status,
    year: value.year,
    ...(value.mode === 'mock90' || value.mode === 'mock150' ? { mode: value.mode } : {}),
    ...(isString(value.examRuleId) ? { examRuleId: value.examRuleId } : {}),
    ...(isStringArray(value.presentedCaseIds)
      ? { presentedCaseIds: [...value.presentedCaseIds] }
      : {}),
    ...(isB1IdentityMap(value.caseIdentities) ? { caseIdentities: value.caseIdentities } : {}),
    ...(isB1MockType(value.mockType) ? { mockType: value.mockType } : {}),
    caseIds: [...value.caseIds],
    unitIds: [...value.unitIds],
    answers: copyB1Answers(value.answers),
    ...(value.unitConfirmations !== undefined &&
    isB1UnitConfirmationMap(value.unitConfirmations, value.unitIds, b1Catalog)
      ? { unitConfirmations: copyB1UnitConfirmations(value.unitConfirmations) }
      : {}),
    selfGrades: copyB1SelfGrades(value.selfGrades),
    ...(value.selfGradeUpdatedAt !== undefined &&
    isB1SelfGradeUpdatedAtMap(value.selfGradeUpdatedAt, value.selfGrades, value.unitIds)
      ? { selfGradeUpdatedAt: { ...value.selfGradeUpdatedAt } }
      : {}),
    reviewQuestionIds: [...value.reviewQuestionIds],
    ...(isStringArray(value.requirementDisclosureQuestionIds)
      ? { requirementDisclosureQuestionIds: [...value.requirementDisclosureQuestionIds] }
      : {}),
    ...(isB1AttemptIdMap(value.attemptIdsByQuestion)
      ? { attemptIdsByQuestion: value.attemptIdsByQuestion }
      : {}),
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
    ...(isString(value.documentId) ? { documentId: value.documentId } : {}),
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
    !isRecord(value.selfGrades) ||
    !isB1UnitConfirmationMap(value.unitConfirmations, unitIds, b1Catalog) ||
    !isB1SelfGradeUpdatedAtMap(value.selfGradeUpdatedAt, value.selfGrades, unitIds)
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
        (grade === 'correct' || grade === 'partial' || grade === 'incorrect' || grade === 'review'),
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

function isB1UnitConfirmationMap(
  value: unknown,
  unitIds: unknown[],
  b1Catalog?: B1ValidationCatalog,
): value is Record<string, { answers: Record<string, string>; confirmedAt: string }> | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([questionId, confirmation]) =>
      unitIds.includes(questionId) &&
      isRecord(confirmation) &&
      isIsoDate(confirmation.confirmedAt) &&
      isRecord(confirmation.answers) &&
      Object.entries(confirmation.answers).every(
        ([fieldId, answer]) =>
          isString(answer) &&
          (b1Catalog === undefined || b1Catalog.hasAnswerField(questionId, fieldId)),
      ),
  );
}

function copyB1UnitConfirmations(
  value: Record<string, { answers: Record<string, string>; confirmedAt: string }>,
): NonNullable<B1PracticeSessionRow['unitConfirmations']> {
  return Object.fromEntries(
    Object.entries(value).map(([questionId, confirmation]) => [
      questionId,
      { answers: { ...confirmation.answers }, confirmedAt: confirmation.confirmedAt },
    ]),
  );
}

function isB1SelfGradeUpdatedAtMap(
  value: unknown,
  selfGrades: unknown,
  unitIds: unknown[],
): value is Record<string, string> | undefined {
  if (value === undefined) return true;
  if (!isRecord(value) || !isRecord(selfGrades)) return false;
  return Object.entries(value).every(
    ([questionId, updatedAt]) =>
      unitIds.includes(questionId) && selfGrades[questionId] !== undefined && isIsoDate(updatedAt),
  );
}

function copyB1SelfGrades(value: Record<string, unknown>): B1PracticeSessionRow['selfGrades'] {
  return Object.fromEntries(
    Object.entries(value).map(([questionId, grade]) => [
      questionId,
      grade as 'correct' | 'partial' | 'incorrect' | 'review',
    ]),
  );
}

function isB1MockType(value: unknown): value is NonNullable<B1MockSessionRow['mockType']> {
  return ['official_year', 'current_focus', 'all_years', 'legacy_reading'].includes(String(value));
}

function isB1AttemptIdMap(value: unknown): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.values(value).every((ids) => Array.isArray(ids) && ids.every(isNonEmptyString))
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

function isValidA1Manifest(value: unknown): value is QuestionDatasetManifest {
  return (
    isRecord(value) &&
    value.key === 'a1' &&
    value.manifestVersion === 1 &&
    isNonEmptyString(value.datasetVersion) &&
    Array.isArray(value.entries) &&
    value.entries.every(
      (entry) =>
        isRecord(entry) &&
        /^A1-\d{3}$/.test(String(entry.code)) &&
        isNonEmptyString(entry.sourceId) &&
        typeof entry.contentHash === 'string' &&
        /^sha256:[a-f0-9]{64}$/.test(entry.contentHash),
    ) &&
    new Set(value.entries.map((entry) => (entry as Record<string, unknown>).code)).size ===
      value.entries.length
  );
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

function isB1ContentIdentity(value: unknown): value is B1ContentIdentity {
  return (
    isRecord(value) &&
    isNonEmptyString(value.datasetVersion) &&
    isNonEmptyString(value.sourceId) &&
    typeof value.contentHash === 'string' &&
    /^sha256:v1:[a-f0-9]{64}$/.test(value.contentHash)
  );
}
function isB1IdentityMap(value: unknown): value is Record<string, B1ContentIdentity> {
  return isRecord(value) && Object.values(value).every(isB1ContentIdentity);
}
function isB1Manifest(value: unknown): value is B1DatasetManifest {
  return (
    isRecord(value) &&
    value.key === 'b1' &&
    value.manifestVersion === 1 &&
    isNonEmptyString(value.datasetVersion) &&
    isB1IdentityMap(value.cases)
  );
}
function parseB1DatasetArchives(
  value: unknown,
  collector: ValidationCollector,
): B1DatasetArchive[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    collector.fatalErrors.push('科目B退避履歴の形式が不正です。');
    return [];
  }
  const result: B1DatasetArchive[] = [];
  for (const archive of value) {
    if (
      !isRecord(archive) ||
      archive.archiveVersion !== 1 ||
      !isNonEmptyString(archive.id) ||
      !isIsoDate(archive.archivedAt) ||
      !isNonEmptyString(archive.previousDatasetVersion) ||
      !isNonEmptyString(archive.nextDatasetVersion) ||
      !isB1Manifest(archive.previousManifest) ||
      !isRecord(archive.data)
    ) {
      collector.fatalErrors.push('科目B退避履歴の識別情報が不正です。');
      continue;
    }
    const data = archive.data;
    const required = [
      'practiceSessions',
      'mockSessions',
      'learnerEvidence',
      'learningReflections',
      'remediationProgress',
      'answerAttempts',
      'preferences',
      'syncMetadata',
      'syncOutbox',
    ] as const;
    if (required.some((key) => !Array.isArray(data[key]))) {
      collector.fatalErrors.push('科目B退避履歴が不足しています。');
      continue;
    }
    const practices = (data.practiceSessions as unknown[]).flatMap((row) => {
      const parsed = parseB1PracticeSession(row);
      return parsed ? [parsed] : [];
    });
    const mocks = (data.mockSessions as unknown[]).flatMap((row) => {
      const parsed = parseB1MockSession(row);
      return parsed ? [parsed] : [];
    });
    if (
      (data.practiceSessions as unknown[]).some(
        (row) => isRecord(row) && row.identity !== undefined && !isB1ContentIdentity(row.identity),
      ) ||
      (data.mockSessions as unknown[]).some(
        (row) =>
          isRecord(row) && row.caseIdentities !== undefined && !isB1IdentityMap(row.caseIdentities),
      )
    ) {
      collector.fatalErrors.push('科目B退避履歴の教材識別が不正です。');
      continue;
    }
    const parsed = {
      practiceSessions: practices,
      mockSessions: mocks,
      learnerEvidence: parseB1LearnerEvidence(data.learnerEvidence, collector),
      learningReflections: parseB1LearningReflections(data.learningReflections, collector),
      remediationProgress: parseB1RemediationProgress(data.remediationProgress, collector),
      answerAttempts: parseB1AnswerAttempts(data.answerAttempts, collector),
      preferences: parseB1Preferences(data.preferences, collector),
      syncMetadata: (data.syncMetadata as unknown[]).filter(isB1ArchiveSyncMetadata),
      syncOutbox: (data.syncOutbox as unknown[]).filter(isB1ArchiveSyncOutbox),
    };
    if (required.some((key) => parsed[key].length !== (data[key] as unknown[]).length)) {
      collector.fatalErrors.push('科目B退避履歴の内容が不正です。');
      continue;
    }
    result.push({
      id: archive.id,
      archiveVersion: 1,
      archivedAt: archive.archivedAt,
      previousDatasetVersion: archive.previousDatasetVersion,
      nextDatasetVersion: archive.nextDatasetVersion,
      previousManifest: archive.previousManifest,
      data: parsed,
    });
  }
  return result;
}
function isB1ArchiveSyncMetadata(
  value: unknown,
): value is import('../database/types').CloudSyncMetadataRow {
  return (
    isRecord(value) &&
    ['b1.answer', 'b1.progress', 'b1.reset'].includes(String(value.scope)) &&
    isNonEmptyString(value.itemKey) &&
    isIsoDate(value.clientUpdatedAt) &&
    isNonEmptyString(value.deviceId) &&
    typeof value.isDeleted === 'boolean'
  );
}
function isB1ArchiveSyncOutbox(
  value: unknown,
): value is import('../database/types').CloudSyncOutboxRow {
  return (
    isRecord(value) &&
    ['b1.answer', 'b1.progress', 'b1.reset'].includes(String(value.scope)) &&
    isNonEmptyString(value.itemKey) &&
    isIsoDate(value.clientUpdatedAt) &&
    isNonEmptyString(value.deviceId) &&
    isNonEmptyString(value.userId) &&
    isIsoDate(value.queuedAt) &&
    isNonNegativeInteger(value.retryCount) &&
    (value.nextRetryAt === undefined || isIsoDate(value.nextRetryAt))
  );
}
