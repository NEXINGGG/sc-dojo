import { sameSourceContent } from './contentIdentity';
import type { Question } from '../types/question';
import legacyA1Manifest from '../../data/sc-a1-legacy-manifest.json';
import { calculateQuestionContentHash } from './questionContent.mjs';

export interface QuestionManifestEntry {
  code: string;
  sourceId: string;
  contentHash: string;
}

export interface QuestionDatasetManifest {
  key: 'a1' | 'a2';
  manifestVersion: 1;
  datasetVersion: string;
  entries: QuestionManifestEntry[];
}

// This snapshot must stay frozen when the production A-1 content is replaced.
// It also protects devices that skip the preparatory release entirely.
export const a1LegacyManifest: QuestionDatasetManifest = {
  ...legacyA1Manifest,
  key: 'a1',
  manifestVersion: 1,
};

export function createA1Manifest(
  questions: readonly Question[],
  datasetVersion = 'legacy-sc-a1-v0',
): QuestionDatasetManifest {
  return {
    key: 'a1',
    manifestVersion: 1,
    datasetVersion,
    entries: questions.map((q) => ({
      code: q.code,
      sourceId: q.sourceId ?? q.source?.source_id ?? `SC-A1-ORIGINAL-${q.code.slice(3)}`,
      // Recalculate so a stale declared hash cannot conceal a replacement.
      contentHash: calculateQuestionContentHash(q),
    })),
  };
}

export function createA2Manifest(
  questions: readonly Question[],
  datasetVersion: string,
): QuestionDatasetManifest {
  return {
    key: 'a2',
    manifestVersion: 1,
    datasetVersion,
    entries: questions.map((q) => {
      if (!q.sourceId || !q.contentHash) throw new Error(`${q.code}: 教材識別情報がありません。`);
      return { code: q.code, sourceId: q.sourceId, contentHash: q.contentHash };
    }),
  };
}

export function changedQuestionCodes(
  previous: QuestionDatasetManifest | undefined,
  current: QuestionDatasetManifest,
): Set<string> {
  const currentByCode = new Map(current.entries.map((entry) => [entry.code, entry]));
  const previousByCode = new Map(previous?.entries.map((entry) => [entry.code, entry]) ?? []);
  return new Set(
    [...new Set([...currentByCode.keys(), ...previousByCode.keys()])].filter((code) => {
      const before = previousByCode.get(code);
      const after = currentByCode.get(code);
      return !sameSourceContent(before, after);
    }),
  );
}
