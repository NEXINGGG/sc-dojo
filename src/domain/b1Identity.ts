import { sameSourceContent } from './contentIdentity';
import type { B1Case } from '../data/b1';
import { calculateB1ContentHash } from './b1Content.mjs';
export { calculateB1ContentHash } from './b1Content.mjs';

export interface B1ContentIdentity {
  datasetVersion: string;
  sourceId: string;
  contentHash: string;
}

export interface B1DatasetManifest {
  key: 'b1';
  manifestVersion: 1;
  datasetVersion: string;
  cases: Record<string, B1ContentIdentity>;
}

export function b1Identity(item: B1Case): B1ContentIdentity {
  return {
    datasetVersion: item.dataset_version!,
    sourceId: item.source_id!,
    contentHash: calculateB1ContentHash(item),
  };
}

export function sameB1Identity(
  left: B1ContentIdentity | undefined,
  right: B1ContentIdentity | undefined,
): boolean {
  return sameSourceContent(left, right) && left?.datasetVersion === right?.datasetVersion;
}

export function createB1Manifest(cases: readonly B1Case[]): B1DatasetManifest {
  return {
    key: 'b1',
    manifestVersion: 1,
    datasetVersion: cases[0]?.dataset_version ?? 'empty-b1',
    cases: Object.fromEntries(cases.map((item) => [item.caseId, b1Identity(item)])),
  };
}

export function b1DocumentId(item: B1Case): string {
  return [
    item.examCode ?? 'NW',
    item.dataset_version ?? 'nw-b1-v4',
    item.year,
    item.term ?? 'spring',
    item.originalSection ?? 'pm1',
    'question',
    item.source.questionDocumentHash ?? 'unverified',
  ].join(':');
}
