import { describe, expect, it } from 'vitest';
import pilot from '../../data/sc-a2-pilot-30.json';
import inventory from '../../data/sc-a2-past-question-inventory.json';
import pilotCategories from '../../data/sc-a2-categories-draft.json';
import { validateScA2Pilot } from '../../scripts/validate-sc-a2-pilot.mjs';
import { createCatalog, getSubjectCatalog, type RawQuestionPayload } from '../data/catalog';
import { calculateQuestionContentHash } from '../domain/questionContent.mjs';
import { selectExamQuestionCodes } from '../domain/exam';

describe('SC A-2 pilot 教材', () => {
  it('監査selectedの30問を全10カテゴリ・9年度・図表・出典・公式正解ごと検証する', () => {
    expect(validateScA2Pilot(pilot, inventory, pilotCategories)).toEqual([]);
  });
  it('教材補足を保持して変換し、旧A-2カタログ240問を維持する', () => {
    const catalog = createCatalog('a2', pilot as RawQuestionPayload, pilotCategories);
    expect(catalog.questions).toHaveLength(30);
    expect(catalog.categories).toHaveLength(10);
    for (const [i, q] of catalog.questions.entries()) {
      const raw = pilot.questions[i];
      expect(q).toMatchObject({
        choiceExplanations: raw.choice_explanations,
        examTip: raw.exam_tip,
        relatedTerms: raw.related_terms,
        sourceId: raw.source.source_id,
        contentHash: raw.content_hash,
        datasetVersion: 'sc-a2-pilot-v1',
      });
      expect(calculateQuestionContentHash(q)).toBe(raw.content_hash);
    }
    expect(getSubjectCatalog('a2').questions).toHaveLength(240);
  });
  it('解説・四択解説・見分け方・記憶ポイント・関連用語はhashへ含めない', () => {
    const q = pilot.questions[0];
    expect(
      calculateQuestionContentHash({
        ...q,
        explanation: '改訂',
        choice_explanations: { A: '変更', B: '変更', C: '変更', D: '変更' },
        exam_tip: '改訂',
        memory_point: '改訂',
        related_terms: ['変更'],
      }),
    ).toBe(q.content_hash);
    expect(calculateQuestionContentHash({ ...q, question: q.question + '変更' })).not.toBe(
      q.content_hash,
    );
  });
  it('試作カタログから25問のランダム模試を重複なく開始できる', () => {
    const catalog = createCatalog('a2', pilot as RawQuestionPayload, pilotCategories);
    const codes = selectExamQuestionCodes('a2', 'random', catalog.questions);
    expect(new Set(codes).size).toBe(25);
    expect(codes.every((code) => catalog.getQuestionByCode(code) !== undefined)).toBe(true);
  });
  it.each(['choice_explanations', 'exam_tip', 'memory_point'] as const)(
    '必須教材項目%sの欠落を拒否する',
    (field) => {
      const changed = structuredClone(pilot);
      Reflect.deleteProperty(changed.questions[0], field);
      expect(validateScA2Pilot(changed, inventory, pilotCategories).join('\n')).toContain(
        field === 'choice_explanations' ? '選択肢解説' : field,
      );
    },
  );
  it('監査原本と異なる公式正解と、正式codeの試作への混入を拒否する', () => {
    const changed = structuredClone(pilot);
    changed.questions[0].correct_choice = 'A';
    changed.questions[0].source.official_answer = 'ア';
    changed.questions[0].source.official_answer_choice_id = 'A';
    changed.questions[0].code = 'A2-001';
    expect(validateScA2Pilot(changed, inventory, pilotCategories).join('\n')).toContain(
      '公式正解不一致',
    );
    expect(validateScA2Pilot(changed, inventory, pilotCategories).join('\n')).toContain(
      '試作専用code',
    );
  });
});
