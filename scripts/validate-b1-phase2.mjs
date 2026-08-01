import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requireComplete = process.argv.includes('--require-complete');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const hash = (path) =>
  createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex')
    .toUpperCase();
const errors = [];
const expectedYears = [2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025];
const protectedFiles = {
  'data/b1-cases-2023-2025-ready.json':
    'DB8B0E7CD80BA4BDAB9227924C6DD90D14D47540CA1D642DC0A3E5EE6C981B21',
  'data/b1-cases-2016-2022-ready.json':
    '05F2ACB75E39305F34AD3F420BC2804C0E23C6B152EF4911C8BBAB0940FD4591',
  'data/questions.json': '7042D700F5764A631CFD5B47EDFC8E2D1424D20FBBE4B2FEA7AC87E1A0A954AE',
  'data/a2-questions.json': '0BC5A27FA6F6AB78A7AB9A750588DFDBEE16C092B4B73434F9003E1757313072',
  'data/categories.json': 'F9E05EF1F46DB50C7471CE37E0DBC0A1A07A08D72A49D1A92EE68F690E2BB609',
  'data/a2-categories.json': '4CBC43A940FB78BF5FFD11B8F2B243B9FF831F4CE3CCAA01FCB9A3878C67E571',
  'data/b1-categories.json': '719C9D15F5990BE658C4C1F1552F8E7AE88BD6DFE7F96A9CD2990EDB0AF5F24A',
  'data/b1-relevance.json': 'D29D9B53F52870346BB21D12CA237D8A57A6A0505EE164D06A2B47646CB7BC61',
};

for (const [path, expectedHash] of Object.entries(protectedFiles)) {
  if (hash(path) !== expectedHash) errors.push(`保護対象データが変更されています: ${path}`);
}

const legacy = readJson('data/b1-cases-2023-2025-ready.json');
const phase1 = readJson('data/b1-cases-2016-2022-ready.json');
const a2 = readJson('data/a2-questions.json');
const a2Categories = readJson('data/a2-categories.json');
const failureCauseData = readJson('data/b1-failure-causes.json');
const topicAliasData = readJson('data/b1-a2-topic-aliases.json');
const reviewManifest = readJson('data/b1-phase2-official-review.json');
const cases = [...legacy.cases, ...phase1.cases];
const units = cases.flatMap((caseItem) => caseItem.questionUnits);
const fields = units.flatMap((unit) => unit.answerFields);
const unitIds = new Set();
const fieldIds = new Set();

if (cases.length !== 27) errors.push(`ケース数が27件ではありません: ${cases.length}`);
if (units.length !== 243) errors.push(`questionUnits数が243件ではありません: ${units.length}`);
if (fields.length !== 379) errors.push(`answerFields数が379件ではありません: ${fields.length}`);
for (const year of expectedYears) {
  if (cases.filter((caseItem) => caseItem.year === year).length !== 3) {
    errors.push(`${year}年度の大問数が3件ではありません`);
  }
}
if (cases.some((caseItem) => caseItem.year === 2020))
  errors.push('2020年度のB-1データが存在します');
for (const unit of units) {
  if (unitIds.has(unit.questionId)) errors.push(`questionIdが重複しています: ${unit.questionId}`);
  unitIds.add(unit.questionId);
  const pages = toPageArray(unit.sourcePromptLocator?.pdfPageZeroBased);
  const printedPages = toPageArray(unit.sourcePromptLocator?.printedPage);
  if (!pages.length || !pages.every((page) => Number.isInteger(page) && page >= 0)) {
    errors.push(`${unit.questionId}: PDFページ位置が不正です`);
  }
  if (!printedPages.length || !printedPages.every((page) => Number.isInteger(page) && page > 0)) {
    errors.push(`${unit.questionId}: 印刷ページ位置が不正です`);
  }
  if (
    pages.length !== printedPages.length ||
    pages.some((page, index) => page + 1 !== printedPages[index])
  ) {
    errors.push(`${unit.questionId}: printedPageとpdfPageZeroBasedが一致しません`);
  }
  for (const field of unit.answerFields) {
    const key = `${unit.questionId}:${field.fieldId}`;
    if (fieldIds.has(key)) errors.push(`fieldIdが重複しています: ${key}`);
    fieldIds.add(key);
    if (!Number.isInteger(field.expectedCount) || field.expectedCount <= 0) {
      errors.push(`${key}: expectedCountが不正です`);
    }
    if (field.maxLength !== null && (!Number.isInteger(field.maxLength) || field.maxLength <= 0)) {
      errors.push(`${key}: maxLengthが不正です`);
    }
  }
}

