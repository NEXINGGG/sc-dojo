import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hashJsonFile } from './json-semantic-hash.mjs';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
const hashJson = (relativePath) => hashJsonFile(join(root, relativePath));
const errors = [];
const expectedYears = [2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025];
const expectedPhase1UnitLabels = {
  'B1-2016-Q1': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問2(4)',
    '設問2(5)',
    '設問3(1)',
    '設問3(2)',
  ],
  'B1-2016-Q2': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3(1)',
    '設問3(2)',
    '設問4(1)',
    '設問4(2)',
  ],
  'B1-2016-Q3': [
    '設問1(1)',
    '設問1(2)',
    '設問1(3)',
    '設問1(4)',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
  ],
  'B1-2017-Q1': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3',
    '設問4(1)',
    '設問4(2)',
    '設問4(3)',
  ],
  'B1-2017-Q2': ['設問1', '設問2(1)', '設問2(2)', '設問2(3)', '設問3(1)', '設問3(2)', '設問4'],
  'B1-2017-Q3': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
    '設問4',
  ],
  'B1-2018-Q1': [
    '設問1(1)',
    '設問1(2)',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
    '設問3(5)',
  ],
  'B1-2018-Q2': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3(1)',
    '設問3(2)',
    '設問4(1)',
    '設問4(2)',
    '設問4(3)',
  ],
  'B1-2018-Q3': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問4(1)',
    '設問4(2)',
    '設問4(3)',
  ],
  'B1-2019-Q1': [
    '設問1(1)',
    '設問1(2)',
    '設問1(3)',
    '設問1(4)',
    '設問1(5)',
    '設問1(6)',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
  ],
  'B1-2019-Q2': ['設問1', '設問2(1)', '設問2(2)', '設問2(3)', '設問3(1)', '設問3(2)', '設問3(3)'],
  'B1-2019-Q3': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3(1)',
    '設問3(2)',
    '設問4(1)',
    '設問4(2)',
  ],
  'B1-2021-Q1': [
    '設問1(1)',
    '設問1(2)',
    '設問1(3)',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問2(4)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
  ],
  'B1-2021-Q2': [
    '設問1',
    '設問2',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
    '設問4(1)',
    '設問4(2)',
    '設問4(3)',
  ],
  'B1-2021-Q3': [
    '設問1',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
    '設問4(1)',
    '設問4(2)',
    '設問4(3)',
    '設問4(4)',
    '設問4(5)',
  ],
  'B1-2022-Q1': [
    '設問1(1)',
    '設問1(2)',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
    '設問3(4)',
    '設問3(5)',
  ],
  'B1-2022-Q2': [
    '設問1(1)',
    '設問1(2)',
    '設問1(3)',
    '設問1(4)',
    '設問1(5)',
    '設問1(6)',
    '設問2(1)',
    '設問2(2)',
    '設問3(1)',
    '設問3(2)',
  ],
  'B1-2022-Q3': [
    '設問1(1)',
    '設問1(2)',
    '設問1(3)',
    '設問1(4)',
    '設問2(1)',
    '設問2(2)',
    '設問2(3)',
    '設問3(1)',
    '設問3(2)',
    '設問3(3)',
  ],
};
const expectedPhase1UnitCount = Object.values(expectedPhase1UnitLabels).reduce(
  (total, labels) => total + labels.length,
  0,
);
const expectedPhase1FieldCount = 227;
const relevanceLabels = new Set([
  'current_core',
  'modern_successor',
  'historical_context',
  'low_current_priority',
]);

const legacy = readJson('data/b1-cases-2023-2025-ready.json');
const phase1 = readJson('data/b1-cases-2016-2022-ready.json');
const categories = readJson('data/b1-categories.json');
const relevance = readJson('data/b1-relevance.json');
const manifest = readJson('data/b1-source-manifest-2016-2022.json');

