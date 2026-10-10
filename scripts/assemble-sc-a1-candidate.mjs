import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { a1Fixes } from './sc-a1-v1-fixes.mjs';
import { a1Replacements } from './sc-a1-v1-replacements.mjs';
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const draft = read('data/sc-a1-source-code-map-draft.json');
const payload = read('data/sc-a1-v1-candidate.json');
const categories = read('data/categories.json');
const assignmentIds = { practice: 'category_drill', mock1: 'mock_exam_1', mock2: 'mock_exam_2' };
for (const entry of draft.entries) {
  const q = payload.questions.find((q) => q.code === entry.code);
  if (!q) throw new Error(entry.code);
  const edit = a1Fixes[q.code] ?? a1Replacements[q.code];
  if (entry.decision !== 'KEEP' && !edit) throw new Error(`Missing edit: ${q.code}`);
  const { source_reference, ...fields } = edit ?? {};
  Object.assign(q, fields);
  q.subject_id = 'a1';
  q.source_id = entry.source_id;
  q.source.source_id = entry.source_id;
  if (source_reference) q.source.references = [source_reference];
  const replacement = draft.replacements.find((r) => r.code === q.code);
  if (replacement) {
    q.correct_choice = replacement.correct_choice;
    q.subcategory = replacement.topic;
    q.source = {
      type: 'official_past_question',
      verbatim_past_question: true,
      basis: `${replacement.exam} ${replacement.year}年度 ${replacement.period} 問${replacement.question_number}（出典：IPA）`,
      source_id: replacement.source_id,
      exam: 'KOUDO-AM1',
      year: replacement.year,
      term: replacement.season.toLowerCase(),
      question_number: replacement.question_number,
      official_question_url: replacement.official_question_url,
      official_answer_url: replacement.official_answer_url,
      official_answer: replacement.official_answer,
      official_answer_choice_id: replacement.correct_choice,
    };
  }
  q.category_id = entry.category;
  q.domain_id = entry.domain;
  q.difficulty = entry.difficulty === '難' ? '応用' : entry.difficulty;
  q.technology_field = entry.technology_field;
  q.question_set = {
    id: assignmentIds[entry.assignment],
    number: entry.assignment === 'mock2' ? 2 : 1,
    sequence: entry.sequence,
  };
  let category = categories.categories.find((c) => c.id === q.category_id);
  if (!category) {
    if (!['user_interface', 'information_media'].includes(entry.category))
      throw new Error(`Unapproved category ${entry.category}`);
    category = {
      id: entry.category,
      name: draft.category_proposals.find((c) => c.id === entry.category).name,
      order: categories.categories.length + 1,
      default_domain: 'technology',
      priority: 'A',
      description:
        entry.category === 'user_interface'
          ? '使用性と利用者向けの操作設計'
          : '画像・動画像などの情報量と表現',
      subcategories: [],
    };
    categories.categories.push(category);
  }
  let subcategory = category.subcategories.find((s) => s.name === q.subcategory);
  if (!subcategory) {
    subcategory = {
      id: `${category.id}__${createHash('sha256').update(q.subcategory).digest('hex').slice(0, 8)}`,
      name: q.subcategory,
    };
    category.subcategories.push(subcategory);
  }
  q.subcategory_id = subcategory.id;
  q.original_category_label = category.name;
}
payload.metadata = {
  title: '情報処理安全確保支援士 科目A-1 正式教材240問',
  subject_id: 'a1',
  dataset_version: 'sc-a1-v1',
  question_count: 240,
  language: 'ja-JP',
  finalized_on: '2026-10-08',
  source_scope: '独自問題225問とIPA高度試験・SC共通午前Iの公式過去問15問',
  source_code_map: 'data/sc-a1-source-code-map.json',
  answer_choice_ids: ['A', 'B', 'C', 'D'],
  question_sets: { category_drill: 180, mock_exam_1: 30, mock_exam_2: 30 },
  exam_format: { time_minutes: 50, question_count: 30, passing_score_percent: 60 },
  copyright_note: '公式問題・公式正解の出典はIPA。独自問題と解説は本教材独自作成。',
};
write('data/categories.json', categories);
write('data/sc-a1-v1-candidate.json', payload);
execFileSync(
  process.execPath,
  ['scripts/update-question-content-hashes.mjs', 'data/sc-a1-v1-candidate.json', '--update'],
  { stdio: 'inherit' },
);
const completed = read('data/sc-a1-v1-candidate.json');
const map = structuredClone(draft);
map.status = 'FINALIZED';
map.runtime_enabled = true;
map.production_mutation = true;
map.finalized_on = '2026-10-08';
for (const entry of map.entries)
  entry.content_hash = completed.questions.find((q) => q.code === entry.code).content_hash;
for (const replacement of map.replacements) {
  replacement.content_hash = completed.questions.find(
    (q) => q.code === replacement.code,
  ).content_hash;
  replacement.authoring_status = 'COMPLETED';
}
write('data/sc-a1-source-code-map.json', map);
console.log('Candidate assembled; production questions.json untouched.');