if (a2.questions.length !== 240)
  errors.push(`A2問題数が240件ではありません: ${a2.questions.length}`);
if (new Set(a2.questions.map((question) => question.code)).size !== a2.questions.length) {
  errors.push('A2 questionIdが重複しています');
}
if (
  new Set(a2Categories.categories.map((category) => category.id)).size !==
  a2Categories.categories.length
) {
  errors.push('A2 categoryIdが重複しています');
}

const supportSourcePath = join(root, 'src', 'data', 'b1LearningSupport.ts');
const supportSource = existsSync(supportSourcePath) ? readFileSync(supportSourcePath, 'utf8') : '';
for (const text of [
  'b1QuestionUnits.map',
  'getB1QuestionOfficialReview',
  'requirementBreakdown',
  'officialEvidence',
  'applicableFailureCauseIds',
  'a2QuestionIds',
  'not_applicable',
]) {
  if (!supportSource.includes(text))
    errors.push(`学習支援データ実装に必要な要素がありません: ${text}`);
}

const failureCauseIds = [
  'knowledge_gap',
  'missed_condition',
  'wrong_scope',
  'traffic_direction',
  'diagram_misread',
  'evidence_missed',
  'missing_element',
  'causality_weak',
  'wording_length',
  'calculation_error',
  'time_management',
];
for (const id of failureCauseIds) {
  if (!failureCauseData.failureCauses?.some((cause) => cause.id === id)) {
    errors.push(`失点原因定義がありません: ${id}`);
  }
}
if (failureCauseData.failureCauses?.length !== failureCauseIds.length) {
  errors.push('失点原因定義数が不正です');
}
if (
  new Set((failureCauseData.failureCauses ?? []).map((cause) => cause.id)).size !==
  failureCauseIds.length
) {
  errors.push('失点原因IDが重複しています');
}
if (topicAliasData.schemaVersion !== 1 || typeof topicAliasData.aliases !== 'object') {
  errors.push('A2連動のトピック対応データが不正です');
}

validateOfficialReviews();
validateGeneratedReviewCsv();
validateA2Links();
validateAnswerLeakageCandidates();

const packageJson = readJson('package.json');
if (packageJson.version !== '0.5.0')
  errors.push('package.jsonのversionは0.5.0である必要があります');
if (packageJson.scripts?.['validate:b1-phase2'] !== 'node scripts/validate-b1-phase2.mjs') {
  errors.push('validate:b1-phase2スクリプトが正しくありません');
}
for (const scriptName of ['validate:data', 'check', 'check:release']) {
  const script = String(packageJson.scripts?.[scriptName] ?? '');
  if (!script.includes('validate-b1-phase2') && !script.includes('validate:b1-phase2')) {
    errors.push(`${scriptName}にB-1 Phase 2検証が含まれていません`);
  }
}
if (!String(packageJson.scripts?.['check:release'] ?? '').includes('--require-complete')) {
  errors.push('check:releaseに完了済みレビュー条件が含まれていません');
}

const unresolvedQuestionIds = getUnresolvedQuestionIds();
console.log(
  `checked: ${cases.length} cases / ${units.length} units / ${fields.length} answer fields`,
);
console.log(
  `review: ${units.length - unresolvedQuestionIds.length} completed / ${unresolvedQuestionIds.length} needs_review`,
);
if (unresolvedQuestionIds.length > 0)
  console.log(`unresolved: ${unresolvedQuestionIds.join(', ')}`);
