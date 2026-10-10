import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  categories,
  getCategoryById,
  getDomainForQuestion,
  getQuestionsInSet,
  getSubjectCatalog,
  questions,
} from './catalog';

describe('問題データカタログ', () => {
  it('240問を文字列IDとして読み込める', () => {
    if (process.env.SC_A1_CANDIDATE === '1') {
      expect(getSubjectCatalog('a1').datasetVersion).toBe('sc-a1-v1');
      expect(questions.find((q) => q.code === 'A1-007')?.sourceId).toBe(
        'IPA-KOUDO-AM1-2024-SPRING-Q01',
      );
    }
    expect(questions).toHaveLength(240);
    expect(questions[0]).toMatchObject({
      id: '1',
      code: 'A1-001',
    });
    expect(new Set(questions.map((question) => question.id)).size).toBe(240);
  });

  it('問題からカテゴリと問題単位の系統を参照できる', () => {
    const question = questions.find((item) => item.categoryId === 'law_standards_emerging');

    expect(question).toBeDefined();
    expect(getCategoryById(question?.categoryId ?? '')).toBeDefined();
    expect(getDomainForQuestion(question ?? questions[0])).toBeDefined();
    expect(categories).toHaveLength(17);
  });

  it('固定模試1・2を各30問参照できる', () => {
    expect(getQuestionsInSet('mock_exam_1')).toHaveLength(30);
    expect(getQuestionsInSet('mock_exam_2')).toHaveLength(30);
  });

  it('loads A-2 questions and both fixed exam sets separately', () => {
    const a2 = getSubjectCatalog('a2');

    expect(a2.questions).toHaveLength(240);
    expect(a2.questions[0]).toMatchObject({ id: '1001', code: 'A2-001', subjectId: 'a2' });
    expect(a2.getQuestionsInSet('mock_exam_1')).toHaveLength(25);
    expect(a2.getQuestionsInSet('mock_exam_2')).toHaveLength(25);
  });
  it('SC固定模試を監査済み出題順で返し，A-1の既存順を保持する', () => {
    const inventory = JSON.parse(readFileSync('data/sc-a2-past-question-inventory.json', 'utf8')) as {
      questions: Array<{ source_id: string; adoption_status: string; assignment: string | null; mock_sequence?: number }>;
    };
    for (const n of [1, 2]) {
      const expected = inventory.questions
        .filter((q) => q.adoption_status === 'selected' && q.assignment === `mock${n}`)
        .sort((a, b) => (a.mock_sequence ?? 0) - (b.mock_sequence ?? 0))
        .map((q) => q.source_id);
      expect(getQuestionsInSet(`mock_exam_${n}`, 'a2').map((q) => q.sourceId)).toEqual(expected);
      const a1Plan = JSON.parse(readFileSync('data/sc-a1-source-code-map-draft.json', 'utf8')) as {
        summary: { assignments: Record<string, { codes: string[] }> };
      };
      if (getSubjectCatalog('a1').datasetVersion === 'sc-a1-v1') {
        expect(getQuestionsInSet(`mock_exam_${n}`, 'a1').map((q) => q.code)).toEqual(a1Plan.summary.assignments[`mock${n}`].codes);
      } else {
        expect(getQuestionsInSet(`mock_exam_${n}`, 'a1').map((q) => q.code)).toEqual(questions.filter((q) => q.questionSet.id === `mock_exam_${n}`).map((q) => q.code));
      }
    }
  });
});
