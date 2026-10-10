import type { B1Case } from '../data/b1';

export interface ScBPracticeFilter {
  year: string;
  term: string;
  questionNumber: string;
  categoryId: string;
  state: 'all' | 'unstarted' | 'weak' | 'favorite';
}

export function filterScBPracticeCases(
  cases: readonly B1Case[],
  filter: ScBPracticeFilter,
  studied: ReadonlySet<string>,
  weak: ReadonlySet<string>,
  favorites: ReadonlySet<string>,
): readonly B1Case[] {
  return cases.filter(
    (item) =>
      (!filter.year || String(item.year) === filter.year) &&
      (!filter.term || item.term === filter.term) &&
      (!filter.questionNumber || String(item.questionNumber) === filter.questionNumber) &&
      (!filter.categoryId || item.categoryIds.includes(filter.categoryId)) &&
      (filter.state === 'all' ||
        (filter.state === 'unstarted' && !studied.has(item.caseId)) ||
        (filter.state === 'weak' && weak.has(item.caseId)) ||
        (filter.state === 'favorite' && favorites.has(item.caseId))),
  );
}
