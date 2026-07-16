import { describe, expect, it } from 'vitest';
import {
  categories,
  getCategoryById,
  getDomainForQuestion,
  getQuestionsInSet,
  questions,
} from './catalog';

describe('問題データカタログ', () => {
  it('240問を文字列IDとして読み込める', () => {
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
    expect(categories).toHaveLength(15);
  });

  it('固定模試1・2を各30問参照できる', () => {
    expect(getQuestionsInSet('mock_exam_1')).toHaveLength(30);
    expect(getQuestionsInSet('mock_exam_2')).toHaveLength(30);
  });
});
