import type { B1Case, B1RelevanceLabel } from '../data/b1';
import { getEffectiveB1Relevance } from '../data/b1';
import type { B1MockType, B1RelevanceFilter } from './b1LearningSupport';

export function matchesB1RelevanceFilter(caseItem: B1Case, filter: B1RelevanceFilter): boolean {
  return caseItem.questionUnits.some((unit) => {
    const relevance = getEffectiveB1Relevance(caseItem.caseId, unit.questionId);
    return relevance !== undefined && filter[relevance.label];
  });
}

export function getB1CaseRelevanceLabels(caseItem: B1Case): readonly B1RelevanceLabel[] {
  return [
    ...new Set(
      caseItem.questionUnits.flatMap((unit) => {
        const relevance = getEffectiveB1Relevance(caseItem.caseId, unit.questionId);
        return relevance === undefined ? [] : [relevance.label];
      }),
    ),
  ];
}

export function filterB1CasesForMock(
  cases: readonly B1Case[],
  mockType: B1MockType,
): readonly B1Case[] {
  if (mockType === 'official_year' || mockType === 'all_years') return cases;
  const wanted =
    mockType === 'current_focus'
      ? new Set<B1RelevanceLabel>(['current_core', 'modern_successor'])
      : new Set<B1RelevanceLabel>(['historical_context', 'low_current_priority']);
  return cases.filter((caseItem) =>
    getB1CaseRelevanceLabels(caseItem).some((label) => wanted.has(label)),
  );
}

export function relevanceLabelText(label: B1RelevanceLabel): string {
  return {
    current_core: '現在も重要',
    modern_successor: '現在は発展形が主流',
    historical_context: '歴史的理解用',
    low_current_priority: '現在の試験では優先度低',
  }[label];
}
