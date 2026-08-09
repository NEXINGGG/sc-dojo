import { DATABASE_VERSION, type A1DojoDatabase } from '../../database/database';
import { APP_VERSION } from '../../app/appVersion';
import type { AnswerAttemptRow, LearningDayRow, QuestionProgressRow } from '../../database/types';
import { allQuestions } from '../../data/catalog';
import {
  createBackupDocument,
  createQuestionDataIdentity,
  type BackupDocument,
  type FavoriteBackupEntry,
  type ValidatedBackup,
  validateBackupDocumentWithB1,
} from '../../domain/backup';
import {
  applyAnswerToQuestionProgress,
  createEmptyQuestionProgress,
  getAsiaTokyoDate,
} from '../../domain/learning';
import { createCloudSyncMetadataRow } from '../sync/cloudSyncLocalRepository';
import { createB1PracticeRestoreMetadata, createB1PracticeTombstones } from '../sync/b1CloudSync';
import { getDeviceId } from '../sync/deviceId';
import { notifyCloudSyncNeeded } from '../sync/syncEvents';
import { queueCloudSyncMetadataForActiveUser } from '../sync/cloudSyncOutbox';

export { APP_VERSION } from '../../app/appVersion';

export interface StoredDataSummary {
  answerHistoryCount: number;
  studiedQuestionCount: number;
  favoriteCount: number;
  normalPracticeResultCount: number;
  mockExamResultCount: number;
  learningDayCount: number;
  hasInProgressPractice: boolean;
  hasInProgressExam: boolean;
  databaseSchemaVersion: number;
  b1RegisteredPdfCount: number;
  b1InProgressPractice: boolean;
  b1InProgressMock: boolean;
  b1LearnerEvidenceCount: number;
  b1LearningReflectionCount: number;
  b1RemediationProgressCount: number;
  b1AnswerAttemptCount: number;
}

export class DataManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataManagementError';
  }
}

export class DataManagementRepository {
  constructor(private readonly database: A1DojoDatabase) {}

  async getSummary(): Promise<StoredDataSummary> {
    await this.database.open();
    const [
      attempts,
      progress,
      practiceResults,
      examResults,
      learningDays,
      practiceSession,
      examSession,
      b1PdfFiles,
      b1PracticeSession,
      b1MockSession,
      b1LearnerEvidence,
      b1LearningReflections,
      b1RemediationProgress,
      b1AnswerAttempts,
    ] = await Promise.all([
      this.database.answerAttempts.toArray(),
      this.database.questionProgress.toArray(),
      this.database.practiceResults.count(),
      this.database.examResults.count(),
      this.database.learningDaysBySubject.count(),
      this.database.practiceSessions.where('status').equals('in_progress').first(),
      this.database.examSessions.where('status').equals('in_progress').first(),
      this.database.b1PdfFiles.count(),
      this.database.b1PracticeSessions.where('status').equals('in_progress').first(),
      this.database.b1MockSessions.where('status').equals('in_progress').first(),
      this.database.b1LearnerEvidence.count(),
      this.database.b1LearningReflections.count(),
      this.database.b1RemediationProgress.count(),
      this.database.b1AnswerAttempts.count(),
    ]);

    return {
      answerHistoryCount: attempts.length,
      studiedQuestionCount: new Set(attempts.map((attempt) => attempt.code)).size,
      favoriteCount: progress.filter((row) => row.favorite).length,
      normalPracticeResultCount: practiceResults,
      mockExamResultCount: examResults,
      learningDayCount: learningDays,
      hasInProgressPractice: practiceSession !== undefined,
      hasInProgressExam: examSession !== undefined,
      databaseSchemaVersion: DATABASE_VERSION,
      b1RegisteredPdfCount: b1PdfFiles,
      b1InProgressPractice: b1PracticeSession !== undefined,
      b1InProgressMock: b1MockSession !== undefined,
      b1LearnerEvidenceCount: b1LearnerEvidence,
      b1LearningReflectionCount: b1LearningReflections,
      b1RemediationProgressCount: b1RemediationProgress,
      b1AnswerAttemptCount: b1AnswerAttempts,
    };
  }