if (requireComplete && unresolvedQuestionIds.length > 0) {
  errors.push('release条件: needs_reviewが残っています');
}
if (errors.length > 0) {
  console.error('FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PASSED: B-1 Phase 2 data protection and official-review validation');

function validateOfficialReviews() {
  if (reviewManifest.schemaVersion !== 1 || !Array.isArray(reviewManifest.caseReviews)) {
    errors.push('公式PDFレビュー証跡のスキーマが不正です');
    return;
  }
  const reviewByCaseId = new Map();
  for (const review of reviewManifest.caseReviews) {
    if (reviewByCaseId.has(review.caseId))
      errors.push(`公式PDFレビューのcaseIdが重複しています: ${review.caseId}`);
    reviewByCaseId.set(review.caseId, review);
    if (!['completed', 'needs_review'].includes(review.reviewStatus)) {
      errors.push(`${review.caseId}: reviewStatusが不正です`);
    }
    if (!['official_pdf_recheck', 'phase1_review_preserved'].includes(review.reviewScope)) {
      errors.push(`${review.caseId}: reviewScopeが不正です`);
    }
    if (!String(review.reviewNotes ?? '').trim())
      errors.push(`${review.caseId}: reviewNotesが空です`);
    const checklist = review.checklist ?? {};
    const completeFlags = [
      review.reviewedAgainstQuestionPdf,
      review.reviewedAgainstAnswerPdf,
      review.reviewedAgainstCommentaryPdf,
      checklist.maxLengthChecked,
      checklist.answerFieldCountChecked,
      checklist.figureTableUnderlineChecked,
      checklist.requirementBreakdownChecked,
      checklist.answerLeakageChecked,
      checklist.officialEvidenceChecked,
      checklist.a2RemediationChecked,
      checklist.failureCausesChecked,
    ];
    if (review.reviewStatus === 'completed' && !completeFlags.every(Boolean)) {
      errors.push(`${review.caseId}: completedに必要な確認フラグが不足しています`);
    }
    if (review.reviewStatus === 'needs_review' && !String(review.reviewNotes ?? '').trim()) {
      errors.push(`${review.caseId}: needs_reviewにはnotesが必要です`);
    }
    for (const [name, pages, pageCount] of [
      ['answer', review.answerPdfPages, review.answerPdfPageCount],
      ['commentary', review.commentaryPdfPages, review.commentaryPdfPageCount],
    ]) {
      if (
        !Array.isArray(pages) ||
        pages.length === 0 ||
        !pages.every((page) => Number.isInteger(page) && page > 0 && page <= pageCount)
      ) {
        errors.push(`${review.caseId}: ${name} PDFページ証跡が不正です`);
      }
    }
    if (!Number.isInteger(review.questionPdfPageCount) || review.questionPdfPageCount <= 0) {
      errors.push(`${review.caseId}: question PDFページ数が不正です`);
    }
  }
  if (reviewByCaseId.size !== cases.length) {
    errors.push(`公式PDFレビューの大問数が一致しません: ${reviewByCaseId.size}`);
  }
  for (const caseItem of cases) {
    const review = reviewByCaseId.get(caseItem.caseId);
    if (review === undefined) {
      errors.push(`${caseItem.caseId}: 公式PDFレビュー証跡がありません`);
      continue;
    }
    const casePages = toPageArray(caseItem.source.questionPdfPagesZeroBased);
    if (!casePages.every((page) => page >= 0 && page < review.questionPdfPageCount)) {
      errors.push(`${caseItem.caseId}: 大問PDF範囲が公式PDFページ数を超えています`);
    }
    for (const unit of caseItem.questionUnits) {
      const promptPages = toPageArray(unit.sourcePromptLocator.pdfPageZeroBased);
      if (!promptPages.every((page) => page >= 0 && page < review.questionPdfPageCount)) {
        errors.push(`${unit.questionId}: officialEvidenceのページが大問PDF範囲外です`);
      }
      if (review.reviewStatus === 'completed' && promptPages.length === 0) {
        errors.push(`${unit.questionId}: completedなのに問題冊子ページ証跡がありません`);
      }
    }
  }
}

function validateGeneratedReviewCsv() {
  const reportPath = join(root, 'reports', 'b1-phase2-guidance-review.csv');
  if (!existsSync(reportPath)) {
    errors.push('レビューCSVがありません');
    return;
  }
  const rows = parseCsv(readFileSync(reportPath, 'utf8'));
  const requiredColumns = [
    'questionId',
    'caseId',
    'year',
    'reviewStatus',
    'reviewedAt',
    'reviewedAgainstQuestionPdf',
    'reviewedAgainstAnswerPdf',
    'reviewedAgainstCommentaryPdf',
    'questionPdfPage',
    'answerPdfPage',
    'commentaryPdfPage',
    'reviewNotes',
  ];
  if (rows.length === 0 || !requiredColumns.every((column) => rows[0].includes(column))) {
    errors.push('レビューCSVの列が不足しています');
    return;
  }
  const [header, ...body] = rows;
  const records = body
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ''])));
  if (records.length !== units.length)
    errors.push(`レビューCSV行数が243件ではありません: ${records.length}`);
  const seen = new Set();
  const reviewByCaseId = new Map(
    reviewManifest.caseReviews.map((review) => [review.caseId, review]),
  );
  for (const record of records) {
    if (seen.has(record.questionId))
      errors.push(`レビューCSVのquestionIdが重複しています: ${record.questionId}`);
    seen.add(record.questionId);
    if (!unitIds.has(record.questionId))
      errors.push(`レビューCSVに存在しないquestionIdがあります: ${record.questionId}`);
    const review = reviewByCaseId.get(record.caseId);
    if (review === undefined || record.reviewStatus !== review.reviewStatus) {
      errors.push(`${record.questionId}: レビューCSVと公式レビュー証跡が一致しません`);
    }
    if (record.reviewStatus === 'needs_review' && !record.reviewNotes.trim()) {
      errors.push(`${record.questionId}: needs_reviewなのにreviewNotesが空です`);
    }
    if (
      record.reviewStatus === 'completed' &&
      [
        record.reviewedAgainstQuestionPdf,
        record.reviewedAgainstAnswerPdf,
        record.reviewedAgainstCommentaryPdf,
        record.questionPdfPage,
        record.answerPdfPage,
        record.commentaryPdfPage,
      ].some((value) => !String(value).trim() || value === 'false')
    ) {
      errors.push(`${record.questionId}: completedに必要なPDF証跡が不足しています`);
    }
  }
  if (seen.size !== unitIds.size) errors.push('レビューCSVとB-1 questionIdの対応が一致しません');
}

