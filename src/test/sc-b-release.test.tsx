import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.stubEnv('VITE_SC_B_LEGACY', '');
  vi.stubEnv('VITE_SC_B_PILOT', '');
  vi.stubEnv('VITE_SC_B_RELEASE_CANDIDATE', '1');
});
import { render, screen, cleanup } from '@testing-library/react';
import { b1Cases, b1Categories, nwB1Cases } from '../data/b1';
import { getSubjectCatalog } from '../data/catalog';
import { createDatabase, initializeDatabase, type A1DojoDatabase } from '../database/database';
import type { B1PracticeSessionRow } from '../database/types';
import { B1Repository } from '../features/b1/b1Repository';
import { B1PreferencesRepository } from '../features/b1/b1PreferencesRepository';
import { filterScBPracticeCases, type ScBPracticeFilter } from '../domain/scBPractice';
import { b1DocumentId } from '../domain/b1Identity';
import { validateScBDataset } from '../domain/b1DatasetValidation';
import { getB1UnansweredFieldIds } from '../domain/b1Progress';
import { toB1AnswerInputUnit } from '../features/b1/b1AnswerInput';
import { B1AnswerForm } from '../features/b1/B1AnswerForm';
import { parseB1Diagram, serializeB1Diagram } from '../domain/b1Diagram';
import { DataManagementRepository } from '../features/settings/dataManagementRepository';
import { allQuestions } from '../data/catalog';
import { createQuestionDataIdentity, validateBackupDocumentWithB1 } from '../domain/backup';

