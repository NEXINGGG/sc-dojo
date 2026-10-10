import { describe, expect, it } from 'vitest';
import { getSubjectCatalog } from '../data/catalog';
import { createBackupDocument, createQuestionDataIdentity, validateBackupDocument } from './backup';

const questions = [...getSubjectCatalog('a1').questions, getSubjectCatalog('a2').questions[0]];
const time = '2026-10-08T00:00:00.000Z';
function backup(legacy = false) {
  const identity = createQuestionDataIdentity(questions, 1);
  if (legacy) delete identity.a1Manifest;
  return createBackupDocument({
    exportedAt: time,
    appVersion: '0.6.0',
    databaseSchemaVersion: 14,
    questionData: identity,
    answerHistory: [questions[0], questions[1], questions.at(-1)!].map((q, i) => ({
      id: i + 1,
      subjectId: q.subjectId,
      code: q.code,
      selectedChoice: q.correctChoice,
      correctChoice: q.correctChoice,
      isCorrect: true,
      answeredAt: time,
      mode: 'normal_practice',
      sessionId: `s${i}`,
      version: 1,
    })),
    favorites: [],
    normalPracticeSessions: [],
    normalPracticeResults: [],
    mockExamSessions: [],
    mockExamResults: [],
    learningDays: [],
    settings: [],
  });
}
describe('A-1バックアップの同一性保護', () => {
  it.each([true, false])('legacy=%s: 改変された同じcodeを除外しKEEPとA-2は復元する', (legacy) => {
    const changed = [
      { ...questions[0], question: '別問題', datasetVersion: 'sc-a1-v1' },
      ...questions.slice(1),
    ];
    const result = validateBackupDocument(
      backup(legacy),
      changed,
      createQuestionDataIdentity(changed, 1),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.document.data.answerHistory.map((r) => r.code)).toEqual([
        'A1-002',
        'A2-001',
      ]);
      expect(result.warnings.join('')).toContain('旧A-1');
    }
  });
  it('旧バックアップでも解説・記憶文・版だけの変更は復元する', () => {
    const changed = questions.map((q) =>
      q.subjectId === 'a1'
        ? { ...q, explanation: '補足', memoryPoint: '記憶文', datasetVersion: 'sc-a1-v1' }
        : q,
    );
    const result = validateBackupDocument(
      backup(true),
      changed,
      createQuestionDataIdentity(changed, 1),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.document.data.answerHistory).toHaveLength(3);
  });
  it('不正hash・重複codeのmanifestを復元前に拒否する', () => {
    for (const corrupt of ['hash', 'duplicate']) {
      const doc = backup();
      if (corrupt === 'hash') doc.questionData.a1Manifest!.entries[0].contentHash = 'bad';
      else doc.questionData.a1Manifest!.entries.push(doc.questionData.a1Manifest!.entries[0]);
      expect(
        validateBackupDocument(doc, questions, createQuestionDataIdentity(questions, 1)).ok,
      ).toBe(false);
    }
  });
});
