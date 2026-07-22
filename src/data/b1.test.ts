import { describe, expect, it } from 'vitest';
import {
  b1Cases,
  b1QuestionUnits,
  getB1Case,
  getB1CasesForYear,
  getB1CategoryName,
} from './b1';

describe('B-1 official PDF reference data', () => {
  it('loads 9 cases and 83 answer units without embedding official question text', () => {
    expect(b1Cases).toHaveLength(9);
    expect(b1QuestionUnits).toHaveLength(83);
    expect(getB1CasesForYear(2025)).toHaveLength(3);
    expect(getB1Case('B1-2025-Q1')).toMatchObject({
      source: { questionPdfUrl: expect.stringMatching(/^https:\/\//) },
    });

    for (const unit of b1QuestionUnits) {
      const pages = Array.isArray(unit.sourcePromptLocator.printedPage)
        ? unit.sourcePromptLocator.printedPage
        : [unit.sourcePromptLocator.printedPage];
      expect(pages.every((page) => page > 0)).toBe(true);
      expect('prompt' in unit).toBe(false);
      expect('question' in unit).toBe(false);
    }
    for (const caseItem of b1Cases) {
      expect(caseItem.categoryIds.every((categoryId) => getB1CategoryName(categoryId) !== categoryId)).toBe(
        true,
      );
    }
  });
});
