import { describe, expect, it } from 'vitest';
import categoriesPayload from '../../data/categories.json';
import questionsPayload from '../../data/questions.json';
import { validateData } from '../../scripts/validate-data.mjs';

describe('Node.js問題データ検証', () => {
  it('本番の240問データを検証できる', () => {
    expect(validateData(questionsPayload, categoriesPayload)).toEqual([]);
  });
});
