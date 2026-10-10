import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { processQuestionContentHashes } from './question-material-data.mjs';

export function main(args = process.argv.slice(2)) {
  const modes = args.filter((arg) => arg === '--check' || arg === '--update');
  const files = args.filter((arg) => !arg.startsWith('--'));
  if (
    modes.length !== 1 ||
    files.length !== 1 ||
    args.some(
      (arg) => arg.startsWith('--') && !['--check', '--update', '--strict-sc-a2'].includes(arg),
    )
  ) {
    console.error(
      'Usage: node scripts/update-question-content-hashes.mjs <教材.json> --check|--update [--strict-sc-a2]',
    );
    process.exitCode = 1;
    return;
  }
  try {
    const file = resolve(files[0]);
    const payload = JSON.parse(readFileSync(file, 'utf8'));
    const mode = modes[0].slice(2);
    const result = processQuestionContentHashes(payload, {
      mode,
      strictScA2: args.includes('--strict-sc-a2'),
    });
    if (result.errors.length) {
      for (const error of result.errors) console.error(`ERROR: ${error}`);
      process.exitCode = 1;
      return;
    }
    if (mode === 'update') writeFileSync(file, `${JSON.stringify(result.payload, null, 2)}\n`);
    console.log(`PASSED: ${result.payload.questions.length} question content hashes (${mode})`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
