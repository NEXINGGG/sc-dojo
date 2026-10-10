import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type A1DojoDatabase } from './database';
import { reconcileA1Dataset } from './a1DatasetMigration';
import { a1LegacyManifest, createA1Manifest } from '../domain/questionManifest';
import { createQuestionFingerprint } from '../domain/questionDataIdentity';
import { toQuestion, type RawQuestionPayload } from '../data/catalog';
import { createPracticeSession, defaultPracticeFilters } from '../domain/practice';
import type { QuestionProgressRow } from './types';
const candidate = JSON.parse(
  readFileSync('data/sc-a1-v1-candidate.json', 'utf8'),
) as RawQuestionPayload;
const questions = candidate.questions.map((q) => toQuestion(q, 'a1', 'sc-a1-v1'));
const draft = JSON.parse(readFileSync('data/sc-a1-source-code-map-draft.json', 'utf8')) as {
  entries: Array<{ code: string; preserve_history: boolean; history_class: string }>;
};
const time = '2026-10-08T00:00:00.000Z';
let db: A1DojoDatabase;
afterEach(async () => {
  if (db) await db.delete();
});
const progress = (code: string, subjectId: 'a1' | 'a2' = 'a1'): QuestionProgressRow => ({
  code,
  subjectId,
  favorite: true,
  attemptCount: 1,
  correctCount: 1,
  incorrectCount: 0,
  updatedAt: time,
});
describe('完成candidateによる実履歴移行', () => {
  it.each([false, true])(
    '準備版manifest保存=%s：197維持、43退避、他科目・設定不変、再実行不変',
    async (stored) => {
      db = createDatabase(`a1-release-${crypto.randomUUID()}`);
      if (stored) await db.a1DatasetManifests.put(a1LegacyManifest);
      const initial = questions.map((q) => progress(q.code));
      const a2 = progress('A2-001', 'a2');
      await db.questionProgress.bulkPut([...initial, a2]);
      await db.answerAttempts.bulkAdd(
        initial.map((r) => ({
          subjectId: 'a1',
          code: r.code,
          selectedChoice: 'A',
          correctChoice: 'A',
          isCorrect: true,
          answeredAt: time,
          mode: 'normal_practice',
          sessionId: r.code,
          version: 1,
        })),
      );
      const a2Attempt = {
        subjectId: 'a2' as const,
        code: 'A2-001',
        selectedChoice: 'B' as const,
        correctChoice: 'B' as const,
        isCorrect: true,
        answeredAt: time,
        mode: 'normal_practice' as const,
        sessionId: 'a2',
        version: 1 as const,
      };
      await db.answerAttempts.add(a2Attempt);
      const keep = createPracticeSession(['A1-001', 'A1-030'], defaultPracticeFilters, {
        id: 'keep',
        now: time,
      });
      const mixed = createPracticeSession(['A1-001', 'A1-012'], defaultPracticeFilters, {
        id: 'mixed',
        now: time,
      });
      await db.practiceSessions.bulkPut([keep, mixed]);
      await db.learningDaysBySubject.put({
        subjectId: 'a1',
        date: '2026-10-08',
        answerCount: 240,
        updatedAt: time,
      });
      await db.learningDays.put({
        subjectId: 'a1',
        date: '2026-10-08',
        answerCount: 240,
        updatedAt: time,
      });
      await db.b1Preferences.put({
        key: 'b1-learning-preferences',
        version: 1,
        relevanceFilter: 'all',
        updatedAt: time,
      });
      await db.settings.put({
        key: 'appearance',
        selectedSubject: 'a1',
        theme: 'dark',
        fontSize: 'large',
        reducedMotion: 'system',
        shuffleChoices: true,
        updatedAt: time,
      });
      await db.b1PracticeSessions.put({
        id: 'b1',
        subjectId: 'b1',
        version: 3,
        status: 'in_progress',
        caseId: 'case',
        unitIds: ['unit'],
        answers: {},
        selfGrades: {},
        reviewQuestionIds: [],
        currentIndex: 0,
        createdAt: time,
        updatedAt: time,
      });
      const protectedTables = [
        db.settings,
        db.b1Preferences,
        db.b1PracticeSessions,
        db.b1AnswerAttempts,
        db.a2DatasetManifests,
        db.a2DatasetArchives,
      ];
      const before = await Promise.all(protectedTables.map((t) => t.toArray()));
      await reconcileA1Dataset(db, createA1Manifest(questions, 'sc-a1-v1'));
      const retained = draft.entries.filter((e) => e.preserve_history).map((e) => e.code);
      const separated = draft.entries.filter((e) => !e.preserve_history).map((e) => e.code);
      expect(retained).toHaveLength(197);
      expect(separated).toHaveLength(43);
      expect(
        (await db.questionProgress.toArray())
          .filter((r) => r.subjectId === 'a1')
          .map((r) => r.code),
      ).toEqual(retained);
      expect(await db.questionProgress.get('A2-001')).toEqual(a2);
      expect((await db.answerAttempts.toArray()).filter((r) => r.subjectId === 'a1')).toHaveLength(
        197,
      );
      const archives = await db.a1DatasetArchives.toArray();
      expect(archives).toHaveLength(1);
      expect(archives[0].changedCodes).toEqual(separated);
      expect(archives[0].previousManifest).toEqual(a1LegacyManifest);
      expect(archives[0].data.progress).toEqual(initial.filter((r) => separated.includes(r.code)));
      expect(archives[0].data.attempts).toHaveLength(43);
      expect(archives[0].data.practiceSessions).toEqual([mixed]);
      expect(await db.practiceSessions.get('keep')).toEqual(keep);
      expect(await db.practiceSessions.get('mixed')).toBeUndefined();
      expect((await db.learningDays.get('2026-10-08'))?.answerCount).toBe(197);
      expect(await Promise.all(protectedTables.map((t) => t.toArray()))).toEqual(before);
      const all = await Promise.all(db.tables.map((t) => t.toArray()));
      await reconcileA1Dataset(db, createA1Manifest(questions, 'sc-a1-v1'));
      expect(await Promise.all(db.tables.map((t) => t.toArray()))).toEqual(all);
    },
  );
  it('正式fingerprintは全同一性を含み、解説と記憶文の編集では不変', () => {
    const original = createQuestionFingerprint(questions);
    expect(original).toMatch(/^sha256:v1:/);
    expect(
      createQuestionFingerprint(
        questions.map((q) => ({ ...q, explanation: '更新', memoryPoint: '更新' })),
      ),
    ).toBe(original);
    expect(
      createQuestionFingerprint(
        questions.map((q, i) => (i ? q : { ...q, sourceId: 'new-source' })),
      ),
    ).not.toBe(original);
  });
});