function validateA2Links() {
  const a2Ids = new Set(a2.questions.map((question) => question.code));
  for (const caseItem of cases) {
    const aliases = caseItem.topics.flatMap((topic) => topicAliasData.aliases[topic] ?? []);
    const selected = [
      ...new Map(
        a2.questions
          .filter((question) =>
            aliases.some(
              (alias) => question.subcategory.includes(alias) || question.question.includes(alias),
            ),
          )
          .map((question) => [question.code, question]),
      ).values(),
    ].slice(0, 3);
    for (const question of selected) {
      if (!a2Ids.has(question.code)) errors.push(`${caseItem.caseId}: 不正なA2 IDがあります`);
    }
    if (selected.length < 3 && !supportSource.includes('十分な件数で特定できないため')) {
      errors.push(`${caseItem.caseId}: not_applicableのreasonが確認できません`);
    }
  }
}

function validateAnswerLeakageCandidates() {
  for (const answer of fields.flatMap((field) => field.acceptedAnswers)) {
    if (answer.length >= 3 && supportSource.includes(answer)) {
      errors.push(`正答漏えい候補が学習支援ソースにあります: ${answer}`);
    }
  }
}

function getUnresolvedQuestionIds() {
  const reviewByCaseId = new Map(
    reviewManifest.caseReviews.map((review) => [review.caseId, review]),
  );
  return units
    .filter((unit) => {
      const caseItem = cases.find((item) =>
        item.questionUnits.some((entry) => entry.questionId === unit.questionId),
      );
      return (
        caseItem === undefined || reviewByCaseId.get(caseItem.caseId)?.reviewStatus !== 'completed'
      );
    })
    .map((unit) => unit.questionId);
}

function toPageArray(value) {
  return Array.isArray(value) ? value : [value];
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) rows.push([...row, field]);
  return rows;
}
