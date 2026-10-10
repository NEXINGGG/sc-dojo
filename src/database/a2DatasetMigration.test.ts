import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type A1DojoDatabase } from './database';
import { reconcileA2Dataset } from './a2DatasetMigration';
import type { QuestionDatasetManifest } from '../domain/questionManifest';
import type { QuestionProgressRow } from './types';

let database: A1DojoDatabase;
afterEach(async () => {
  if (database) await database.delete();
});
const current: QuestionDatasetManifest = {
  key: 'a2',
  manifestVersion: 1,
  datasetVersion: 'sc-a2-v1',
  entries: [
    { code: 'A2-001', sourceId: 'SC-2025-FALL-Q01', contentHash: 'hash1' },
    { code: 'A2-002', sourceId: 'SC-2025-FALL-Q02', contentHash: 'hash2' },
  ],
};
const progress = (code: string): QuestionProgressRow => ({
  subjectId: code.startsWith('A1') ? 'a1' : 'a2',
  code,
  attemptCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  favorite: true,
  updatedAt: '2026-10-07T00:00:00.000Z',
});
describe('A-2教材更新の履歴保管', () => {
  it('旧NW A-2を保管して集計から分離し，A-1・科目B・設定を保持する', async () => {
    database = createDatabase(`migration-${crypto.randomUUID()}`);
    await database.questionProgress.bulkPut([progress('A1-001'), progress('A2-001')]);
    await database.b1Preferences.put({
      key: 'b1-learning-preferences',
      version: 1,
      relevanceFilter: 'all',
      updatedAt: '2026-10-07T00:00:00.000Z',
    });
    const b1 = await database.b1Preferences.toArray();
    await reconcileA2Dataset(database, current);
    expect(await database.questionProgress.get('A1-001')).toEqual(progress('A1-001'));
    expect(await database.questionProgress.get('A2-001')).toBeUndefined();
    expect(await database.b1Preferences.toArray()).toEqual(b1);
    const archive = (await database.a2DatasetArchives.toArray())[0];
    expect(archive.previousDatasetVersion).toBe('legacy-nw-a2');
    expect(archive.data.progress).toEqual([progress('A2-001')]);
    await reconcileA2Dataset(database, current);
    expect(await database.a2DatasetArchives.count()).toBe(1);
  });
  it('SC v2では変更された1問だけを保管し，残る問題の履歴を維持する', async () => {
    database = createDatabase(`migration-${crypto.randomUUID()}`);
    await reconcileA2Dataset(database, current);
    await database.questionProgress.bulkPut([progress('A2-001'), progress('A2-002')]);
    await reconcileA2Dataset(database, {
      ...current,
      datasetVersion: 'sc-a2-v2',
      entries: current.entries.map((q, i) => (i === 0 ? { ...q, contentHash: 'newhash' } : q)),
    });
    expect(await database.questionProgress.get('A2-001')).toBeUndefined();
    expect(await database.questionProgress.get('A2-002')).toEqual(progress('A2-002'));
    expect((await database.a2DatasetArchives.toArray())[0].changedCodes).toEqual(['A2-001']);
  });
  it('保管に失敗した場合は履歴も教材manifestも変更しない', async () => {
    database = createDatabase(`migration-${crypto.randomUUID()}`);
    await database.questionProgress.put(progress('A2-001'));
    database.a2DatasetArchives.hook('creating', () => {
      throw new Error('保存失敗');
    });
    await expect(reconcileA2Dataset(database, current)).rejects.toThrow('保存失敗');
    expect(await database.questionProgress.get('A2-001')).toEqual(progress('A2-001'));
    expect(await database.a2DatasetManifests.get('a2')).toBeUndefined();
  });
  it('v2への更新では変更問題の回答と日別件数を分離し，未変更の回答を保持する', async () => {
    database = createDatabase(`migration-${crypto.randomUUID()}`);
    await reconcileA2Dataset(database, current);
    const answeredAt = '2026-10-07T16:00:00.000Z'; // JSTでは10月8日。
    await database.answerAttempts.bulkAdd(
      current.entries.map((q) => ({
        subjectId: 'a2' as const,
        code: q.code,
        selectedChoice: 'A' as const,
        correctChoice: 'A' as const,
        isCorrect: true,
        answeredAt,
        mode: 'normal_practice' as const,
        sessionId: q.code,
        version: 1 as const,
      })),
    );
    await database.learningDaysBySubject.put({
      subjectId: 'a2',
      date: '2026-10-08',
      answerCount: 2,
      updatedAt: answeredAt,
    });
    await reconcileA2Dataset(database, {
      ...current,
      datasetVersion: 'sc-a2-v2',
      entries: [{ ...current.entries[0], contentHash: 'changed' }, current.entries[1]],
    });
    expect((await database.answerAttempts.toArray()).map((r) => r.code)).toEqual(['A2-002']);
    expect((await database.learningDaysBySubject.get(['a2', '2026-10-08']))?.answerCount).toBe(1);
    const archive = (await database.a2DatasetArchives.toArray())[0];
    expect(archive.data.attempts.map((r) => r.code)).toEqual(['A2-001']);
    expect(archive.data.learningDays[0].answerCount).toBe(2);
  });
});
