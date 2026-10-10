import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { QuestionDatasetManifest } from '../src/domain/questionManifest';

const baseline = JSON.parse(
  readFileSync(new URL('../data/sc-a1-legacy-manifest.json', import.meta.url), 'utf8'),
) as QuestionDatasetManifest;
const finalPlan = JSON.parse(
  readFileSync(new URL('../data/sc-a1-source-code-map-draft.json', import.meta.url), 'utf8'),
) as {
  entries: Array<{ code: string; preserve_history: boolean }>;
};
const correctChoices = Object.fromEntries(
  ['questions.json', 'a2-questions.json'].flatMap((file) => {
    const payload = JSON.parse(
      readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'),
    ) as {
      questions: Array<{ code: string; correct_choice: string }>;
    };
    return payload.questions.map((q) => [q.code, q.correct_choice]);
  }),
);
const replacements = finalPlan.entries
  .filter((entry) => !entry.preserve_history)
  .map((entry) => entry.code);

test('正式A-1で43問の旧成績を退避し，KEEP・非内容FIX197問とA-2・科目Bを維持する', async ({
  page,
}) => {
  await page.goto('/#/');
  await expect(page.getByText('0 / 240問')).toBeVisible();
  await page.evaluate(
    async ({ baseline, correctChoices }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('sc-dojo');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const names = [
        'a1DatasetManifests',
        'questionProgress',
        'answerAttempts',
        'learningDays',
        'learningDaysBySubject',
        'b1Preferences',
      ];
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(names, 'readwrite');
        // Genuine frozen legacy identities under the same codes.
        tx.objectStore('a1DatasetManifests').put(baseline);
        for (const code of [...baseline.entries.map((q) => q.code), 'A2-001']) {
          tx.objectStore('questionProgress').put({
            subjectId: code.startsWith('A1') ? 'a1' : 'a2',
            code,
            attemptCount: 1,
            correctCount: 1,
            incorrectCount: 0,
            favorite: true,
            lastIsCorrect: true,
            lastChoice: correctChoices[code],
            lastAnsweredAt: '2026-10-08T00:00:00.000Z',
            updatedAt: '2026-10-08T00:00:00.000Z',
          });
          tx.objectStore('answerAttempts').add({
            subjectId: code.startsWith('A1') ? 'a1' : 'a2',
            code,
            selectedChoice: correctChoices[code],
            correctChoice: correctChoices[code],
            isCorrect: true,
            answeredAt: '2026-10-08T00:00:00.000Z',
            mode: 'normal_practice',
            sessionId: `seed-${code}`,
            version: 1,
          });
        }
        const day = {
          subjectId: 'a1',
          date: '2026-10-08',
          answerCount: 240,
          updatedAt: '2026-10-08T00:00:00.000Z',
        };
        tx.objectStore('learningDays').put(day);
        tx.objectStore('learningDaysBySubject').put(day);
        tx.objectStore('learningDaysBySubject').put({ ...day, subjectId: 'a2', answerCount: 1 });
        tx.objectStore('b1Preferences').put({
          key: 'b1-learning-preferences',
          version: 1,
          relevanceFilter: 'all',
          updatedAt: '2026-10-08T00:00:00.000Z',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { baseline, correctChoices },
  );
  await page.reload();
  await expect(page.getByText('197 / 240問')).toBeVisible();
  const snapshot = async () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open('sc-dojo');
        request.onsuccess = () => resolve(request.result);
      });
      const getAll = (name: string) =>
        new Promise<unknown[]>((resolve) => {
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => resolve(request.result);
        });
      const result = await Promise.all(
        [
          'a1DatasetArchives',
          'questionProgress',
          'b1Preferences',
          'answerAttempts',
          'learningDaysBySubject',
        ].map(getAll),
      );
      db.close();
      return result;
    });
  const first = await snapshot();
  const archives = first[0] as Array<{
    changedCodes: string[];
    data: { progress: Array<{ code: string }>; attempts: Array<{ code: string }> };
  }>;
  expect(archives).toHaveLength(1);
  expect(new Set(archives[0].changedCodes)).toEqual(new Set(replacements));
  expect(archives[0].data.progress).toHaveLength(43);
  expect(archives[0].data.attempts).toHaveLength(43);
  expect(first[1]).toHaveLength(198); // 197 A-1 + unchanged A-2.
  expect(first[2]).toHaveLength(1);
  expect(first[3]).toHaveLength(198);
  expect(first[4]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ subjectId: 'a1', answerCount: 197 }),
      expect.objectContaining({ subjectId: 'a2', answerCount: 1 }),
    ]),
  );
  await page.reload();
  await expect(page.getByText('197 / 240問')).toBeVisible();
  expect(await snapshot()).toEqual(first);
});
