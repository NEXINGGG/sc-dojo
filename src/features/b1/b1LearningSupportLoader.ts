import type { B1LearningSupportCatalog } from '../../data/b1LearningSupport';

/**
 * Keeps Phase 2's 243-entry support catalog out of the A-1/A-2 initial bundles.
 * Phase 3 screens should use this API instead of statically importing the catalog.
 */
export async function loadB1LearningSupport(): Promise<B1LearningSupportCatalog> {
  const support = await import('../../data/b1LearningSupport');
  return support.loadB1LearningSupportCatalog();
}
