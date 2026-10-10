import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.doUnmock('../../data/sc-b-v1-release-gate.json');
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadWithApproval(approved: boolean) {
  vi.resetModules();
  for (const name of ['VITE_SC_B_LEGACY', 'VITE_SC_B_PILOT', 'VITE_SC_B_RELEASE_CANDIDATE'])
    vi.stubEnv(name, '');
  vi.doMock('../../data/sc-b-v1-release-gate.json', () => ({ default: { approved } }));
  return import('../data/b1');
}

describe('SC B production教材接続', () => {
  it('未承認なら候補をproduction教材に接続しない', async () => {
    const data = await loadWithApproval(false);
    expect(data.isScBRelease).toBe(false);
    expect(data.b1Cases).toHaveLength(27);
    expect(data.b1Cases.every((c) => c.source.exam === 'ネットワークスペシャリスト')).toBe(true);
  });
  it('承認後は候補フラグなしで20大問を接続し，旧NW正本を保持する', async () => {
    const data = await loadWithApproval(true);
    expect(data.isScBRelease).toBe(true);
    expect(data.b1Cases).toHaveLength(20);
    expect(data.b1QuestionUnits).toHaveLength(181);
    expect(data.b1QuestionUnits.flatMap((u) => u.answerFields)).toHaveLength(292);
    expect(data.b1Cases.every((c) => c.dataset_version === 'sc-b-v1')).toBe(true);
    expect(data.nwB1Cases).toHaveLength(27);
    expect(data.getB1Case(data.nwB1Cases[0].caseId)).toBeUndefined();
    const support = await import('../data/b1LearningSupport');
    expect(support.getB1LearningSupportCatalog().a2Remediations.every((r) => r.reviewStatus === 'completed')).toBe(true);
  });
});
