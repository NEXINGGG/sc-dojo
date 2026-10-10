import { describe, expect, it } from 'vitest';
import { changedQuestionCodes, type QuestionDatasetManifest } from './questionManifest';

const manifest: QuestionDatasetManifest = {
  key: 'a2',
  manifestVersion: 1,
  datasetVersion: 'sc-a2-v1',
  entries: [
    { code: 'A2-001', sourceId: 'SC-2025-FALL-Q01', contentHash: 'hash1' },
    { code: 'A2-002', sourceId: 'SC-2025-FALL-Q02', contentHash: 'hash2' },
  ],
};
describe('A-2教材の問題別照合', () => {
  it('codeしかない旧NW教材は全問を別問題とする', () => {
    expect([...changedQuestionCodes(undefined, manifest)]).toEqual(['A2-001', 'A2-002']);
  });
  it('教材版の変更だけなら全問の履歴を維持する', () => {
    expect(changedQuestionCodes(manifest, { ...manifest, datasetVersion: 'sc-a2-v2' }).size).toBe(
      0,
    );
  });
  it('出典又は問題内容が変わった問題だけを分離する', () => {
    const current = {
      ...manifest,
      entries: manifest.entries.map((q, i) =>
        i === 0 ? { ...q, sourceId: 'SC-2024-FALL-Q01' } : q,
      ),
    };
    expect([...changedQuestionCodes(manifest, current)]).toEqual(['A2-001']);
    current.entries[0] = { ...manifest.entries[0], contentHash: 'changed' };
    expect([...changedQuestionCodes(manifest, current)]).toEqual(['A2-001']);
  });
  it('削除された問題の履歴も分離する', () => {
    expect([
      ...changedQuestionCodes(manifest, { ...manifest, entries: manifest.entries.slice(1) }),
    ]).toEqual(['A2-001']);
  });
});
