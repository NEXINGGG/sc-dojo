import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const inventory = read('data/sc-a2-past-question-inventory.json');
const selected = inventory.questions.filter((q) => q.adoption_status === 'selected');
const path = 'data/sc-a2-source-code-map.json';
const assignments = ['practice', 'mock1', 'mock2'];
const ordered = assignments.flatMap((assignment) =>
  selected
    .filter((q) => q.assignment === assignment)
    .sort((a, b) => a.source_id.localeCompare(b.source_id)),
);
assert.equal(ordered.length, 240);
const entries = ordered.map((q, i) => ({
  code: `A2-${String(i + 1).padStart(3, '0')}`,
  id: 1001 + i,
  source_id: q.source_id,
  assignment: q.assignment,
}));
if (existsSync(path)) {
  assert.deepEqual(read(path).entries, entries, '既存の正式対応表を自動変更しません');
} else {
  writeFileSync(
    path,
    JSON.stringify(
      {
        map_version: 1,
        dataset_version: 'sc-a2-v1',
        selection_revision: inventory.selection_revision,
        finalized_on: '2026-10-07',
        rule: 'v1初回のみpractice/mock1/mock2順、各組内source_id辞書順。以後はこの対応表を正本として使用し、再抽選・再採番しない。',
        entries,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log('PASS: immutable source/code map 240 / 190+25+25');
