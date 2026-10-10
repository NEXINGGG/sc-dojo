import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type A1DojoDatabase } from './database';
import { reconcileA1Dataset } from './a1DatasetMigration';
import { getSubjectCatalog } from '../data/catalog';
import { a1LegacyManifest, createA1Manifest } from '../domain/questionManifest';
import type { QuestionProgressRow } from './types';
import type { Question } from '../types/question';
import { createPracticeSession, defaultPracticeFilters } from '../domain/practice';
import { createPracticeResult } from '../domain/learning';
import { createExamSession } from '../domain/exam';

const time = '2026-10-08T00:00:00.000Z';
const questions = getSubjectCatalog('a1').questions;
const currentManifest = () => createA1Manifest(questions, getSubjectCatalog('a1').datasetVersion);
let database: A1DojoDatabase;
afterEach(async () => {
  if (database) await database.delete();
});
const progress = (code: string): QuestionProgressRow => ({
  subjectId: code.startsWith('A1') ? 'a1' : 'a2',
  code,
  attemptCount: 1,
  correctCount: 1,
  incorrectCount: 0,
  favorite: true,
  updatedAt: time,
});
async function seed() {
  database = createDatabase(`a1-migration-${crypto.randomUUID()}`);
  // Synthetic edit tests compare against their seeded current catalog. The real
  // legacy→candidate migration is exercised separately across all 240 codes.
  await database.a1DatasetManifests.put(currentManifest());
  await database.questionProgress.bulkPut([
    progress('A1-001'),
    progress('A1-002'),
    progress('A2-001'),
  ]);
  await database.answerAttempts.bulkAdd(
    ['A1-001', 'A1-002'].map((code) => ({
      subjectId: 'a1' as const,
      code,
      selectedChoice: 'A' as const,
      correctChoice: 'A' as const,
      isCorrect: true,
      answeredAt: time,
      mode: 'normal_practice' as const,
      sessionId: code,
      version: 1 as const,
    })),
  );
  const day = { subjectId: 'a1' as const, date: '2026-10-08', answerCount: 2, updatedAt: time };
  await database.learningDaysBySubject.put(day);
  await database.learningDays.put(day);
  await database.b1Preferences.put({
    key: 'b1-learning-preferences',
    version: 1,
    relevanceFilter: 'all',
    updatedAt: time,
  });
  await database.b1PracticeSessions.put({
    id: 'b1-history',
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
  await database.b1AnswerAttempts.put({
    id: 'b1-answer',
    version: 1,
    sessionId: 'b1-history',
    questionId: 'question',
    attemptNumber: 1,
    answers: {},
    characterCount: 0,
    failureCauseIds: [],
    createdAt: time,
    updatedAt: time,
  });
}

describe('A-1の内容同一性と履歴保護', () => {
  it.each(['KEEP', 'explanation', 'memoryPoint', 'categoryId'] as const)(
    '%sのみの更新なら既存履歴を全て維持する',
    async (field) => {
      await seed();
      const changed = structuredClone(questions[0]);
      if (field !== 'KEEP') changed[field] += '更新';
      await reconcileA1Dataset(
        database,
        createA1Manifest([changed, ...questions.slice(1)], 'sc-a1-v1'),
      );
      expect(await database.questionProgress.get('A1-001')).toEqual(progress('A1-001'));
      expect(await database.answerAttempts.count()).toBe(2);
      expect(await database.a1DatasetArchives.count()).toBe(0);
    },
  );

  const edits: Array<[string, (q: Question) => void]> = [
    [
      '本文',
      (q) => {
        q.question += '変更';
      },
    ],
    [
      '選択肢',
      (q) => {
        q.choices = q.choices.map((c, i) => (i === 0 ? { ...c, text: c.text + '変更' } : c));
      },
    ],
    [
      '正解',
      (q) => {
        q.correctChoice = q.correctChoice === 'A' ? 'B' : 'A';
      },
    ],
    [
      '回答に必要な図表',
      (q) => {
        q.stimulus = [{ type: 'table', headers: ['条件'], rows: [['変更']] }];
      },
    ],
    [
      'REPLACEのsource_id',
      (q) => {
        q.sourceId = 'IPA-KOUDO-AM1-2024-SPRING-Q01';
      },
    ],
  ];
  it.each(edits)(
    '%s変更は古いhashが残っていても当該問題だけ分離し，2回目は結果不変',
    async (_, edit) => {
      await seed();
      const changed = structuredClone(questions[0]);
      edit(changed);
      const manifest = createA1Manifest([changed, ...questions.slice(1)], 'sc-a1-v1');
      await reconcileA1Dataset(database, manifest);
      expect(await database.questionProgress.get('A1-001')).toBeUndefined();
      expect(await database.questionProgress.get('A1-002')).toEqual(progress('A1-002'));
      expect(await database.questionProgress.get('A2-001')).toEqual(progress('A2-001'));
      expect(await database.b1Preferences.get('b1-learning-preferences')).toBeDefined();
      expect(await database.b1PracticeSessions.get('b1-history')).toMatchObject({
        id: 'b1-history',
        updatedAt: time,
      });
      expect(await database.b1AnswerAttempts.get('b1-answer')).toMatchObject({
        id: 'b1-answer',
        attemptNumber: 1,
        updatedAt: time,
      });
      expect((await database.answerAttempts.toArray()).map((r) => r.code)).toEqual(['A1-002']);
      expect((await database.learningDays.get('2026-10-08'))?.answerCount).toBe(1);
      expect((await database.learningDaysBySubject.get(['a1', '2026-10-08']))?.answerCount).toBe(1);
      const archives = await database.a1DatasetArchives.toArray();
      expect(archives[0].data.progress).toEqual([progress('A1-001')]);
      expect(archives[0].data.attempts[0].code).toBe('A1-001');
      await reconcileA1Dataset(database, manifest);
      expect(await database.a1DatasetArchives.toArray()).toEqual(archives);
      expect(await database.answerAttempts.count()).toBe(1);
    },
  );

  it('初回は凍結baselineで照合し，manifestを記録する。正式版へ直接更新しても15問だけ分離する', async () => {
    database = createDatabase(`a1-migration-${crypto.randomUUID()}`);
    await database.questionProgress.bulkPut(questions.map((q) => progress(q.code)));
    const replacementCodes = new Set(
      [
        '007',
        '144',
        '181',
        '191',
        '197',
        '198',
        '202',
        '205',
        '207',
        '210',
        '229',
        '232',
        '236',
        '237',
        '239',
      ].map((id) => `A1-${id}`),
    );
    await reconcileA1Dataset(database, {
      ...a1LegacyManifest,
      datasetVersion: 'sc-a1-v1',
      entries: a1LegacyManifest.entries.map((entry) =>
        replacementCodes.has(entry.code)
          ? { ...entry, sourceId: `NEW-${entry.code}`, contentHash: 'changed' }
          : entry,
      ),
    });
    expect(await database.questionProgress.count()).toBe(225);
    const archived = (await database.a1DatasetArchives.toArray())[0];
    expect(new Set(archived.changedCodes)).toEqual(replacementCodes);
    expect(archived.data.progress).toHaveLength(15);
  });

  it('同じ教材の初期化・並行再実行は退避せずmanifestだけ記録する', async () => {
    await seed();
    await Promise.all([reconcileA1Dataset(database), reconcileA1Dataset(database)]);
    expect(await database.a1DatasetManifests.get('a1')).toEqual(currentManifest());
    expect(await database.a1DatasetArchives.count()).toBe(0);
  });

  it('退避に失敗すると履歴・manifest・日別件数を全てロールバックする', async () => {
    await seed();
    database.a1DatasetArchives.hook('creating', () => {
      throw new Error('保存失敗');
    });
    const changed = { ...questions[0], question: '差替え' };
    await expect(
      reconcileA1Dataset(database, createA1Manifest([changed, ...questions.slice(1)], 'sc-a1-v1')),
    ).rejects.toThrow('保存失敗');
    expect(await database.questionProgress.get('A1-001')).toEqual(progress('A1-001'));
    expect(await database.a1DatasetManifests.get('a1')).toEqual(currentManifest());
    expect(await database.answerAttempts.count()).toBe(2);
    expect((await database.learningDays.get('2026-10-08'))?.answerCount).toBe(2);
  });

  it('変更問題を含む途中演習・模試は丸ごと退避し，KEEPだけの演習と他科目は残す', async () => {
    await seed();
    const mixed = createPracticeSession(['A1-001', 'A1-002'], defaultPracticeFilters, {
      id: 'mixed',
      now: time,
    });
    const keep = createPracticeSession(['A1-002'], defaultPracticeFilters, {
      id: 'keep',
      now: time,
    });
    const a2 = createPracticeSession(['A2-001'], defaultPracticeFilters, {
      id: 'a2',
      now: time,
      subjectId: 'a2',
    });
    const exam = createExamSession(
      'random',
      questions.slice(0, 30).map((q) => q.code),
      { id: 'exam', now: time },
    );
    await database.practiceSessions.bulkPut([mixed, keep, a2]);
    await database.practiceResults.put(createPracticeResult(mixed, time));
    await database.examSessions.put(exam);
    await database.cloudSyncMetadata.put({
      scope: 'a1.question',
      itemKey: 'A1-001',
      clientUpdatedAt: time,
      deviceId: 'test',
      isDeleted: false,
    });
    await reconcileA1Dataset(
      database,
      createA1Manifest(
        [{ ...questions[0], question: '別問題' }, ...questions.slice(1)],
        'sc-a1-v1',
      ),
    );
    expect((await database.practiceSessions.toArray()).map((r) => r.id)).toEqual(['a2', 'keep']);
    expect(await database.examSessions.count()).toBe(0);
    expect(await database.practiceResults.count()).toBe(0);
    expect(await database.cloudSyncMetadata.count()).toBe(0);
    const archive = (await database.a1DatasetArchives.toArray())[0];
    expect(archive.data.practiceSessions).toEqual([mixed]);
    expect(archive.data.practiceResults).toHaveLength(1);
    expect(archive.data.examSessions).toEqual([exam]);
    expect(archive.data.syncMetadata).toHaveLength(1);
    expect(await database.questionProgress.get('A1-002')).toEqual(progress('A1-002'));
  });
});