if (
  hashJson('data/b1-cases-2023-2025-ready.json') !==
  '383988AC2CF545B2FBD02855BE1A8BF962D76E57FBCE0815382250F1DC169DDB'
) {
  errors.push('既存B-1 2023～2025データが変更されています');
}
if (
  hashJson('data/questions.json') !==
  '9004F83084D78E43D70B647A4E27DE6E2B2A53BC7FAE0CA2D43A1BF2F4484307'
) {
  errors.push('科目A-1問題データが変更されています');
}
if (
  hashJson('data/a2-questions.json') !==
  'E86783804502799A16A6139CABB630F5B805E46934C8055E3F0D0AAE1CFEEA4E'
) {
  errors.push('科目A-2問題データが変更されています');
}

if (legacy.cases?.length !== 9) errors.push('既存B-1ケース数は9件である必要があります');
if (phase1.cases?.length !== 18) errors.push('Phase 1ケース数は18件である必要があります');
const allCases = [...(legacy.cases ?? []), ...(phase1.cases ?? [])];
if (allCases.length !== 27) errors.push(`B-1合計ケース数が27件ではありません: ${allCases.length}`);
const legacyUnitCount = (legacy.cases ?? []).flatMap(
  (caseItem) => caseItem.questionUnits ?? [],
).length;
const phase1UnitCount = (phase1.cases ?? []).flatMap(
  (caseItem) => caseItem.questionUnits ?? [],
).length;
const phase1FieldCount = (phase1.cases ?? []).flatMap((caseItem) =>
  (caseItem.questionUnits ?? []).flatMap((unit) => unit.answerFields ?? []),
).length;
if (legacyUnitCount !== 83)
  errors.push(`既存2023～2025の設問単位数が変更されています: ${legacyUnitCount}`);
if (phase1UnitCount !== expectedPhase1UnitCount) {
  errors.push(`Phase 1設問単位数が不正です: ${phase1UnitCount}`);
}
if (phase1FieldCount !== expectedPhase1FieldCount) {
  errors.push(`Phase 1答案欄数が不正です: ${phase1FieldCount}`);
}
for (const caseItem of phase1.cases ?? []) {
  const expectedLabels = expectedPhase1UnitLabels[caseItem.caseId];
  const actualLabels = (caseItem.questionUnits ?? []).map((unit) => unit.label);
  if (expectedLabels === undefined || expectedLabels.join('|') !== actualLabels.join('|')) {
    errors.push(`${caseItem.caseId}: 公式設問ラベルとの対応が不正です`);
  }
  if (actualLabels.some((label) => /[～・]/.test(label))) {
    errors.push(`${caseItem.caseId}: 複数の公式設問を一つのquestionUnitに統合しています`);
  }
}

