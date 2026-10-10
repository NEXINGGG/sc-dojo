import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateQuestionMaterialData } from './question-material-data.mjs';

const tally = (values) =>
  values.reduce((counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }), {});
const equal = (left, right) => isDeepStrictEqual(left, right);
export const originalReviewFields = [
  'year',
  'term',
  'question_number',
  'source_id',
  'question',
  'choice_A',
  'choice_B',
  'choice_C',
  'choice_D',
  'official_answer',
  'figures',
  'official_question_url',
  'official_answer_url',
];

export function validateScA2Release(payload, inventory, categories, mapping, review, pilot) {
  const errors = validateQuestionMaterialData(payload, { strictScA2: true });
  const fail = (message) => errors.push(message);
  const selected = inventory.questions.filter((q) => q.adoption_status === 'selected');
  const sourceById = new Map(selected.map((q) => [q.source_id, q]));
  const questions = payload.questions ?? [];
  const entries = mapping.entries ?? [];
  const mapByCode = new Map(entries.map((q) => [q.code, q]));
  const reviewBySource = new Map((review.questions ?? []).map((q) => [q.source_id, q]));
  const categoryById = new Map(categories.categories.map((c) => [c.id, c]));
  const sameSet = (left, right) => equal([...left].sort(), [...right].sort());
  if (payload.metadata?.dataset_version !== 'sc-a2-v1') fail('正式教材版はsc-a2-v1です');
  if (payload.metadata?.production_enabled === false)
    fail('正式教材を本番無効のまま投入できません');
  if (mapping.dataset_version !== 'sc-a2-v1') fail('正式対応表の教材版はsc-a2-v1です');
  if (
    payload.metadata?.question_count !== 240 ||
    questions.length !== 240 ||
    selected.length !== 240
  )
    fail('正式教材とselectedは240問必要です');
  if (entries.length !== 240 || mapping.selection_revision !== inventory.selection_revision)
    fail('正式ID対応表の件数・監査版が不正です');
  if (
    !sameSet(
      questions.map((q) => q.source?.source_id),
      selected.map((q) => q.source_id),
    )
  )
    fail('監査selected 240と教材source_idが完全一致しません');
  if (
    !sameSet(
      entries.map((q) => q.source_id),
      selected.map((q) => q.source_id),
    )
  )
    fail('対応表が監査selectedと一致しません');
  if (
    new Set(entries.map((q) => q.code)).size !== 240 ||
    new Set(entries.map((q) => q.id)).size !== 240 ||
    new Set(entries.map((q) => q.source_id)).size !== 240
  )
    fail('対応表のID/code/source_idが重複しています');
  if (
    !sameSet(
      questions.map((q) => q.id),
      Array.from({ length: 240 }, (_, i) => 1001 + i),
    )
  )
    fail('IDは1001～1240です');
  if (
    !sameSet(
      questions.map((q) => q.code),
      Array.from({ length: 240 }, (_, i) => `A2-${String(i + 1).padStart(3, '0')}`),
    )
  )
    fail('codeはA2-001～A2-240です');
  if (
    categories.exam_code !== 'SC' ||
    categories.categories.length !== 10 ||
    !sameSet(
      categoryById.keys(),
      inventory.summary.categories.map((c) => c.id),
    )
  )
    fail('SCの正式10カテゴリが必要です');
  const usedCategories = new Set(questions.map((q) => q.category_id));
  if (!sameSet(usedCategories, categoryById.keys())) fail('全10カテゴリを教材で使用してください');
  for (const q of questions) {
    const source = sourceById.get(q.source?.source_id);
    const row = mapByCode.get(q.code);
    if (!source) {
      fail(`${q.code}: selected以外の問題です`);
      continue;
    }
    if (
      q.id !== 1000 + Number(q.code.slice(3)) ||
      row?.id !== q.id ||
      row?.source_id !== source.source_id ||
      row?.assignment !== source.assignment ||
      q.source_id !== source.source_id
    )
      fail(`${q.code}: 正式対応表と不一致です`);
    const number = { practice: null, mock1: 1, mock2: 2 }[source.assignment];
    const setId = number === null ? 'category_drill' : `mock_exam_${number}`;
    const sequence = number === null ? null : source.mock_sequence;
    if (!equal(q.question_set, { id: setId, number, sequence }))
      fail(`${q.code}: 監査割当・連番が不一致です`);
    for (const [field, value] of Object.entries({
      year: source.year,
      term: source.term,
      question_number: source.question_number,
      official_question_url: source.question_pdf_url,
      official_answer_url: source.answer_source_url,
      official_answer: source.official_answer,
      official_answer_choice_id: source.official_answer_choice_id,
    }))
      if (q.source[field] !== value) fail(`${q.code}: source.${field}が監査と不一致です`);
    if (q.correct_choice !== source.official_answer_choice_id)
      fail(`${q.code}: 公式解答不一致です`);
    const category = categoryById.get(q.category_id);
    if (
      q.domain_id !== source.domain_id ||
      q.category_id !== source.estimated_category ||
      q.subcategory_id !== source.estimated_subcategory ||
      !category?.subcategories.some(
        (s) =>
          s.id === q.subcategory_id &&
          s.name === q.subcategory &&
          (!s.domain_id || s.domain_id === q.domain_id),
      )
    )
      fail(`${q.code}: 監査分類と不一致です`);
    for (const field of [
      'choice_explanations',
      'explanation',
      'exam_tip',
      'memory_point',
      'related_terms',
    ])
      if (q[field] === undefined) fail(`${q.code}: ${field}が必要です`);
    if (
      source.freshness === 'usable_with_note' &&
      (!q.freshness_note?.trim() || !q.explanation.includes(q.freshness_note))
    )
      fail(`${q.code}: 現行性注記を解説に含めてください`);
    const stimuli = [...(q.stimulus ?? []), ...q.choices.flatMap((c) => c.stimulus ?? [])];
    const cls = source.display_audit.primary_class;
    if (cls === 'B' && !stimuli.some((s) => s.type === 'table'))
      fail(`${q.code}: HTML tableが必要です`);
    if (cls === 'C' && !stimuli.some((s) => s.type === 'code'))
      fail(`${q.code}: code/logが必要です`);
    if (['D', 'E'].includes(cls) && !stimuli.some((s) => s.type === 'image'))
      fail(`${q.code}: 図画像が必要です`);
    const r = reviewBySource.get(source.source_id);
    const sitting = inventory.sittings.find(
      (s) => s.year === source.year && s.term === source.term,
    );
    if (
      !r ||
      r.content_hash !== q.content_hash ||
      !equal(r.question_pdf_pages, source.question_pdf_pages) ||
      r.question_pdf_sha256 !== sitting.question_pdf_sha256 ||
      r.answer_pdf_sha256 !== sitting.answer_pdf_sha256 ||
      !originalReviewFields.every((f) => r.checks?.[f] === 'verified') ||
      r.official_answer !== q.source.official_answer ||
      !r.reviewed_on ||
      !r.method
    )
      fail(`${q.code}: 完成内容に対する全項目の二次校閲記録が必要です`);
  }
  if (
    !equal(tally(questions.map((q) => q.question_set.id)), {
      category_drill: 190,
      mock_exam_1: 25,
      mock_exam_2: 25,
    })
  )
    fail('所属は190+25+25です');
  for (const c of inventory.summary.categories) {
    const actual = questions.filter((q) => q.category_id === c.id);
    const formal = categoryById.get(c.id);
    if (
      !equal(formal?.allocation, {
        category_drill: c.practice,
        mock_exam_1: c.mock1,
        mock_exam_2: c.mock2,
        total: c.selected,
      })
    )
      fail(`${c.id}: 正式カテゴリの配分情報が監査と不一致です`);
    for (const sub of formal?.subcategories ?? []) {
      const subset = actual.filter((q) => q.subcategory_id === sub.id);
      if (
        !equal(sub.allocation, {
          category_drill: subset.filter((q) => q.question_set.id === 'category_drill').length,
          mock_exam_1: subset.filter((q) => q.question_set.id === 'mock_exam_1').length,
          mock_exam_2: subset.filter((q) => q.question_set.id === 'mock_exam_2').length,
          total: subset.length,
        })
      )
        fail(`${sub.id}: 正式小分類の配分情報が教材と不一致です`);
    }
    if (
      actual.length !== c.selected ||
      actual.filter((q) => q.question_set.id === 'category_drill').length !== c.practice ||
      actual.filter((q) => q.question_set.id === 'mock_exam_1').length !== c.mock1 ||
      actual.filter((q) => q.question_set.id === 'mock_exam_2').length !== c.mock2
    )
      fail(`${c.id}: 監査のカテゴリ別配分と不一致です`);
  }
  for (const number of [1, 2]) {
    const mock = questions.filter((q) => q.question_set.id === `mock_exam_${number}`);
    for (const field of ['source_id', 'duplicate_group']) {
      const values = mock
        .map((q) => {
          const s = sourceById.get(q.source?.source_id);
          return field === 'source_id' ? s?.source_id : s?.duplicate_group;
        })
        .filter(Boolean);
      if (new Set(values).size !== values.length) fail(`模試${number}: ${field}重複です`);
    }
  }
  if (
    review.questions?.length !== 240 ||
    reviewBySource.size !== 240 ||
    review.dataset_version !== 'sc-a2-v1' ||
    review.status !== 'completed'
  )
    fail('二次校閲記録は正式版240問必要です');
  for (const p of pilot.questions) {
    const q = questions.find((q) => q.source?.source_id === p.source.source_id);
    for (const field of [
      'question',
      'choices',
      'correct_choice',
      'explanation',
      'choice_explanations',
      'exam_tip',
      'memory_point',
      'related_terms',
      'stimulus',
      'source',
    ])
      if (
        !equal(q?.[field], p[field]) &&
        !review.pilot_changes?.some(
          (c) => c.source_id === p.source.source_id && c.fields.includes(field) && c.reason?.trim(),
        )
      )
        fail(`${p.source.source_id}: pilotの${field}変更理由が必要です`);
  }
  return errors;
}

export function main() {
  try {
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const errors = validateScA2Release(
      read('data/a2-questions.json'),
      read('data/sc-a2-past-question-inventory.json'),
      read('data/a2-categories.json'),
      read('data/sc-a2-source-code-map.json'),
      read('data/sc-a2-v1-secondary-review.json'),
      read('data/sc-a2-pilot-30.json'),
    );
    if (errors.length) {
      for (const error of errors) console.error(error);
      process.exitCode = 1;
    } else
      console.log(
        'PASS: SC A-2 v1 240 / selected / map / 190+25+25 / categories / materials / hashes / secondary review / pilot preservation',
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