  async createBackup(exportedAt = new Date().toISOString()): Promise<BackupDocument> {
    await this.database.open();
    const [
      answerHistory,
      progress,
      practiceSessions,
      practiceResults,
      examSessions,
      examResults,
      learningDays,
      settings,
      b1PracticeSessions,
      b1MockSessions,
      b1PdfFiles,
      b1LearnerEvidence,
      b1LearningReflections,
      b1RemediationProgress,
      b1AnswerAttempts,
      b1Preferences,
    ] = await Promise.all([
      this.database.answerAttempts.toArray(),
      this.database.questionProgress.toArray(),
      this.database.practiceSessions.toArray(),
      this.database.practiceResults.toArray(),
      this.database.examSessions.toArray(),
      this.database.examResults.toArray(),
      this.database.learningDaysBySubject.toArray(),
      this.database.settings.toArray(),
      this.database.b1PracticeSessions.toArray(),
      this.database.b1MockSessions.toArray(),
      this.database.b1PdfFiles.toArray(),
      this.database.b1LearnerEvidence.toArray(),
      this.database.b1LearningReflections.toArray(),
      this.database.b1RemediationProgress.toArray(),
      this.database.b1AnswerAttempts.toArray(),
      this.database.b1Preferences.toArray(),
    ]);
    const document = createBackupDocument({
      exportedAt,
      appVersion: APP_VERSION,
      databaseSchemaVersion: DATABASE_VERSION,
      questionData: createQuestionDataIdentity(allQuestions, 1),
      answerHistory,
      favorites: progress
        .filter((row) => row.favorite)
        .map<FavoriteBackupEntry>((row) => ({
          subjectId: row.subjectId,
          code: row.code,
          favoriteAt: row.favoriteAt,
        })),
      normalPracticeSessions: practiceSessions.filter(
        (session) => session.status === 'in_progress',
      ),
      normalPracticeResults: practiceResults,
      mockExamSessions: examSessions.filter((session) => session.status === 'in_progress'),
      mockExamResults: examResults,
      learningDays,
      settings,
      b1: {
        practiceSessions: b1PracticeSessions,
        mockSessions: b1MockSessions,
        pdfRegistrations: b1PdfFiles.map((row) => ({
          subjectId: row.subjectId,
          year: row.year,
          fileName: row.fileName,
          mimeType: row.mimeType,
          size: row.size,
          updatedAt: row.updatedAt,
        })),
        learnerEvidence: b1LearnerEvidence,
        learningReflections: b1LearningReflections,
        remediationProgress: b1RemediationProgress,
        answerAttempts: b1AnswerAttempts,
        preferences: b1Preferences,
      },
    });
    const validation = await validateBackupDocumentWithB1(
      document,
      allQuestions,
      createQuestionDataIdentity(allQuestions, 1),
    );
    if (!validation.ok) {
      throw new DataManagementError('保存データをバックアップ形式へ変換できませんでした。');
    }
    return validation.value.document;
  }

