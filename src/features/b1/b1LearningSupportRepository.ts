import { getSubjectCatalog } from '../../data/catalog';
import { getB1QuestionUnit } from '../../data/b1';
import type { A1DojoDatabase } from '../../database/database';
import type {
  B1LearnerEvidenceRow,
  B1LearningReflectionRow,
  B1RemediationProgressRow,
} from '../../database/types';
import {
  isB1FailureCauseId,
  type B1FailureCauseId,
  type B1LearnerEvidence,
  type B1LearningReflection,
  type B1RemediationProgress,
  type B1EvidenceSourceType,
} from '../../domain/b1LearningSupport';

export class B1LearningSupportDataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface SaveLearnerEvidenceInput {
  id?: string;
  sessionId: string;
  questionId: string;
  sourceType?: B1EvidenceSourceType;
  printedPage?: number;
  location?: string;
  evidenceId?: string;
  note: string;
}

export interface SaveLearningReflectionInput {
  sessionId: string;
  questionId: string;
  failureCauseIds: readonly B1FailureCauseId[];
  selfAssessment: B1LearningReflection['selfAssessment'];
  note?: string;
}

export interface StartRemediationInput {
  originQuestionId: string;
  originSessionId: string;
  originCaseId?: string;
  failureCauseIds: readonly B1FailureCauseId[];
  a2QuestionIds: readonly string[];
}

export class B1LearningSupportRepository {
  constructor(private readonly database: A1DojoDatabase) {}

