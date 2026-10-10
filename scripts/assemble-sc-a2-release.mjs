import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateScA2Release } from './validate-sc-a2-release.mjs';
import { processQuestionContentHashes } from './question-material-data.mjs';

/** Assemble only reviewed manuscripts. A failed check never overwrites production data. */
export function main(args = process.argv.slice(2)) {
  try {
    if (args.some((arg) => arg !== '--publish'))
      throw new Error('Usage: node scripts/assemble-sc-a2-release.mjs [--publish]');
    const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
    const inventory = read('data/sc-a2-past-question-inventory.json');
    const mapping = read('data/sc-a2-source-code-map.json');
    const manuscript = read('data/sc-a2-v1-authoring.json');
    const review = read('data/sc-a2-v1-secondary-review.json');
    const draft = read('data/sc-a2-categories-draft.json');
    const categories = {
      schema_version: 1,
      exam_id: 'information_security_specialist',
      exam_code: 'SC',
      subject_id: 'a2',
      metadata: {
        status: 'release',
        dataset_version: 'sc-a2-v1',
        selection_revision: inventory.selection_revision,
        category_id_policy: '監査済みsc_* IDを正式採用。表示名と分離し，更新時もIDを維持する。',
      },
      domains: draft.domains,
      categories: draft.categories.map((category) => {
        const allocation = inventory.summary.categories.find((c) => c.id === category.id);
        const formal = {
          ...category,
          allocation: {
            category_drill: allocation.practice,
            mock_exam_1: allocation.mock1,
            mock_exam_2: allocation.mock2,
            total: allocation.selected,
          },
          subcategories: category.subcategories.map((sub) => {
            const selected = inventory.questions.filter(
              (q) => q.adoption_status === 'selected' && q.estimated_subcategory === sub.id,
            );
            return {
              ...sub,
              allocation: {
                category_drill: selected.filter((q) => q.assignment === 'practice').length,
                mock_exam_1: selected.filter((q) => q.assignment === 'mock1').length,
                mock_exam_2: selected.filter((q) => q.assignment === 'mock2').length,
                total: selected.length,
              },
            };
          }),
        };
        // Draft minima are planning history. The final audited selection is authoritative.
        delete formal.coverage_constraints;
        return formal;
      }),
    };
    const bySource = new Map(manuscript.questions.map((q) => [q.source.source_id, q]));
    const auditedBySource = new Map(inventory.questions.map((q) => [q.source_id, q]));
    const missing = mapping.entries.filter((row) => !bySource.has(row.source_id));
    if (missing.length) throw new Error(`未作成${missing.length}問。正式教材を変更しません。`);
    if (bySource.size !== 240)
      throw new Error('原稿はselected 240問と完全一致する必要があります。');
    const questions = mapping.entries.map((row) => {
      const q = structuredClone(bySource.get(row.source_id));
      const number = { practice: null, mock1: 1, mock2: 2 }[row.assignment];
      return {
        ...q,
        id: row.id,
        code: row.code,
        source_id: row.source_id,
        question_set: {
          id: number === null ? 'category_drill' : `mock_exam_${number}`,
          number,
          sequence: number === null ? null : auditedBySource.get(row.source_id).mock_sequence,
        },
      };
    });
    const payload = {
      schema_version: 1,
      metadata: {
        dataset_version: 'sc-a2-v1',
        subject_id: 'a2',
        title: '情報処理安全確保支援士 科目A-2 正式教材240問',
        question_count: 240,
        language: 'ja-JP',
        source_inventory: 'data/sc-a2-past-question-inventory.json',
        selection_revision: inventory.selection_revision,
        source_code_map: 'data/sc-a2-source-code-map.json',
        exam_format: {
          time_minutes: 40,
          question_count: 25,
          passing_score_percent: 60,
          passing_correct_count: 15,
        },
        answer_choice_ids: ['A', 'B', 'C', 'D'],
        question_sets: { category_drill: 190, mock_exam_1: 25, mock_exam_2: 25 },
        copyright_note: '問題・公式正解の出典はIPA。解説は本教材独自作成。',
      },
      questions,
    };
    const hashed = processQuestionContentHashes(payload, { mode: 'update', strictScA2: true });
    const errors = [
      ...hashed.errors,
      ...validateScA2Release(
        hashed.payload,
        inventory,
        categories,
        mapping,
        review,
        read('data/sc-a2-pilot-30.json'),
      ),
    ];
    if (errors.length) throw new Error(errors.join('\n'));
    if (args.includes('--publish')) {
      writeFileSync('data/a2-categories.json', JSON.stringify(categories, null, 2) + '\n');
      writeFileSync('data/a2-questions.json', JSON.stringify(hashed.payload, null, 2) + '\n');
      console.log('PASS: audited SC A-2 v1 replaced production data');
    } else
      console.log(
        'PASS: SC A-2 v1 assembly / review / hash check. --publishで正式教材へ置換できます。',
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