  async restore(backup: ValidatedBackup): Promise<void> {
    await this.database.open();
    const data = backup.document.data;
    const progressRows = createQuestionProgress(data.answerHistory, data.favorites);
    const learningDays = createLearningDays(data.answerHistory);
    const syncUpdatedAt = new Date().toISOString();
    const deviceId = getDeviceId();
    const [previousB1PracticeSessions, previousCloudSyncMetadata] = await Promise.all([
      this.database.b1PracticeSessions.toArray(),
      this.database.cloudSyncMetadata.toArray(),
    ]);
    const restoredQuestionKeys = new Set(progressRows.map((row) => `${row.subjectId}:${row.code}`));
    const cloudSyncMetadata = [
      ...allQuestions.map((question) =>
        createCloudSyncMetadataRow(
          question.subjectId,
          question.code,
          syncUpdatedAt,
          deviceId,
          !restoredQuestionKeys.has(`${question.subjectId}:${question.code}`),
        ),
      ),
      ...createB1PracticeRestoreMetadata(
        data.b1.practiceSessions,
        previousB1PracticeSessions,
        previousCloudSyncMetadata,
        syncUpdatedAt,
        deviceId,
      ),
    ];

    try {
      await this.database.transaction(
        'rw',
        [
          this.database.questionProgress,
          this.database.answerAttempts,
          this.database.practiceSessions,
          this.database.practiceResults,
          this.database.examSessions,
          this.database.examResults,
          this.database.learningDays,
          this.database.learningDaysBySubject,
          this.database.settings,
          this.database.b1PracticeSessions,
          this.database.b1MockSessions,
          this.database.b1LearnerEvidence,
          this.database.b1LearningReflections,
          this.database.b1RemediationProgress,
          this.database.b1AnswerAttempts,
          this.database.b1Preferences,
          this.database.cloudSyncMetadata,
          this.database.cloudSyncOutbox,
        ],
        async () => {
          await Promise.all([
            this.database.questionProgress.clear(),
            this.database.answerAttempts.clear(),
            this.database.practiceSessions.clear(),
            this.database.practiceResults.clear(),
            this.database.examSessions.clear(),
            this.database.examResults.clear(),
            this.database.learningDays.clear(),
            this.database.learningDaysBySubject.clear(),
            this.database.settings.clear(),
            this.database.b1PracticeSessions.clear(),
            this.database.b1MockSessions.clear(),
            this.database.b1LearnerEvidence.clear(),
            this.database.b1LearningReflections.clear(),
            this.database.b1RemediationProgress.clear(),
            this.database.b1AnswerAttempts.clear(),
            this.database.b1Preferences.clear(),
            this.database.cloudSyncMetadata.clear(),
          ]);

          if (data.answerHistory.length > 0) {
            await this.database.answerAttempts.bulkPut(data.answerHistory);
          }
          if (progressRows.length > 0) {
            await this.database.questionProgress.bulkPut(progressRows);
          }
          if (data.normalPracticeSessions.length > 0) {
            await this.database.practiceSessions.bulkPut(data.normalPracticeSessions);
          }
          if (data.normalPracticeResults.length > 0) {
            await this.database.practiceResults.bulkPut(data.normalPracticeResults);
          }
          if (data.mockExamSessions.length > 0) {
            await this.database.examSessions.bulkPut(data.mockExamSessions);
          }
          if (data.mockExamResults.length > 0) {
            await this.database.examResults.bulkPut(data.mockExamResults);
          }
          if (learningDays.length > 0) {
            await this.database.learningDaysBySubject.bulkPut(learningDays);
            await this.database.learningDays.bulkPut(
              learningDays.filter((day) => day.subjectId === 'a1'),
            );
          }
          if (data.settings.length > 0) {
            await this.database.settings.bulkPut(data.settings);
          }
          if (data.b1.practiceSessions.length > 0) {
            await this.database.b1PracticeSessions.bulkPut(data.b1.practiceSessions);
          }
          if (data.b1.mockSessions.length > 0) {
            await this.database.b1MockSessions.bulkPut(data.b1.mockSessions);
          }
          if (data.b1.learnerEvidence.length > 0) {
            await this.database.b1LearnerEvidence.bulkPut(data.b1.learnerEvidence);
          }
          if (data.b1.learningReflections.length > 0) {
            await this.database.b1LearningReflections.bulkPut(data.b1.learningReflections);
          }
          if (data.b1.remediationProgress.length > 0) {
            await this.database.b1RemediationProgress.bulkPut(data.b1.remediationProgress);
          }
          if ((data.b1.answerAttempts?.length ?? 0) > 0) {
            await this.database.b1AnswerAttempts.bulkPut(data.b1.answerAttempts ?? []);
          }
          if ((data.b1.preferences?.length ?? 0) > 0) {
            await this.database.b1Preferences.bulkPut(data.b1.preferences ?? []);
          }
          await this.database.cloudSyncMetadata.bulkPut(cloudSyncMetadata);
          await queueCloudSyncMetadataForActiveUser(
            this.database,
            cloudSyncMetadata,
            syncUpdatedAt,
          );
        },
      );
      notifyCloudSyncNeeded();
    } catch {
      throw new DataManagementError(
        '復元に失敗しました。現在の学習データは変更されていません。再試行するか、別のファイルを選んでください。',
      );
    }
  }

