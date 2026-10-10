import { readFileSync, writeFileSync } from 'node:fs';
import { calculateB1ContentHash } from '../src/domain/b1Content.mjs';

const path = process.argv.find((a) => a.endsWith('.json')) ?? 'data/sc-b-pilot-2025-fall.json';
const check = process.argv.includes('--check');
const payload = JSON.parse(readFileSync(path, 'utf8'));
let mismatches = 0;
for (const item of payload.cases) {
  const generated = calculateB1ContentHash(item);
  if (check && item.content_hash !== generated) {
    console.error(`${item.source_id}: content_hash不一致`);
    mismatches++;
  }
  if (!check) item.content_hash = generated;
}
if (!check) writeFileSync(path, JSON.stringify(payload, null, 2) + '\n');
console.log(
  `SC B content_hash ${check ? 'check' : '生成'}: ${payload.cases.length}大問 / 不一致${mismatches}件`,
);
if (mismatches) process.exitCode = 1;
