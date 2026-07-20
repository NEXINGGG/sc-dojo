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
  validateBackupDocument,
} from '../../domain/backup';
import {
  applyAnswerToQuestionProgress,
  createEmptyQuestionProgress,
  getAsiaTokyoDate,
} from '../../domain/learning';

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
    ] = await Promise.all([
      this.database.answerAttempts.toArray(),
      this.database.questionProgress.toArray(),
      this.database.practiceResults.count(),
      this.database.examResults.count(),
      this.database.learningDaysBySubject.count(),
      this.database.practiceSessions.where('status').equals('in_progress').first(),
      this.database.examSessions.where('status').equals('in_progress').first(),
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
    ] = await Promise.all([
      this.database.answerAttempts.toArray(),
      this.database.questionProgress.toArray(),
      this.database.practiceSessions.toArray(),
      this.database.practiceResults.toArray(),
      this.database.examSessions.toArray(),
      this.database.examResults.toArray(),
      this.database.learningDaysBySubject.toArray(),
      this.database.settings.toArray(),
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
    });
    const validation = validateBackupDocument(
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
        },
      );
    } catch {
      throw new DataManagementError(
        '復元に失敗しました。現在の学習データは変更されていません。再試行するか、別のファイルを選んでください。',
      );
    }
  }

  async clearLearningData(): Promise<void> {
    await this.database.open();
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
          ]);
        },
      );
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
