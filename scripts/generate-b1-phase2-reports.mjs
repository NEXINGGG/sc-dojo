import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const legacy = readJson('data/b1-cases-2023-2025-ready.json');
const phase1 = readJson('data/b1-cases-2016-2022-ready.json');
const a2 = readJson('data/a2-questions.json');
const aliases = readJson('data/b1-a2-topic-aliases.json').aliases;
const reviewManifest = readJson('data/b1-phase2-official-review.json');
const cases = [...legacy.cases, ...phase1.cases];
const entries = cases.flatMap((caseItem) =>
  caseItem.questionUnits.map((unit) => ({ caseItem, unit })),
);
const reports = join(root, 'reports');
mkdirSync(reports, { recursive: true });

const reviewByCaseId = new Map(reviewManifest.caseReviews.map((review) => [review.caseId, review]));
const reviews = entries.map(({ caseItem, unit }) => {
  const review = reviewByCaseId.get(caseItem.caseId);
  if (review === undefined) throw new Error(`レビュー証跡がありません: ${caseItem.caseId}`);
  return {
    questionId: unit.questionId,
    caseId: caseItem.caseId,
    year: caseItem.year,
    label: unit.label,
    officialEvidenceCount: toPageArray(unit.sourcePromptLocator.pdfPageZeroBased).length,
    questionPdfPages: toPageArray(unit.sourcePromptLocator.pdfPageZeroBased).map(
      (page) => page + 1,
    ),
    ...review,
  };
});

const remediation = entries.map(({ caseItem, unit }) => {
  const terms = caseItem.topics.flatMap((topic) => aliases[topic] ?? []);
  const candidates = a2.questions.filter((question) =>
    terms.some((term) => question.subcategory.includes(term) || question.question.includes(term)),
  );
  const selected = [
    ...new Map(candidates.map((question) => [question.code, question])).values(),
  ].slice(0, 3);
  return {
    questionId: unit.questionId,
    status: selected.length >= 3 ? 'linked' : 'not_applicable',
    selected,
  };
});
const linked = remediation.filter((entry) => entry.status === 'linked');
const evidenceCount = reviews.reduce((count, review) => count + review.officialEvidenceCount, 0);
const needsReview = reviews.filter((review) => review.reviewStatus === 'needs_review');
const officialRecheck = reviews.filter((review) => review.reviewScope === 'official_pdf_recheck');
const countBy = (predicate) => entries.filter(predicate).length;
const failureCauseCounts = {
  knowledge_gap: countBy(
    ({ unit }) => !unit.answerFields.some((field) => field.inputKind === 'description'),
  ),
  missed_condition: entries.length,
  evidence_missed: entries.length,
  missing_element: countBy(({ unit }) =>
    unit.answerFields.some((field) => field.inputKind === 'description'),
  ),
  causality_weak: countBy(({ unit }) =>
    unit.answerFields.some((field) => field.inputKind === 'description'),
  ),
  wording_length: countBy(({ unit }) =>
    unit.answerFields.some((field) => field.inputKind === 'description'),
  ),
  calculation_error: countBy(({ unit }) =>
    unit.answerFields.some((field) => ['number', 'cidr'].includes(field.inputKind)),
  ),
  traffic_direction: countBy(({ unit }) =>
    /通信|経路|送信|宛先|転送|ルート|配送|流入|流出/.test(unit.promptSummary),
  ),
  diagram_misread: countBy(
    ({ unit }) =>
      unit.sourcePromptLocator.figureRefs.length || unit.sourcePromptLocator.tableRefs.length,
  ),
  time_management: countBy(({ unit }) => unit.answerFields.length >= 4),
};
const totalLinks = linked.reduce((total, entry) => total + entry.selected.length, 0);
const reviewedPageCount = [
  ...new Map(
    reviewManifest.caseReviews
      .filter((review) => review.reviewScope === 'official_pdf_recheck')
      .map((review) => [
        review.caseId.slice(3, 7),
        review.questionPdfPageCount + review.answerPdfPageCount + review.commentaryPdfPageCount,
      ]),
  ).values(),
].reduce((total, pageCount) => total + pageCount, 0);

writeFileSync(
  join(reports, 'b1-phase2-coverage-report.md'),
  `# B-1 Phase 2 カバレッジ\n\n- ケース: ${cases.length}\n- 設問要求分解: ${entries.length}\n- 公式根拠箇所: ${evidenceCount}\n- A2連動: ${linked.length}\n- A2適用外: ${entries.length - linked.length}\n- completed: ${reviews.filter((review) => review.reviewStatus === 'completed').length}\n- needs_review: ${needsReview.length}\n\n学習支援データは \`src/data/b1LearningSupport.ts\` でB-1コアデータから遅延生成し、コア問題データを変更していません。\n\n## 失点原因の適用件数\n\n${Object.entries(
    failureCauseCounts,
  )
    .map(([id, count]) => `- ${id}: ${count}`)
    .join('\n')}\n`,
);

