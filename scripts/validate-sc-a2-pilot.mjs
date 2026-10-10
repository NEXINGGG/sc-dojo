import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateQuestionMaterialData } from './question-material-data.mjs';

export function validateScA2Pilot(payload, inventory, categories) {
  const errors = validateQuestionMaterialData(payload);
  if (
    payload.metadata?.dataset_version !== 'sc-a2-pilot-v1' ||
    payload.metadata?.production_enabled !== false
  )
    errors.push('pilotの教材版・本番無効設定が不正です');
  if (payload.questions?.length !== 30 || payload.metadata?.question_count !== 30)
    errors.push('pilotは30問にしてください');
  const selected = inventory.questions.filter((q) => q.adoption_status === 'selected');
  if (selected.length !== 240) errors.push('採用監査のselectedは240問が必要です');
  const sourceById = new Map(selected.map((q) => [q.source_id, q]));
  const categoryById = new Map(categories.categories.map((c) => [c.id, c]));
  const groups = { duplicate_group: new Set(), similar_group: new Set() };
  const years = new Set();
  const categoryCounts = new Map();
  const stimulusCounts = { table: 0, code: 0, image: 0, total: 0 };
  for (const q of payload.questions ?? []) {
    const source = sourceById.get(q.source?.source_id);
    if (!source) {
      errors.push(`${q.code}: selectedにないsource_idです`);
      continue;
    }
    if (q.code !== `A2-PILOT-${source.source_id}`) errors.push(`${q.code}: 試作専用codeが不正です`);
    for (const [field, expected] of Object.entries({
      year: source.year,
      term: source.term,
      question_number: source.question_number,
      official_question_url: source.question_pdf_url,
      official_answer_url: source.answer_source_url,
      official_answer: source.official_answer,
      official_answer_choice_id: source.official_answer_choice_id,
    }))
      if (q.source[field] !== expected)
        errors.push(`${q.code}: source.${field}が採用監査と不一致です`);
    if (q.correct_choice !== source.official_answer_choice_id)
      errors.push(`${q.code}: 公式正解不一致`);
    if (source.freshness !== 'current')
      errors.push(`${q.code}: current以外は採用理由の再確認が必要です`);
    if (
      q.category_id !== source.estimated_category ||
      q.subcategory_id !== source.estimated_subcategory ||
      q.domain_id !== source.domain_id
    )
      errors.push(`${q.code}: 採用監査の分類と不一致です`);
    const category = categoryById.get(q.category_id);
    if (!category?.subcategories.some((s) => s.id === q.subcategory_id && s.name === q.subcategory))
      errors.push(`${q.code}: カテゴリ・小分類が不正です`);
    if (!q.choice_explanations || !q.exam_tip?.trim())
      errors.push(`${q.code}: 選択肢解説・exam_tipが必須です`);
    if (q.status !== 'active') errors.push(`${q.code}: 演習・模試で使用できるactiveが必要です`);
    for (const [key, seen] of Object.entries(groups)) {
      if (source[key] && seen.has(source[key])) errors.push(`${q.code}: ${key}が重複しています`);
      if (source[key]) seen.add(source[key]);
    }
    years.add(source.year);
    categoryCounts.set(q.category_id, (categoryCounts.get(q.category_id) ?? 0) + 1);
    const types = new Set(
      [...(q.stimulus ?? []), ...q.choices.flatMap((c) => c.stimulus ?? [])].map((s) => s.type),
    );
    if (types.size) stimulusCounts.total++;
    for (const type of ['table', 'code', 'image']) if (types.has(type)) stimulusCounts[type]++;
  }
  if (years.size !== 9) errors.push('2017～2025の全9年度を含めてください');
  for (const c of categories.categories) {
    const actual = categoryCounts.get(c.id) ?? 0;
    const expected = selected.filter((q) => q.estimated_category === c.id).length / 8;
    if (actual < 1 || Math.abs(actual - expected) > 1)
      errors.push(`${c.id}: 240問の比率から乖離しています`);
  }
  if (
    stimulusCounts.table < 2 ||
    stimulusCounts.code < 2 ||
    stimulusCounts.image < 1 ||
    stimulusCounts.total < 5
  )
    errors.push('図表問題が不足しています');
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const errors = validateScA2Pilot(
    read('data/sc-a2-pilot-30.json'),
    read('data/sc-a2-past-question-inventory.json'),
    read('data/sc-a2-categories-draft.json'),
  );
  for (const error of errors) console.error(`ERROR: ${error}`);
  if (errors.length) process.exitCode = 1;
  else console.log('PASSED: SC A-2 pilot 30 / selected・出典・正解・教材品質・分類・図表・hash');
}
