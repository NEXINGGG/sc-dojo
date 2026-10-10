import { b1Cases, nwB1Cases } from '../data/b1';
import {
  b1Identity,
  createB1Manifest,
  sameB1Identity,
  type B1DatasetManifest,
} from '../domain/b1Identity';
import type { A1DojoDatabase } from './database';
import type {
  B1AnswerAttemptRow,
  B1LearnerEvidenceRow,
  B1LearningReflectionRow,
  B1MockSessionRow,
  B1PracticeSessionRow,
  B1RemediationProgressRow,
  B1PreferenceRow,
  CloudSyncMetadataRow,
  CloudSyncOutboxRow,
} from './types';

export interface B1DatasetArchive {
  id: string;
  archiveVersion: 1;
  archivedAt: string;
  previousDatasetVersion: string;
  nextDatasetVersion: string;
  previousManifest: B1DatasetManifest;
  data: {
    practiceSessions: B1PracticeSessionRow[];
    mockSessions: B1MockSessionRow[];
    learnerEvidence: B1LearnerEvidenceRow[];
    learningReflections: B1LearningReflectionRow[];
    remediationProgress: B1RemediationProgressRow[];
    answerAttempts: B1AnswerAttemptRow[];
    preferences: B1PreferenceRow[];
    syncMetadata: CloudSyncMetadataRow[];
    syncOutbox: CloudSyncOutboxRow[];
  };
}

const currentB1Manifest = createB1Manifest(b1Cases);
const legacyB1Manifest = createB1Manifest(nwB1Cases);

