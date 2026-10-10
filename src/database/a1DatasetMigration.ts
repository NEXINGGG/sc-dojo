import type { A1DojoDatabase } from './database';
import { getSubjectCatalog } from '../data/catalog';
import {
  a1LegacyManifest,
  createA1Manifest,
  type QuestionDatasetManifest,
} from '../domain/questionManifest';
import { reconcileQuestionDataset } from './questionDatasetMigration';

export async function reconcileA1Dataset(
  database: A1DojoDatabase,
  manifest?: QuestionDatasetManifest,
): Promise<void> {
  const catalog = getSubjectCatalog('a1');
  await reconcileQuestionDataset(
    database,
    manifest ?? createA1Manifest(catalog.questions, catalog.datasetVersion),
    a1LegacyManifest,
  );
}
