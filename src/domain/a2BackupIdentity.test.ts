import { describe, expect, it } from 'vitest';
import { questions } from '../data/catalog';
import { createBackupDocument, createQuestionDataIdentity, validateBackupDocument } from './backup';
import type { Question } from '../types/question';

const time = '2026-10-07T00:00:00.000Z';
const a1 = questions[0];
const a2: Question = {
  ...a1,
  subjectId: 'a2',
  id: '1001',
  code: 'A2-001',
  sourceId: 'SC-2025-FALL-Q01',
  contentHash: `sha256:${'a'.repeat(64)}`,
  datasetVersion: 'sc-a2-v1',
};
function backup(includeManifest: boolean) {
  const identity = createQuestionDataIdentity([a1, a2], 1);
  if (!includeManifest) delete identity.a2Manifest;
  return createBackupDocument({
    exportedAt: time,
    appVersion: '0.6.0',
    databaseSchemaVersion: 13,
    questionData: identity,
    answerHistory: [a1, a2].map((q, i) => ({
      id: i + 1,
      subjectId: q.subjectId,
      code: q.code,
      selectedChoice: q.correctChoice,
      correctChoice: q.correctChoice,
      isCorrect: true,
      answeredAt: time,
      mode: 'normal_practice',
      sessionId: `session${i}`,
      version: 1,
    })),
    favorites: [{ subjectId: 'a2', code: a2.code }],
    normalPracticeSessions: [],
    normalPracticeResults: [],
    mockExamSessions: [],
    mockExamResults: [],
    learningDays: [],
    settings: [],
  });
}
describe('旧A-2バックアップの取り違え防止', () => {
  it('manifestがない旧バックアップではA-2のみ除外し，A-1を保持する', () => {
    const result = validateBackupDocument(
      backup(false),
      [a1, a2],
      createQuestionDataIdentity([a1, a2], 1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.document.data.answerHistory.map((q) => q.code)).toEqual([a1.code]);
    expect(result.value.document.data.favorites).toEqual([]);
    expect(result.warnings.join('')).toContain('旧A-2');
  });
  it('source_idとhashが一致すれば教材版が更新されても復元する', () => {
    const result = validateBackupDocument(
      backup(true),
      [a1, { ...a2, datasetVersion: 'sc-a2-v2' }],
      createQuestionDataIdentity([a1, { ...a2, datasetVersion: 'sc-a2-v2' }], 1),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.document.data.answerHistory).toHaveLength(2);
  });
  it('同じcodeでsource_id又はhashが異なる問題の履歴を復元しない', () => {
    for (const q of [
      { ...a2, sourceId: 'SC-2024-FALL-Q01' },
      { ...a2, contentHash: `sha256:${'b'.repeat(64)}` },
    ]) {
      const result = validateBackupDocument(
        backup(true),
        [a1, q],
        createQuestionDataIdentity([a1, q], 1),
      );
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.value.document.data.answerHistory.map((q) => q.code)).toEqual([a1.code]);
    }
  });
  it('不正manifestは復元前にファイル全体を拒否する', () => {
    const doc = backup(true);
    doc.questionData.a2Manifest!.entries[0].contentHash = 'invalid';
    expect(validateBackupDocument(doc, [a1, a2], createQuestionDataIdentity([a1, a2], 1)).ok).toBe(
      false,
    );
  });
});
