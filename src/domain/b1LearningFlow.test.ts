import { describe, expect, it } from 'vitest';
import { b1Cases } from '../data/b1';
import { filterB1CasesForMock, matchesB1RelevanceFilter } from './b1LearningFlow';

describe('B-1 Phase 3 learning selection', () => {
  it('uses current relevance labels by default and retains historical labels for the legacy mock', () => {
    const defaultCases = b1Cases.filter((caseItem) =>
      matchesB1RelevanceFilter(caseItem, {
        current_core: true,
        modern_successor: true,
        historical_context: false,
        low_current_priority: false,
      }),
    );
    expect(defaultCases.length).toBeGreaterThan(0);
    expect(filterB1CasesForMock(b1Cases, 'legacy_reading').length).toBeGreaterThan(0);
    expect(filterB1CasesForMock(b1Cases, 'all_years')).toHaveLength(b1Cases.length);
  });
});
