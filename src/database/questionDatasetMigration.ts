import type { A1DojoDatabase } from './database';
import { changedQuestionCodes, type QuestionDatasetManifest } from '../domain/questionManifest';
import { getAsiaTokyoDate } from '../domain/learning';

/** Preserve old rows before removing them from the active catalog's learning views. */
export async function reconcileQuestionDataset(
  database: A1DojoDatabase,
  current: QuestionDatasetManifest,
  legacyBaseline?: QuestionDatasetManifest,
): Promise<void> {
  const subjectId = current.key;
  const manifests = subjectId === 'a1' ? database.a1DatasetManifests : database.a2DatasetManifests;
  const archives = subjectId === 'a1' ? database.a1DatasetArchives : database.a2DatasetArchives;
  await database.open();
  await database.transaction(
    'rw',
    [
      manifests,
      archives,
      database.questionProgress,
      database.answerAttempts,
      database.practiceSessions,
      database.practiceResults,
      database.examSessions,
      database.examResults,
      database.learningDaysBySubject,
      database.learningDays,
      database.cloudSyncMetadata,
      database.cloudSyncOutbox,
    ],
    async () => {
      const stored = await manifests.get(subjectId);
      const previous = stored ?? legacyBaseline;
      const changed = changedQuestionCodes(previous, current);
      if (changed.size === 0 && stored?.datasetVersion === current.datasetVersion) return;
      if (changed.size) {
        const progress = await database.questionProgress
          .where('subjectId')
          .equals(subjectId)
          .filter((r) => changed.has(r.code))
          .toArray();
        const attempts = await database.answerAttempts
          .where('subjectId')
          .equals(subjectId)
          .filter((r) => changed.has(r.code))
          .toArray();
        const affectedSession = (r: { questionCodes: string[] }) =>
          r.questionCodes.some((code) => changed.has(code));
        const practiceSessions = await database.practiceSessions
          .where('subjectId')
          .equals(subjectId)
          .filter(affectedSession)
          .toArray();
        const practiceResults = await database.practiceResults
          .where('subjectId')
          .equals(subjectId)
          .filter(affectedSession)
          .toArray();
        const examSessions = await database.examSessions
          .where('subjectId')
          .equals(subjectId)
          .filter(affectedSession)
          .toArray();
        const examResults = await database.examResults
          .where('subjectId')
          .equals(subjectId)
          .filter(
            (r) =>
              affectedSession(r) ||
              Object.keys(r.questionResults).some((code) => changed.has(code)),
          )
          .toArray();
        const learningDays = await database.learningDaysBySubject
          .where('subjectId')
          .equals(subjectId)
          .toArray();
        const syncMetadata = await database.cloudSyncMetadata
          .where('scope')
          .equals(`${subjectId}.question`)
          .filter((r) => changed.has(r.itemKey))
          .toArray();
        const syncOutbox = await database.cloudSyncOutbox
          .where('scope')
          .equals(`${subjectId}.question`)
          .filter((r) => changed.has(r.itemKey))
          .toArray();
        if (
          progress.length ||
          attempts.length ||
          practiceSessions.length ||
          practiceResults.length ||
          examSessions.length ||
          examResults.length ||
          syncMetadata.length ||
          syncOutbox.length ||
          (!previous && learningDays.length)
        ) {
          const archivedAt = new Date().toISOString();
          await archives.add({
            id: crypto.randomUUID(),
            archiveVersion: 1,
            archivedAt,
            previousDatasetVersion: previous?.datasetVersion ?? 'legacy-nw-a2',
            nextDatasetVersion: current.datasetVersion,
            previousManifest: previous,
            changedCodes: [...changed],
            data: {
              progress,
              attempts,
              practiceSessions,
              practiceResults,
              examSessions,
              examResults,
              learningDays,
              syncMetadata,
              syncOutbox,
            },
          });
          await database.questionProgress.bulkDelete(progress.map((r) => r.code));
          await database.answerAttempts.bulkDelete(attempts.map((r) => r.id!));
          await database.practiceSessions.bulkDelete(practiceSessions.map((r) => r.id));
          await database.practiceResults.bulkDelete(practiceResults.map((r) => r.id));
          await database.examSessions.bulkDelete(examSessions.map((r) => r.id));
          await database.examResults.bulkDelete(examResults.map((r) => r.id));
          await database.cloudSyncMetadata.bulkDelete(
            syncMetadata.map((r) => [r.scope, r.itemKey]),
          );
          await database.cloudSyncOutbox.bulkDelete(
            syncOutbox.map((r) => [r.userId, r.scope, r.itemKey]),
          );
          // Keep days belonging to unchanged SC questions; legacy NW days are fully archived.
          const removedByDate = new Map<string, number>();
          for (const attempt of attempts) {
            const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
            removedByDate.set(date, (removedByDate.get(date) ?? 0) + 1);
          }
          for (const day of learningDays) {
            const answerCount = previous
              ? Math.max(0, day.answerCount - (removedByDate.get(day.date) ?? 0))
              : 0;
            if (answerCount) {
              await database.learningDaysBySubject.put({ ...day, answerCount });
              if (subjectId === 'a1') await database.learningDays.put({ ...day, answerCount });
            } else {
              await database.learningDaysBySubject.delete([subjectId, day.date]);
              if (subjectId === 'a1') await database.learningDays.delete(day.date);
            }
          }
        }
      }
      await manifests.put(current);
    },
  );
}