  async saveLearnerEvidence(
    input: SaveLearnerEvidenceInput,
    now = new Date().toISOString(),
  ): Promise<B1LearnerEvidence> {
    validateQuestionAndSession(input.questionId, input.sessionId);
    if (input.note.trim().length === 0) {
      throw new B1LearningSupportDataError('根拠のメモを入力してください。');
    }
    await this.database.open();
    if (
      input.printedPage !== undefined &&
      (!Number.isInteger(input.printedPage) || input.printedPage < 1)
    ) {
      throw new B1LearningSupportDataError('印刷ページは1以上の整数で入力してください。');
    }
    const existing =
      input.id !== undefined
        ? await this.database.b1LearnerEvidence.get(input.id)
        : input.sourceType === undefined &&
            input.printedPage === undefined &&
            input.location === undefined
          ? await this.database.b1LearnerEvidence
              .where('[sessionId+questionId]')
              .equals([input.sessionId, input.questionId])
              .first()
          : undefined;
    if (
      existing !== undefined &&
      (existing.sessionId !== input.sessionId || existing.questionId !== input.questionId)
    ) {
      throw new B1LearningSupportDataError('別の設問の根拠記録は編集できません。');
    }
    const row: B1LearnerEvidenceRow = {
      id: existing?.id ?? `b1-evidence-${crypto.randomUUID()}`,
      version: 2,
      sessionId: input.sessionId,
      questionId: input.questionId,
      ...(input.sourceType === undefined ? {} : { sourceType: input.sourceType }),
      ...(input.printedPage === undefined ? {} : { printedPage: input.printedPage }),
      ...(input.location?.trim() ? { location: input.location.trim() } : {}),
      ...(input.evidenceId === undefined ? {} : { evidenceId: input.evidenceId }),
      note: input.note.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.database.b1LearnerEvidence.put(row);
    return row;
  }

  async listLearnerEvidenceByQuestion(questionId: string): Promise<B1LearnerEvidence[]> {
    validateQuestion(questionId);
    await this.database.open();
    return this.database.b1LearnerEvidence
      .where('questionId')
      .equals(questionId)
      .sortBy('updatedAt');
  }

  async listLearnerEvidenceBySession(sessionId: string): Promise<B1LearnerEvidence[]> {
    validateSession(sessionId);
    await this.database.open();
    return this.database.b1LearnerEvidence.where('sessionId').equals(sessionId).sortBy('updatedAt');
  }

  async deleteLearnerEvidence(id: string): Promise<void> {
    if (id.trim().length === 0)
      throw new B1LearningSupportDataError('削除する根拠記録を指定してください。');
    await this.database.open();
    await this.database.b1LearnerEvidence.delete(id);
  }

  async clearLearnerEvidenceForQuestion(questionId: string): Promise<void> {
    validateQuestion(questionId);
    await this.database.open();
    await this.database.b1LearnerEvidence.where('questionId').equals(questionId).delete();
  }

  async saveLearningReflection(
    input: SaveLearningReflectionInput,
    now = new Date().toISOString(),
  ): Promise<B1LearningReflection> {
    validateQuestionAndSession(input.questionId, input.sessionId);
    const failureCauseIds = normalizeFailureCauses(input.failureCauseIds, input.selfAssessment);
    if (
      !['understood', 'partial', 'review_needed', 'correct', 'incorrect'].includes(
        input.selfAssessment,
      )
    ) {
      throw new B1LearningSupportDataError('自己評価の値が正しくありません。');
    }
    await this.database.open();
    const existing = await this.database.b1LearningReflections
      .where('[sessionId+questionId]')
      .equals([input.sessionId, input.questionId])
      .first();
    const row: B1LearningReflectionRow = {
      id: existing?.id ?? `b1-reflection-${crypto.randomUUID()}`,
      version: 2,
      sessionId: input.sessionId,
      questionId: input.questionId,
      failureCauseIds,
      selfAssessment: input.selfAssessment,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.database.b1LearningReflections.put(row);
    return row;
  }

  async getLearningReflection(
    sessionId: string,
    questionId: string,
  ): Promise<B1LearningReflection | undefined> {
    validateQuestionAndSession(questionId, sessionId);
    await this.database.open();
    return this.database.b1LearningReflections
      .where('[sessionId+questionId]')
      .equals([sessionId, questionId])
      .first();
  }

  async listLearningReflectionsByQuestion(questionId: string): Promise<B1LearningReflection[]> {
    validateQuestion(questionId);
    await this.database.open();
    return this.database.b1LearningReflections
      .where('questionId')
      .equals(questionId)
      .sortBy('updatedAt');
  }

  async listLearningReflectionsBySession(sessionId: string): Promise<B1LearningReflection[]> {
    validateSession(sessionId);
    await this.database.open();
    return this.database.b1LearningReflections
      .where('sessionId')
      .equals(sessionId)
      .sortBy('updatedAt');
  }

  async startRemediation(
    input: StartRemediationInput,
    now = new Date().toISOString(),
  ): Promise<B1RemediationProgress> {
    validateQuestionAndSession(input.originQuestionId, input.originSessionId);
    const failureCauseIds = normalizeFailureCauses(input.failureCauseIds);
    const a2QuestionIds = normalizeA2QuestionIds(input.a2QuestionIds);
    if (a2QuestionIds.length === 0) {
      throw new B1LearningSupportDataError('A2復習問題を1問以上指定してください。');
    }
    await this.database.open();
    const active = await this.database.b1RemediationProgress
      .where('[originQuestionId+status]')
      .equals([input.originQuestionId, 'in_progress'])
      .and((row) => row.originSessionId === input.originSessionId)
      .first();
    if (active !== undefined) return active;
    const row: B1RemediationProgressRow = {
      id: `b1-remediation-${crypto.randomUUID()}`,
      version: 2,
      originQuestionId: input.originQuestionId,
      originSessionId: input.originSessionId,
      ...(input.originCaseId === undefined ? {} : { originCaseId: input.originCaseId }),
      failureCauseIds,
      a2QuestionIds,
      completedA2QuestionIds: [],
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    await this.database.b1RemediationProgress.put(row);
    return row;
  }

  async getActiveRemediation(
    originQuestionId: string,
    originSessionId?: string,
  ): Promise<B1RemediationProgress | undefined> {
    validateQuestion(originQuestionId);
    await this.database.open();
    return this.database.b1RemediationProgress
      .where('[originQuestionId+status]')
      .equals([originQuestionId, 'in_progress'])
      .and((row) => originSessionId === undefined || row.originSessionId === originSessionId)
      .first();
  }

  async markA2QuestionCompleted(
    remediationId: string,
    a2QuestionId: string,
    now = new Date().toISOString(),
  ): Promise<B1RemediationProgress> {
    const progress = await this.requireActiveRemediation(remediationId);
    if (!progress.a2QuestionIds.includes(a2QuestionId)) {
      throw new B1LearningSupportDataError('この復習進捗に含まれないA2問題です。');
    }
    const completedA2QuestionIds = [...new Set([...progress.completedA2QuestionIds, a2QuestionId])];
    const updated = { ...progress, completedA2QuestionIds, updatedAt: now };
    await this.database.b1RemediationProgress.put(updated);
    return updated;
  }

  async completeRemediation(
    remediationId: string,
    now = new Date().toISOString(),
  ): Promise<B1RemediationProgress> {
    const progress = await this.requireActiveRemediation(remediationId);
    if (progress.completedA2QuestionIds.length !== progress.a2QuestionIds.length) {
      throw new B1LearningSupportDataError(
        '紐付いたA2問題をすべて完了してから復習を完了してください。',
      );
    }
    const completed = {
      ...progress,
      status: 'completed' as const,
      completedAt: now,
      updatedAt: now,
    };
    await this.database.b1RemediationProgress.put(completed);
    return completed;
  }

  async cancelRemediation(
    remediationId: string,
    now = new Date().toISOString(),
  ): Promise<B1RemediationProgress> {
    const progress = await this.requireActiveRemediation(remediationId);
    const cancelled = {
      ...progress,
      status: 'cancelled' as const,
      cancelledAt: now,
      updatedAt: now,
    };
    await this.database.b1RemediationProgress.put(cancelled);
    return cancelled;
  }

  async listRemediationsByOriginQuestion(questionId: string): Promise<B1RemediationProgress[]> {
    validateQuestion(questionId);
    await this.database.open();
    return this.database.b1RemediationProgress
      .where('originQuestionId')
      .equals(questionId)
      .sortBy('updatedAt');
  }

  /** Call this when a 科目B practice or mock session is explicitly deleted. */
  async clearLearningSupportForSession(sessionId: string): Promise<void> {
    validateSession(sessionId);
    await this.database.open();
    await this.database.transaction(
      'rw',
      [
        this.database.b1LearnerEvidence,
        this.database.b1LearningReflections,
        this.database.b1RemediationProgress,
      ],
      async () => {
        await Promise.all([
          this.database.b1LearnerEvidence.where('sessionId').equals(sessionId).delete(),
          this.database.b1LearningReflections.where('sessionId').equals(sessionId).delete(),
          this.database.b1RemediationProgress.where('originSessionId').equals(sessionId).delete(),
        ]);
      },
    );
  }

  private async requireActiveRemediation(id: string): Promise<B1RemediationProgressRow> {
    if (id.trim().length === 0)
      throw new B1LearningSupportDataError('復習進捗を指定してください。');
    await this.database.open();
    const progress = await this.database.b1RemediationProgress.get(id);
    if (progress === undefined)
      throw new B1LearningSupportDataError('A2復習進捗が見つかりません。');
    if (progress.status !== 'in_progress') {
      throw new B1LearningSupportDataError('このA2復習進捗は既に終了しています。');
    }
    return progress;
  }
}

function validateQuestionAndSession(questionId: string, sessionId: string): void {
  validateQuestion(questionId);
  validateSession(sessionId);
}

function validateQuestion(questionId: string): void {
  if (getB1QuestionUnit(questionId) === undefined) {
    throw new B1LearningSupportDataError('存在しない科目B設問です。');
  }
}

function validateSession(sessionId: string): void {
  if (sessionId.trim().length === 0) {
    throw new B1LearningSupportDataError('学習セッションを指定してください。');
  }
}

function normalizeFailureCauses(
  value: readonly B1FailureCauseId[],
  selfAssessment?: B1LearningReflection['selfAssessment'],
): B1FailureCauseId[] {
  const unique = [...new Set(value)];
  if (
    (unique.length === 0 && selfAssessment !== 'understood' && selfAssessment !== 'correct') ||
    unique.some((id) => !isB1FailureCauseId(id))
  ) {
    throw new B1LearningSupportDataError('失点原因を1件以上、正しく指定してください。');
  }
  return unique;
}

function normalizeA2QuestionIds(value: readonly string[]): string[] {
  const a2Questions = new Set(getSubjectCatalog('a2').questions.map((question) => question.code));
  const unique = [...new Set(value)];
  if (unique.some((questionId) => !a2Questions.has(questionId))) {
    throw new B1LearningSupportDataError('存在しないA2問題は復習に登録できません。');
  }
  return unique;
}
