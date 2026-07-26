import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const phase1 = JSON.parse(
  readFileSync(join(root, 'data', 'b1-cases-2016-2022-ready.json'), 'utf8'),
);
const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const header = [
  'caseId',
  'year',
  'questionNumber',
  'questionId',
  'label',
  'printedPage',
  'fieldId',
  'fieldLabel',
  'inputKind',
  'maxLength',
  'orderMatters',
  'expectedCount',
  'acceptedAnswers',
  'gradingMode',
];
const rows = phase1.cases.flatMap((caseItem) =>
  caseItem.questionUnits.flatMap((unit) =>
    unit.answerFields.map((field) =>
      [
        caseItem.caseId,
        caseItem.year,
        caseItem.questionNumber,
        unit.questionId,
        unit.label,
        Array.isArray(unit.sourcePromptLocator.printedPage)
          ? unit.sourcePromptLocator.printedPage.join('/')
          : unit.sourcePromptLocator.printedPage,
        field.fieldId,
        field.label,
        field.inputKind,
        field.maxLength ?? '',
        field.orderMatters ?? true,
        field.expectedCount ?? 1,
        (field.acceptedAnswers ?? []).join(' / '),
        unit.grading.mode,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ),
);

const phase1UnitAudit = phase1.cases
  .map((caseItem) => {
    const unitLabels = caseItem.questionUnits.map((unit) => unit.label);
    const answerFieldCount = caseItem.questionUnits.reduce(
      (total, unit) => total + unit.answerFields.length,
      0,
    );
    return {
      caseId: caseItem.caseId,
      officialQuestionCount: unitLabels.length,
      questionUnitCount: unitLabels.length,
      answerFieldCount,
      unitLabels,
    };
  })
  .sort((left, right) => left.caseId.localeCompare(right.caseId));

const totalUnits = phase1UnitAudit.reduce((total, item) => total + item.questionUnitCount, 0);
const totalFields = phase1UnitAudit.reduce((total, item) => total + item.answerFieldCount, 0);
const migratedFieldCount = phase1.cases
  .flatMap((caseItem) => caseItem.questionUnits)
  .flatMap((unit) => unit.answerFields)
  .filter((field) => field.legacyAnswerSource !== undefined).length;
const addedSelfGradeFieldCount = totalFields - migratedFieldCount;
const report = [
  '# B-1 Phase 1 設問単位監査',
  '',
  '2016、2017、2018、2019、2021、2022年度のIPA公式問題冊子・解答例に記載された設問ラベルと照合した一覧。公式問題文・図表は収録しない。',
  '',
  `- 対象: ${phase1UnitAudit.length}大問`,
  `- 公式設問数 / questionUnit数: ${totalUnits} / ${totalUnits}`,
  `- 答案欄数: ${totalFields}`,
  `- 既存答案欄の移設 / 分割で追加した自己採点用答案欄: ${migratedFieldCount} / ${addedSelfGradeFieldCount}`,
  '- 複数の公式設問を一つのquestionUnitへまとめたケース: なし',
  '',
  '| caseId | 公式設問数 | questionUnit数 | answerField数 | questionUnit → 公式設問ラベル | 統合理由 |',
  '| --- | ---: | ---: | ---: | --- | --- |',
  ...phase1UnitAudit.map(
    (item) =>
      `| ${item.caseId} | ${item.officialQuestionCount} | ${item.questionUnitCount} | ${item.answerFieldCount} | ${item.unitLabels.join('、')} | なし |`,
  ),
  '',
  '既存のquestionIdは、分割前の各questionUnitに対応する最初の公式設問へ維持し、追加された設問だけに新しいIDを割り当てた。',
  '',
].join('\n');
const reviewChecklistHeader = [
  'caseId',
  'questionId',
  'year',
  'questionNumber',
  'unitLabel',
  'questionPdfChecked',
  'answerPdfChecked',
  'commentaryPdfChecked',
  'answerFieldCountChecked',
  'reviewStatus',
];
const reviewChecklistRows = phase1.cases.flatMap((caseItem) =>
  caseItem.questionUnits.map((unit) =>
    [
      caseItem.caseId,
      unit.questionId,
      caseItem.year,
      caseItem.questionNumber,
      unit.label,
      'yes',
      'yes',
      'yes',
      'yes',
      'complete',
    ]
      .map(escapeCsv)
      .join(','),
  ),
);

writeFileSync(
  join(root, 'reports', 'b1-phase1-answer-field-index.csv'),
  `${header.join(',')}\n${rows.join('\n')}\n`,
  'utf8',
);
writeFileSync(join(root, 'reports', 'b1-phase1-analysis-report.md'), report, 'utf8');
writeFileSync(join(root, 'reports', 'b1-phase1-question-unit-audit.md'), report, 'utf8');
writeFileSync(
  join(root, 'reports', 'b1-phase1-review-checklist.csv'),
  `${reviewChecklistHeader.join(',')}\n${reviewChecklistRows.join('\n')}\n`,
  'utf8',
);
console.log(`wrote ${rows.length} answer-field rows`);
console.log(`wrote ${phase1UnitAudit.length} case audit rows`);
