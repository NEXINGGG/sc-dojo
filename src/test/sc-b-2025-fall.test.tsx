import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => vi.stubEnv('VITE_SC_B_PILOT', '1'));
import { render, screen, cleanup } from '@testing-library/react';
import payload from '../../data/sc-b-pilot-2025-fall.json';
import { b1Cases, b1Categories, nwB1Cases } from '../data/b1';
import { getSubjectCatalog } from '../data/catalog';
import { calculateB1ContentHash, b1DocumentId } from '../domain/b1Identity';
import { validateScBDataset } from '../domain/b1DatasetValidation';
import { B1CaseBody } from '../features/b1/B1CaseBody';
import { B1AnswerForm } from '../features/b1/B1AnswerForm';
import { toB1AnswerInputUnit } from '../features/b1/b1AnswerInput';
import { createDatabase, initializeDatabase } from '../database/database';
import { B1Repository } from '../features/b1/b1Repository';
import { B1LearningSupportRepository } from '../features/b1/b1LearningSupportRepository';

afterEach(cleanup);
describe('IPA SC 2025秋期4問pilot', () => {
  it('原本4問、全枝番33設問・68欄・42図表を読み込み、既存教材を保持する', () => {
    expect(b1Cases.map((c) => c.questionNumber)).toEqual([1, 2, 3, 4]);
    expect(b1Cases.map((c) => c.questionUnits.length)).toEqual([10, 9, 8, 6]);
    expect(b1Cases.flatMap((c) => c.questionUnits).flatMap((u) => u.answerFields)).toHaveLength(68);
    expect(b1Cases.flatMap((c) => c.body.materials ?? [])).toHaveLength(42);
    expect(nwB1Cases).toHaveLength(27);
    for (const id of ['a1', 'a2'] as const)
      expect(getSubjectCatalog(id).questions).toHaveLength(240);
    expect(
      validateScBDataset(
        b1Cases,
        new Set(getSubjectCatalog('a2').questions.map((q) => q.code)),
        new Set(b1Categories.map((c) => c.categoryId)),
      ),
    ).toEqual([]);
    b1Cases.forEach((item, i) =>
      expect(calculateB1ContentHash(item)).toBe(payload.cases[i].content_hash),
    );
    expect(b1Cases[2].questionUnits[1].label).toBe('設問1(2)');
    expect(
      b1Cases[2].questionUnits[1].answerFields.map((f) => [
        f.fieldId,
        f.maxLength,
        f.officialAnswer,
      ]),
    ).toEqual([
      ['b', 5, 'DoH'],
      ['c', 5, 'TLS'],
    ]);
  });
  it('原文の図表挿入順・下線・抜出しコードを保持し、変更をhashで検出する', () => {
    const item = b1Cases[0];
    render(<B1CaseBody caseItem={item} unit={item.questionUnits[0]} />);
    const p5 = document.getElementById(`body-${item.caseId}-p-5`)!;
    const table = document.getElementById(`body-${item.caseId}-table-1`)!;
    const p6 = document.getElementById(`body-${item.caseId}-p-6`)!;
    expect(p5.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(table.compareDocumentPosition(p6) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('u[data-underline="①"]')).toHaveTextContent('工夫');
    expect(document.querySelector('pre')).toHaveTextContent(
      "Content-Security-Policy: default-src 'self';",
    );
    const changed = structuredClone(item);
    changed.body.materials![1].text += '変更';
    expect(calculateB1ContentHash(changed)).not.toBe(calculateB1ContentHash(item));
    const aid = structuredClone(item);
    aid.questionUnits[0].explanation!.reasoning += '解説改訂';
    expect(calculateB1ContentHash(aid)).toBe(calculateB1ContentHash(item));
    const rows = structuredClone(b1Cases[3]);
    rows.body.materials!.find((m) => m.id === 'table-3')!.rows = [['変更']];
    expect(calculateB1ContentHash(rows)).not.toBe(calculateB1ContentHash(b1Cases[3]));
  });
  it('模試入力モデルに解答・根拠候補・解説を渡さず、提出後だけ解説と手順を表示する', () => {
    const unit = b1Cases[0].questionUnits[5];
    const input = toB1AnswerInputUnit(unit);
    expect(input).not.toHaveProperty('explanation');
    expect(input).not.toHaveProperty('evidenceRefs');
    expect(input).not.toHaveProperty('guidance');
    const props = { unit: input, values: {}, onChange: vi.fn() };
    const { rerender } = render(<B1AnswerForm {...props} />);
    expect(screen.queryByRole('heading', { name: '学習用解説' })).toBeNull();
    rerender(<B1AnswerForm {...props} revealReference referenceUnit={unit} />);
    expect(screen.getByRole('heading', { name: '学習用解説' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '答えの作り方' })).toBeVisible();
    expect(screen.getByText(/CSPを無効化した/)).toBeVisible();
  });
  it.each([
    [0, 1],
    [0, 2],
    [1, 3],
  ])('実問%d＋%dの150分模試で全答案・根拠・見直し・再開・提出を保存する', async (first, second) => {
    const db = createDatabase(`sc-b-real-${crypto.randomUUID()}`);
    try {
      await initializeDatabase(db);
      const repository = new B1Repository(db);
      const support = new B1LearningSupportRepository(db);
      const cases = [b1Cases[first], b1Cases[second]];
      const mock = await repository.createMock(
        2025,
        cases.map((c) => c.caseId),
      );
      expect(mock.unitIds).toHaveLength(cases.reduce((n, c) => n + c.questionUnits.length, 0));
      expect(new Date(mock.deadlineAt).getTime() - new Date(mock.startedAt).getTime()).toBe(
        9_000_000,
      );
      const unit = cases[0].questionUnits[0];
      mock.answers[unit.questionId] = Object.fromEntries(
        unit.answerFields.map((f) => [f.fieldId, '自分の答案']),
      );
      mock.reviewQuestionIds = [unit.questionId];
      await repository.saveMock(mock);
      await support.saveLearnerEvidence({
        sessionId: mock.id,
        questionId: unit.questionId,
        evidenceId: 'p-2',
        sourceType: 'paragraph',
        printedPage: cases[0].body.sections![0].paragraphs[1].printedPage,
        location: 'p-2',
        note: '本文の条件を答案へ対応付けた',
      });
      expect((await repository.getMock(mock.id))!.answers).toEqual(mock.answers);
      expect((await support.listLearnerEvidenceBySession(mock.id))[0].evidenceId).toBe('p-2');
      const submitted = await repository.submitMock(mock.id, 'manual');
      expect(submitted.status).toBe('submitted');
      expect(submitted.answers).toEqual(mock.answers);
      expect(submitted.reviewQuestionIds).toEqual(mock.reviewQuestionIds);
      expect(b1DocumentId(cases[0])).not.toBe(
        b1DocumentId(nwB1Cases.find((c) => c.year === 2025)!),
      );
    } finally {
      await db.delete();
    }
  });
});