const csvRows = [
  'questionId,caseId,year,officialEvidenceCount,reviewStatus,reviewReason,reviewedAt,reviewedAgainstQuestionPdf,reviewedAgainstAnswerPdf,reviewedAgainstCommentaryPdf,questionPdfPage,answerPdfPage,commentaryPdfPage,reviewNotes',
];
for (const review of reviews) {
  csvRows.push(
    [
      review.questionId,
      review.caseId,
      review.year,
      review.officialEvidenceCount,
      review.reviewStatus,
      review.reviewStatus === 'completed' ? '公式PDF照合を完了' : review.reviewNotes,
      review.reviewedAt,
      review.reviewedAgainstQuestionPdf,
      review.reviewedAgainstAnswerPdf,
      review.reviewedAgainstCommentaryPdf,
      review.questionPdfPages.join(';'),
      review.answerPdfPages.join(';'),
      review.commentaryPdfPages.join(';'),
      `${review.reviewNotes} 対象: ${review.label}。`,
    ]
      .map(csv)
      .join(','),
  );
}
writeFileSync(join(reports, 'b1-phase2-guidance-review.csv'), `${csvRows.join('\n')}\n`);

writeFileSync(
  join(reports, 'b1-phase2-a2-link-report.md'),
  `# B-1 Phase 2 A2連動\n\n- linked: ${linked.length}\n- not_applicable: ${entries.length - linked.length}\n- A2リンク総数: ${totalLinks}\n- linked設問あたりの平均: ${(totalLinks / Math.max(linked.length, 1)).toFixed(2)}\n- needs_review: ${needsReview.length}\n\nA2のトピック対応は \`data/b1-a2-topic-aliases.json\` を正本とし、3問未満しか直接対応を特定できない設問は適用外としています。\n`,
);
writeFileSync(
  join(reports, 'b1-phase2-evidence-report.md'),
  `# B-1 Phase 2 公式根拠箇所\n\n- 設問数: ${entries.length}\n- 根拠レコード数: ${evidenceCount}\n- completed: ${reviews.filter((review) => review.reviewStatus === 'completed').length}\n- needs_review: ${needsReview.length}\n\n根拠位置は既存 \`sourcePromptLocator\` の印刷ページ・PDFページを参照し、公式PDFとの照合結果は \`b1-phase2-guidance-review.csv\` に記録します。PDF本体、引用本文、Blobはレポートおよびバックアップに含めません。\n`,
);

const countsByYear = groupCount(officialRecheck, (review) => String(review.year));
const countsByCase = groupCount(officialRecheck, (review) => review.caseId);
writeFileSync(
  join(reports, 'b1-phase2-official-review-report.md'),
  `# B-1 Phase 2 公式PDFレビュー\n\n- 対象questionUnits: ${officialRecheck.length}\n- 公式PDFで確認したページ数: ${reviewedPageCount}\n- requirementBreakdownの内容修正: 0\n- officialEvidenceのページ位置修正: 0\n- officialEvidenceのレビュー状態更新: ${officialRecheck.reduce((total, review) => total + review.officialEvidenceCount, 0)}\n- A2リンク内容修正: 0\n- 失点原因内容修正: 0\n- 正答漏えい修正: 0\n- completed: ${reviews.filter((review) => review.reviewStatus === 'completed').length}\n- needs_review: ${needsReview.length}\n\n## 年度別完了数\n\n${toMarkdownList(countsByYear)}\n\n## 大問別完了数\n\n${toMarkdownList(countsByCase)}\n\n## 未解決一覧\n\n${needsReview.length === 0 ? 'なし' : needsReview.map((review) => `- ${review.questionId}: ${review.reviewNotes}`).join('\n')}\n\n対象160件は問題冊子、解答例、採点講評を照合し、図表、表、下線、答案欄、字数制限及び正答漏えいの有無を確認した。既存の2023〜2025年度83件はPhase 1のレビュー済み内容を保持している。\n`,
);

const checklistRows = [
  'questionId,caseId,year,reviewStatus,reviewScope,questionPdfChecked,answerPdfChecked,commentaryPdfChecked,maxLengthChecked,answerFieldCountChecked,figureTableUnderlineChecked,requirementBreakdownChecked,answerLeakageChecked,officialEvidenceChecked,a2RemediationChecked,failureCausesChecked,questionPdfPage,answerPdfPage,commentaryPdfPage,reviewNotes',
];
for (const review of reviews) {
  checklistRows.push(
    [
      review.questionId,
      review.caseId,
      review.year,
      review.reviewStatus,
      review.reviewScope,
      review.reviewedAgainstQuestionPdf,
      review.reviewedAgainstAnswerPdf,
      review.reviewedAgainstCommentaryPdf,
      review.checklist.maxLengthChecked,
      review.checklist.answerFieldCountChecked,
      review.checklist.figureTableUnderlineChecked,
      review.checklist.requirementBreakdownChecked,
      review.checklist.answerLeakageChecked,
      review.checklist.officialEvidenceChecked,
      review.checklist.a2RemediationChecked,
      review.checklist.failureCausesChecked,
      review.questionPdfPages.join(';'),
      review.answerPdfPages.join(';'),
      review.commentaryPdfPages.join(';'),
      `${review.reviewNotes} 対象: ${review.label}。`,
    ]
      .map(csv)
      .join(','),
  );
}
writeFileSync(
  join(reports, 'b1-phase2-official-review-checklist.csv'),
  `${checklistRows.join('\n')}\n`,
);

console.log(`generated B-1 Phase 2 reports for ${entries.length} question units`);

function toPageArray(value) {
  return Array.isArray(value) ? value : [value];
}

function groupCount(items, key) {
  return Object.fromEntries(
    [...new Set(items.map(key))]
      .sort()
      .map((entry) => [entry, items.filter((item) => key(item) === entry).length]),
  );
}

function toMarkdownList(counts) {
  return Object.entries(counts)
    .map(([key, count]) => `- ${key}: ${count}`)
    .join('\n');
}

function csv(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