  async clearLearningData(): Promise<void> {
    await this.database.open();
    const deletedAt = new Date().toISOString();
    const deviceId = getDeviceId();
    const [b1PracticeSessions, cloudSyncMetadata] = await Promise.all([
      this.database.b1PracticeSessions.toArray(),
      this.database.cloudSyncMetadata.toArray(),
    ]);
    const tombstones = [
      ...allQuestions.map((question) =>
        createCloudSyncMetadataRow(question.subjectId, question.code, deletedAt, deviceId, true),
      ),
      ...createB1PracticeTombstones(b1PracticeSessions, cloudSyncMetadata, deletedAt, deviceId),
    ];
    try {
      await this.database.transaction(
        'rw',
        [
          this.database.questionProgress,
          this.database.answerAttempts,
          this.database.practiceSessions,
          this.database.practiceResults,
          this.database.examSessions,
          this.database.examResults,
          this.database.learningDays,
          this.database.learningDaysBySubject,
          this.database.b1PdfFiles,
          this.database.b1PracticeSessions,
          this.database.b1MockSessions,
          this.database.b1LearnerEvidence,
          this.database.b1LearningReflections,
          this.database.b1RemediationProgress,
          this.database.b1AnswerAttempts,
          this.database.cloudSyncMetadata,
          this.database.cloudSyncOutbox,
        ],
        async () => {
          await Promise.all([
            this.database.questionProgress.clear(),
            this.database.answerAttempts.clear(),
            this.database.practiceSessions.clear(),
            this.database.practiceResults.clear(),
            this.database.examSessions.clear(),
            this.database.examResults.clear(),
            this.database.learningDays.clear(),
            this.database.learningDaysBySubject.clear(),
            this.database.b1PdfFiles.clear(),
            this.database.b1PracticeSessions.clear(),
            this.database.b1MockSessions.clear(),
            this.database.b1LearnerEvidence.clear(),
            this.database.b1LearningReflections.clear(),
            this.database.b1RemediationProgress.clear(),
            this.database.b1AnswerAttempts.clear(),
            this.database.cloudSyncMetadata.clear(),
          ]);
          await this.database.cloudSyncMetadata.bulkPut(tombstones);
          await queueCloudSyncMetadataForActiveUser(this.database, tombstones, deletedAt);
        },
      );
      notifyCloudSyncNeeded();
    } catch {
      throw new DataManagementError(
        '学習データを削除できませんでした。現在のデータは変更されていません。再試行してください。',
      );
    }
  }
}

function createQuestionProgress(
  attempts: readonly AnswerAttemptRow[],
  favorites: readonly FavoriteBackupEntry[],
): QuestionProgressRow[] {
  const byCode = new Map<string, QuestionProgressRow>();
  const sortedAttempts = attempts
    .slice()
    .sort(
      (left, right) =>
        left.answeredAt.localeCompare(right.answeredAt) || (left.id ?? 0) - (right.id ?? 0),
    );

  for (const attempt of sortedAttempts) {
    const key = `${attempt.subjectId}:${attempt.code}`;
    byCode.set(key, applyAnswerToQuestionProgress(byCode.get(key), attempt));
  }
  for (const favorite of favorites) {
    const key = `${favorite.subjectId}:${favorite.code}`;
    const current = byCode.get(key);
    const base =
      current ??
      createEmptyQuestionProgress(
        favorite.code,
        favorite.favoriteAt ?? new Date(0).toISOString(),
        favorite.subjectId,
      );
    byCode.set(key, {
      ...base,
      favorite: true,
      favoriteAt: favorite.favoriteAt,
      updatedAt: favorite.favoriteAt ?? base.updatedAt,
    });
  }
  return [...byCode.values()];
}

function createLearningDays(attempts: readonly AnswerAttemptRow[]): LearningDayRow[] {
  const days = new Map<string, LearningDayRow>();
  for (const attempt of attempts) {
    const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
    const key = `${attempt.subjectId}:${date}`;
    const current = days.get(key);
    days.set(key, {
      subjectId: attempt.subjectId,
      date,
      answerCount: (current?.answerCount ?? 0) + 1,
      updatedAt:
        current === undefined || current.updatedAt.localeCompare(attempt.answeredAt) < 0
          ? attempt.answeredAt
          : current.updatedAt,
    });
  }
  return [...days.values()].sort((left, right) => left.date.localeCompare(right.date));
}
