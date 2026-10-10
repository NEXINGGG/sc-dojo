import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  calculateQuestionContentHash,
  canonicalQuestionContent,
  sha256,
} from './questionContent.mjs';
import { createQuestionMaterialFixture } from '../test/questionMaterialFixture';
import { toQuestion, getSubjectCatalog } from '../data/catalog';
import { createQuestionDataIdentity } from './backup';

describe('問題内容SHA-256と教材fingerprint', () => {
  it.each([0, 3, 55, 56, 63, 64, 65, 10000])('Node標準SHA-256と一致する: %i bytes', (length) => {
    const value = 'x'.repeat(length);
    expect(sha256(value)).toBe(createHash('sha256').update(value).digest('hex'));
  });
  it('Unicodeとraw JSON/QuestionのhashがNode標準SHA-256と一致する', () => {
    const raw = createQuestionMaterialFixture().questions[0];
    raw.question += '😀';
    const hash = calculateQuestionContentHash(raw);
    expect(hash).toBe(
      `sha256:${createHash('sha256').update(canonicalQuestionContent(raw)).digest('hex')}`,
    );
    expect(calculateQuestionContentHash(toQuestion(raw, 'a2'))).toBe(hash);
  });
  it('NFC・改行・選択肢ID順を正規化し、空白は維持する', () => {
    const raw = createQuestionMaterialFixture().questions[0];
    raw.question = 'e\u0301\r\n次行';
    expect(calculateQuestionContentHash(raw)).toBe(
      calculateQuestionContentHash({
        ...raw,
        question: 'é\n次行',
        choices: [...raw.choices].reverse(),
      }),
    );
    expect(calculateQuestionContentHash({ ...raw, question: 'é\n 次行' })).not.toBe(
      calculateQuestionContentHash(raw),
    );
  });
  it('解説・補足・カテゴリ・出典URLはhashとfingerprintを変えない', () => {
    const raw = createQuestionMaterialFixture().questions[0];
    raw.content_hash = calculateQuestionContentHash(raw);
    const changed = {
      ...raw,
      explanation: '解説誤字修正',
      memory_point: '補足変更',
      category_id: 'other',
      difficulty: '基礎' as const,
      priority: 'B' as const,
      source: {
        ...raw.source,
        official_question_url: 'https://www.ipa.go.jp/new.pdf',
        basis: '追記',
      },
    };
    expect(calculateQuestionContentHash(changed)).toBe(raw.content_hash);
    expect(createQuestionDataIdentity([toQuestion(changed, 'a2', 'sc-a2-v1')], 2)).toEqual(
      createQuestionDataIdentity([toQuestion(raw, 'a2', 'sc-a2-v1')], 2),
    );
  });
  it.each(['question', 'choices', 'correct_choice', 'stimulus'] as const)(
    '%s変更でhash/fingerprintが変わる',
    (field) => {
      const raw = createQuestionMaterialFixture().questions[0];
      raw.content_hash = calculateQuestionContentHash(raw);
      const changed = structuredClone(raw);
      if (field === 'question') changed.question += '変更';
      if (field === 'choices') changed.choices[0].text += '変更';
      if (field === 'correct_choice')
        changed.correct_choice = raw.correct_choice === 'A' ? 'B' : 'A';
      if (field === 'stimulus') changed.stimulus = [{ type: 'code', content: 'value = 4' }];
      expect(calculateQuestionContentHash(changed)).not.toBe(raw.content_hash);
      // A stale stored hash must not hide an actual question change at runtime.
      expect(
        createQuestionDataIdentity([toQuestion(changed, 'a2', 'sc-a2-v1')], 2).fingerprint,
      ).not.toBe(createQuestionDataIdentity([toQuestion(raw, 'a2', 'sc-a2-v1')], 2).fingerprint);
    },
  );
  it('選択肢画像のbyte hashも含み、画像パスは含めない', () => {
    const raw = createQuestionMaterialFixture().questions[0];
    raw.choices[0].stimulus = [
      {
        type: 'image',
        src: 'questions/sc/a2/test.svg',
        alt: '接続図',
        asset_sha256: 'a'.repeat(64),
      },
    ];
    const hash = calculateQuestionContentHash(raw);
    raw.choices[0].stimulus[0] = {
      ...raw.choices[0].stimulus[0],
      src: 'questions/sc/a2/renamed.svg',
    };
    expect(calculateQuestionContentHash(raw)).toBe(hash);
    raw.choices[0].stimulus[0] = { ...raw.choices[0].stimulus[0], asset_sha256: 'b'.repeat(64) };
    expect(calculateQuestionContentHash(raw)).not.toBe(hash);
  });
  it('出典・版・code・科目を検知し、配列順は無視する', () => {
    const raw = createQuestionMaterialFixture().questions[0];
    const question = toQuestion(
      { ...raw, content_hash: calculateQuestionContentHash(raw) },
      'a2',
      'sc-a2-v1',
    );
    const original = createQuestionDataIdentity([question], 2).fingerprint;
    expect(original).toMatch(/^sha256:v1:[a-f0-9]{64}$/);
    for (const changed of [
      { ...question, sourceId: 'SC-2099-FALL-Q01' },
      { ...question, datasetVersion: 'sc-a2-v2' },
      { ...question, code: 'A2-002' },
      { ...question, subjectId: 'a1' as const },
    ])
      expect(createQuestionDataIdentity([changed], 2).fingerprint).not.toBe(original);
    const mixed = [...getSubjectCatalog('a1').questions, question];
    expect(createQuestionDataIdentity(mixed, 2)).toEqual(
      createQuestionDataIdentity([...mixed].reverse(), 2),
    );
  });
  it('A-1も内容のfingerprintを持ち，codeだけの旧識別関数は互換値を維持する', () => {
    const catalog = getSubjectCatalog('a1');
    const identity = createQuestionDataIdentity(catalog.questions, 1);
    expect(identity.fingerprint).toMatch(/^sha256:v1:/);
    expect(identity.a1Manifest?.entries).toHaveLength(240);
    expect(
      createQuestionDataIdentity(
        catalog.questions.map(({ code }) => ({ code })),
        1,
      ).fingerprint,
    ).toMatch(/^fnv1a-32:/);
  });
});
