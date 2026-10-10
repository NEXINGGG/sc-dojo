import type { Question } from '../types/question';
import { calculateQuestionContentHash, sha256 } from './questionContent.mjs';

export type IdentityQuestion = Pick<Question, 'code'> & Partial<Question>;

export function createQuestionFingerprint(questions: readonly IdentityQuestion[]): string {
  const sorted = [...questions].sort((left, right) =>
    left.code < right.code ? -1 : left.code > right.code ? 1 : 0,
  );
  const usesContentIdentity = sorted.some(
    (question) =>
      question.sourceId !== undefined ||
      question.source?.source_id !== undefined ||
      question.contentHash !== undefined ||
      question.datasetVersion !== undefined,
  );
  if (!usesContentIdentity) {
    let hash = 0x811c9dc5;
    // Preserve the old sorting rule and exact legacy value.
    const codes = questions
      .map((question) => question.code)
      .sort((left, right) => left.localeCompare(right));
    const value = codes.join('\n');
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `fnv1a-32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }
  const manifest = sorted.map((question) => {
    const sourceId = question.sourceId ?? question.source?.source_id ?? null;
    // Recalculate new content so even an accidentally stale declared hash cannot hide a change.
    const contentHash =
      question.contentHash !== undefined &&
      question.question !== undefined &&
      question.choices !== undefined &&
      question.correctChoice !== undefined
        ? calculateQuestionContentHash({
            question: question.question,
            choices: question.choices,
            correctChoice: question.correctChoice,
            stimulus: question.stimulus,
          })
        : (question.contentHash ?? null);
    return [
      question.subjectId ?? null,
      question.datasetVersion ?? null,
      question.code,
      sourceId,
      contentHash,
    ];
  });
  return `sha256:v1:${sha256(JSON.stringify(['question-dataset-v1', manifest]))}`;
}
