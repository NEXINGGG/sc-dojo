import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(
  await readFile(resolve(root, 'data/sc-a2-past-question-inventory.json'), 'utf8'),
);
const categories = JSON.parse(
  await readFile(resolve(root, 'data/sc-a2-categories-draft.json'), 'utf8'),
).categories;
const questions = inventory.questions;
const count = (predicate) => questions.filter(predicate).length;
const tally = (values) =>
  values.reduce((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

assert.equal(inventory.runtime_enabled, false);
assert.equal(inventory.inventory_version, 2);
assert.equal(inventory.status, 'final_selection_audited');
assert.equal(inventory.exam_code, 'SC');
assert.equal(inventory.subject_id, 'a2');
assert.equal(questions.length, 425);
assert.equal(inventory.sittings.length, 17);
const expectedSittings = [];
for (let year = 2017; year <= 2025; year++) {
  for (const term of year === 2020 ? ['october'] : ['spring', 'fall']) {
    expectedSittings.push(`SC-${year}-${term.toUpperCase()}`);
  }
}
assert.deepEqual(
  inventory.sittings.map((sitting) => sitting.sitting_id).sort(),
  expectedSittings.sort(),
);
const byId = new Map(questions.map((question) => [question.source_id, question]));
assert.equal(byId.size, 425);
const referenceIds = new Set(inventory.references.map((reference) => reference.id));
const categoryIds = new Set(categories.map((category) => category.id));
const statuses = new Set(['selected', 'reserve', 'rejected']);
const freshnessValues = new Set([
  'current',
  'usable_with_note',
  'obsolete_candidate',
  'historical_only',
  'not_verified',
]);
const visualRequirements = new Set([
  'table',
  'network_diagram',
  'code_or_log',
  'other_figure',
  'relational_schema',
  'math',
]);
for (const sitting of inventory.sittings) {
  assert.equal(sitting.question_count, 25);
  for (const kind of ['question', 'answer']) {
    const url = new URL(sitting[`${kind}_pdf_url`]);
    assert.equal(url.hostname, 'www.ipa.go.jp');
    assert.match(sitting[`${kind}_pdf_sha256`], /^[a-f0-9]{64}$/);
  }
  for (let number = 1; number <= 25; number++) {
    const sourceId = `${sitting.sitting_id}-Q${String(number).padStart(2, '0')}`;
    const question = byId.get(sourceId);
    assert.ok(question, sourceId);
    assert.equal(question.year, sitting.year);
    assert.equal(question.term, sitting.term);
    assert.equal(question.question_number, number);
    assert.equal(question.question_pdf_url, sitting.question_pdf_url);
    assert.equal(question.answer_source_url, sitting.answer_pdf_url);
    assert.ok(
      question.question_pdf_pages.every((page) => page <= sitting.question_pdf_page_count),
      sourceId,
    );
    assert.ok(question.answer_pdf_page <= sitting.answer_pdf_page_count, sourceId);
    assert.equal(question.source_secondary_review.official_index_url, sitting.official_index_url);
  }
}
for (const question of questions) {
  const id = question.source_id;
  assert.match(question.official_answer, /^[アイウエ]$/, id);
  assert.equal(
    question.official_answer_choice_id,
    'ABCD'['アイウエ'.indexOf(question.official_answer)],
    id,
  );
  assert.ok(categoryIds.has(question.estimated_category), id);
  const subcategory = categories
    .find((category) => category.id === question.estimated_category)
    .subcategories.find((sub) => sub.id === question.estimated_subcategory);
  assert.ok(subcategory, id);
  assert.equal(question.domain_id, subcategory.domain_id, id);
  assert.ok(statuses.has(question.adoption_status), id);
  assert.ok(freshnessValues.has(question.freshness), id);
  assert.ok(question.freshness_reason.length > 0, id);
  assert.ok(
    question.freshness_evidence_refs.every((ref) => referenceIds.has(ref)),
    id,
  );
  assert.ok(['basic', 'standard', 'applied'].includes(question.estimated_difficulty), id);
  for (const key of [
    'has_figure',
    'has_table',
    'has_code',
    'has_network_diagram',
    'has_other_formatted_content',
    'current_ui_supported',
  ]) {
    assert.equal(typeof question[key], 'boolean', `${id}: ${key}`);
  }
  assert.ok(!question.has_network_diagram || question.has_figure, id);
  assert.ok(
    question.question_pdf_pages.every((page) => Number.isInteger(page) && page > 0),
    id,
  );
  assert.ok(question.display_requirements.length > 0, id);
  assert.equal(
    question.current_ui_supported,
    question.display_requirements[0] === 'plain_text',
    id,
  );
  if (!question.current_ui_supported) {
    assert.ok(
      question.display_requirements.every((requirement) => visualRequirements.has(requirement)),
      id,
    );
  }
  assert.equal(question.has_table, question.display_requirements.includes('table'), id);
  assert.equal(question.has_code, question.display_requirements.includes('code_or_log'), id);
  assert.equal(
    question.has_network_diagram,
    question.display_requirements.includes('network_diagram'),
    id,
  );
  assert.ok(question.title.length > 0 && question.notes.length > 0, id);
  assert.equal(question.source_secondary_review.status, 'verified', id);
  assert.deepEqual(
    question.source_secondary_review.checks,
    [
      'exam_sc_am2',
      'year_and_term',
      'question_number_and_pdf_page',
      'official_answer_and_choice_id',
      'question_and_answer_links',
      'pdf_sha256',
    ],
    id,
  );
  assert.match(question.source_secondary_review.checked_on, /^\d{4}-\d{2}-\d{2}$/, id);
  assert.ok(question.question_pdf_pages.length > 0, id);
  assert.equal(question.answer_pdf_page, 1, id);
  assert.ok(!Object.hasOwn(question, 'id') && !Object.hasOwn(question, 'code'), id);
  assert.ok(!Object.hasOwn(question, 'explanation'), id);
  assert.equal(question.content_transcription_status, 'not_started', id);
  if (question.adoption_status === 'selected') {
    assert.ok(['current', 'usable_with_note'].includes(question.freshness), id);
    if (question.freshness === 'usable_with_note') {
      assert.ok(question.material_note?.length > 0, id);
      assert.ok(question.freshness_evidence_refs.length > 0, id);
    }
    assert.ok(['practice', 'mock1', 'mock2'].includes(question.assignment), id);
    assert.ok(question.selection_reason.length > 0, id);
    assert.ok(['A', 'B', 'C', 'D', 'E'].includes(question.display_audit.primary_class), id);
    assert.ok(question.display_audit.plan.length > 0, id);
    assert.ok(
      question.display_audit.additional_classes.every((value) => 'BCDE'.includes(value)),
      id,
    );
  } else {
    assert.equal(question.assignment, null, id);
  }
  if (question.adoption_status === 'rejected') {
    assert.ok(question.rejection_reason.length > 0, id);
    if (question.replacement_source_id) assert.ok(byId.has(question.replacement_source_id), id);
  }
  if (question.freshness === 'not_verified') assert.equal(question.adoption_status, 'reserve', id);
  if (question.adoption_status === 'reserve') assert.ok(question.reserve_reason?.length > 0, id);
}
assert.deepEqual(
  tally(questions.map((question) => question.adoption_status)),
  inventory.summary.adoption_status,
);
assert.deepEqual(
  tally(questions.map((question) => question.freshness)),
  inventory.summary.freshness,
);
assert.equal(
  count((question) => question.adoption_status === 'selected'),
  240,
);
const selected = questions.filter((question) => question.adoption_status === 'selected');
assert.deepEqual(
  tally(selected.map((question) => question.freshness)),
  inventory.summary.selected_freshness,
);
assert.equal(inventory.summary.adoption_review_required, 0);
assert.equal(inventory.summary.freshness_review_required, 0);
assert.equal(inventory.summary.selected_source_secondary_verified, selected.length);
const resolution = inventory.audit_resolution;
assert.equal(resolution.selection_ready, true);
assert.equal(resolution.runtime_content_import_ready, false);
assert.equal(resolution.source_missing_count_selected, 0);
assert.equal(resolution.official_answer_mismatch_count_all, 0);
assert.equal(resolution.resolved_review_count, 24);
assert.equal(resolution.original_review_required_source_ids.length, 24);
assert.equal(new Set(resolution.original_review_required_source_ids).size, 24);
for (const id of resolution.original_review_required_source_ids) {
  const question = byId.get(id);
  assert.equal(question.review_resolution.previous_adoption_status, 'review_required', id);
  assert.equal(question.review_resolution.decision, question.adoption_status, id);
  assert.ok(question.review_resolution.reason.length > 0, id);
}
assert.deepEqual(
  tally(resolution.original_review_required_source_ids.map((id) => byId.get(id).adoption_status)),
  resolution.review_decision_counts,
);
assert.deepEqual(
  tally(questions.filter((question) => question.assignment).map((question) => question.assignment)),
  { mock1: 25, practice: 190, mock2: 25 },
);
for (const [groupKey, questionKey] of [
  ['duplicate_groups', 'duplicate_group'],
  ['similar_groups', 'similar_group'],
  ['exact_groups', 'exact_group'],
  ['related_groups', 'related_group'],
]) {
  const groups = inventory[groupKey];
  assert.equal(new Set(groups.map((group) => group.id)).size, groups.length);
  for (const group of groups) {
    assert.ok(group.members.length >= 2, group.id);
    assert.equal(new Set(group.members).size, group.members.length, group.id);
    assert.ok(group.basis.length > 0, group.id);
    const relations = {
      duplicate_groups: ['A', 'B'],
      exact_groups: ['A'],
      similar_groups: ['C'],
      related_groups: ['D'],
    };
    assert.ok(relations[groupKey].includes(group.relation), group.id);
    for (const id of group.members) {
      assert.equal(byId.get(id)?.[questionKey], group.id, id);
    }
    if (groupKey === 'duplicate_groups') {
      assert.ok(
        group.members.filter((id) => byId.get(id).adoption_status === 'selected').length <= 1,
        group.id,
      );
      for (const id of group.members)
        assert.equal(byId.get(id).duplicate_relation, group.relation, id);
      assert.equal(
        group.selected_member,
        group.members.find((id) => byId.get(id).adoption_status === 'selected') ?? null,
        group.id,
      );
      if (group.selected_member) {
        const sourceDate = (question) => question.year * 10 + (question.term === 'spring' ? 1 : 2);
        assert.equal(
          sourceDate(byId.get(group.selected_member)),
          Math.max(...group.members.map((id) => sourceDate(byId.get(id)))),
          group.id,
        );
      }
    }
    if (groupKey === 'exact_groups') {
      const duplicateIds = new Set(group.members.map((id) => byId.get(id).duplicate_group));
      assert.equal(duplicateIds.size, 1, group.id);
      assert.ok(!duplicateIds.has(null), group.id);
      assert.equal(
        new Set(group.members.map((id) => byId.get(id).official_answer)).size,
        1,
        group.id,
      );
    }
    if (groupKey === 'similar_groups') {
      assert.ok(group.learning_assertion.length > 0, group.id);
      if (group.members.filter((id) => byId.get(id).adoption_status === 'selected').length > 1) {
        assert.ok(group.multiple_selection_reason?.length > 0, group.id);
      }
    }
  }
  for (const question of questions) {
    if (question[questionKey]) {
      assert.ok(
        groups.some(
          (group) =>
            group.id === question[questionKey] && group.members.includes(question.source_id),
        ),
      );
    }
  }
}
for (const mock of ['mock1', 'mock2']) {
  const set = questions.filter((question) => question.assignment === mock);
  assert.deepEqual(
    set.map((question) => question.mock_sequence).sort((a, b) => a - b),
    Array.from({ length: 25 }, (_, index) => index + 1),
  );
  const years = Object.values(tally(set.map((question) => question.year)));
  assert.equal(years.length, 9);
  assert.ok(Math.max(...years) <= 4);
  const difficulty = tally(set.map((question) => question.estimated_difficulty));
  assert.ok(difficulty.basic >= 8 && difficulty.standard >= 8 && difficulty.applied >= 3);
  assert.deepEqual(
    { years: tally(set.map((question) => question.year)), difficulty },
    inventory.summary[`${mock}_balance`],
  );
  for (const key of ['duplicate_group', 'similar_group']) {
    const groups = set.map((question) => question[key]).filter(Boolean);
    assert.equal(new Set(groups).size, groups.length, `${mock}: ${key}`);
  }
}
for (const [key, summaryKey] of [
  ['duplicate_group', 'mock_duplicate_group_overlap'],
  ['similar_group', 'mock_similar_group_overlap'],
]) {
  const first = new Set(
    selected
      .filter((question) => question.assignment === 'mock1')
      .map((question) => question[key])
      .filter(Boolean),
  );
  const second = new Set(
    selected
      .filter((question) => question.assignment === 'mock2')
      .map((question) => question[key])
      .filter(Boolean),
  );
  const overlap = [...first].filter((id) => second.has(id)).length;
  assert.equal(overlap, 0, key);
  assert.equal(inventory.summary[summaryKey], overlap);
}
assert.equal(inventory.summary.categories.length, 10);
for (const category of inventory.summary.categories) {
  assert.equal(
    category.inventory,
    count((question) => question.estimated_category === category.id),
  );
  for (const assignment of ['practice', 'mock1', 'mock2']) {
    assert.equal(
      category[assignment],
      count(
        (question) =>
          question.estimated_category === category.id && question.assignment === assignment,
      ),
    );
  }
  assert.equal(category.selected, category.practice + category.mock1 + category.mock2);
  assert.equal(
    category.selected,
    count(
      (question) =>
        question.estimated_category === category.id && question.adoption_status === 'selected',
    ),
  );
}
assert.equal(
  inventory.summary.visual_or_formatted_questions,
  count((question) => !question.current_ui_supported),
);
assert.equal(
  inventory.summary.selected_visual_or_formatted,
  count((question) => !question.current_ui_supported && question.adoption_status === 'selected'),
);
assert.equal(
  inventory.summary.exact_excess_count,
  inventory.exact_groups.reduce((sum, group) => sum + group.members.length - 1, 0),
);
for (const [groupKey, countKey, memberKey] of [
  ['exact_groups', 'exact_groups', 'exact_member_count'],
  ['duplicate_groups', 'duplicate_groups', 'duplicate_member_count'],
  ['similar_groups', 'similar_groups', 'similar_member_count'],
]) {
  assert.equal(inventory.summary[countKey], inventory[groupKey].length);
  assert.equal(
    inventory.summary[memberKey],
    new Set(inventory[groupKey].flatMap((group) => group.members)).size,
  );
}
assert.equal(inventory.summary.related_only_group_count, inventory.related_groups.length);
assert.deepEqual(
  tally(inventory.duplicate_groups.map((group) => group.relation)),
  inventory.summary.duplicate_family_relation_groups,
);
const selectedExcess = inventory.duplicate_groups.reduce(
  (sum, group) =>
    sum +
    Math.max(
      0,
      group.members.filter((id) => byId.get(id).adoption_status === 'selected').length - 1,
    ),
  0,
);
assert.equal(selectedExcess, 0);
assert.equal(inventory.summary.selected_duplicate_excess, selectedExcess);
const originalVisualIds = resolution.original_visual_candidate_ids;
assert.equal(originalVisualIds.length, 29);
assert.equal(new Set(originalVisualIds).size, 29);
for (const id of originalVisualIds) {
  assert.equal(byId.get(id).display_audit.original_29_candidate, true, id);
  assert.ok(byId.get(id).display_audit.plan.length > 0, id);
}
assert.equal(inventory.summary.original_visual_candidates_checked, 29);
assert.deepEqual(
  tally(originalVisualIds.map((id) => byId.get(id).display_audit.primary_class)),
  inventory.summary.original_visual_candidate_classes,
);
assert.deepEqual(
  tally(
    selected
      .filter((question) => !question.current_ui_supported)
      .map((question) => question.display_audit.primary_class),
  ),
  inventory.summary.selected_visual_primary_classes,
);
assert.deepEqual(
  tally(selected.map((question) => question.display_audit.primary_class)),
  inventory.summary.selected_display_primary_classes,
);
for (const file of ['sc-a2-past-question-audit.md', 'sc-a2-content-implementation-readiness.md']) {
  const document = await readFile(resolve(root, 'docs', file), 'utf8');
  assert.ok(!/@@[a-z_]+@@/.test(document), file);
  for (const category of inventory.summary.categories)
    assert.ok(document.includes(category.name), `${file}: ${category.id}`);
  if (file === 'sc-a2-past-question-audit.md') {
    for (const question of selected)
      assert.ok(document.includes(question.source_id), question.source_id);
  }
}
assert.equal(
  inventory.summary.duplicate_excess_count,
  inventory.duplicate_groups.reduce((sum, group) => sum + group.members.length - 1, 0),
);
// The research inventory must stay outside the production import graph.
async function inspectSource(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inspectSource(path);
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) {
      assert.ok(!(await readFile(path, 'utf8')).includes('sc-a2-past-question-inventory'), path);
    }
  }
}
await inspectSource(resolve(root, 'src'));
console.log(
  'SC A-2 final audit: 17 sittings / 425 sources / selected 240 / review 0 / 190+25+25 / A-B-C-D / 29 visuals / freshness / isolated runtime: PASS',
);
