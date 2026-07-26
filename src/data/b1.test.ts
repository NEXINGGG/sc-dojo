import { describe, expect, it } from 'vitest';
import {
  b1Cases,
  b1QuestionUnits,
  findB1CasesWithoutRelevance,
  getB1Case,
  getB1CaseRelevance,
  getB1CasesForYear,
  getB1CategoryName,
  getEffectiveB1Relevance,
  isB1RelevanceLabel,
} from './b1';

describe('B-1 official PDF reference data', () => {
  it('loads all 27 cases and 243 official question units without embedding official question text', () => {
    expect(b1Cases).toHaveLength(27);
    expect(b1QuestionUnits).toHaveLength(243);
    expect([2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025]).toEqual(
      [...new Set(b1Cases.map((caseItem) => caseItem.year))].sort((left, right) => left - right),
    );
    expect(getB1CasesForYear(2020)).toHaveLength(0);
    for (const year of [2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025]) {
      expect(getB1CasesForYear(year)).toHaveLength(3);
    }
    expect(getB1CasesForYear(2025)).toHaveLength(3);
    expect(getB1Case('B1-2018-Q1')?.questionUnits.map((unit) => unit.label)).toEqual([
      '設問1(1)',
      '設問1(2)',
      '設問2(1)',
      '設問2(2)',
      '設問3(1)',
      '設問3(2)',
      '設問3(3)',
      '設問3(4)',
      '設問3(5)',
    ]);
    expect(getB1Case('B1-2022-Q3')?.questionUnits.map((unit) => unit.label)).toEqual([
      '設問1(1)',
      '設問1(2)',
      '設問1(3)',
      '設問1(4)',
      '設問2(1)',
      '設問2(2)',
      '設問2(3)',
      '設問3(1)',
      '設問3(2)',
      '設問3(3)',
    ]);
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
      expect(caseItem.source).toMatchObject({
        provider: 'IPA',
        exam: 'ネットワークスペシャリスト',
        sectionAtTime: '午後Ⅰ',
        currentEquivalent: '科目B-1',
        modified: true,
      });
      expect(caseItem.source.questionPdfPagesZeroBased.length).toBeGreaterThan(0);
    }
  });

  it('provides reviewed relevance for every case, including a unit override', () => {
    expect(findB1CasesWithoutRelevance()).toEqual([]);
    expect(getB1CaseRelevance('B1-2025-Q1')?.label).toBe('current_core');
    expect(getEffectiveB1Relevance('B1-2016-Q1', 'B1-2016-Q1-U01')?.label).toBe(
      'historical_context',
    );
    expect(getEffectiveB1Relevance('B1-2016-Q1', 'B1-2016-Q1-U02')?.label).toBe(
      'modern_successor',
    );
  });

  it('rejects unsupported relevance labels', () => {
    expect(isB1RelevanceLabel('current_core')).toBe(true);
    expect(isB1RelevanceLabel('needs_review')).toBe(false);
  });
});
