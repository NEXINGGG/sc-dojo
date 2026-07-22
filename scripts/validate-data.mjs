import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const choiceIds = new Set(['A', 'B', 'C', 'D']);
const difficulties = new Set(['基礎', '標準', '応用']);
const priorities = new Set(['S', 'A', 'B']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addDuplicateErrors(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${label}が重複しています: ${String(value)}`);
    }
    seen.add(value);
  }
}

export function validateData(questionsPayload, categoriesPayload) {
  const errors = [];
  const questions = Array.isArray(questionsPayload?.questions) ? questionsPayload.questions : [];
  const categories = Array.isArray(categoriesPayload?.categories)
    ? categoriesPayload.categories
    : [];
  const domains = Array.isArray(categoriesPayload?.domains) ? categoriesPayload.domains : [];
  const categoryIds = new Set(categories.map((category) => category.id));
  const domainIds = new Set(domains.map((domain) => domain.id));
  const subcategoryIds = new Set(
    categories.flatMap((category) =>
      Array.isArray(category.subcategories)
        ? category.subcategories.map((subcategory) => subcategory.id)
        : [],
    ),
  );

  if (questions.length !== 240) {
    errors.push(`問題数が240ではありません: ${questions.length}`);
  }

  const numericIds = questions.map((question) => question.id);
  addDuplicateErrors(numericIds, '問題ID', errors);
  const expectedIds = new Set(Array.from({ length: 240 }, (_, index) => index + 1));
  for (const id of expectedIds) {
    if (!numericIds.includes(id)) {
      errors.push(`問題IDが欠番です: ${id}`);
    }
  }

  addDuplicateErrors(
    questions.map((question) => question.code),
    '問題code',
    errors,
  );
  addDuplicateErrors(
    questions.map((question) => question.question),
    '完全一致する問題文',
    errors,
  );

  for (const [index, question] of questions.entries()) {
    const label = isNonEmptyString(question?.code) ? question.code : `index:${index + 1}`;
    const requiredKeys = [
      'id',
      'code',
      'domain_id',
      'category_id',
      'subcategory_id',
      'difficulty',
      'priority',
      'question',
      'choices',
      'correct_choice',
      'explanation',
      'memory_point',
      'question_set',
      'source',
      'status',
      'schema_version',
    ];

    for (const key of requiredKeys) {
      if (question?.[key] === undefined || question[key] === null || question[key] === '') {
        errors.push(`${label}: ${key} がありません`);
      }
    }

    for (const key of ['question', 'explanation', 'memory_point']) {
      if (!isNonEmptyString(question?.[key])) {
        errors.push(`${label}: ${key} が空です`);
      }
    }

    if (!categoryIds.has(question?.category_id)) {
      errors.push(`${label}: category_idがcategories.jsonに存在しません`);
    }
    if (!subcategoryIds.has(question?.subcategory_id)) {
      errors.push(`${label}: subcategory_idがcategories.jsonに存在しません`);
    }
    if (!domainIds.has(question?.domain_id)) {
      errors.push(`${label}: domain_idが許可値ではありません`);
    }
    if (!difficulties.has(question?.difficulty)) {
      errors.push(`${label}: difficultyが許可値ではありません`);
    }
    if (!priorities.has(question?.priority)) {
      errors.push(`${label}: priorityが許可値ではありません`);
    }

    const choices = Array.isArray(question?.choices) ? question.choices : [];
    if (choices.length !== 4) {
      errors.push(`${label}: 選択肢が4件ではありません`);
    }
    const actualChoiceIds = choices.map((choice) => choice?.id);
    if (actualChoiceIds.length !== 4 || actualChoiceIds.some((id) => !choiceIds.has(id))) {
      errors.push(`${label}: 選択肢IDがA、B、C、Dではありません`);
    }
    if (new Set(actualChoiceIds).size !== 4) {
      errors.push(`${label}: 選択肢IDが重複しています`);
    }
    if (!actualChoiceIds.includes(question?.correct_choice)) {
      errors.push(`${label}: 正解IDが選択肢内に存在しません`);
    }
  }

  for (const examId of ['mock_exam_1', 'mock_exam_2']) {
    const examQuestions = questions.filter((question) => question?.question_set?.id === examId);
    if (examQuestions.length !== 30) {
      errors.push(`${examId}: 問題数が30ではありません: ${examQuestions.length}`);
    }
    addDuplicateErrors(
      examQuestions.map((question) => question.id),
      `${examId}内の問題ID`,
      errors,
    );
  }

  return errors;
}

export function main() {
  const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const questionsPayload = readJson(join(rootDir, 'data', 'questions.json'));
  const categoriesPayload = readJson(join(rootDir, 'data', 'categories.json'));
  const errors = validateData(questionsPayload, categoriesPayload);

  if (errors.length > 0) {
    console.error(`FAILED: ${errors.length} error(s)`);
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`checked: ${questionsPayload.questions.length} questions`);
  execFileSync(process.execPath, [join(rootDir, 'scripts', 'validate-a2-data.mjs')], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [join(rootDir, 'scripts', 'validate-b1-ready.mjs')], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('PASSED: no data validation errors');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
