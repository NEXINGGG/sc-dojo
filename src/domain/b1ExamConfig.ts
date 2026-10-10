import type { B1Case } from '../data/b1';

export const scBExamConfig = {
  ruleId: 'sc-b-2026',
  presentedCount: 4,
  selectedCount: 2,
  durationSeconds: 150 * 60,
} as const;
export const nwBExamConfig = {
  ruleId: 'legacy-nw-b1',
  presentedCount: 3,
  selectedCount: 2,
  durationSeconds: 90 * 60,
} as const;
export function getB1ExamConfig(cases: readonly B1Case[]) {
  return cases[0]?.examCode === 'SC' ? scBExamConfig : nwBExamConfig;
}

export function toggleB1CaseSelection(
  selected: readonly string[],
  id: string,
): { selected: string[]; message?: string } {
  if (selected.includes(id)) return { selected: selected.filter((value) => value !== id) };
  if (selected.length >= scBExamConfig.selectedCount)
    return {
      selected: [...selected],
      message: '2問を選択済みです。先に選択した問題を解除してください。',
    };
  return { selected: [...selected, id] };
}