/** Transactional copy-before-removal, shared manifest/identity policy with A-1/A-2. */
export async function reconcileB1Dataset(
  database: A1DojoDatabase,
  current = currentB1Manifest,
): Promise<void> {
  await database.open();
  const tables = [
    database.b1DatasetManifests,
    database.b1DatasetArchives,
    database.b1PracticeSessions,
    database.b1MockSessions,
    database.b1LearnerEvidence,
    database.b1LearningReflections,
    database.b1RemediationProgress,
    database.b1AnswerAttempts,
    database.b1Preferences,
    database.cloudSyncMetadata,
    database.cloudSyncOutbox,
  ];
  await database.transaction('rw', tables, async () => {
    const previous = (await database.b1DatasetManifests.get('b1')) ?? legacyB1Manifest;
    const changed = Object.keys(previous.cases).filter(
      (id) => !sameB1Identity(previous.cases[id], current.cases[id]),
    );
    const practiceSessions = await database.b1PracticeSessions
      .filter(
        (row) =>
          !sameB1Identity(
            row.identity ?? legacyB1Manifest.cases[row.caseId],
            current.cases[row.caseId],
          ),
      )
      .toArray();
    const mockSessions = await database.b1MockSessions
      .filter((row) =>
        row.caseIds.some(
          (id) =>
            !sameB1Identity(
              row.caseIdentities?.[id] ?? legacyB1Manifest.cases[id],
              current.cases[id],
            ),
        ),
      )
      .toArray();
    const ids = new Set([...practiceSessions, ...mockSessions].map((row) => row.id));
    const oldUnits = new Set(
      nwB1Cases
        .filter((item) => changed.includes(item.caseId))
        .flatMap((item) => item.questionUnits.map((unit) => unit.questionId)),
    );
    const identityChanged = (identity?: import('../domain/b1Identity').B1ContentIdentity) =>
      identity !== undefined &&
      !Object.values(current.cases).some((entry) => sameB1Identity(identity, entry));
    const activeQuestionIds = new Set(
      b1Cases
        .filter((item) => current.cases[item.caseId])
        .flatMap((item) => item.questionUnits.map((unit) => unit.questionId)),
    );
    const affected = (row: {
      sessionId: string;
      questionId: string;
      identity?: import('../domain/b1Identity').B1ContentIdentity;
    }) =>
      ids.has(row.sessionId) ||
      oldUnits.has(row.questionId) ||
      identityChanged(row.identity) ||
      !activeQuestionIds.has(row.questionId) ||
      (!row.identity && current.datasetVersion.startsWith('sc-b-'));
    const learnerEvidence = await database.b1LearnerEvidence.filter(affected).toArray();
    const learningReflections = await database.b1LearningReflections.filter(affected).toArray();
    const answerAttempts = await database.b1AnswerAttempts.filter(affected).toArray();
    const remediationProgress = await database.b1RemediationProgress
      .filter(
        (row) =>
          ids.has(row.originSessionId) ||
          oldUnits.has(row.originQuestionId) ||
          identityChanged(row.identity) ||
          !activeQuestionIds.has(row.originQuestionId) ||
          (!row.identity && current.datasetVersion.startsWith('sc-b-')),
      )
      .toArray();
    const preferences = changed.length ? await database.b1Preferences.toArray() : [];
    const isOldSync = (row: { scope: string; itemKey: string }) =>
      row.scope.startsWith('b1.') &&
      (previous.datasetVersion !== current.datasetVersion ||
        row.scope === 'b1.reset' ||
        [...ids].some((id) => row.itemKey === id || row.itemKey.startsWith(`${id}:`)));
    const syncMetadata =
      changed.length || ids.size
        ? await database.cloudSyncMetadata.filter(isOldSync).toArray()
        : [];
    const syncOutbox =
      changed.length || ids.size ? await database.cloudSyncOutbox.filter(isOldSync).toArray() : [];
    const data = {
      practiceSessions,
      mockSessions,
      learnerEvidence,
      learningReflections,
      remediationProgress,
      answerAttempts,
      preferences,
      syncMetadata,
      syncOutbox,
    };
    if (Object.values(data).some((rows) => rows.length)) {
      await database.b1DatasetArchives.add({
        id: crypto.randomUUID(),
        archiveVersion: 1,
        archivedAt: new Date().toISOString(),
        previousDatasetVersion: previous.datasetVersion,
        nextDatasetVersion: current.datasetVersion,
        previousManifest: {
          ...previous,
          cases: {
            ...legacyB1Manifest.cases,
            ...previous.cases,
            ...Object.fromEntries(
              practiceSessions
                .filter((row) => row.identity)
                .map((row) => [row.caseId, row.identity!]),
            ),
            ...Object.assign({}, ...mockSessions.map((row) => row.caseIdentities ?? {})),
          },
        },
        data,
      });
      await database.b1PracticeSessions.bulkDelete(practiceSessions.map((row) => row.id));
      await database.b1MockSessions.bulkDelete(mockSessions.map((row) => row.id));
      await database.b1LearnerEvidence.bulkDelete(learnerEvidence.map((row) => row.id));
      await database.b1LearningReflections.bulkDelete(learningReflections.map((row) => row.id));
      await database.b1RemediationProgress.bulkDelete(remediationProgress.map((row) => row.id));
      await database.b1AnswerAttempts.bulkDelete(answerAttempts.map((row) => row.id));
      await database.b1Preferences.bulkDelete(preferences.map((row) => row.key));
      await database.cloudSyncMetadata.bulkDelete(
        syncMetadata.map((row) => [row.scope, row.itemKey]),
      );
      await database.cloudSyncOutbox.bulkDelete(
        syncOutbox.map((row) => [row.userId, row.scope, row.itemKey]),
      );
    }
    // Existing NW rows stay usable while NW is the active dataset.
    await database.b1PracticeSessions
      .filter((row) => !row.identity)
      .modify((row) => {
        row.identity ??= current.cases[row.caseId];
      });
    await database.b1MockSessions
      .filter((row) => !row.caseIdentities)
      .modify((row) => {
        row.caseIdentities ??= Object.fromEntries(row.caseIds.map((id) => [id, current.cases[id]]));
      });
    const stored = await database.b1DatasetManifests.get('b1');
    if (JSON.stringify(stored) !== JSON.stringify(current))
      await database.b1DatasetManifests.put(current);
  });
}

export function activeB1Identity(caseId: string) {
  const item = b1Cases.find((entry) => entry.caseId === caseId);
  return item === undefined ? undefined : b1Identity(item);
}
