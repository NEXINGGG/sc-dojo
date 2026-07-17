import { afterEach, describe, expect, it } from 'vitest';
import { questions } from '../../data/catalog';
import { createDatabase, type A1DojoDatabase } from '../../database/database';
import {
  completePracticeSession,
  confirmPracticeAnswer,
  createPracticeSession,
  defaultPracticeFilters,
} from '../../domain/practice';
import { ensureLearningDataReady, LearningRepository } from './learningRepository';

const databases: A1DojoDatabase[] = [];

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      const name = database.name;
      database.close();
      await indexedDB.deleteDatabase(name);
    }),
  );
});

function createTestDatabase(): A1DojoDatabase {
  const database = createDatabase(`a1-dojo-learning-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function createConfirmedSession(
  id: string,
  questionIndex: number,
  selectedChoice: 'A' | 'B' | 'C' | 'D',
  confirmedAt: string,
) {
  const question = questions[questionIndex];
  const session = createPracticeSession([question.code], defaultPracticeFilters, {
    id,
    now: '2026-07-16T14:59:00.000Z',
  });
  const result = confirmPracticeAnswer(session, question, selectedChoice, confirmedAt);

  if (!result.ok) {
    throw new Error('テスト用の回答を確定できませんでした。');
  }

  return { question, session: result.session };
}

describe('LearningRepository', () => {
  it('確定回答を履歴・進捗・学習日に一度だけ保存する', async () => {
    const database = createTestDatabase();
    const repository = new LearningRepository(database);
    const { question, session } = createConfirmedSession(
      'record-once',
      0,
      questions[0].correctChoice,
      '2026-07-16T15:00:00.000Z',
    );

    await expect(
      repository.recordConfirmedPracticeAnswer(session, question),
    ).resolves.toMatchObject({
      recorded: true,
    });
    await expect(
      repository.recordConfirmedPracticeAnswer(session, question),
    ).resolves.toMatchObject({
      recorded: false,
    });

    const attempts = await repository.getAttempts(question.code);
    const progress = await repository.getProgress(question.code);
    const day = await database.learningDays.get('2026-07-17');

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      code: question.code,
      correctChoice: question.correctChoice,
      isCorrect: true,
      sessionId: session.id,
      mode: 'normal_practice',
      version: 1,
    });
    expect(progress).toMatchObject({
      attemptCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      lastIsCorrect: true,
    });
    expect(day).toMatchObject({ answerCount: 1 });
  });

  it('別セッションの再回答は履歴を増やし、最新の正誤状態を更新する', async () => {
    const database = createTestDatabase();
    const repository = new LearningRepository(database);
    const first = createConfirmedSession(
      'first-answer',
      0,
      questions[0].correctChoice,
      '2026-07-17T01:00:00.000Z',
    );
    const second = createConfirmedSession(
      'second-answer',
      0,
      questions[0].correctChoice === 'A' ? 'B' : 'A',
      '2026-07-17T02:00:00.000Z',
    );

    await repository.recordConfirmedPracticeAnswer(first.session, first.question);
    await repository.recordConfirmedPracticeAnswer(second.session, second.question);

    expect(await repository.getAttempts(first.question.code)).toHaveLength(2);
    await expect(repository.getProgress(first.question.code)).resolves.toMatchObject({
      attemptCount: 2,
      correctCount: 1,
      incorrectCount: 1,
      lastIsCorrect: false,
    });
  });

  it('お気に入りを回答履歴とは独立して更新できる', async () => {
    const database = createTestDatabase();
    const repository = new LearningRepository(database);
    const { question, session } = createConfirmedSession(
      'favorite-answer',
      1,
      questions[1].correctChoice,
      '2026-07-17T01:00:00.000Z',
    );

    await repository.recordConfirmedPracticeAnswer(session, question);
    await repository.setFavorite(question.code, true, '2026-07-17T02:00:00.000Z');
    await repository.setFavorite(question.code, false, '2026-07-17T03:00:00.000Z');

    expect(await repository.getAttempts(question.code)).toHaveLength(1);
    await expect(repository.getProgress(question.code)).resolves.toMatchObject({
      favorite: false,
      attemptCount: 1,
      favoriteAt: undefined,
    });
  });

  it('完了結果はセッションごとに一件だけ保存する', async () => {
    const database = createTestDatabase();
    const repository = new LearningRepository(database);
    const { session } = createConfirmedSession(
      'result-once',
      2,
      questions[2].correctChoice,
      '2026-07-17T01:00:00.000Z',
    );
    const completed = completePracticeSession(session, '2026-07-17T01:05:00.000Z');

    const first = await repository.completePracticeSession(completed);
    const second = await repository.completePracticeSession(completed);

    expect(first).toMatchObject({ total: 1, correct: 1, correctRate: 100 });
    expect(second).toEqual(first);
    expect(await database.practiceResults.count()).toBe(1);
  });

  it('既存セッションの確定回答を破棄せずにバックフィルし、繰り返しても重複しない', async () => {
    const database = createTestDatabase();
    const { question, session } = createConfirmedSession(
      'phase3-session',
      3,
      questions[3].correctChoice,
      '2026-07-17T01:00:00.000Z',
    );
    const completed = completePracticeSession(session, '2026-07-17T01:01:00.000Z');
    await database.practiceSessions.put(completed);

    await ensureLearningDataReady(database);
    await ensureLearningDataReady(database);

    expect(await database.practiceSessions.get(completed.id)).toEqual(completed);
    expect(await database.answerAttempts.where('code').equals(question.code).count()).toBe(1);
    await expect(database.questionProgress.get(question.code)).resolves.toMatchObject({
      attemptCount: 1,
    });
    expect(await database.practiceResults.get(completed.id)).toMatchObject({
      sessionId: completed.id,
      total: 1,
    });
  });
});
