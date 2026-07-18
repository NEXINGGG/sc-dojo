import { afterEach, describe, expect, it } from 'vitest';
import { questions } from '../../data/catalog';
import { createDatabase, type A1DojoDatabase } from '../../database/database';
import { createExamSession, selectExamAnswer, toggleExamReview } from '../../domain/exam';
import { createPracticeSession, defaultPracticeFilters } from '../../domain/practice';
import { ActiveExamSessionExistsError, ExamRepository } from './examRepository';

const databases: A1DojoDatabase[] = [];
const activeQuestions = questions.filter((question) => question.status === 'active');

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
  const database = createDatabase(`a1-dojo-exam-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function createSession(id: string, now = '2026-07-18T00:00:00.000Z') {
  return createExamSession(
    'fixed_1',
    activeQuestions.slice(0, 30).map((question) => question.code),
    { id, now },
  );
}

describe('ExamRepository', () => {
  it('提出時に結果・回答履歴・進捗・学習日を同一トランザクションで保存する', async () => {
    const database = createTestDatabase();
    const repository = new ExamRepository(database);
    const firstQuestion = activeQuestions[0];
    const secondQuestion = activeQuestions[1];
    const created = createSession('submit-session');
    const answered = selectExamAnswer(
      selectExamAnswer(
        created,
        firstQuestion,
        firstQuestion.correctChoice,
        '2026-07-18T00:01:00.000Z',
      ),
      secondQuestion,
      secondQuestion.correctChoice === 'A' ? 'B' : 'A',
      '2026-07-18T00:02:00.000Z',
    );
    const session = toggleExamReview(answered, secondQuestion.code, '2026-07-18T00:03:00.000Z');
    await repository.createInProgress(session);

    const firstSubmit = await repository.submit(session.id, '2026-07-18T00:10:00.000Z', 'manual');
    const duplicateSubmit = await repository.submit(
      session.id,
      '2026-07-18T00:11:00.000Z',
      'manual',
    );

    expect(firstSubmit.created).toBe(true);
    expect(firstSubmit.result).toMatchObject({
      correct: 1,
      incorrect: 1,
      unanswered: 28,
      submissionReason: 'manual',
    });
    expect(duplicateSubmit.created).toBe(false);
    expect(await database.examResults.count()).toBe(1);
    expect(await database.answerAttempts.where('sessionId').equals(session.id).count()).toBe(2);
    await expect(
      database.answerAttempts.where('sessionId').equals(session.id).toArray(),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ mode: 'mock_exam_fixed_1' })]),
    );
    await expect(database.questionProgress.get(firstQuestion.code)).resolves.toMatchObject({
      attemptCount: 1,
      lastIsCorrect: true,
    });
    await expect(database.questionProgress.get(secondQuestion.code)).resolves.toMatchObject({
      attemptCount: 1,
      lastIsCorrect: false,
    });
    await expect(database.learningDays.get('2026-07-18')).resolves.toMatchObject({
      answerCount: 2,
    });
    await expect(database.examSessions.get(session.id)).resolves.toMatchObject({
      status: 'submitted',
      submissionReason: 'manual',
    });
  });

  it('締切後の未完了模試を一度だけ時間切れ提出する', async () => {
    const database = createTestDatabase();
    const repository = new ExamRepository(database);
    const session = createSession('timeout-session');
    await repository.createInProgress(session);

    const submitted = await repository.submitExpiredInProgress(
      new Date('2026-07-18T01:00:00.000Z'),
    );
    const repeated = await repository.submitExpiredInProgress(new Date('2026-07-18T01:01:00.000Z'));

    expect(submitted).toMatchObject({
      created: true,
      result: expect.objectContaining({ submissionReason: 'timeout', unanswered: 30 }),
    });
    expect(repeated).toBeUndefined();
    expect(await database.examResults.count()).toBe(1);
    expect(await database.answerAttempts.count()).toBe(0);
  });

  it('途中模試は1件だけにし、破棄しても通常演習など他テーブルを削除しない', async () => {
    const database = createTestDatabase();
    const repository = new ExamRepository(database);
    const first = createSession('only-one');
    const second = createSession('next-one');
    const practice = createPracticeSession([activeQuestions[0].code], defaultPracticeFilters, {
      id: 'practice-should-remain',
      now: '2026-07-18T00:00:00.000Z',
    });
    await database.practiceSessions.put(practice);
    await repository.createInProgress(first);

    await expect(repository.createInProgress(second)).rejects.toBeInstanceOf(
      ActiveExamSessionExistsError,
    );
    await repository.discardInProgress(first.id);

    expect(await repository.getInProgress()).toBeUndefined();
    expect(await database.practiceSessions.get(practice.id)).toEqual(practice);
  });

  it('模試種別ごとの履歴件数・直近・最高得点を取得する', async () => {
    const database = createTestDatabase();
    const repository = new ExamRepository(database);
    const first = createSession('history-first', '2026-07-18T00:00:00.000Z');
    const second = createSession('history-second', '2026-07-18T02:00:00.000Z');
    await repository.createInProgress(first);
    await repository.submit(first.id, '2026-07-18T00:10:00.000Z', 'manual');
    await repository.createInProgress(second);
    await repository.submit(second.id, '2026-07-18T02:20:00.000Z', 'manual');

    const summaries = await repository.getTypeHistorySummaries();
    const overview = await repository.getOverview();

    expect(summaries.fixed_1.attempts).toBe(2);
    expect(summaries.fixed_1.latest?.examSessionId).toBe(second.id);
    expect(summaries.fixed_2.attempts).toBe(0);
    expect(overview).toMatchObject({ totalAttempts: 2, inProgress: undefined });
  });
});
