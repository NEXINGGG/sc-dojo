import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The synthetic fixture exercises rejection rules; it does not claim source/teaching quality.
// @ts-expect-error Node-only editorial validators have no browser declarations.
import { originalReviewFields, validateScA2Release } from './validate-sc-a2-release.mjs';
import { calculateQuestionContentHash } from '../src/domain/questionContent.mjs';

const read = (file: string) => JSON.parse(readFileSync(resolve('data', file), 'utf8'));
function fixture() {
  const inventory = read('sc-a2-past-question-inventory.json');
  const mapping = read('sc-a2-source-code-map.json');
  const categories = read('a2-categories.json');
  const pilot = read('sc-a2-pilot-30.json');
  const authored = read('sc-a2-v1-authoring.json');
  const bySource = new Map(
    authored.questions.map((q: { source: { source_id: string } }) => [q.source.source_id, q]),
  );
  const questions = mapping.entries.map(
    (row: { source_id: string; id: number; code: string; assignment: string }) => {
      const source = inventory.questions.find(
        (q: { source_id: string }) => q.source_id === row.source_id,
      );
      const category = categories.categories.find(
        (c: { id: string }) => c.id === source.estimated_category,
      );
      const sub = category.subcategories.find(
        (s: { id: string }) => s.id === source.estimated_subcategory,
      );
      const q = structuredClone(bySource.get(row.source_id) ?? authored.questions[0]);
      const number = row.assignment === 'practice' ? null : row.assignment === 'mock1' ? 1 : 2;
      Object.assign(q, {
        id: row.id,
        code: row.code,
        source_id: row.source_id,
        question_set: {
          id: number === null ? 'category_drill' : `mock_exam_${number}`,
          number,
          sequence: number === null ? null : source.mock_sequence,
        },
        domain_id: source.domain_id,
        category_id: category.id,
        subcategory_id: sub.id,
        subcategory: sub.name,
        correct_choice: source.official_answer_choice_id,
      });
      Object.assign(q.source, {
        source_id: source.source_id,
        exam: 'SC',
        year: source.year,
        term: source.term,
        question_number: source.question_number,
        official_question_url: source.question_pdf_url,
        official_answer_url: source.answer_source_url,
        official_answer: source.official_answer,
        official_answer_choice_id: source.official_answer_choice_id,
      });
      if (source.freshness === 'usable_with_note') {
        q.freshness_note = '検証用の現行性注記。';
        q.explanation += '検証用の現行性注記。';
      }
      if (!bySource.has(row.source_id)) {
        q.question = '検証用の仮問題（教材ではありません）。';
        delete q.stimulus;
        for (const c of q.choices) delete c.stimulus;
        const cls = source.display_audit.primary_class;
        if (cls === 'B') q.stimulus = [{ type: 'table', headers: ['項目'], rows: [['値']] }];
        if (cls === 'C') q.stimulus = [{ type: 'code', content: 'fixture' }];
        if (['D', 'E'].includes(cls))
          q.stimulus = [
            ...pilot.questions.find(
              (p: { source: { source_id: string } }) => p.source.source_id === 'SC-2025-FALL-Q22',
            ).stimulus,
          ];
      }
      q.content_hash = calculateQuestionContentHash(q);
      return q;
    },
  );
  const review = {
    dataset_version: 'sc-a2-v1',
    status: 'completed',
    questions: questions.map(
      (q: {
        source: { source_id: string; year: number; term: string; official_answer: string };
        content_hash: string;
      }) => {
        const s = inventory.questions.find(
          (s: { source_id: string }) => s.source_id === q.source.source_id,
        );
        const sitting = inventory.sittings.find(
          (s: { year: number; term: string }) =>
            s.year === q.source.year && s.term === q.source.term,
        );
        return {
          source_id: s.source_id,
          content_hash: q.content_hash,
          question_pdf_pages: s.question_pdf_pages,
          question_pdf_sha256: sitting.question_pdf_sha256,
          answer_pdf_sha256: sitting.answer_pdf_sha256,
          official_answer: q.source.official_answer,
          reviewed_on: '2026-10-07',
          method: 'synthetic fixture',
          checks: Object.fromEntries(originalReviewFields.map((f: string) => [f, 'verified'])),
        };
      },
    ),
  };
  return {
    payload: {
      schema_version: 1,
      metadata: { dataset_version: 'sc-a2-v1', question_count: 240 },
      questions,
    },
    inventory,
    categories,
    mapping,
    review,
    pilot,
  };
}
function errors(f: ReturnType<typeof fixture>): string[] {
  return validateScA2Release(f.payload, f.inventory, f.categories, f.mapping, f.review, f.pilot);
}
describe('正式SC A-2の投入前検証', () => {
  it('全項目を備える構造fixtureを受け入れる', () => expect(errors(fixture())).toEqual([]));
  it('reserveの混入，正式IDの変更，所属変更を拒否する', () => {
    const f = fixture();
    f.payload.questions[0].source.source_id = f.inventory.questions.find(
      (q: { adoption_status: string }) => q.adoption_status === 'reserve',
    ).source_id;
    expect(errors(f).join('')).toContain('selected');
    const id = fixture();
    id.payload.questions[0].id = 9999;
    expect(errors(id).join('')).toContain('正式対応表');
    const set = fixture();
    set.payload.questions[0].question_set.id = 'mock_exam_2';
    expect(errors(set).join('')).toContain('監査割当');
    const order = fixture();
    order.payload.questions.find(
      (q: { question_set: { id: string } }) => q.question_set.id === 'mock_exam_1',
    ).question_set.sequence = 99;
    expect(errors(order).join('')).toContain('監査割当');
  });
  it('hash更新漏れ，未校閲，四択解説欠落を拒否する', () => {
    const hash = fixture();
    hash.payload.questions[0].question += '変更';
    expect(errors(hash).join('')).toContain('content_hash');
    const review = fixture();
    review.review.questions[0].checks.question = 'pending';
    expect(errors(review).join('')).toContain('二次校閲');
    const ce = fixture();
    delete ce.payload.questions[0].choice_explanations.D;
    expect(errors(ce).join('')).toContain('choice_explanations');
  });
  it('pilotの無理由な解説再生成を拒否する', () => {
    const f = fixture();
    const q = f.payload.questions.find(
      (q: { source: { source_id: string } }) =>
        q.source.source_id === f.pilot.questions[0].source.source_id,
    );
    q.explanation = '再生成';
    expect(errors(f).join('')).toContain('pilotのexplanation変更理由');
  });
  it('草案の配分が正式カテゴリ情報へ残ることを拒否する', () => {
    const f = fixture();
    f.categories.categories[0].subcategories[0].allocation.total += 1;
    expect(errors(f).join('')).toContain('正式小分類の配分情報');
  });
});