const databases: A1DojoDatabase[] = [];
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  for (const db of databases.splice(0)) await db.delete();
});
function database() {
  const db = createDatabase(`sc-b-v1-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
const examSets = [...new Set(b1Cases.map((c) => c.examSetId!))];
describe('SC B正式教材候補', () => {
  it('20大問181設問292欄を読み、A-1/A-2とNW正本を保持する', () => {
    expect(b1Cases).toHaveLength(20);
    expect(examSets).toHaveLength(5);
    expect(b1Cases.flatMap((c) => c.questionUnits)).toHaveLength(181);
    expect(b1Cases.flatMap((c) => c.questionUnits.flatMap((u) => u.answerFields))).toHaveLength(
      292,
    );
    expect(b1Cases.every((c) => c.dataset_version === 'sc-b-v1')).toBe(true);
    expect(nwB1Cases).toHaveLength(27);
    expect(
      validateScBDataset(
        b1Cases,
        new Set(getSubjectCatalog('a2').questions.map((q) => q.code)),
        new Set(b1Categories.map((c) => c.categoryId)),
      ),
    ).toEqual([]);
    for (const s of ['a1', 'a2'] as const) expect(getSubjectCatalog(s).questions).toHaveLength(240);
  });
  it.each(examSets)('%sは同一回4問から2問・9000秒、再読込と締切で答案を保つ', async (set) => {
    const db = database();
    const repo = new B1Repository(db);
    const cases = b1Cases.filter((c) => c.examSetId === set);
    const mock = await repo.createMock(
      cases[0].year,
      cases.slice(0, 2).map((c) => c.caseId),
    );
    expect(mock.presentedCaseIds).toEqual(cases.map((c) => c.caseId));
    expect(new Date(mock.deadlineAt).getTime() - new Date(mock.startedAt).getTime()).toBe(
      9_000_000,
    );
    const first = cases[0].questionUnits[0];
    mock.answers[first.questionId] = { [first.answerFields[0].fieldId]: '途中答案' };
    await repo.saveMock(mock);
    expect((await repo.getMock(mock.id))?.answers).toEqual(mock.answers);
    vi.spyOn(Date, 'now').mockReturnValue(new Date(mock.deadlineAt).getTime());
    const expired = await repo.getMock(mock.id);
    expect(expired).toMatchObject({
      status: 'submitted',
      submissionReason: 'timeout',
      answers: mock.answers,
      submittedAt: mock.deadlineAt,
    });
    expect(await repo.submitMock(mock.id, 'manual')).toEqual(expired);
  });
  it('同じ年度でも春秋を混ぜた模試を拒否し、5回のPDFが衝突しない', async () => {
    const repo = new B1Repository(database());
    const spring = b1Cases.find((c) => c.year === 2024 && c.term === 'spring')!;
    const fall = b1Cases.find((c) => c.year === 2024 && c.term === 'fall')!;
    await expect(repo.createMock(2024, [spring.caseId, fall.caseId])).rejects.toThrow();
    expect(
      new Set(examSets.map((s) => b1DocumentId(b1Cases.find((c) => c.examSetId === s)!))).size,
    ).toBe(5);
  });
  it('年度・期・大問・カテゴリ・未実施・苦手・お気に入りで絞れる', () => {
    const empty = new Set<string>();
    const base: ScBPracticeFilter = {
      year: '',
      term: '',
      questionNumber: '',
      categoryId: '',
      state: 'all',
    };
    const target = b1Cases.find(
      (c) => c.year === 2024 && c.term === 'spring' && c.questionNumber === 3,
    )!;
    expect(
      filterScBPracticeCases(
        b1Cases,
        {
          ...base,
          year: '2024',
          term: 'spring',
          questionNumber: '3',
          categoryId: target.primaryCategory!,
        },
        empty,
        empty,
        empty,
      ),
    ).toEqual([target]);
    const marked = new Set([target.caseId]);
    expect(
      filterScBPracticeCases(b1Cases, { ...base, state: 'unstarted' }, marked, empty, empty),
    ).toHaveLength(19);
    for (const state of ['weak', 'favorite'] as const)
      expect(filterScBPracticeCases(b1Cases, { ...base, state }, empty, marked, marked)).toEqual([
        target,
      ]);
  });
  it('お気に入りを再読込し、現在性設定の保存で失わない', async () => {
    const db = database();
    await initializeDatabase(db);
    const repo = new B1PreferencesRepository(db);
    const ids = await repo.toggleFavorite(b1Cases[0].caseId);
    expect(ids).toEqual([b1Cases[0].caseId]);
    await repo.save((await repo.get()).relevanceFilter);
    expect((await new B1PreferencesRepository(db).get()).favoriteCaseIds).toEqual(ids);
    expect(await repo.toggleFavorite(b1Cases[0].caseId)).toEqual([]);
  });
  it('お気に入りのバックアップ・復元と不正形式拒否', async () => {
    const db = database();
    await initializeDatabase(db);
    await new B1PreferencesRepository(db).toggleFavorite(b1Cases[0].caseId);
    const manager = new DataManagementRepository(db);
    const backup = await manager.createBackup();
    const valid = await validateBackupDocumentWithB1(
      backup,
      allQuestions,
      createQuestionDataIdentity(allQuestions, 1),
    );
    expect(valid.ok).toBe(true);
    if (!valid.ok) throw new Error('バックアップ検証');
    await new B1PreferencesRepository(db).toggleFavorite(b1Cases[0].caseId);
    await manager.restore(valid.value);
    expect((await new B1PreferencesRepository(db).get()).favoriteCaseIds).toEqual([
      b1Cases[0].caseId,
    ]);
    const broken = structuredClone(backup);
    Object.assign(broken.data.b1!.preferences![0], { favoriteCaseIds: [123] });
    expect(
      (
        await validateBackupDocumentWithB1(
          broken,
          allQuestions,
          createQuestionDataIdentity(allQuestions, 1),
        )
      ).ok,
    ).toBe(false);
    expect((await new B1PreferencesRepository(db).get()).favoriteCaseIds).toEqual([
      b1Cases[0].caseId,
    ]);
  });
  it('不成立の運用担当者2欄を未回答判定から外し、開発者欄は残す', () => {
    const unit = b1Cases
      .find((c) => c.examSetId === 'SC-2024-SPRING-PM' && c.questionNumber === 4)!
      .questionUnits.find((u) => u.label === '設問2(3)')!;
    expect(unit.answerFields.filter((f) => f.gradingExcluded)).toHaveLength(2);
    expect(getB1UnansweredFieldIds(unit, {})).toHaveLength(2);
  });
  it('図示を保存・再表示し、公式図は回答確定前のモデルに入れない', () => {
    const value = serializeB1Diagram({
      strokes: [[10, 20, 30, 40]],
      note: 'カード情報の入力欄を配置',
    });
    expect(parseB1Diagram(value)).toEqual({
      strokes: [[10, 20, 30, 40]],
      note: 'カード情報の入力欄を配置',
    });
    expect(parseB1Diagram('diagram:v1:{bad')).toEqual({ strokes: [], note: '' });
    const unit = b1Cases
      .find((c) => c.examSetId === 'SC-2024-FALL-PM' && c.questionNumber === 3)!
      .questionUnits.find((u) => u.label === '設問2(1)')!;
    const input = toB1AnswerInputUnit(unit);
    expect(input.answerFields[0]).not.toHaveProperty('officialAnswerAsset');
    const props = { unit: input, values: { 図示: value }, onChange: vi.fn() };
    const { rerender } = render(<B1AnswerForm {...props} />);
    expect(screen.queryByAltText(/公式解答例の図/)).toBeNull();
    rerender(<B1AnswerForm {...props} referenceUnit={unit} revealReference />);
    expect(screen.getAllByAltText(/公式解答例の図/)).toHaveLength(2);
    expect(screen.getByRole('img', { name: '保存した図示答案' })).toBeInTheDocument();
  });
  it('NW履歴を退避して保持し、A-1/A-2履歴を変更しない', async () => {
    const db = database();
    await initializeDatabase(db);
    const old = nwB1Cases[0];
    const now = new Date().toISOString();
    const legacy: B1PracticeSessionRow = {
      id: 'old-nw',
      subjectId: 'b1',
      version: 3,
      status: 'in_progress',
      caseId: old.caseId,
      unitIds: old.questionUnits.map((u) => u.questionId),
      answers: { [old.questionUnits[0].questionId]: { a: 'NW保存答案' } },
      selfGrades: {},
      reviewQuestionIds: [],
      currentIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.b1PracticeSessions.put(legacy);
    for (const subjectId of ['a1', 'a2'] as const)
      await db.questionProgress.put({
        subjectId,
        code: getSubjectCatalog(subjectId).questions[0].code,
        favorite: true,
        attemptCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        updatedAt: now,
      });
    const before = await db.questionProgress.toArray();
    await initializeDatabase(db);
    await initializeDatabase(db);
    expect(await db.b1PracticeSessions.count()).toBe(0);
    expect((await db.b1DatasetArchives.toArray())[0].data.practiceSessions[0].answers).toEqual(
      legacy.answers,
    );
    expect(await db.b1DatasetArchives.count()).toBe(1);
    expect(await db.questionProgress.toArray()).toEqual(before);
  });
});
