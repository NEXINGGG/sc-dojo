import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { manuscript } from './sc-b-v1-authoring.mjs';
import { inventories, commentaries, a2Links } from './sc-b-v1-review-notes.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
// This bootstrap assembler contains the initial page-image drafts. Never overwrite
// later transcriptions, optimized assets or signed editorial decisions with them.
const candidatePath = 'data/sc-b-cases-2023-2025-ready.json';
if (existsSync(candidatePath) && read(candidatePath).cases.some((c) =>
  c.year !== 2025 || c.term !== 'fall'
    ? c.body.sections?.some((s) => s.paragraphs?.length)
    : false)) {
  throw new Error('段落教材化済み候補を初期画像版で上書きできません。転記編集スクリプトを使用してください。');
}
const write = (p, d) => writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
const hash = (p) => 'sha256:' + createHash('sha256').update(readFileSync(p)).digest('hex');
const draft = read('data/sc-b-categories-draft.json');
const pilot = read('data/sc-b-pilot-2025-fall.json');
const sources = read('data/sc-b-v1-sources.json').sources;
const ranges = {
  '2023-fall': [
    [2, 6],
    [7, 15],
    [16, 22],
    [23, 31],
  ],
  '2024-spring': [
    [3, 12],
    [13, 21],
    [22, 30],
    [31, 40],
  ],
  '2024-fall': [
    [2, 11],
    [12, 21],
    [22, 29],
    [30, 39],
  ],
  '2025-spring': [
    [2, 9],
    [10, 19],
    [20, 28],
    [29, 37],
  ],
};
const prompts = {
  '2023-fall': [[6], [14, 15], [21, 22], [31]],
  '2024-spring': [[12], [21], [30], [39, 40]],
  '2024-fall': [[11], [20, 21], [29], [39]],
  '2025-spring': [
    [8, 9],
    [18, 19],
    [27, 28],
    [36, 37],
  ],
};
const a2 = read('data/a2-questions.json').questions;
// Explicit topic matches, reviewed against the corresponding A-2 prompts below.
const links = {
  クロスサイトスクリプティング: ['XSS', 'クロスサイトスクリプティング'],
  CSRF: ['CSRF', 'クロスサイトリクエストフォージェリ'],
  SQLインジェクション: ['SQLインジェクション'],
  認可: ['アクセス制御'],
  証明書: ['サーバ証明書'],
  秘密鍵: ['秘密鍵'],
  DDoS: ['DDoS'],
  ログ: ['ログの分析', 'ログを分析'],
  リスクアセスメント: ['リスクアセスメント'],
  SBOM: ['SBOM'],
  マルウェア: ['EDR'],
  ハッシュ: ['ソルト', 'salt'],
  SPF: ['SPF'],
  DKIM: ['DKIM'],
  WebAuthn: ['WebAuthn', 'FIDO'],
};
const mapping = [];
const cases = [];
for (const [sitting, questions] of Object.entries(manuscript)) {
  const [yearString, term] = sitting.split('-');
  const year = Number(yearString);
  const offset = sitting === '2024-spring' ? 1 : 0;
  const examSetId = `SC-${year}-${term.toUpperCase()}-PM`;
  const src = sources.filter((s) => s.examSetId === examSetId);
  const directory = `public/questions/sc/b/${sitting}`;
  mkdirSync(directory, { recursive: true });
  for (const [i, units] of questions.entries()) {
    const caseId = `${examSetId}-Q0${i + 1}`;
    const category = draft.case_inventory.find((c) => c.source_id === caseId);
    const [start, end] = ranges[sitting][i];
    const originalPages = [];
    const materials = [];
    const inventory = [];
    for (let page = start; page <= end; page++) {
      const name = `q${i + 1}-page-${String(page - offset).padStart(2, '0')}.png`;
      const source = `tmp/sc-b-v1/${sitting}/qs-${String(page).padStart(2, '0')}.png`;
      copyFileSync(source, `${directory}/${name}`);
      const assetUrl = `/questions/sc/b/${sitting}/${name}`;
      const assetHash = hash(`${directory}/${name}`);
      originalPages.push({
        printedPage: page - offset,
        pdfPageZeroBased: page - 1,
        assetUrl,
        assetHash,
        alt: `IPA ${year}年度${term === 'spring' ? '春期' : '秋期'} 午後 問${i + 1} ${page - offset}ページ。原本の本文，空欄，下線，図表，注記，設問を含む。`,
      });
      materials.push({
        id: `page-${page - offset}`,
        kind: 'image',
        caption: `原本 ${page - offset}ページ`,
        text: originalPages.at(-1).alt,
        assetUrl,
        assetHash,
        printedPage: page - offset,
        renderText: false,
      });
    }
    for (const [label, page, kind, caption, lastPage = page] of inventories[sitting][i]) {
      inventory.push({
        id: `${label.startsWith('表') ? 'table' : 'figure'}-${label.slice(1)}`,
        label,
        caption,
        kind,
        printedPage: page - offset,
        printedPages: Array.from({ length: lastPage - page + 1 }, (_, j) => page + j - offset),
        pageRef: `page-${page - offset}`,
        assetUrl: originalPages.find((p) => p.pdfPageZeroBased === page - 1).assetUrl,
        classificationStatus: 'visual_inventory_checked',
        textRenderingStatus: 'original_image_only',
      });
    }
    const questionUnits = units.map((unit) => {
      const questionId = `${caseId}-S${unit.label.replace(/[()]/g, (v) => (v === '(' ? '-' : ''))}`;
      const evidenceRefs = unit.pages.map((p) => `page-${p - offset}`);
      const f = unit.fields.map(([label, officialAnswer, maxLength]) => {
        const excluded =
          sitting === '2024-spring' &&
          i === 3 &&
          unit.label === '2(3)' &&
          label.startsWith('システム運用担当者');
        const description =
          officialAnswer.length > 12 ||
          /方法|理由|処理|内容|対策|事項|攻撃|調査|仕組み|図示|変更|考え方/.test(label);
        return {
          fieldId: label,
          label,
          inputKind: description
            ? 'description'
            : /^\d+(?:\.\d+)?$/.test(officialAnswer)
              ? 'number'
              : 'term',
          maxLength,
          acceptedAnswers: excluded ? [] : [officialAnswer],
          officialAnswer,
          acceptableAnswers: [],
          requiredKeywords: [],
          scoringPoints: excluded ? [] : description ? [unit.reasoning, unit.mistake] : [],
          gradingNote: excluded
            ? 'IPA訂正で設問不成立。答案入力・未回答判定から除外します。'
            : '自己採点時の確認ポイントです。IPAの公式配点・採点基準ではありません。意味と因果関係で確認してください。',
          orderMatters: true,
          expectedCount: 1,
          notes: excluded ? '設問不成立（2024-07-19 IPA訂正）' : null,
          ...(excluded ? { gradingExcluded: true } : {}),
          ...(label === '図示' ? { answerFormat: 'diagram' } : {}),
        };
      });
      const relatedTerms = Object.keys(links).filter((term) => unit.reasoning.includes(term));
      // Do not choose an arbitrary first match. Store reviewed selections in a separate map.
      const relatedA2QuestionIds = a2Links[`${sitting}/${i + 1}/${unit.label}`] ?? [];
      const relatedA2Categories = [
        ...new Set(relatedA2QuestionIds.map((code) => a2.find((q) => q.code === code).category_id)),
      ];
      const officialEvidence = unit.pages.map((p, j) => ({
        evidenceId: `${questionId}-E${j + 1}`,
        sourceType: 'figure',
        printedPage: p - offset,
        pdfPageZeroBased: p - 1,
        reference: `page-${p - offset}`,
        figureRef: null,
        tableRef: null,
        summary: '本文の根拠位置（IPA原本ページ）',
        reason: unit.reasoning,
        reviewStatus: 'needs_review',
      }));
      const applicableFailureCauseIds = [
        'sc_b_requirement_misread',
        'sc_b_evidence_missed',
        'sc_b_evidence_misread',
        'sc_b_knowledge_gap',
        'sc_b_missing_answer_element',
        ...(unit.reasoning.includes('認証') ? ['sc_b_auth_access_confusion'] : []),
        ...(unit.reasoning.includes('順') ? ['sc_b_direction_sequence_error'] : []),
        ...(f.some((x) => x.maxLength !== null) ? ['sc_b_wording_length'] : []),
      ];
      const promptPages = prompts[sitting][i];
      const commentaryInsight = commentaries[sitting][i][1][unit.label] ?? null;
      return {
        questionId,
        label: `設問${unit.label}`,
        promptSummary: unit.prompt,
        promptTextIncluded: true,
        promptSourceImages: promptPages.map((p) =>
          originalPages.find((x) => x.pdfPageZeroBased === p - 1),
        ),
        answerType: 'structured',
        answerConcepts: [],
        gradingMode: 'self_grade',
        readyForApp: true,
        requiresManualPromptTranscription: true,
        sourcePromptLocator: {
          pdfPageZeroBased: promptPages.map((p) => p - 1),
          printedPage: promptPages.map((p) => p - offset),
          underlineRefs: [],
          figureRefs: [],
          tableRefs: [],
          paragraphIds: [],
          sectionIds: [],
          materialIds: evidenceRefs,
        },
        answerFields: f,
        evidenceRefs,
        explanation: {
          asked: unit.prompt,
          lookAt: evidenceRefs.map((r) => `原本 ${r.slice(5)}ページ`).join('／'),
          reasoning: unit.reasoning,
          officialAnswerReason:
            f
              .filter((f) => !f.gradingExcluded)
              .map((f) => `${f.label}：${f.officialAnswer}`)
              .join('。') + '。本文条件と照合し，意味を確認する。',
          commonMistakes: unit.mistake,
        },
        answerStrategy: [
          '原本の設問で対象・回答形式・字数と枝番を確認する',
          `本文条件を確認する：${unit.reasoning}`,
          '必要な主体・対象・条件・結果を答案に組み立て，指定形式に合わせる',
          `見直す：${unit.mistake}`,
        ],
        commentaryInsight,
        relatedA2QuestionIds,
        relatedA2Categories,
        relatedTerms,
        grading: {
          mode: 'self_grade',
          exactAutomaticEligible: false,
          officialAnswerConcepts: [],
          notice: '自己採点は学習用です。IPAの正式採点や得点・合否を算出しません。',
          caution: f.some((f) => f.gradingExcluded)
            ? '運用担当者の2欄はIPA訂正で設問不成立です。開発者の2欄だけを評価してください。'
            : null,
        },
        guidance: {
          questionId,
          requirementBreakdown: {
            answerTarget: unit.prompt,
            targetObject: f.map((x) => x.label).join('／'),
            targetEnvironment: category.topic_summary,
            situation: unit.reasoning,
            answerForm: 'other',
            requiredAnswerCount: f.filter((f) => !f.gradingExcluded).length,
            maxLength: null,
            responseChecklist: [
              '設問の枝番と空欄記号を確認する',
              '根拠を本文から記録する',
              '字数と回答数を確認する',
            ],
            constraints: f
              .filter((x) => x.maxLength !== null)
              .map((x) => `${x.label}は${x.maxLength}字以内`),
            commonTraps: [unit.mistake],
            trainingHint: unit.reasoning,
          },
          officialEvidence,
          applicableFailureCauseIds,
        },
      };
    });
    const item = {
      caseId,
      subjectId: 'b1',
      dataset_version: 'sc-b-v1',
      source_id: caseId,
      examCode: 'SC',
      term,
      originalSection: 'pm',
      examSetId,
      difficulty: [
        'sc_b_secure_development',
        'sc_b_web_security',
        'sc_b_vulnerability_management',
      ].includes(category.primary_category_id)
        ? 'hard'
        : 'normal',
      difficultyNotes:
        '読解量，コード・表の追跡，複数段階の推論と記述を考慮した学習用分類。IPA公式の難易度ではない。',
      year,
      questionNumber: i + 1,
      title: category.topic_summary,
      categoryIds: category.category_ids,
      primaryCategory: category.primary_category_id,
      secondaryCategories: category.category_ids.filter((c) => c !== category.primary_category_id),
      topics: category.topic_tags,
      estimatedMinutes: 75,
      purposeSummary: category.classification_reason,
      commentarySummary: '',
      source: {
        provider: 'IPA',
        exam: '情報処理安全確保支援士',
        sectionAtTime: '午後',
        currentEquivalent: '科目B',
        questionPdfUrl: src.find((s) => s.kind === 'qs').url,
        answerPdfUrl: src.find((s) => s.kind === 'ans').url,
        commentaryPdfUrl: src.find((s) => s.kind === 'cmnt').url,
        yearPageUrl: draft.references.find((r) => r.exam_set_id === examSetId).year_page_url,
        questionDocumentHash: src.find((s) => s.kind === 'qs').sha256,
        questionPdfPagesZeroBased: originalPages.map((p) => p.pdfPageZeroBased),
        modified: true,
        modificationNote:
          '本文・図表・設問はIPA原本ページ画像として忠実に収録。設問案内・解説・手順・根拠候補・分類は学習用編集。OCRは図表監査の補助資料であり，原本の代替にしない。',
      },
      body: {
        fullTextIncluded: true,
        figuresIncluded: true,
        originalPageMode: true,
        offlineAvailability:
          '本文・図表・設問の原本ページ画像をPWA precacheへ収録。公式PDFは別途端末登録。',
        sections: [],
        materials,
        readingOrder: materials.map((m) => ({ kind: 'material', id: m.id })),
        originalPages,
        figureTableInventory: inventory,
      },
      questionUnits,
    };
    item.commentarySummary = commentaries[sitting][i][0];
    item.difficultyNotes = `原本${end - start + 1}ページ，${questionUnits.length}設問単位，${inventory.filter((x) => ['code', 'log'].includes(x.kind)).length}件のコード・ログ資料。${item.commentarySummary} これは学習用分類でありIPA公式の難易度ではない。`;
    const diagram = questionUnits
      .flatMap((u) => u.answerFields)
      .find((f) => f.answerFormat === 'diagram');
    if (diagram) {
      const assetUrl = '/questions/sc/b/2024-fall/q3-answer-diagram.png';
      diagram.officialAnswerAsset = {
        assetUrl,
        assetHash: hash('public' + assetUrl),
        alt: 'IPA 2024年度秋期 午後 問3 設問2(1)の公式解答例の図。配送先・支払方法選択画面に追加する欄。',
      };
    }
    cases.push(item);
    mapping.push({
      source_id: caseId,
      examSetId,
      physicalPages: [start, end],
      printedPages: [start - offset, end - offset],
      questionUnitCount: questionUnits.length,
      answerFieldCount: questionUnits.reduce((n, u) => n + u.answerFields.length, 0),
      visualInventoryStatus: 'checked',
      visualReviewStatus: 'full_resolution_secondary_review_pending',
      originalAnswerReviewStatus: 'literal_answers_checked',
      mobileParagraphTranscriptionStatus: 'pending',
    });
  }
}
for (const original of pilot.cases) {
  const item = structuredClone(original);
  item.dataset_version = 'sc-b-v1';
  const classification = draft.case_inventory.find((c) => c.source_id === item.source_id);
  item.primaryCategory = classification.primary_category_id;
  item.secondaryCategories = item.categoryIds.filter((c) => c !== item.primaryCategory);
  for (const m of [...item.body.materials, ...item.body.originalPages]) {
    const relative = m.assetUrl.replace('/questions/sc-b/', '');
    const target = `public/questions/sc/b/${relative}`;
    mkdirSync(target.slice(0, target.lastIndexOf('/')), { recursive: true });
    copyFileSync(`data/sc-b-pilot-assets/${relative}`, target);
    m.assetUrl = `/questions/sc/b/${relative}`;
    m.alt = m.text ?? `IPA 2025年度秋期 午後 問${item.questionNumber} ${m.printedPage}ページの原本`;
  }
  delete item.source.localQuestionPdfUrl;
  cases.push(item);
  mapping.push({
    source_id: item.source_id,
    examSetId: item.examSetId,
    pilotImported: true,
    changes: [
      'dataset_versionをsc-b-v1へ変更',
      '画像URLをSC B専用publicパスへ変更（画像バイトとhashは保持）',
      '主・副カテゴリを明示',
      '公式PDFは従来仕様の任意登録へ統一',
    ],
    visualReviewStatus: 'pilot_review_preserved',
    originalAnswerReviewStatus: 'pilot_review_preserved',
  });
}
write('data/sc-b-cases-2023-2025-ready.json', {
  schemaVersion: 3,
  dataset_version: 'sc-b-v1',
  status: 'release_candidate',
  cases,
});
write('data/sc-b-v1-source-map.json', {
  schemaVersion: 1,
  dataset_version: 'sc-b-v1',
  entries: mapping,
});
write('data/sc-b-exam-sets.json', {
  schemaVersion: 1,
  dataset_version: 'sc-b-v1',
  sets: draft.references.map((r) => ({
    examSetId: r.exam_set_id,
    exam: 'SC',
    year: r.year,
    term: r.term,
    session: 'pm',
    label: `${r.year}年度${r.term === 'spring' ? '春期' : '秋期'}`,
    presentedCount: 4,
    selectedCount: 2,
    durationSeconds: 9000,
    caseIds: cases.filter((c) => c.examSetId === r.exam_set_id).map((c) => c.caseId),
  })),
});
write('data/sc-b-categories.json', {
  schemaVersion: 1,
  dataset_version: 'sc-b-v1',
  classificationPolicy: draft.metadata.classification_policy,
  categories: draft.categories.map((c) => ({
    ...c,
    primaryCaseCount: cases.filter((i) => i.primaryCategory === c.id).length,
    relatedCaseCount: cases.filter((i) => i.categoryIds.includes(c.id)).length,
  })),
});
write(
  'tmp/sc-b-v1/a2-link-candidates.json',
  Object.fromEntries(
    Object.entries(links).map(([term, patterns]) => [
      term,
      a2
        .filter((q) => patterns.some((p) => (q.question ?? q.text ?? '').includes(p)))
        .map((q) => ({ code: q.code, text: q.question ?? q.text, category: q.category_id })),
    ]),
  ),
);
console.log(
  `${cases.length} cases / ${cases.reduce((n, c) => n + c.questionUnits.length, 0)} units / ${cases.flatMap((c) => c.questionUnits).reduce((n, u) => n + u.answerFields.length, 0)} fields`,
);
