import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error Shared Node validator has no runtime TypeScript dependency.
import { validateScA1Release } from './validate-sc-a1-release.mjs';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const payload = read('data/sc-a1-v1-candidate.json');
const categories = read('data/categories.json');
const draft = read('data/sc-a1-source-code-map-draft.json');
const audit = read('data/sc-a1-audit.json');
const baseline = read('data/sc-a1-legacy-manifest.json');
const mapping = read('data/sc-a1-source-code-map.json');
const review = read('data/sc-a1-v1-secondary-review.json');
const validate = (p = payload, m = mapping, r = review): string[] =>
  validateScA1Release(p, categories, draft, audit, baseline, m, r);
describe('SC A-1正式候補のリリースゲート', () => {
  it('240問・原本記録・確定構成・197維持/43分離が全件一致する', () =>
    expect(validate()).toEqual([]));
  it('別問題への差替え、監査変更、hash未更新、他科目混入を拒否する', () => {
    const p = structuredClone(payload),
      m = structuredClone(mapping);
    p.questions[6].source.source_id = 'IPA-KOUDO-AM1-2025-FALL-Q01';
    p.questions[0].question += '条件変更';
    p.questions[1].subject_id = 'a2';
    m.entries[0].decision = 'REPLACE';
    expect(validate(p, m)).toEqual(
      expect.arrayContaining([
        'A1-007 subject/source_id',
        'A1-001 content_hash',
        'A1-002 subject/source_id',
        'A1-001 source-code-map frozen fields',
      ]),
    );
  });
  it('構成数、図表・校閲hash、非内容FIXの同一性違反を拒否する', () => {
    const p = structuredClone(payload),
      r = structuredClone(review);
    p.questions[29].question += '変更';
    p.questions[0].question_set.id = 'mock_exam_1';
    r.questions[0].checks.figures = 'pending';
    r.questions[1].content_hash = 'old';
    const errors = validate(p, mapping, r);
    expect(errors).toContain('practice count/sequence');
    expect(errors).toContain('A1-030 history identity');
    expect(errors).toContain('A1-007 secondary review fields');
    expect(errors).toContain('A1-144 secondary review identity');
  });
});
