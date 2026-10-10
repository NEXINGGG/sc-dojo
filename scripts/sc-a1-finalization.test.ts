import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error Node validation module is deliberately shared without runtime TS.
import { validateA1Finalization } from './validate-sc-a1-finalization.mjs';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const draft = read('data/sc-a1-source-code-map-draft.json');
const audit = read('data/sc-a1-audit.json');
const production = read('data/questions.json');
const baseline = read('data/sc-a1-legacy-manifest.json');
describe('A-1正式化構成案', () => {
  it('240件の監査対応・履歴分類・公式出典・模試構成が整合する', () => {
    expect(validateA1Finalization(draft, audit, production, baseline)).toEqual([]);
  });
  it('同じsource_idの重複とREPLACEの履歴引継ぎを検出する', () => {
    const changed = structuredClone(draft);
    changed.entries[0].source_id = changed.entries[1].source_id;
    changed.entries[6].preserve_history = true;
    const errors = validateA1Finalization(changed, audit, production, baseline) as string[];
    expect(errors).toContain('unique source_ids');
    expect(errors).toContain('A1-007 replacement identity');
  });
});
