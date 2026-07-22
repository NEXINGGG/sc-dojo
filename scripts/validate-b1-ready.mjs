import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'data', 'b1-cases-2023-2025-ready.json');
const categoriesPath = path.join(root, 'data', 'b1-categories.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
const errors = [];

if (data.schemaVersion !== 2) errors.push('schemaVersion must be 2');
if (data.cases?.length !== 9) errors.push('expected 9 cases');
if (categories.schemaVersion !== 1 || !Array.isArray(categories.categories)) {
  errors.push('invalid B-1 category data');
}
const categoryIds = new Set((categories.categories ?? []).map((category) => category.categoryId));

const caseIds = new Set();
const questionIds = new Set();
let units = 0;
let fields = 0;

for (const c of data.cases ?? []) {
  if (caseIds.has(c.caseId)) errors.push(`duplicate caseId: ${c.caseId}`);
  caseIds.add(c.caseId);
  if (c.body?.appReady !== true) errors.push(`${c.caseId}: body not appReady`);
  for (const categoryId of c.categoryIds ?? []) {
    if (!categoryIds.has(categoryId)) errors.push(`${c.caseId}: unknown categoryId ${categoryId}`);
  }

  for (const q of c.questionUnits ?? []) {
    units += 1;
    if (questionIds.has(q.questionId)) errors.push(`duplicate questionId: ${q.questionId}`);
    questionIds.add(q.questionId);

    if (q.readyForApp !== true) errors.push(`${q.questionId}: not readyForApp`);
    if (q.promptTextIncluded !== false)
      errors.push(`${q.questionId}: promptTextIncluded must be false`);
    if (q.requiresManualPromptTranscription !== false) {
      errors.push(`${q.questionId}: manual transcription flag must be false`);
    }
    if (!q.sourcePromptLocator) errors.push(`${q.questionId}: missing sourcePromptLocator`);
    if (!Array.isArray(q.answerFields) || q.answerFields.length === 0) {
      errors.push(`${q.questionId}: missing answerFields`);
    }
    if (!['automatic', 'concept_assisted_self_grade', 'self_grade'].includes(q.grading?.mode)) {
      errors.push(`${q.questionId}: invalid grading mode`);
    }

    for (const f of q.answerFields ?? []) {
      fields += 1;
      if (!f.fieldId || !f.label || !f.inputKind) {
        errors.push(`${q.questionId}: invalid answer field`);
      }
      if (f.maxLength !== null && (!Number.isInteger(f.maxLength) || f.maxLength <= 0)) {
        errors.push(`${q.questionId}/${f.fieldId}: invalid maxLength`);
      }
    }
  }
}

if (units !== 83) errors.push(`expected 83 units, got ${units}`);
if (fields < 100) errors.push(`unexpectedly low answer field count: ${fields}`);

console.log(`checked: ${data.cases.length} cases / ${units} units / ${fields} answer fields`);
if (errors.length) {
  console.error('FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('PASSED: B1 PDF-analysis data is implementation-ready');
