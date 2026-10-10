import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error CLI validator is JavaScript; data validation is exercised without a TS wrapper.
import { validateScBRelease } from './validate-sc-b-release.mjs';
import payload from '../data/sc-b-cases-2023-2025-ready.json';

describe('SC B v1切替前検証', () => {
  it('20大問・15正本・画像・全設問・模試・pilot整合を確認する', () => {
    expect(validateScBRelease(payload)).toEqual([]);
  });
  it('20大問の本文・設問・答案・図表の二次校閲証跡が一致する', () => {
    expect(validateScBRelease(payload, { requireReleaseReview: true })).toEqual([]);
  });
  it('未校閲16件を拒否し，状態ラベルの書換えだけでは通さない', () => {
    const map = JSON.parse(readFileSync('data/sc-b-v1-source-map.json', 'utf8'));
    for (const entry of map.entries.slice(0, 16)) {
      delete entry.secondaryReview;
      entry.transcription_status = 'needs_review';
      entry.visualReviewStatus = 'completed';
      entry.mobileParagraphTranscriptionStatus = 'completed';
    }
    const errors: string[] = validateScBRelease(payload, { map, requireReleaseReview: true });
    expect(errors).toHaveLength(16);
    expect(errors.every((e) => e.includes('段落教材化・全原本二次校閲未完了'))).toBe(true);
    for (const entry of map.entries) entry.transcription_status = 'verified';
    expect(validateScBRelease(payload, { map, requireReleaseReview: true })).toHaveLength(16);
  });
  it('校閲後の教材変更はhashを再生成しても再校閲を要求する', () => {
    const broken = structuredClone(payload);
    broken.cases[0].questionUnits[0].explanation.reasoning += '本文と異なる解説';
    const errors: string[] = validateScBRelease(broken, { requireReleaseReview: true });
    expect(errors).toContain('SC-2023-FALL-PM-Q01:段落教材化・全原本二次校閲未完了');
  });
  it('ID重複・欄欠落・模試混在・画像改変・pilot改変を検出する', () => {
    const broken = structuredClone(payload);
    broken.cases[1].source_id = broken.cases[0].source_id;
    broken.cases[2].questionUnits[0].answerFields = [];
    broken.cases[16].questionUnits[0].answerFields[0].officialAnswer = '変更';
    const sets = JSON.parse(readFileSync('data/sc-b-exam-sets.json', 'utf8'));
    sets.sets[0].caseIds[0] = broken.cases[4].caseId;
    const errors: string[] = validateScBRelease(broken, {
      sets,
      readAsset: () => Buffer.from('改変'),
    });
    for (const token of ['source_id', '欄数', '4問→2問', '画像hash', 'pilot設問'])
      expect(errors.join()).toContain(token);
  });
});
