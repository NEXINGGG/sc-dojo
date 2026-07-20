import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const qPath = path.join(root, 'data', 'a2-questions.json');
const cPath = path.join(root, 'data', 'a2-categories.json');
const questionsDoc = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const categoriesDoc = JSON.parse(fs.readFileSync(cPath, 'utf8'));
const errors = [];
const questions = questionsDoc.questions;
const categoryIds = new Set(categoriesDoc.categories.map((c) => c.id));
if (!Array.isArray(questions) || questions.length !== 240)
  errors.push(`question count: ${questions?.length}`);
const ids = new Set();
const codes = new Set();
for (const q of questions) {
  if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`);
  if (codes.has(q.code)) errors.push(`duplicate code: ${q.code}`);
  ids.add(q.id);
  codes.add(q.code);
  if (q.subject_id !== 'a2') errors.push(`subject_id: ${q.code}`);
  if (!categoryIds.has(q.category_id)) errors.push(`category: ${q.code}`);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`choices: ${q.code}`);
  const choiceIds = q.choices?.map((c) => c.id) ?? [];
  if (choiceIds.join(',') !== 'A,B,C,D') errors.push(`choice ids: ${q.code}`);
  if (!choiceIds.includes(q.correct_choice)) errors.push(`correct choice: ${q.code}`);
  if (!q.question?.trim() || !q.explanation?.trim() || !q.memory_point?.trim())
    errors.push(`empty text: ${q.code}`);
}
const setCount = questions.reduce(
  (m, q) => ((m[q.question_set.id] = (m[q.question_set.id] ?? 0) + 1), m),
  {},
);
if (setCount.category_drill !== 190 || setCount.mock_exam_1 !== 25 || setCount.mock_exam_2 !== 25)
  errors.push(`question sets: ${JSON.stringify(setCount)}`);
for (const n of [1, 2]) {
  const mock = questions.filter((q) => q.question_set.id === `mock_exam_${n}`);
  if (mock.length !== 25 || new Set(mock.map((q) => q.id)).size !== 25) errors.push(`mock ${n}`);
}
if (errors.length) {
  console.error('FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`checked: ${questions.length} A2 questions`);
console.log('PASSED: no A2 data validation errors');
