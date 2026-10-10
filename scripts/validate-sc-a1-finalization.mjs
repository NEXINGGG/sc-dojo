import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { calculateQuestionContentHash } from '../src/domain/questionContent.mjs';

export function validateA1Finalization(draft, audit, production, baseline) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const entries = draft.entries;
  check(
    entries.length === 240 && new Set(entries.map((q) => q.code)).size === 240,
    '240 unique codes',
  );
  check(
    new Set(entries.map((q) => q.id)).size === 240 &&
      entries.every((q) => q.code === `A1-${String(q.id).padStart(3, '0')}`),
    'stable id/code',
  );
  check(new Set(entries.map((q) => q.source_id)).size === 240, 'unique source_ids');
  for (const [decision, n] of [
    ['KEEP', 180],
    ['FIX', 45],
    ['REPLACE', 15],
  ])
    check(entries.filter((q) => q.decision === decision).length === n, `${decision} count`);
  check(
    draft.fixes.length === 45 && new Set(draft.fixes.map((q) => q.code)).size === 45,
    '45 individual fixes',
  );
  check(
    draft.replacements.length === 15 &&
      new Set(draft.replacements.map((q) => q.source_id)).size === 15,
    '15 official replacements',
  );
  for (const [assignment, n] of [
    ['practice', 180],
    ['mock1', 30],
    ['mock2', 30],
  ]) {
    const rows = entries.filter((q) => q.assignment === assignment);
    check(rows.length === n, `${assignment} count`);
    check(
      rows
        .map((q) => q.sequence)
        .sort((a, b) => a - b)
        .every((v, i) => v === i + 1),
      `${assignment} sequence`,
    );
    if (assignment !== 'practice') {
      check(
        rows.filter((q) => q.difficulty === '標準').length >= 10,
        `${assignment} standard difficulty`,
      );
      check(
        rows.some((q) => q.difficulty === '難') && rows.some((q) => q.difficulty === '基礎'),
        `${assignment} difficulty spread`,
      );
      check(
        ['technology', 'management', 'strategy'].every(
          (domain) => rows.filter((q) => q.domain === domain).length >= 5,
        ),
        `${assignment} domain spread`,
      );
    }
  }
  for (const row of audit.questions) {
    const entry = entries.find((q) => q.code === row.code);
    check(
      entry?.decision === (row.decision === 'REMOVE_CANDIDATE' ? 'REPLACE' : row.decision),
      `${row.code} decision`,
    );
    if (row.decision === 'KEEP')
      check(entry?.preserve_history === true, `${row.code} KEEP history`);
    if (row.decision === 'FIX') {
      const fix = draft.fixes.find((q) => q.code === row.code);
      check(fix?.preserve_history === entry?.preserve_history, `${row.code} FIX history`);
      check(
        fix?.preserve_history ===
          !fix?.targets.some((t) =>
            ['question', 'choices', 'correct_choice', 'stimulus'].includes(t),
          ),
        `${row.code} content separation`,
      );
      check(['P1', 'P2', 'P3'].includes(fix?.priority), `${row.code} fix priority`);
    }
  }
  for (const candidate of draft.replacements) {
    const entry = entries.find((q) => q.code === candidate.code);
    check(
      entry?.decision === 'REPLACE' &&
        !entry.preserve_history &&
        entry.source_id === candidate.source_id,
      `${candidate.code} replacement identity`,
    );
    check(
      candidate.source_id ===
        `IPA-KOUDO-AM1-${candidate.year}-${candidate.season}-Q${String(candidate.question_number).padStart(2, '0')}`,
      `${candidate.code} official source id`,
    );
    check(
      candidate.source_status === 'OFFICIAL_PAST_QUESTION' &&
        ['A', 'B', 'C', 'D'].includes(candidate.correct_choice),
      `${candidate.code} official answer`,
    );
    check(
      ['official_question_url', 'official_answer_url'].every((k) =>
        /^https:\/\/www\.ipa\.go\.jp\//.test(candidate[k]),
      ),
      `${candidate.code} official URL`,
    );
    check(
      ['question_pdf_sha256', 'answer_pdf_sha256'].every((k) =>
        /^[a-f0-9]{64}$/.test(candidate[k]),
      ),
      `${candidate.code} PDF evidence`,
    );
  }
  check(
    baseline.entries.length === 240 && baseline.datasetVersion === 'legacy-sc-a1-v0',
    'frozen baseline',
  );
  for (const q of production.questions) {
    const old = baseline.entries.find((e) => e.code === q.code);
    if (
      production.metadata.dataset_version !== 'sc-a1-v1' ||
      entries.find((e) => e.code === q.code)?.preserve_history
    )
      check(old?.contentHash === calculateQuestionContentHash(q), `${q.code} production unchanged`);
  }
  check(
    draft.runtime_enabled === false && draft.production_mutation === false,
    'draft never runtime',
  );
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const errors = validateA1Finalization(
    read('data/sc-a1-source-code-map-draft.json'),
    read('data/sc-a1-audit.json'),
    read('data/questions.json'),
    read('data/sc-a1-legacy-manifest.json'),
  );
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      'PASS: 240 draft entries / 45 fixes / 15 official replacements / 180+30+30 / frozen production',
    );
}
