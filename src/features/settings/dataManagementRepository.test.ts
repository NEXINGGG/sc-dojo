import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabase, initializeDatabase, type A1DojoDatabase } from '../../database/database';
import { questionDataVersion, questions } from '../../data/catalog';
import {
  createBackupDocument,
  createQuestionDataIdentity,
  validateBackupDocument,
  type BackupCreateInput,
  type ValidatedBackup,
} from '../../domain/backup';
import { createExamSession, gradeExam } from '../../domain/exam';
import { createPracticeResult } from '../../domain/learning';
import {
  completePracticeSession,
  confirmPracticeAnswer,
  createPracticeSession,
  defaultPracticeFilters,
} from '../../domain/practice';
import { DataManagementRepository } from './dataManagementRepository';

const databaseNames: string[] = [];
const exportedAt = '2026-07-18T00:00:00.000Z';
const identity = createQuestionDataIdentity(questions, questionDataVersion);

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databaseNames.splice(0).map(async (name) => indexedDB.deleteDatabase(name)));
});

function createTestDatabase(): A1DojoDatabase {
  const name = `a1-dojo-data-management-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return createDatabase(name);
}

function createValidatedBackup(): ValidatedBackup {
  const practiceQuestion = questions[0];
  const practiceSession = createPracticeSession([practiceQuestion.code], defaultPracticeFilters, {
    id: 'practice-result-1',
    now: exportedAt,
  });
  const confirmed = confirmPracticeAnswer(
    practiceSession,
    practiceQuestion,
    practiceQuestion.correctChoice,
    exportedAt,
  );
  if (!confirmed.ok) {
    throw new Error('通常演習のテストデータを作成できません。');
  }
  const completed = completePracticeSession(confirmed.session, exportedAt);
  const practiceResult = createPracticeResult(completed, exportedAt);
  const examSession = createExamSession(
    'fixed_1',
    questions.slice(0, 30).map((question) => question.code),
    { id: 'exam-result-1', now: exportedAt },
  );
  examSession.answers[examSession.questionCodes[0]] = questions[0].correctChoice;
  const examResult = gradeExam(
    examSession,
    new Map(questions.map((question) => [question.code, question])),
    exportedAt,
    'manual',
  );
  const document = createBackupDocument({
    exportedAt,
    appVersion: '0.1.0',
    databaseSchemaVersion: 4,
    questionData: identity,
    answerHistory: [
      {
        id: 11,
        code: practiceQuestion.code,
        selectedChoice: practiceQuestion.correctChoice,
        correctChoice: practiceQuestion.correctChoice,
        isCorrect: true,
        answeredAt: exportedAt,
        mode: 'normal_practice',
        sessionId: practiceSession.id,
        version: 1,
      },
      {
        id: 12,
        code: examSession.questionCodes[0],
        selectedChoice: questions[0].correctChoice,
        correctChoice: questions[0].correctChoice,
        isCorrect: true,
        answeredAt: exportedAt,
        mode: 'mock_exam_fixed_1',
        sessionId: examSession.id,
        version: 1,
      },
    ],
    favorites: [{ code: questions[1].code, favoriteAt: exportedAt }],
    normalPracticeSessions: [
      createPracticeSession([questions[2].code], defaultPracticeFilters, {
        id: 'practice-in-progress',
        now: exportedAt,
      }),
    ],
    normalPracticeResults: [practiceResult],
    mockExamSessions: [
      createExamSession(
        'fixed_2',
        questions.slice(30, 60).map((question) => question.code),
        { id: 'exam-in-progress', now: exportedAt },
      ),
    ],
    mockExamResults: [examResult],
    learningDays: [{ date: '2026-07-18', answerCount: 2, updatedAt: exportedAt }],
    settings: [
      {
        key: 'appearance',
        theme: 'dark',
        fontSize: 'extra_large',
        reducedMotion: 'reduce',
        shuffleChoices: true,
        updatedAt: exportedAt,
      },
    ],
  } satisfies BackupCreateInput);
  const validation = validateBackupDocument(document, questions, identity);
  if (!validation.ok) {
    throw new Error(validation.errors[0].message);
  }
  return validation.value;
}

describe('DataManagementRepository', () => {
  it('全対象データをバックアップ形式へ変換し、問題本文を含めない', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new DataManagementRepository(database);
    await database.answerAttempts.add({
      code: questions[0].code,
      selectedChoice: questions[0].correctChoice,
      correctChoice: questions[0].correctChoice,
      isCorrect: true,
      answeredAt: exportedAt,
      mode: 'normal_practice',
      sessionId: 'saved-answer',
      version: 1,
    });
    await database.questionProgress.put({
      code: questions[1].code,
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      favorite: true,
      favoriteAt: exportedAt,
      updatedAt: exportedAt,
    });
    await database.settings.put({
      key: 'appearance',
      theme: 'dark',
      fontSize: 'large',
      reducedMotion: 'reduce',
      shuffleChoices: false,
      updatedAt: exportedAt,
    });

    const backup = await repository.createBackup(exportedAt);

    expect(backup.data.answerHistory).toHaveLength(1);
    expect(backup.data.favorites).toEqual([{ code: questions[1].code, favoriteAt: exportedAt }]);
    expect(JSON.stringify(backup)).not.toContain(questions[0].question);
    expect(JSON.stringify(backup)).not.toContain(questions[0].explanation);
    expect(backup.questionData).toEqual(identity);
    database.close();
  });

  it('復元時に古いデータを残さず、進捗・設定・途中セッションを完全置換する', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new DataManagementRepository(database);
    await database.answerAttempts.add({
      code: questions[100].code,
      selectedChoice: questions[100].correctChoice,
      correctChoice: questions[100].correctChoice,
      isCorrect: true,
      answeredAt: exportedAt,
      mode: 'normal_practice',
      sessionId: 'old-data',
      version: 1,
    });

    await repository.restore(createValidatedBackup());

    await expect(database.answerAttempts.count()).resolves.toBe(2);
    await expect(
      database.answerAttempts.where('code').equals(questions[100].code).count(),
    ).resolves.toBe(0);
    await expect(database.questionProgress.get(questions[1].code)).resolves.toMatchObject({
      favorite: true,
    });
    await expect(database.practiceSessions.get('practice-in-progress')).resolves.toMatchObject({
      status: 'in_progress',
    });
    await expect(database.practiceResults.count()).resolves.toBe(1);
    await expect(database.examSessions.get('exam-in-progress')).resolves.toMatchObject({
      status: 'in_progress',
    });
    await expect(database.examResults.count()).resolves.toBe(1);
    await expect(database.learningDays.get('2026-07-18')).resolves.toMatchObject({
      answerCount: 2,
    });
    await expect(database.settings.get('appearance')).resolves.toMatchObject({
      theme: 'dark',
      fontSize: 'extra_large',
      reducedMotion: 'reduce',
    });
    database.close();
  });

  it('全消去は表示設定を残し、学習テーブルだけを空にする', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new DataManagementRepository(database);
    await repository.restore(createValidatedBackup());

    await repository.clearLearningData();

    expect(await repository.getSummary()).toMatchObject({
      answerHistoryCount: 0,
      studiedQuestionCount: 0,
      favoriteCount: 0,
      normalPracticeResultCount: 0,
      mockExamResultCount: 0,
      learningDayCount: 0,
      hasInProgressPractice: false,
      hasInProgressExam: false,
    });
    await expect(database.settings.get('appearance')).resolves.toMatchObject({ theme: 'dark' });
    database.close();
  });

  it('トランザクション中の失敗では、復元前のデータを保持する', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new DataManagementRepository(database);
    await database.answerAttempts.add({
      code: questions[100].code,
      selectedChoice: questions[100].correctChoice,
      correctChoice: questions[100].correctChoice,
      isCorrect: true,
      answeredAt: exportedAt,
      mode: 'normal_practice',
      sessionId: 'old-data',
      version: 1,
    });
    vi.spyOn(database.examResults, 'bulkPut').mockRejectedValueOnce(new Error('storage failure'));

    await expect(repository.restore(createValidatedBackup())).rejects.toThrow(
      '現在の学習データは変更されていません',
    );
    await expect(
      database.answerAttempts.where('code').equals(questions[100].code).count(),
    ).resolves.toBe(1);
    database.close();
  });
});
