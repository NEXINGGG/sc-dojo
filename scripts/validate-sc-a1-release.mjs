import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateData } from './validate-data.mjs';
import { calculateQuestionContentHash } from '../src/domain/questionContent.mjs';
export const a1ReviewFields = [
  'question',
  'choice_A',
  'choice_B',
  'choice_C',
  'choice_D',
  'official_answer',
  'figures',
  'year',
  'term',
  'question_number',
  'source_id',
];
const equal = (a, b) => isDeepStrictEqual(a, b);
const counts = (values) =>
  Object.fromEntries(
    [...new Set(values)].sort().map((v) => [v, values.filter((x) => x === v).length]),
  );
const sets = { practice: 'category_drill', mock1: 'mock_exam_1', mock2: 'mock_exam_2' };
export function validateScA1Release(payload, categories, draft, audit, baseline, mapping, review) {
  const errors = validateData(payload, categories);
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const questions = payload.questions ?? [];
  check(payload.metadata?.dataset_version === 'sc-a1-v1', 'dataset_version sc-a1-v1');
  check(payload.metadata?.question_count === 240 && questions.length === 240, '240 questions');
  check(
    equal(
      questions.map((q) => q.id),
      Array.from({ length: 240 }, (_, i) => i + 1),
    ),
    'id range 1..240',
  );
  check(
    new Set(questions.map((q) => q.code)).size === 240 &&
      questions.every((q) => q.code === `A1-${String(q.id).padStart(3, '0')}`),
    'A1 unique codes',
  );
  check(new Set(questions.map((q) => q.source?.source_id)).size === 240, 'unique source_ids');
  check(
    mapping.dataset_version === draft.dataset_version &&
      mapping.status === 'FINALIZED' &&
      mapping.entries?.length === 240,
    'final source map',
  );
  for (const key of ['summary', 'fixes', 'swaps', 'category_proposals'])
    check(equal(mapping[key], draft[key]), `frozen map ${key}`);
  check(
    mapping.replacements?.length === 15 &&
      mapping.replacements.every((row) => {
        const official = draft.replacements.find((r) => r.code === row.code);
        const question = questions.find((q) => q.code === row.code);
        return (
          official &&
          question &&
          equal(
            { ...official, content_hash: question.content_hash, authoring_status: 'COMPLETED' },
            row,
          )
        );
      }),
    'frozen official replacement map',
  );
  check(
    equal(counts(questions.map((q) => q.category_id)), draft.summary.categories),
    'category distribution',
  );
  check(
    equal(counts(questions.map((q) => q.domain_id)), draft.summary.domains),
    'domain distribution',
  );
  for (const [assignment, setId] of Object.entries(sets)) {
    const rows = questions
      .filter((q) => q.question_set.id === setId)
      .sort((a, b) => a.question_set.sequence - b.question_set.sequence);
    const planned = draft.summary.assignments[assignment];
    check(
      equal(
        rows.map((q) => q.code),
        planned.codes,
      ),
      `${assignment} count/sequence`,
    );
    check(
      equal(counts(rows.map((q) => q.category_id)), planned.categories),
      `${assignment} category spread`,
    );
    check(
      equal(counts(rows.map((q) => q.domain_id)), planned.domains),
      `${assignment} domain spread`,
    );
    check(
      equal(
        counts(rows.map((q) => (q.difficulty === '応用' ? '難' : q.difficulty))),
        planned.difficulty,
      ),
      `${assignment} difficulty spread`,
    );
  }
  check(
    review.status === 'completed' && review.questions?.length === 15,
    '15 completed secondary reviews',
  );
  check(new Set(review.questions?.map((r) => r.code)).size === 15, 'unique secondary reviews');
  check(
    review.fix_reviews?.length === 45 && new Set(review.fix_reviews.map((r) => r.code)).size === 45,
    '45 completed FIX reviews',
  );
  for (const q of questions) {
    const label = q.code;
    const planned = draft.entries.find((e) => e.code === label);
    const final = mapping.entries?.find((e) => e.code === label);
    const old = baseline.entries.find((e) => e.code === label);
    const audited = audit.questions.find((e) => e.code === label);
    if (!planned || !old || !audited || !final) {
      errors.push(`${label} missing authoritative entry`);
      continue;
    }
    check(
      q.subject_id === 'a1' &&
        q.source_id === q.source?.source_id &&
        q.source.source_id === planned.source_id,
      `${label} subject/source_id`,
    );
    const { content_hash: plannedHash, ...frozen } = planned;
    check(
      equal({ ...frozen, content_hash: q.content_hash }, final),
      `${label} source-code-map frozen fields`,
    );
    check(
      plannedHash === null || plannedHash === q.content_hash,
      `${label} planned preserved hash`,
    );
    check(
      planned.audit_decision === audited.decision &&
        planned.decision ===
          (audited.decision === 'REMOVE_CANDIDATE' ? 'REPLACE' : audited.decision),
      `${label} audit decision`,
    );
    check(
      q.category_id === planned.category &&
        q.domain_id === planned.domain &&
        q.technology_field === planned.technology_field,
      `${label} category metadata`,
    );
    check(
      q.question_set.id === sets[planned.assignment] &&
        q.question_set.sequence === planned.sequence,
      `${label} assignment`,
    );
    const category = categories.categories.find((c) => c.id === q.category_id);
    check(
      category?.subcategories.some((s) => s.id === q.subcategory_id && s.name === q.subcategory),
      `${label} subcategory belongs to category`,
    );
    check(q.content_hash === calculateQuestionContentHash(q), `${label} content_hash`);
    const same =
      old.sourceId === q.source.source_id && old.contentHash === calculateQuestionContentHash(q);
    check(same === planned.preserve_history, `${label} history identity`);
    const fix = draft.fixes.find((e) => e.code === label);
    if (fix) {
      check(
        q.difficulty === (fix.final_difficulty === '難' ? '応用' : fix.final_difficulty),
        `${label} FIX difficulty`,
      );
      const fixReview = review.fix_reviews?.find((r) => r.code === label);
      check(
        fixReview?.status === 'verified' &&
          fixReview.fix_class === fix.fix_class &&
          fixReview.priority === fix.priority &&
          fixReview.source_id === q.source_id &&
          fixReview.content_hash === q.content_hash &&
          equal(fixReview.changed_targets, fix.targets),
        `${label} FIX reviewed targets`,
      );
      check(
        fix.targets.every((target) => {
          const key = target === 'category' ? 'category_id' : target;
          return equal(q[key], fixReview?.reviewed_fields?.[key]);
        }),
        `${label} FIX reviewed fields`,
      );
    }
    if (planned.decision !== 'REPLACE') {
      check(
        q.source.type === 'original' &&
          q.source.verbatim_past_question === false &&
          /^SC-A1-ORIGINAL-\d{3}$/.test(q.source.source_id),
        `${label} original namespace`,
      );
      continue;
    }
    const official = draft.replacements.find((e) => e.code === label);
    check(
      official &&
        q.correct_choice === official.correct_choice &&
        q.source.type === 'official_past_question' &&
        q.source.verbatim_past_question === true,
      `${label} specified replacement/answer`,
    );
    if (!official) continue;
    for (const key of [
      'year',
      'question_number',
      'official_answer',
      'official_question_url',
      'official_answer_url',
    ])
      check(q.source[key] === official[key], `${label} official ${key}`);
    check(
      q.source.term === official.season.toLowerCase() && q.source.exam === 'KOUDO-AM1',
      `${label} official sitting`,
    );
    check(
      Object.keys(q.choice_explanations ?? {})
        .sort()
        .join() === 'A,B,C,D' &&
        Object.values(q.choice_explanations ?? {}).every((s) => typeof s === 'string' && s.trim()),
      `${label} four educational explanations`,
    );
    check(
      typeof q.exam_tip === 'string' && q.exam_tip.trim() && Array.isArray(q.related_terms),
      `${label} educational fields`,
    );
    const row = review.questions.find((e) => e.code === label);
    check(
      row?.status === 'verified' &&
        row.source_id === official.source_id &&
        row.content_hash === q.content_hash &&
        row.pdf_page === official.pdf_page &&
        row.question_pdf_sha256 === official.question_pdf_sha256 &&
        row.answer_pdf_sha256 === official.answer_pdf_sha256,
      `${label} secondary review identity`,
    );
    check(
      a1ReviewFields.every((key) => row?.checks?.[key] === 'verified'),
      `${label} secondary review fields`,
    );
  }
  const actualReplacements = questions.filter((q) => q.source.type === 'official_past_question');
  check(
    actualReplacements.length === 15 &&
      actualReplacements.every((q) =>
        draft.replacements.some((r) => r.code === q.code && r.source_id === q.source.source_id),
      ),
    'no unselected official questions',
  );
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const file = process.argv[2] ?? 'data/sc-a1-v1-candidate.json';
  const errors = validateScA1Release(
    read(file),
    read('data/categories.json'),
    read('data/sc-a1-source-code-map-draft.json'),
    read('data/sc-a1-audit.json'),
    read('data/sc-a1-legacy-manifest.json'),
    read('data/sc-a1-source-code-map.json'),
    read('data/sc-a1-v1-secondary-review.json'),
  );
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      `PASS: ${file}: 240 / 180+30+30 / frozen audit/map / 197 retained+43 separated / 15 reviewed / 240 hashes`,
    );
}
