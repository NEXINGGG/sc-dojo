import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Produces a JSON representation whose object-property order is deterministic.
 * Array order is preserved because it is part of the data's meaning.
 */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

/**
 * Hashes parsed JSON instead of the checked-out file bytes so the integrity
 * check is unaffected by line endings, indentation, or object key ordering.
 */
export function hashJsonFile(path) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  return createHash('sha256').update(stableStringify(value)).digest('hex').toUpperCase();
}
