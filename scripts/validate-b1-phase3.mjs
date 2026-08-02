import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const read = (path) => readFileSync(join(root, path), 'utf8');
const errors = [];
const legacy = readJson('data/b1-cases-2023-2025-ready.json');
const phase1 = readJson('data/b1-cases-2016-2022-ready.json');
const cases = [...legacy.cases, ...phase1.cases];
const units = cases.flatMap((item) => item.questionUnits);
const fields = units.flatMap((item) => item.answerFields);
const years = [...new Set(cases.map((item) => item.year))].sort();
const packageJson = readJson('package.json');
const database = read('src/database/database.ts');
const supportUi = read('src/features/b1/B1LearningPanels.tsx');
const sessionUi = read('src/pages/B1SessionPage.tsx');
const practiceUi = read('src/pages/B1PracticePage.tsx');
const backup = read('src/domain/backup.ts');

if (cases.length !== 27 || units.length !== 243 || fields.length !== 379) {
  errors.push(
    `B-1件数が不正です: ${cases.length} cases / ${units.length} units / ${fields.length} fields`,
  );
}
if (years.join(',') !== '2016,2017,2018,2019,2021,2022,2023,2024,2025' || years.includes(2020)) {
  errors.push('年度は2020を除く9年度である必要があります');
}
if (packageJson.version !== '0.6.0')
  errors.push('package.jsonのversionは0.6.0である必要があります');
for (const scriptName of ['validate:data', 'validate:b1', 'check', 'check:release']) {
  const script = String(packageJson.scripts?.[scriptName] ?? '');
  if (!script.includes('validate-b1-phase3') && !script.includes('validate:b1-phase3')) {
    errors.push(`${scriptName}にB-1 Phase 3検証が含まれていません`);
  }
}
for (const mode of ['training', 'practical', 'mock90'])
  if (!supportUi.includes(mode) && !sessionUi.includes(mode) && !practiceUi.includes(mode))
    errors.push(`演習モードがありません: ${mode}`);
for (const label of [
  'current_core',
  'modern_successor',
  'historical_context',
  'low_current_priority',
])
  if (!read('src/domain/b1LearningSupport.ts').includes(label))
    errors.push(`現在性ラベルがありません: ${label}`);
for (const type of ['current_focus', 'all_years', 'legacy_reading'])
  if (!read('src/pages/B1MockSelectionPage.tsx').includes(type))
    errors.push(`模試種別がありません: ${type}`);
for (const name of ['b1AnswerAttempts', 'b1Preferences', 'this.version(9)'])
  if (!database.includes(name)) errors.push(`IndexedDB移行がありません: ${name}`);
for (const name of ['answerAttempts', 'preferences', 'BACKUP_FORMAT_VERSION = 5'])
  if (!backup.includes(name)) errors.push(`バックアップ拡張がありません: ${name}`);
if (!sessionUi.includes("learningMode !== 'mock90'"))
  errors.push('mock90解答中の補助情報を分離していません');
if (supportUi.includes('acceptedAnswers'))
  errors.push('解答前UIにacceptedAnswersを含めてはいけません');
if (errors.length) {
  console.error('FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(
  `PASSED: B-1 Phase 3 (${cases.length} cases / ${units.length} units / ${fields.length} answer fields)`,
);
