import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const errors = [];
const packageJson = readJson('package.json');
const requiredSources = [
  'src/domain/b1Progress.ts',
  'src/features/b1/B1AnswerForm.tsx',
  'src/features/b1/b1Repository.ts',
  'src/pages/B1SessionPage.tsx',
  'src/pages/B1ProgressPage.tsx',
  'src/domain/backup.ts',
  'src/database/database.ts',
];

for (const source of requiredSources) {
  if (!existsSync(join(root, source))) errors.push(`Phase 4の必須ファイルがありません: ${source}`);
}

const checks = [
  ['src/database/database.ts', 'this.version(10)', 'IndexedDBのPhase 4マイグレーション'],
  ['src/database/types.ts', 'unitConfirmations', '回答確定データ'],
  ['src/database/types.ts', 'selfGradeUpdatedAt', '自己評価日時'],
  ['src/domain/b1Progress.ts', 'summarizeB1UnitProgress', '進捗集計の純粋関数'],
  ['src/features/b1/B1AnswerForm.tsx', '模範解答と自分の回答を確認する', '模範解答比較UI'],
  ['src/pages/B1SessionPage.tsx', '回答を確定して模範解答を確認する', '回答確定UI'],
  ['src/pages/B1ProgressPage.tsx', '次に復習する問題', '復習導線'],
  ['src/domain/backup.ts', 'BACKUP_FORMAT_VERSION = 6', 'Phase 4バックアップ形式'],
];

for (const [path, requiredText, label] of checks) {
  if (!existsSync(join(root, path)) || !read(path).includes(requiredText)) {
    errors.push(`${label}が実装されていません: ${path}`);
  }
}

if (packageJson.scripts?.['validate:b1-phase4'] !== 'node scripts/validate-b1-phase4.mjs') {
  errors.push('validate:b1-phase4スクリプトが正しく登録されていません');
}
for (const scriptName of ['validate:data', 'validate:b1', 'prebuild', 'check', 'check:release']) {
  const script = String(packageJson.scripts?.[scriptName] ?? '');
  if (!script.includes('validate-b1-phase4') && !script.includes('validate:b1-phase4')) {
    errors.push(`${scriptName}にB-1 Phase 4検証が組み込まれていません`);
  }
}

if (errors.length > 0) {
  console.error('FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('PASSED: B-1 Phase 4 confirmation, self-assessment, review, and progress wiring');
