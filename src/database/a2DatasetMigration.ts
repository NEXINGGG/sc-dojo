import type { A1DojoDatabase } from './database';
import { getSubjectCatalog } from '../data/catalog';
import { createA2Manifest, type QuestionDatasetManifest } from '../domain/questionManifest';
import { reconcileQuestionDataset } from './questionDatasetMigration';

export async function reconcileA2Dataset(
  database: A1DojoDatabase,
  manifest?: QuestionDatasetManifest,
): Promise<void> {
  const catalog = getSubjectCatalog('a2');
  if (!manifest && !/^sc-a2-v[0-9]+$/.test(catalog.datasetVersion ?? '')) return;
  await reconcileQuestionDataset(
    database,
    manifest ?? createA2Manifest(catalog.questions, catalog.datasetVersion!),
  );
}