const categoryIds = new Set((categories.categories ?? []).map((category) => category.categoryId));
const caseIds = new Set();
const questionIds = new Set();
const answerFieldKeys = new Set();
const phase1CaseIds = new Set((phase1.cases ?? []).map((caseItem) => caseItem.caseId));
for (const caseItem of allCases) {
  const isPhase1 = phase1CaseIds.has(caseItem.caseId);
  if (caseIds.has(caseItem.caseId)) errors.push(`caseIdが重複しています: ${caseItem.caseId}`);
  caseIds.add(caseItem.caseId);
  if (caseItem.subjectId !== 'b1') {
    errors.push(`${caseItem.caseId}: subjectIdがb1ではありません`);
  }
  if (!Number.isInteger(caseItem.year) || !Number.isInteger(caseItem.questionNumber)) {
    errors.push(`${caseItem.caseId}: 年度又は問題番号が不正です`);
  }
  for (const categoryId of caseItem.categoryIds ?? []) {
    if (!categoryIds.has(categoryId))
      errors.push(`${caseItem.caseId}: 未登録カテゴリ ${categoryId}`);
  }
  for (const key of ['yearPageUrl', 'questionPdfUrl', 'answerPdfUrl', 'commentaryPdfUrl']) {
    if (!String(caseItem.source?.[key] ?? '').startsWith('https://www.ipa.go.jp/')) {
      errors.push(`${caseItem.caseId}: ${key} がIPAのHTTPS URLではありません`);
    }
  }
  for (const [key, value] of [
    ['provider', 'IPA'],
    ['exam', 'ネットワークスペシャリスト'],
    ['sectionAtTime', '午後Ⅰ'],
    ['currentEquivalent', '科目B-1'],
  ]) {
    if (caseItem.source?.[key] !== value)
      errors.push(`${caseItem.caseId}: source.${key} が不正です`);
  }
  if (!Array.isArray(caseItem.source?.questionPdfPagesZeroBased)) {
    errors.push(`${caseItem.caseId}: 問題PDFのページ範囲がありません`);
  }
  if (caseItem.source?.modified !== true || !caseItem.source?.modificationNote) {
    errors.push(`${caseItem.caseId}: 変更注記がありません`);
  }
  if (
    isPhase1 &&
    (caseItem.body?.mode !== 'official_pdf_plus_answer_form' ||
      caseItem.body?.fullTextIncluded !== false ||
      caseItem.body?.figuresIncluded !== false)
  ) {
    errors.push(`${caseItem.caseId}: 本文のPDF参照モードが不正です`);
  }
  for (const unit of caseItem.questionUnits ?? []) {
    if (questionIds.has(unit.questionId))
      errors.push(`questionIdが重複しています: ${unit.questionId}`);
    questionIds.add(unit.questionId);
    const promptPages = unit.sourcePromptLocator?.pdfPageZeroBased;
    if (
      !unit.sourcePromptLocator ||
      !(
        Number.isInteger(promptPages) ||
        (Array.isArray(promptPages) &&
          promptPages.length > 0 &&
          promptPages.every(Number.isInteger))
      )
    ) {
      errors.push(`${unit.questionId}: PDFページ位置がありません`);
    }
    if (
      unit.readyForApp !== true ||
      unit.promptTextIncluded !== false ||
      unit.requiresManualPromptTranscription !== false
    ) {
      errors.push(`${unit.questionId}: アプリ利用可否フラグが不正です`);
    }
    for (const key of ['underlineRefs', 'figureRefs', 'tableRefs']) {
      if (!Array.isArray(unit.sourcePromptLocator?.[key])) {
        errors.push(`${unit.questionId}: ${key} が配列ではありません`);
      }
    }
    if (!['automatic', 'concept_assisted_self_grade', 'self_grade'].includes(unit.grading?.mode)) {
      errors.push(`${unit.questionId}: 採点モードが不正です`);
    }
    if (!Array.isArray(unit.answerFields) || unit.answerFields.length === 0) {
      errors.push(`${unit.questionId}: 答案欄がありません`);
    }
    for (const field of unit.answerFields ?? []) {
      const key = `${unit.questionId}:${field.fieldId}`;
      if (answerFieldKeys.has(key)) errors.push(`答案欄IDが重複しています: ${key}`);
      answerFieldKeys.add(key);
      if (!field.fieldId || !field.label || !field.inputKind)
        errors.push(`${key}: 答案欄が不正です`);
      if (
        field.maxLength !== null &&
        (!Number.isInteger(field.maxLength) || field.maxLength <= 0)
      ) {
        errors.push(`${key}: maxLengthが不正です`);
      }
      if (
        typeof field.orderMatters !== 'boolean' ||
        !Number.isInteger(field.expectedCount) ||
        field.expectedCount <= 0 ||
        !Array.isArray(field.acceptedAnswers)
      ) {
        errors.push(`${key}: 答案欄の補助情報が不正です`);
      }
    }
  }
}

for (const year of expectedYears) {
  const count = allCases.filter((caseItem) => caseItem.year === year).length;
  if (count !== 3) errors.push(`${year}年度の大問数が3件ではありません: ${count}`);
}
if (allCases.some((caseItem) => caseItem.year === 2020)) errors.push('2020年度は収録対象外です');

