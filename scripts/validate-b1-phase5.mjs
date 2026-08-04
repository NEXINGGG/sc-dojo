import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const errors = [];
const packageJson = readJson('package.json');

const requiredSources = [
  'src/domain/b1MockExam.ts',
  'src/domain/b1MockExam.test.ts',
  'src/features/b1/b1Repository.ts',
  'src/features/b1/b1Repository.test.ts',
  'src/pages/B1MockSelectionPage.tsx',
  'src/pages/B1SessionPage.tsx',
  'src/pages/B1ProgressPage.tsx',
  'src/pages/B1Flow.test.tsx',
  'src/domain/backup.ts',
];

for (const source of requiredSources) {
  if (!existsSync(join(root, source))) errors.push(`Phase 5の必須ファイルがありません: ${source}`);
}

const checks = [
  ['src/domain/b1MockExam.ts', 'summarizeB1MockAnswers', '回答欄単位の模試集計'],
  ['src/domain/b1MockExam.ts', 'getB1MockElapsedSeconds', '開始日時基準の経過時間計算'],
  ['src/features/b1/b1Repository.ts', 'createSubmittedMockConfirmations', '提出時の回答確定'],
  ['src/features/b1/b1Repository.ts', 'discardInProgressMock', '途中模試の破棄'],
  ['src/features/b1/b1Repository.ts', 'deleteCompletedMock', '確定済み模試履歴の削除'],
  ['src/pages/B1MockSelectionPage.tsx', 'この内容でB-1模試を開始しますか？', '開始前確認画面'],
  ['src/pages/B1SessionPage.tsx', '提出結果の概要', '提出後の結果概要'],
  ['src/pages/B1SessionPage.tsx', '答案はこの端末に自動保存されています。', '自動保存状態の表示'],
  ['src/pages/B1ProgressPage.tsx', 'この模試履歴を削除する', '模試履歴の削除確認'],
  ['src/domain/backup.ts', 'mockSessions', 'B-1模試バックアップ'],
];

for (const [path, requiredText, label] of checks) {
  if (!existsSync(join(root, path)) || !read(path).includes(requiredText)) {
    errors.push(`${label}が実装されていません: ${path}`);
  }
}

if (packageJson.scripts?.['validate:b1-phase5'] !== 'node scripts/validate-b1-phase5.mjs') {
  errors.push('validate:b1-phase5スクリプトが正しく登録されていません');
}
for (const scriptName of ['validate:data', 'validate:b1', 'prebuild', 'check', 'check:release']) {
  const script = String(packageJson.scripts?.[scriptName] ?? '');
  if (!script.includes('validate-b1-phase5') && !script.includes('validate:b1-phase5')) {
    errors.push(`${scriptName}にB-1 Phase 5検証が組み込まれていません`);
  }
}
for (const phase of [1, 2, 3, 4]) {
  const script = String(packageJson.scripts?.['validate:b1'] ?? '');
  if (!script.includes(`validate-b1-phase${phase}`)) {
    errors.push(`validate:b1からB-1 Phase ${phase}検証が失われています`);
  }
}

if (errors.length > 0) {
  console.error('FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('PASSED: B-1 Phase 5 mock examination completion, history, and review wiring');
