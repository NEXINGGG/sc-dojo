import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { calculateB1ContentHash } from '../src/domain/b1Content.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
export function validateScBPilot(
  payload,
  readAsset = (url) =>
    readFileSync('data/sc-b-pilot-assets/' + url.replace('/questions/sc-b/', '')),
) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const categories = new Set(read('data/sc-b-categories-draft.json').categories.map((c) => c.id));
  const a2 = new Set(read('data/a2-questions.json').questions.map((q) => q.code));
  const causes = new Set(read('data/sc-b-failure-causes.json').failureCauses.map((c) => c.id));
  check(
    payload.dataset_version === 'sc-b-pilot-2025-fall-v1' && payload.status === 'development_only',
    'pilot識別が不正',
  );
  check(payload.cases.length === 4, '4大問が必要');
  try {
    check(
      'sha256:' +
        createHash('sha256')
          .update(readAsset('/questions/sc-b/2025-fall/2025r07a_sc_pm_qs.pdf'))
          .digest('hex') ===
        payload.sources.find((s) => s.kind === 'qs')?.sha256,
      '同梱IPA問題PDFのhash不一致',
    );
  } catch {
    errors.push('同梱IPA問題PDFがない');
  }
  check(
    payload.sources.length === 3 &&
      payload.sources.every(
        (s) =>
          /^https:\/\/www\.ipa\.go\.jp\/.+2025r07a_sc_pm_(?:qs|ans|cmnt)\.pdf$/.test(s.url) &&
          /^sha256:[a-f0-9]{64}$/.test(s.sha256),
      ),
    'IPA正本3資料の識別が必要',
  );
  for (const [i, item] of payload.cases.entries()) {
    const id = `SC-2025-FALL-PM-Q0${i + 1}`;
    check(
      item.caseId === id && item.source_id === id && item.examSetId === 'SC-2025-FALL-PM',
      `${id}: 出典ID`,
    );
    check(
      item.dataset_version === payload.dataset_version &&
        item.examCode === 'SC' &&
        item.year === 2025 &&
        item.term === 'fall' &&
        item.originalSection === 'pm',
      `${id}: 試験識別`,
    );
    check(item.content_hash === calculateB1ContentHash(item), `${id}: content_hash不一致`);
    check(item.questionUnits.length === [10, 9, 8, 6][i], `${id}: 設問数`);
    check(
      item.questionUnits.reduce((a, u) => a + u.answerFields.length, 0) === [13, 15, 10, 30][i],
      `${id}: 解答欄数`,
    );
    check(
      item.categoryIds.length && item.categoryIds.every((c) => categories.has(c)),
      `${id}: カテゴリ`,
    );
    check(['easy', 'normal', 'hard'].includes(item.difficulty), `${id}: 難易度`);
    const paragraphs = item.body.sections.flatMap((s) => s.paragraphs);
    const materialIds = item.body.materials.map((m) => m.id);
    const locations = [
      ...item.body.sections.map((s) => s.id),
      ...paragraphs.map((p) => p.id),
      ...materialIds,
    ];
    check(new Set(locations).size === locations.length, `${id}: 本文ID重複`);
    check(
      item.body.readingOrder.length === locations.length &&
        new Set(item.body.readingOrder.map((r) => r.id)).size === locations.length &&
        item.body.readingOrder.every((r) => locations.includes(r.id)),
      `${id}: 原本の読書順序`,
    );
    check(item.body.materials.length === [5, 8, 13, 16][i], `${id}: 図表欠落`);
    for (const p of paragraphs)
      check(
        p.text && p.underlines.every((u) => p.text.includes(u.text)),
        `${id}/${p.id}: 本文又は下線`,
      );
    for (const m of [...item.body.materials, ...item.body.originalPages]) {
      check(
        /^\/questions\/sc-b\/2025-fall\/(?:page-\d{2}|q[1-4]-(?:figure|table)-\d+)\.png$/.test(
          m.assetUrl,
        ),
        `${id}: 画像URL`,
      );
      try {
        check(
          m.assetHash ===
            'sha256:' + createHash('sha256').update(readAsset(m.assetUrl)).digest('hex'),
          `${id}/${m.id ?? m.printedPage}: 画像hash`,
        );
      } catch {
        errors.push(`${id}/${m.assetUrl}: 画像がない`);
      }
    }
    check(
      item.body.materials.every(
        (m) => m.text && (!m.rows || m.rows.every((r) => r.length === m.headers.length)),
      ),
      `${id}: alt又は表の列数`,
    );
    check(
      item.body.originalPages[0].printedPage === [2, 8, 15, 26][i] &&
        item.source.questionPdfPagesZeroBased[0] === [1, 7, 14, 25][i],
      `${id}: PDF開始ページ`,
    );
    const units = new Set();
    for (const u of item.questionUnits) {
      check(!units.has(u.questionId) && u.questionId.startsWith(id + '-S'), `${id}: 設問ID`);
      units.add(u.questionId);
      check(
        u.promptText &&
          u.promptTextIncluded &&
          u.gradingMode === 'self_grade' &&
          !u.grading.exactAutomaticEligible,
        `${u.questionId}: 原本設問と自己採点`,
      );
      check(
        u.evidenceRefs.length && u.evidenceRefs.every((r) => locations.includes(r)),
        `${u.questionId}: 根拠参照`,
      );
      check(
        Object.values(u.explanation).every((v) => typeof v === 'string' && v.length > 0) &&
          u.answerStrategy.length >= 3,
        `${u.questionId}: 解説・答案作成手順`,
      );
      check(
        u.relatedA2QuestionIds.length <= 2 && u.relatedA2QuestionIds.every((r) => a2.has(r)),
        `${u.questionId}: 正式A-2リンク`,
      );
      check(
        u.guidance.applicableFailureCauseIds.every((c) => causes.has(c)),
        `${u.questionId}: SC失点原因`,
      );
      check(
        new Set(u.answerFields.map((f) => f.fieldId)).size === u.answerFields.length,
        `${u.questionId}: 欄ID重複`,
      );
      for (const f of u.answerFields)
        check(
          f.officialAnswer &&
            f.acceptedAnswers.includes(f.officialAnswer) &&
            (f.maxLength === null ||
              (Number.isInteger(f.maxLength) && f.officialAnswer.length <= f.maxLength)) &&
            (f.inputKind !== 'description' || f.scoringPoints.length > 0),
          `${u.questionId}/${f.fieldId}: 公式解答・字数・自己採点ポイント`,
        );
    }
  }
  return errors;
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/validate-sc-b-pilot.mjs')) {
  const payload = read('data/sc-b-pilot-2025-fall.json');
  const errors = validateScBPilot(payload);
  console.log(`SC B 2025秋 pilot: 4大問 / 33設問 / 68解答欄 / 42図表 / エラー${errors.length}件`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}
