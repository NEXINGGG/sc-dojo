import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, initializeDatabase, type A1DojoDatabase } from '../../database/database';
import { B1LearningSupportRepository } from './b1LearningSupportRepository';

const databaseNames: string[] = [];
const now = '2026-07-26T00:00:00.000Z';
const questionId = 'B1-2025-Q1-U01';
const sessionId = 'b1-practice-test-session';

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => indexedDB.deleteDatabase(name)));
});

function createTestDatabase(): A1DojoDatabase {
  const name = `b1-learning-support-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return createDatabase(name);
}

describe('B1LearningSupportRepository', () => {
  it('根拠記録を設問・セッション単位でupsert、取得、削除できる', async () => {
    const database = createTestDatabase();
    const repository = new B1LearningSupportRepository(database);
    const first = await repository.saveLearnerEvidence(
      {
        sessionId,
        questionId,
        evidenceId: `${questionId}-E01`,
        note: '構成図の接続先を確認した。',
      },
      now,
    );
    const updated = await repository.saveLearnerEvidence(
      { sessionId, questionId, note: '設問条件と構成図を照合した。' },
      '2026-07-26T00:01:00.000Z',
    );

    expect(updated.id).toBe(first.id);
    await expect(repository.listLearnerEvidenceByQuestion(questionId)).resolves.toMatchObject([
      { note: '設問条件と構成図を照合した。' },
    ]);
    await expect(repository.listLearnerEvidenceBySession(sessionId)).resolves.toHaveLength(1);
    await repository.deleteLearnerEvidence(updated.id);
    await expect(repository.listLearnerEvidenceBySession(sessionId)).resolves.toEqual([]);
    await repository.saveLearnerEvidence({ sessionId, questionId, note: '再確認した。' }, now);
    await repository.clearLearnerEvidenceForQuestion(questionId);
    await expect(repository.listLearnerEvidenceBySession(sessionId)).resolves.toEqual([]);
    database.close();
  });

  it('振返りを保存し、A2復習を二重開始せずに完了又はキャンセルできる', async () => {
    const database = createTestDatabase();
    const repository = new B1LearningSupportRepository(database);
    await repository.saveLearningReflection(
      {
        sessionId,
        questionId,
        failureCauseIds: ['knowledge_gap', 'missed_condition'],
        selfAssessment: 'partial',
      },
      now,
    );
    await expect(repository.getLearningReflection(sessionId, questionId)).resolves.toMatchObject({
      failureCauseIds: ['knowledge_gap', 'missed_condition'],
    });

    const first = await repository.startRemediation(
      {
        originQuestionId: questionId,
        originSessionId: sessionId,
        failureCauseIds: ['knowledge_gap'],
        a2QuestionIds: ['A2-061', 'A2-062', 'A2-063'],
      },
      now,
    );
    const duplicate = await repository.startRemediation(
      {
        originQuestionId: questionId,
        originSessionId: sessionId,
        failureCauseIds: ['knowledge_gap'],
        a2QuestionIds: ['A2-061', 'A2-062', 'A2-063'],
      },
      now,
    );
    expect(duplicate.id).toBe(first.id);
    for (const a2QuestionId of first.a2QuestionIds) {
      await repository.markA2QuestionCompleted(first.id, a2QuestionId, now);
    }
    await expect(repository.completeRemediation(first.id, now)).resolves.toMatchObject({
      status: 'completed',
      completedA2QuestionIds: ['A2-061', 'A2-062', 'A2-063'],
    });

    const second = await repository.startRemediation(
      {
        originQuestionId: questionId,
        originSessionId: sessionId,
        failureCauseIds: ['knowledge_gap'],
        a2QuestionIds: ['A2-061'],
      },
      '2026-07-26T00:02:00.000Z',
    );
    await expect(repository.cancelRemediation(second.id, now)).resolves.toMatchObject({
      status: 'cancelled',
    });
    await expect(repository.listRemediationsByOriginQuestion(questionId)).resolves.toHaveLength(2);
    database.close();
  });

  it('DB再読込み後も根拠・振返り・進捗を保持し、不正IDを拒否する', async () => {
    const database = createTestDatabase();
    await initializeDatabase(database);
    const repository = new B1LearningSupportRepository(database);
    await repository.saveLearnerEvidence({ sessionId, questionId, note: '本文を確認した。' }, now);
    await repository.saveLearningReflection(
      {
        sessionId,
        questionId,
        failureCauseIds: ['knowledge_gap'],
        selfAssessment: 'review_needed',
      },
      now,
    );
    const progress = await repository.startRemediation(
      {
        originQuestionId: questionId,
        originSessionId: sessionId,
        failureCauseIds: ['knowledge_gap'],
        a2QuestionIds: ['A2-061'],
      },
      now,
    );
    database.close();

    const reopened = createDatabase(database.name);
    await initializeDatabase(reopened);
    const reloaded = new B1LearningSupportRepository(reopened);
    await expect(reloaded.listLearnerEvidenceBySession(sessionId)).resolves.toHaveLength(1);
    await expect(reloaded.listLearningReflectionsBySession(sessionId)).resolves.toHaveLength(1);
    await expect(reloaded.getActiveRemediation(questionId, sessionId)).resolves.toMatchObject({
      id: progress.id,
    });
    await expect(
      reloaded.startRemediation({
        originQuestionId: questionId,
        originSessionId: sessionId,
        failureCauseIds: ['knowledge_gap'],
        a2QuestionIds: ['A2-999'],
      }),
    ).rejects.toThrow('存在しないA2問題');
    reopened.close();
  });
});
