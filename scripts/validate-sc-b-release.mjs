import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { calculateB1ContentHash } from '../src/domain/b1Content.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const counts = [
  [7, 7],
  [12, 15],
  [11, 12],
  [4, 13],
  [10, 13],
  [9, 11],
  [10, 13],
  [10, 13],
  [9, 11],
  [10, 12],
  [6, 11],
  [7, 12],
  [10, 17],
  [11, 25],
  [10, 17],
  [12, 22],
  [10, 13],
  [9, 15],
  [8, 10],
  [6, 30],
];
const sittings = ['2023-FALL', '2024-SPRING', '2024-FALL', '2025-SPRING', '2025-FALL'];
export function validateScBRelease(payload, options = {}) {
  const categories = options.categories ?? read('data/sc-b-categories.json');
  const sets = options.sets ?? read('data/sc-b-exam-sets.json');
  const sources = options.sources ?? read('data/sc-b-v1-sources.json');
  const map = options.map ?? read('data/sc-b-v1-source-map.json');
  const pilot = options.pilot ?? read('data/sc-b-pilot-2025-fall.json');
  const pilotMaterialReview = options.pilotMaterialReview ?? (existsSync('data/sc-b-v1-pilot-material-review.json') ? read('data/sc-b-v1-pilot-material-review.json') : {entries:[]});
  const imageReport = options.imageReport ?? read('data/sc-b-v1-image-report.json');
  const a2 = new Map(read('data/a2-questions.json').questions.map((q) => [q.code, q]));
  const causes = new Set(read('data/sc-b-failure-causes.json').failureCauses.map((c) => c.id));
  const readAsset = options.readAsset ?? ((url) => readFileSync('public' + url));
  const errors = [];
  const check = (test, message) => {
    if (!test) errors.push(message);
  };
  check(payload.dataset_version === 'sc-b-v1', 'dataset_version');
  check(payload.cases.length === 20, '20大問');
  check(new Set(payload.cases.map((c) => c.source_id)).size === 20, 'source_id 20件一意');
  const categoryIds = new Set(categories.categories.map((c) => c.id));
  check(categoryIds.size === 12 && categories.dataset_version === 'sc-b-v1', '12カテゴリ');
  check(sets.sets.length === 5, '5模試');
  for (const sitting of sittings) {
    const examSetId = 'SC-' + sitting + '-PM';
    const items = payload.cases.filter((c) => c.examSetId === examSetId);
    check(
      items.length === 4 &&
        items
          .map((c) => c.questionNumber)
          .sort()
          .join() === '1,2,3,4',
      examSetId + ':4大問',
    );
    const set = sets.sets.find((s) => s.examSetId === examSetId);
    check(
      set?.presentedCount === 4 &&
        set.selectedCount === 2 &&
        set.durationSeconds === 9000 &&
        set.session === 'pm' &&
        set.exam === 'SC' &&
        set.caseIds.length === 4 &&
        set.caseIds.every((id) => items.some((c) => c.caseId === id)),
      examSetId + ':4問→2問・150分',
    );
  }
  check(sources.sources.length === 15, '5回×公式3資料');
  for (const source of sources.sources) {
    check(/^https:\/\/www\.ipa\.go\.jp\//.test(source.url), 'IPA以外の正本');
    try {
      check(
        digest(readFileSync(source.path)) === source.sha256,
        source.examSetId + ':' + source.kind + ' PDF hash',
      );
    } catch {
      errors.push(source.examSetId + ':正本PDF不在');
    }
  }
  const pdfIds = new Set();
  const units = new Set();
  for (const [index, c] of payload.cases.entries()) {
    const id = `SC-${c.year}-${c.term.toUpperCase()}-PM-Q${String(c.questionNumber).padStart(2, '0')}`;
    check(
      c.source_id === id &&
        c.caseId === id &&
        c.examCode === 'SC' &&
        c.originalSection === 'pm' &&
        c.dataset_version === 'sc-b-v1' &&
        sittings.includes(`${c.year}-${c.term.toUpperCase()}`),
      id + ':出典・旧形式除外',
    );
    check(c.content_hash === calculateB1ContentHash(c), id + ':content_hash');
    check(
      c.questionUnits.length === counts[index]?.[0] &&
        c.questionUnits.reduce((n, u) => n + u.answerFields.length, 0) === counts[index]?.[1],
      id + ':設問・欄数',
    );
    check(
      c.categoryIds.every((x) => categoryIds.has(x)) &&
        c.categoryIds.includes(c.primaryCategory) &&
        c.secondaryCategories.every((x) => x !== c.primaryCategory && c.categoryIds.includes(x)),
      id + ':主副カテゴリ',
    );
    check(
      ['easy', 'normal', 'hard'].includes(c.difficulty) &&
        (c.difficultyNotes?.length > 20 || c.questionUnits.every((u) => u.difficultyNotes?.length)),
      id + ':難易度根拠',
    );
    check(c.commentarySummary?.length > 25, id + ':採点講評要約');
    const pdfId = `${c.examCode}/${c.year}/${c.term}/${c.originalSection}`;
    pdfIds.add(pdfId);
    const qs = sources.sources.find((s) => s.examSetId === c.examSetId && s.kind === 'qs');
    check(
      c.source.questionPdfUrl === qs?.url && c.source.questionDocumentHash === qs?.sha256,
      id + ':PDF識別',
    );
    const locs = [
      ...c.body.sections.flatMap((s) => [s.id, ...s.paragraphs.map((p) => p.id)]),
      ...c.body.materials.map((m) => m.id),
    ];
    check(
      new Set(locs).size === locs.length &&
        c.body.readingOrder.length === locs.length &&
        c.body.readingOrder.every((r) => locs.includes(r.id)),
      id + ':本文位置と順序',
    );
    const offset = c.examSetId === 'SC-2024-SPRING-PM' ? 1 : 0;
    c.body.originalPages.forEach((p, i) => {
      const physicalZero = p.pdfPageZeroBased ?? p.printedPage + offset - 1;
      check(
        p.printedPage + offset === physicalZero + 1 &&
          physicalZero === c.source.questionPdfPagesZeroBased[i] &&
          physicalZero < qs.pageCount,
        id + ':PDFページ位置',
      );
    });
    const assets = [
      ...c.body.materials,
      ...c.body.originalPages,
      ...c.questionUnits.flatMap((u) =>
        u.answerFields.map((f) => f.officialAnswerAsset).filter(Boolean),
      ),
    ].filter((asset) => asset.assetUrl);
    for (const asset of assets) {
      check(
        /^\/questions\/sc\/b\/(?:2023-fall|2024-(?:spring|fall)|2025-(?:spring|fall))\//.test(
          asset.assetUrl,
        ),
        id + ':SC画像パス',
      );
      check((asset.alt ?? asset.text)?.trim(), id + ':画像alt');
      try {
        const bytes = readAsset(asset.assetUrl);
        check(digest(bytes) === asset.assetHash, id + ':画像hash');
        check(bytes.length < 2_000_000, id + ':画像precacheサイズ');
      } catch {
        errors.push(id + ':必要画像がない ' + asset.assetUrl);
      }
    }
    if (c.body.figureTableInventory) {
      check(
        new Set(c.body.figureTableInventory.map((m) => m.id)).size ===
          c.body.figureTableInventory.length,
        id + ':図表ID',
      );
      check(
        c.body.figureTableInventory.every(
          (m) =>
            ['table', 'code', 'log', 'text', 'image', 'figure'].includes(m.kind) &&
            locs.includes(m.pageRef) &&
            m.classificationStatus === 'visual_inventory_checked',
        ),
        id + ':図表分類',
      );
    }
    for (const u of c.questionUnits) {
      check(!units.has(u.questionId) && u.questionId.startsWith(id + '-S'), id + ':設問ID');
      units.add(u.questionId);
      check(
        u.grading.mode === 'self_grade' && !u.grading.exactAutomaticEligible,
        u.questionId + ':自己採点',
      );
      check(
        u.evidenceRefs.length && u.evidenceRefs.every((r) => locs.includes(r)),
        u.questionId + ':根拠位置',
      );
      check(
        ['asked', 'lookAt', 'reasoning', 'officialAnswerReason', 'commonMistakes'].every((k) =>
          u.explanation[k]?.trim(),
        ) && u.answerStrategy.length >= 3,
        u.questionId + ':解説・答案手順',
      );
      check(
        u.relatedA2QuestionIds.every((code) => a2.has(code)) && u.relatedA2QuestionIds.length <= 3,
        u.questionId + ':A2連動',
      );
      check(
        u.relatedA2Categories.every((cat) => [...a2.values()].some((q) => q.category_id === cat)),
        u.questionId + ':A2カテゴリ',
      );
      check(
        u.guidance.applicableFailureCauseIds.every((cause) => causes.has(cause)),
        u.questionId + ':失点原因',
      );
      check(
        u.answerFields.length &&
          new Set(u.answerFields.map((f) => f.fieldId)).size === u.answerFields.length,
        u.questionId + ':欄ID',
      );
      for (const f of u.answerFields) {
        check(!f.choices || f.choices.every((choice) => typeof choice === 'string' && choice.trim()), u.questionId + ':解答群の文字列仕様');
        check(
          f.officialAnswer?.trim() &&
            f.label &&
            (f.maxLength === null || (Number.isInteger(f.maxLength) && f.maxLength > 0)) &&
            Array.isArray(f.acceptableAnswers) &&
            Array.isArray(f.requiredKeywords) &&
            Array.isArray(f.scoringPoints),
          u.questionId + '/' + f.fieldId + ':answerField',
        );
        if (f.gradingExcluded)
          check(
            c.examSetId === 'SC-2024-SPRING-PM' &&
              c.questionNumber === 4 &&
              u.label === '設問2(3)' &&
              f.label.startsWith('システム運用担当者'),
            u.questionId + ':採点除外範囲',
          );
        if (f.answerFormat === 'diagram')
          check(f.officialAnswerAsset, u.questionId + ':図示公式答案');
      }
    }
    const entry = map.entries.find((e) => e.source_id === id);
    check(entry, id + ':source map');
    if (options.requireReleaseReview) {
      const review = entry?.secondaryReview;
      const officialSources = sources.sources.filter((s) => s.examSetId === c.examSetId);
      const editorialHash = digest(JSON.stringify(c));
      check(
        entry?.visualReviewStatus === 'completed' &&
            entry.mobileParagraphTranscriptionStatus === 'completed' &&
            ['transcription_status', 'answer_review_status', 'figure_review_status',
              'content_review_status', 'commentary_review_status'].every((k) => entry[k] === 'verified') &&
            review?.reviewedContentHash === c.content_hash &&
            review?.reviewedEditorialHash === editorialHash &&
            officialSources.every((s) => review.sourceHashes?.[s.kind] === s.sha256) &&
            review?.paragraphIds?.length === c.body.sections.flatMap((s) => s.paragraphs).length &&
            c.body.sections.flatMap((s) => s.paragraphs).every((p) => review.paragraphIds?.includes(p.id)) &&
            c.body.materials.every((m) => review.materialIds?.includes(m.id) &&
              ['A', 'B', 'C', 'D', 'E'].includes(m.classification) &&
              !/^page-/.test(m.id) &&
              (m.classification !== 'E' || (m.assetUrl && m.imageReason?.trim())) &&
              (m.classification !== 'B' || (m.renderText && m.headers?.length && m.rows?.length)) &&
              (!['A', 'C'].includes(m.classification) || (m.renderText && m.text?.trim()))) &&
            c.body.originalPageMode !== true &&
            c.body.sections?.some((section) => section.paragraphs.length > 0) &&
            c.questionUnits.every(
              (unit) =>
                unit.requiresManualPromptTranscription !== true &&
                unit.promptText?.trim() &&
                unit.explanation.necessaryKnowledge?.trim() &&
                review.questionIds?.includes(unit.questionId) &&
                unit.evidenceRefs.every((id) => !/^page-/.test(id)) &&
                unit.answerFields.every((f) => review.answerFieldIds?.includes(unit.questionId + '/' + f.fieldId)) &&
                unit.guidance?.officialEvidence?.length > 0 &&
                unit.guidance.officialEvidence.every(
                  (evidence) => evidence.reviewStatus === 'completed',
                ),
            ),
        id + ':段落教材化・全原本二次校閲未完了',
      );
    }
  }
  check(pdfIds.size === 5, '5回のPDF識別衝突');
  for (const original of pilot.cases) {
    const imported = payload.cases.find((c) => c.source_id === original.source_id);
    const preservedUnits = imported && structuredClone(imported.questionUnits);
    for (const unit of preservedUnits ?? []) {
      if (!original.questionUnits.find((u) => u.questionId === unit.questionId)?.explanation.necessaryKnowledge)
        delete unit.explanation.necessaryKnowledge;
    }
    check(
      imported && JSON.stringify(preservedUnits) === JSON.stringify(original.questionUnits),
      original.source_id + ':pilot設問・全学習支援保持',
    );
    const transformation = pilotMaterialReview.entries.find((e) => e.source_id === original.source_id);
    if (transformation) {
      const sections = structuredClone(imported.body.sections);
      for (const section of sections) for (const p of section.paragraphs) {
        delete p.sectionId; delete p.paragraphId;
      }
      check(JSON.stringify(sections) === JSON.stringify(original.body.sections), original.source_id + ':pilot段落保持');
      check(transformation.originalMaterialHash === digest(JSON.stringify(original.body.materials)) &&
        transformation.structuredMaterialHash === digest(JSON.stringify(imported.body.materials)) &&
        JSON.stringify(transformation.materialIds) === JSON.stringify(original.body.materials.map((m) => m.id)) &&
        imported.body.materials.length === original.body.materials.length &&
        imported.body.materials.every((m) => ['A','B','C','D','E'].includes(m.classification) && m.printedPage === original.body.materials.find((o) => o.id === m.id)?.printedPage) &&
        original.body.materials.filter((m) => ['code','log'].includes(m.kind) && m.renderText).every((m) => imported.body.materials.find((i) => i.id === m.id)?.text === m.text),
        original.source_id + ':pilot図表の原本転記証跡');
      continue;
    }
    // Reversible image encoding may change bytes/hash, never the pilot content.
    // Restore the pinned source asset hashes before checking the pilot identity.
    const preserved = imported && structuredClone(imported);
    for (const m of [...(preserved?.body.materials ?? []), ...(preserved?.body.originalPages ?? [])]) {
      const proof = imageReport.pixelProofs.find((p) => p.optimizedUrl === m.assetUrl);
      if (proof) {
        check(proof.decodedPixelEquality === true && proof.optimizedHash === m.assetHash,
          original.source_id + ':pilot画像可逆変換証跡');
        m.assetHash = proof.originalHash;
      }
    }
    check(
      preserved && calculateB1ContentHash(preserved) === original.content_hash,
      original.source_id + ':pilot本文・図表保持',
    );
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateScBRelease(read('data/sc-b-cases-2023-2025-ready.json'), {
    requireReleaseReview:
      process.argv.includes('--release') ||
      read('data/sc-b-v1-release-gate.json').approved === true,
  });
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log('SC B v1構造検証:20大問/181設問/292欄/5模試/公式15資料/画像/hash/pilot整合 成功');
}