const sourceYears = new Set((manifest.sources ?? []).map((source) => source.year));
for (const year of [2016, 2017, 2018, 2019, 2021, 2022]) {
  if (!sourceYears.has(year)) errors.push(`出典マニフェストに${year}年度がありません`);
}
for (const source of manifest.sources ?? []) {
  for (const key of ['yearPageUrl', 'questionPdfUrl', 'answerPdfUrl', 'commentaryPdfUrl']) {
    if (!String(source[key] ?? '').startsWith('https://www.ipa.go.jp/')) {
      errors.push(`出典${source.year}: ${key} が不正です`);
    }
  }
}
for (const caseItem of phase1.cases ?? []) {
  const source = (manifest.sources ?? []).find((item) => item.year === caseItem.year);
  if (source === undefined) continue;
  for (const key of ['yearPageUrl', 'questionPdfUrl', 'answerPdfUrl', 'commentaryPdfUrl']) {
    if (caseItem.source?.[key] !== source[key]) {
      errors.push(`${caseItem.caseId}: 出典マニフェストと${key}が一致しません`);
    }
  }
}

const relevanceByCaseId = new Map((relevance.entries ?? []).map((entry) => [entry.caseId, entry]));
for (const caseItem of allCases) {
  const entry = relevanceByCaseId.get(caseItem.caseId);
  if (!entry) {
    errors.push(`${caseItem.caseId}: 現在性メタデータがありません`);
    continue;
  }
  const caseRelevance = entry.caseRelevance;
  if (
    !relevanceLabels.has(caseRelevance?.label) ||
    !caseRelevance?.displayLabel ||
    !caseRelevance?.reason ||
    !/^\d{4}-\d{2}$/.test(caseRelevance?.reviewedAt ?? '') ||
    !(caseRelevance?.sourceRefs?.length > 0)
  ) {
    errors.push(`${caseItem.caseId}: 現在性メタデータが不正です`);
  }
  for (const [questionId, override] of Object.entries(entry.questionUnitOverrides ?? {})) {
    if (!questionIds.has(questionId))
      errors.push(`${caseItem.caseId}: 現在性上書きの設問IDが不正です`);
    if (
      !relevanceLabels.has(override.label) ||
      !override.displayLabel ||
      !override.reason ||
      !/^\d{4}-\d{2}$/.test(override.reviewedAt ?? '') ||
      !Array.isArray(override.sourceRefs)
    ) {
      errors.push(`${caseItem.caseId}: 現在性上書きが不正です`);
    }
  }
}

if (!readFileSync(join(root, '.gitignore'), 'utf8').includes('reference/b1-official/')) {
  errors.push('公式PDF参照ディレクトリがgitignoreされていません');
}
if (existsSync(join(root, 'public', 'reference', 'b1-official'))) {
  errors.push('公式PDFがpublic配下にあります');
}
const publicFiles = existsSync(join(root, 'public'))
  ? readdirSync(join(root, 'public'), { recursive: true })
  : [];
if (publicFiles.some((file) => String(file).toLowerCase().endsWith('.pdf'))) {
  errors.push('public配下にPDFがあります');
}
const viteConfig = readFileSync(join(root, 'vite.config.ts'), 'utf8');
if (/globPatterns:\s*\[[^\]]*\.pdf/i.test(viteConfig)) {
  errors.push('Service WorkerのglobPatternsにPDFが含まれています');
}
const trackedOfficialPdfs = execFileSync('git', ['ls-files', 'reference/b1-official'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
if (trackedOfficialPdfs) errors.push('reference/b1-official配下のPDFがGit管理されています');

console.log(
  `checked: ${allCases.length} cases / ${questionIds.size} units / ${answerFieldKeys.size} answer fields`,
);
if (errors.length > 0) {
  console.error('FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PASSED: B-1 Phase 1 data, source and relevance validation');
