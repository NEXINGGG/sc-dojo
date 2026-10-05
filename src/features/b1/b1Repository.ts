import type { B1Case } from '../../data/b1';
import {
  b1Cases,
  getB1Case,
  getEffectiveB1Relevance,
  getB1LegacyAnswerFieldTarget,
  getB1LegacyQuestionUnitTargets,
  getB1QuestionUnit,
  getB1UnitIds,
} from '../../data/b1';
import type { A1DojoDatabase } from '../../database/database';
import type {
  B1AnswerAttemptRow,
  B1MockSessionRow,
  B1PdfFileRow,
  B1PdfRegistrationMetadata,
  B1PracticeSessionRow,
  ExamSubmissionReason,
} from '../../database/types';
import { gradeB1Unit, type B1AnswerValues } from '../../domain/b1';
import {
  getB1UnansweredFieldIds,
  summarizeB1UnitProgress,
  type B1ProgressBreakdown,
  type B1ReviewTarget,
} from '../../domain/b1Progress';
import type { B1FailureCauseId, B1LearningMode, B1MockType } from '../../domain/b1LearningSupport';
import { B1_CLOUD_SYNC_DEBOUNCE_MS, markB1PracticeForCloudSync } from '../sync/b1CloudSync';
import { notifyCloudSyncNeeded } from '../sync/syncEvents';

export class B1DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'B1DataError';
  }
}

export interface B1ProgressSummary {
  completedPracticeCount: number;
  completedMockCount: number;
  submittedMockCount: number;
  correctSelfGrades: number;
  partialSelfGrades: number;
  reviewSelfGrades: number;
  learnerEvidenceCount: number;
  rewriteCount: number;
  totalUnitCount: number;
  unansweredUnitCount: number;
  confirmedUnitCount: number;
  selfAssessedUnitCount: number;
  incorrectSelfGrades: number;
  reviewTargetCount: number;
  progressRate: number;
  byYear: readonly B1ProgressBreakdown[];
  byCase: readonly B1ProgressBreakdown[];
  reviewTargets: readonly B1ReviewTarget[];
}

export interface B1LearningAnalytics {
  failureCauseCounts: Readonly<Record<string, number>>;
  evidenceMissingRate: number;
  rewriteImprovementRate: number;
  remediationImprovementRate: number;
  relevancePracticeCounts: Readonly<Record<string, number>>;
}

export interface B1PracticeSaveOptions {
  previous?: B1PracticeSessionRow;
}

export class B1Repository {
  constructor(private readonly database: A1DojoDatabase) {}

  async getPdf(year: number): Promise<B1PdfFileRow | undefined> {
    await this.database.open();
    return this.database.b1PdfFiles.get(year);
  }

  async listPdfMetadata(): Promise<B1PdfRegistrationMetadata[]> {
    await this.database.open();
    const rows = await this.database.b1PdfFiles.toArray();
    return rows.map(toPdfMetadata).sort((left, right) => right.year - left.year);
  }

  async savePdf(year: number, file: File, updatedAt = new Date().toISOString()): Promise<void> {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new B1DataError('PDF形式のファイルを選んでください。');
    }
    if (file.size === 0) {
      throw new B1DataError(
        '空のPDFは登録できません。IPAからダウンロードした問題PDFを選んでください。',
      );
    }
    await this.database.open();
    await this.database.b1PdfFiles.put({
      subjectId: 'b1',
      year,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      size: file.size,
      updatedAt,
      blob: file,
    });
  }

  async removePdf(year: number): Promise<void> {
    await this.database.open();
    await this.database.b1PdfFiles.delete(year);
  }

  async getPractice(id: string): Promise<B1PracticeSessionRow | undefined> {
    await this.database.open();
    const session = await this.database.b1PracticeSessions.get(id);
    return session === undefined ? undefined : this.migratePracticeCatalog(session);
  }

  async getInProgressPractice(): Promise<B1PracticeSessionRow | undefined> {
    await this.database.open();
    const session = await this.database.b1PracticeSessions
      .where('status')
      .equals('in_progress')
      .first();
    return session === undefined ? undefined : this.migratePracticeCatalog(session);
  }

  async createPractice(
    caseItem: B1Case,
    modeOrNow: Exclude<B1LearningMode, 'mock90'> | string = 'training',
    suppliedNow = new Date().toISOString(),
  ): Promise<B1PracticeSessionRow> {
    const mode = modeOrNow === 'training' || modeOrNow === 'practical' ? modeOrNow : 'training';
    const now = mode === modeOrNow ? suppliedNow : modeOrNow;
    const existing = await this.getInProgressPractice();
    if (existing !== undefined) {
      throw new B1DataError('途中の科目B演習があります。再開するか、先に完了してください。');
    }
    const session: B1PracticeSessionRow = {
      id: createB1SessionId('practice'),
      subjectId: 'b1',
      version: 3,
      status: 'in_progress',
      mode,
      caseId: caseItem.caseId,
      unitIds: caseItem.questionUnits.map((unit) => unit.questionId),
      answers: {},
      unitConfirmations: {},
      selfGrades: {},
      selfGradeUpdatedAt: {},
      reviewQuestionIds: [],
      requirementDisclosureQuestionIds: [],
      attemptIdsByQuestion: {},
      currentIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.savePractice(session);
    return session;
  }

  async savePractice(
    session: B1PracticeSessionRow,
    options: B1PracticeSaveOptions = {},
  ): Promise<void> {
    validatePractice(session);
    await this.database.open();
    await this.database.transaction(
      'rw',
      [
        this.database.b1PracticeSessions,
        this.database.cloudSyncMetadata,
        this.database.cloudSyncOutbox,
      ],
      async () => {
        const previous =
          options.previous ?? (await this.database.b1PracticeSessions.get(session.id));
        await this.database.b1PracticeSessions.put(session);
        await markB1PracticeForCloudSync(this.database, previous, session);
      },
    );
    notifyCloudSyncNeeded({ debounceMs: B1_CLOUD_SYNC_DEBOUNCE_MS });
  }

  async completePractice(
    id: string,
    completedAt = new Date().toISOString(),
  ): Promise<B1PracticeSessionRow> {
    const session = await this.getPractice(id);
    if (session === undefined) throw new B1DataError('科目B演習が見つかりません。');
    const completed: B1PracticeSessionRow = {
      ...session,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    };
    await this.savePractice(completed, { previous: session });
    return completed;
  }

  async createReviewPractice(
    questionId: string,
    now = new Date().toISOString(),
  ): Promise<B1PracticeSessionRow> {
    const caseItem = b1Cases.find((item) =>
      item.questionUnits.some((unit) => unit.questionId === questionId),
    );
    if (caseItem === undefined) {
      throw new B1DataError(
        '復習する科目B設問が見つかりません。進捗画面を再読み込みしてください。',
      );
    }
    const created = await this.createPractice(caseItem, 'training', now);
    const currentIndex = created.unitIds.indexOf(questionId);
    const session = { ...created, currentIndex: Math.max(0, currentIndex), updatedAt: now };
    await this.savePractice(session);
    return session;
  }

  async getMock(id: string): Promise<B1MockSessionRow | undefined> {
    await this.database.open();
    const session = await this.database.b1MockSessions.get(id);
    return session === undefined ? undefined : this.migrateMockCatalog(session);
  }

  async getInProgressMock(): Promise<B1MockSessionRow | undefined> {
    await this.database.open();
    const session = await this.database.b1MockSessions
      .where('status')
      .equals('in_progress')
      .first();
    return session === undefined ? undefined : this.migrateMockCatalog(session);
  }

  async listMocks(): Promise<B1MockSessionRow[]> {
    await this.database.open();
    const sessions = await this.database.b1MockSessions.orderBy('updatedAt').reverse().toArray();
    return Promise.all(sessions.map((session) => this.migrateMockCatalog(session)));
  }

  async createMock(
    year: number,
    caseIds: readonly string[],
    mockTypeOrNow: B1MockType | string = 'official_year',
    suppliedNow = new Date().toISOString(),
  ): Promise<B1MockSessionRow> {
    const mockTypes: readonly B1MockType[] = [
      'official_year',
      'current_focus',
      'all_years',
      'legacy_reading',
    ];
    const usesLegacySignature = !mockTypes.includes(mockTypeOrNow as B1MockType);
    const mockType = usesLegacySignature ? 'official_year' : (mockTypeOrNow as B1MockType);
    const now = usesLegacySignature ? mockTypeOrNow : suppliedNow;
    const existing = await this.getInProgressMock();
    if (existing !== undefined) {
      throw new B1DataError('途中の科目B模試があります。再開するか、先に提出してください。');
    }
    const candidates = caseIds.map((caseId) => getB1Case(caseId));
    if (
      caseIds.length !== 2 ||
      new Set(caseIds).size !== 2 ||
      candidates.some(
        (caseItem) =>
          caseItem === undefined || (mockType === 'official_year' && caseItem.year !== year),
      )
    ) {
      throw new B1DataError(
        mockType === 'official_year'
          ? '同一年度の3大問から、異なる2大問を選んでください。'
          : '異なる2大問を選んでください。',
      );
    }
    const unitIds = getB1UnitIds(caseIds);
    if (unitIds.length === 0 || new Set(unitIds).size !== unitIds.length) {
      throw new B1DataError(
        '科目B模試の問題構成に重複または不足があります。選択をやり直してください。',
      );
    }
    const session: B1MockSessionRow = {
      id: createB1SessionId('mock'),
      subjectId: 'b1',
      version: 3,
      status: 'in_progress',
      year,
      mode: 'mock90',
      mockType,
      caseIds: [...caseIds],
      unitIds,
      answers: {},
      unitConfirmations: {},
      selfGrades: {},
      selfGradeUpdatedAt: {},
      reviewQuestionIds: [],
      requirementDisclosureQuestionIds: [],
      attemptIdsByQuestion: {},
      currentIndex: 0,
      startedAt: now,
      deadlineAt: new Date(new Date(now).getTime() + 90 * 60 * 1000).toISOString(),
      updatedAt: now,
    };
    await this.database.b1MockSessions.put(session);
    return session;
  }

  async saveMock(session: B1MockSessionRow): Promise<void> {
    validateMock(session);
    await this.database.open();
    await this.database.b1MockSessions.put(session);
  }

  async submitMock(
    id: string,
    reason: ExamSubmissionReason,
    submittedAt = new Date().toISOString(),
  ): Promise<B1MockSessionRow> {
    const session = await this.getMock(id);
    if (session === undefined) throw new B1DataError('科目B模試が見つかりません。');
    if (session.status !== 'in_progress') return session;
    validateMock(session);
    const submitted: B1MockSessionRow = {
      ...session,
      status: 'submitted',
      unitConfirmations: createSubmittedMockConfirmations(session, submittedAt),
      submittedAt,
      submissionReason: reason,
      updatedAt: submittedAt,
    };
    await this.database.b1MockSessions.put(submitted);
    return submitted;
  }

  async completeMock(
    id: string,
    completedAt = new Date().toISOString(),
  ): Promise<B1MockSessionRow> {
    const session = await this.getMock(id);
    if (session === undefined) throw new B1DataError('科目B模試が見つかりません。');
    if (session.status !== 'submitted') {
      throw new B1DataError('提出後に自己採点を完了してください。');
    }
    const requiredSelfGrades = session.unitIds
      .map(getB1QuestionUnit)
      .filter((unit): unit is NonNullable<typeof unit> => unit !== undefined)
      .filter((unit) => unit.grading.mode !== 'automatic');
    if (requiredSelfGrades.some((unit) => session.selfGrades[unit.questionId] === undefined)) {
      throw new B1DataError('すべての記述答案を自己採点してから、結果を確定してください。');
    }
    const completed: B1MockSessionRow = {
      ...session,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    };
    await this.database.b1MockSessions.put(completed);
    return completed;
  }

  async discardInProgressMock(id: string): Promise<void> {
    await this.deleteMockSession(id, 'in_progress', '途中の科目B模試だけを破棄できます。');
  }

  async deleteCompletedMock(id: string): Promise<void> {
    await this.deleteMockSession(
      id,
      'completed',
      '確定済みの科目B模試だけを履歴から削除できます。',
    );
  }

  async getProgressSummary(): Promise<B1ProgressSummary> {
    await this.database.open();
    const [practices, mocks, completedPracticeCount, learnerEvidenceCount, answerAttempts] =
      await Promise.all([
        this.listPractices(),
        this.listMocks(),
        this.database.b1PracticeSessions.where('status').equals('completed').count(),
        this.database.b1LearnerEvidence.count(),
        this.database.b1AnswerAttempts.toArray(),
      ]);
    const progress = summarizeB1UnitProgress(b1Cases, [...practices, ...mocks]);
    return {
      completedPracticeCount,
      completedMockCount: mocks.filter((session) => session.status === 'completed').length,
      submittedMockCount: mocks.filter((session) => session.status === 'submitted').length,
      correctSelfGrades: progress.correctSelfGradeCount,
      partialSelfGrades: progress.partialSelfGradeCount,
      reviewSelfGrades: progress.incorrectSelfGradeCount,
      learnerEvidenceCount,
      rewriteCount: answerAttempts.filter((attempt) => attempt.attemptNumber > 1).length,
      totalUnitCount: progress.totalUnitCount,
      unansweredUnitCount: progress.unansweredUnitCount,
      confirmedUnitCount: progress.confirmedUnitCount,
      selfAssessedUnitCount: progress.selfAssessedUnitCount,
      incorrectSelfGrades: progress.incorrectSelfGradeCount,
      reviewTargetCount: progress.reviewTargetCount,
      progressRate: progress.progressRate,
      byYear: progress.byYear,
      byCase: progress.byCase,
      reviewTargets: progress.reviewTargets,
    };
  }

  async listPractices(): Promise<B1PracticeSessionRow[]> {
    await this.database.open();
    const sessions = await this.database.b1PracticeSessions
      .orderBy('updatedAt')
      .reverse()
      .toArray();
    return Promise.all(sessions.map((session) => this.migratePracticeCatalog(session)));
  }

  async getLearningAnalytics(): Promise<B1LearningAnalytics> {
    await this.database.open();
    const [evidence, reflections, attempts, practices, mocks] = await Promise.all([
      this.database.b1LearnerEvidence.toArray(),
      this.database.b1LearningReflections.toArray(),
      this.database.b1AnswerAttempts.toArray(),
      this.listPractices(),
      this.listMocks(),
    ]);
    const failureCauseCounts: Record<string, number> = {};
    for (const reflection of reflections) {
      for (const id of reflection.failureCauseIds) {
        failureCauseCounts[id] = (failureCauseCounts[id] ?? 0) + 1;
      }
    }
    const sessions = [...practices, ...mocks];
    const questionKeys = sessions.flatMap((session) =>
      session.unitIds.map((questionId) => `${session.id}\u0000${questionId}`),
    );
    const evidenceKeys = new Set(
      evidence.map((item) => `${item.sessionId}\u0000${item.questionId}`),
    );
    const rewrites = attempts.filter((attempt) => attempt.attemptNumber > 1);
    const relevancePracticeCounts: Record<string, number> = {};
    for (const session of sessions) {
      for (const questionId of session.unitIds) {
        const caseId =
          'caseId' in session
            ? session.caseId
            : b1Cases.find((caseItem) =>
                caseItem.questionUnits.some((unit) => unit.questionId === questionId),
              )?.caseId;
        if (caseId === undefined) continue;
        const relevance = getEffectiveB1Relevance(caseId, questionId);
        if (relevance !== undefined) {
          relevancePracticeCounts[relevance.label] =
            (relevancePracticeCounts[relevance.label] ?? 0) + 1;
        }
      }
    }
    return {
      failureCauseCounts,
      evidenceMissingRate:
        questionKeys.length === 0
          ? 0
          : Math.round(
              ((questionKeys.length - questionKeys.filter((key) => evidenceKeys.has(key)).length) /
                questionKeys.length) *
                100,
            ),
      rewriteImprovementRate:
        rewrites.length === 0
          ? 0
          : Math.round(
              (rewrites.filter((attempt) => attempt.selfGrade === 'correct').length /
                rewrites.length) *
                100,
            ),
      remediationImprovementRate:
        rewrites.length === 0
          ? 0
          : Math.round(
              (rewrites.filter((attempt) => attempt.remediationCompletedBefore).length /
                rewrites.length) *
                100,
            ),
      relevancePracticeCounts,
    };
  }

  async createAnswerAttempt(input: {
    sessionId: string;
    questionId: string;
    answers: B1AnswerValues;
    selfGrade?: import('../../domain/b1').B1SelfGrade;
    failureCauseIds?: readonly B1FailureCauseId[];
    remediationCompletedBefore?: boolean;
    now?: string;
  }): Promise<B1AnswerAttemptRow> {
    if (getB1QuestionUnit(input.questionId) === undefined) {
      throw new B1DataError('答案を書き直す対象の科目B設問が見つかりません。');
    }
    if (!input.sessionId.trim()) throw new B1DataError('答案の学習セッションが見つかりません。');
    const now = input.now ?? new Date().toISOString();
    await this.database.open();
    const existing = await this.database.b1AnswerAttempts
      .where('[sessionId+questionId]')
      .equals([input.sessionId, input.questionId])
      .toArray();
    const attempt: B1AnswerAttemptRow = {
      id: `b1-attempt-${crypto.randomUUID()}`,
      version: 1,
      sessionId: input.sessionId,
      questionId: input.questionId,
      attemptNumber: existing.length + 1,
      answers: { ...input.answers },
      characterCount: Object.values(input.answers).reduce(
        (total, value) => total + value.length,
        0,
      ),
      ...(input.selfGrade === undefined ? {} : { selfGrade: input.selfGrade }),
      failureCauseIds: [...new Set(input.failureCauseIds ?? [])],
      ...(input.remediationCompletedBefore === undefined
        ? {}
        : { remediationCompletedBefore: input.remediationCompletedBefore }),
      createdAt: now,
      updatedAt: now,
    };
    await this.database.b1AnswerAttempts.put(attempt);
    return attempt;
  }

  async listAnswerAttempts(sessionId: string, questionId: string): Promise<B1AnswerAttemptRow[]> {
    await this.database.open();
    return this.database.b1AnswerAttempts
      .where('[sessionId+questionId]')
      .equals([sessionId, questionId])
      .sortBy('attemptNumber');
  }

  async updateLatestAnswerAttempt(
    sessionId: string,
    questionId: string,
    changes: Pick<B1AnswerAttemptRow, 'selfGrade' | 'failureCauseIds'>,
    updatedAt = new Date().toISOString(),
  ): Promise<B1AnswerAttemptRow | undefined> {
    const attempts = await this.listAnswerAttempts(sessionId, questionId);
    const latest = attempts[attempts.length - 1];
    if (latest === undefined) return undefined;
    const updated: B1AnswerAttemptRow = { ...latest, ...changes, updatedAt };
    await this.database.b1AnswerAttempts.put(updated);
    return updated;
  }

  private async migratePracticeCatalog(
    session: B1PracticeSessionRow,
  ): Promise<B1PracticeSessionRow> {
    const currentCase = getB1Case(session.caseId);
    if (currentCase === undefined) return session;
    const catalogMigrated = migrateB1SessionCatalog(
      session,
      currentCase.questionUnits.map((unit) => unit.questionId),
    );
    const migrated: B1PracticeSessionRow = {
      ...catalogMigrated,
      version: 3,
      mode: catalogMigrated.mode ?? 'training',
      unitConfirmations: catalogMigrated.unitConfirmations ?? {},
      selfGradeUpdatedAt: catalogMigrated.selfGradeUpdatedAt ?? {},
      requirementDisclosureQuestionIds: catalogMigrated.requirementDisclosureQuestionIds ?? [],
      attemptIdsByQuestion: catalogMigrated.attemptIdsByQuestion ?? {},
    };
    if (migrated !== session) await this.database.b1PracticeSessions.put(migrated);
    return migrated;
  }

  private async migrateMockCatalog(session: B1MockSessionRow): Promise<B1MockSessionRow> {
    const catalogMigrated = migrateB1SessionCatalog(session, getB1UnitIds(session.caseIds));
    const unitConfirmations =
      catalogMigrated.status === 'in_progress'
        ? (catalogMigrated.unitConfirmations ?? {})
        : createSubmittedMockConfirmations(
            catalogMigrated,
            catalogMigrated.submittedAt ?? catalogMigrated.updatedAt,
          );
    const migrated: B1MockSessionRow = {
      ...catalogMigrated,
      version: 3,
      mode: 'mock90',
      mockType: catalogMigrated.mockType ?? 'official_year',
      unitConfirmations,
      selfGradeUpdatedAt: catalogMigrated.selfGradeUpdatedAt ?? {},
      requirementDisclosureQuestionIds: catalogMigrated.requirementDisclosureQuestionIds ?? [],
      attemptIdsByQuestion: catalogMigrated.attemptIdsByQuestion ?? {},
    };
    if (migrated !== session) await this.database.b1MockSessions.put(migrated);
    return migrated;
  }

  private async deleteMockSession(
    id: string,
    expectedStatus: B1MockSessionRow['status'],
    invalidStatusMessage: string,
  ): Promise<void> {
    await this.database.open();
    const session = await this.database.b1MockSessions.get(id);
    if (session === undefined) return;
    if (session.status !== expectedStatus) throw new B1DataError(invalidStatusMessage);

    await this.database.transaction(
      'rw',
      [
        this.database.b1MockSessions,
        this.database.b1AnswerAttempts,
        this.database.b1LearnerEvidence,
        this.database.b1LearningReflections,
        this.database.b1RemediationProgress,
      ],
      async () => {
        await this.database.b1MockSessions.delete(id);
        await this.database.b1AnswerAttempts.where('sessionId').equals(id).delete();
        await this.database.b1LearnerEvidence.where('sessionId').equals(id).delete();
        await this.database.b1LearningReflections.where('sessionId').equals(id).delete();
        await this.database.b1RemediationProgress.where('originSessionId').equals(id).delete();
      },
    );
  }
}

export function applyB1Answer(
  answers: Record<string, B1AnswerValues>,
  questionId: string,
  fieldId: string,
  value: string,
): Record<string, B1AnswerValues> {
  return {
    ...answers,
    [questionId]: { ...answers[questionId], [fieldId]: value },
  };
}

export function getB1ReferenceGrade(questionId: string, answers: B1AnswerValues) {
  const unit = getB1QuestionUnit(questionId);
  return unit === undefined ? undefined : gradeB1Unit(unit, answers);
}

type B1CatalogSession = Pick<
  B1PracticeSessionRow,
  | 'unitIds'
  | 'answers'
  | 'unitConfirmations'
  | 'selfGrades'
  | 'selfGradeUpdatedAt'
  | 'reviewQuestionIds'
  | 'currentIndex'
>;

function migrateB1SessionCatalog<T extends B1CatalogSession>(
  session: T,
  currentUnitIds: readonly string[],
): T {
  if (sameStringArray(session.unitIds, currentUnitIds)) return session;

  const answers: Record<string, B1AnswerValues> = {};
  for (const [legacyQuestionId, fieldAnswers] of Object.entries(session.answers)) {
    for (const [legacyFieldId, value] of Object.entries(fieldAnswers)) {
      const target = getB1LegacyAnswerFieldTarget(legacyQuestionId, legacyFieldId);
      const preservedCurrentField =
        currentUnitIds.includes(legacyQuestionId) &&
        getB1QuestionUnit(legacyQuestionId)?.answerFields.some(
          (field) => field.fieldId === legacyFieldId,
        ) === true;
      const targetQuestionId =
        target?.questionId ?? (preservedCurrentField ? legacyQuestionId : undefined);
      const targetFieldId = target?.fieldId ?? (preservedCurrentField ? legacyFieldId : undefined);
      if (targetQuestionId !== undefined && targetFieldId !== undefined) {
        answers[targetQuestionId] = {
          ...answers[targetQuestionId],
          [targetFieldId]: value,
        };
      }
    }
  }

  const targetIdsForLegacyUnit = (legacyQuestionId: string) => {
    const migrated = getB1LegacyQuestionUnitTargets(legacyQuestionId).filter((questionId) =>
      currentUnitIds.includes(questionId),
    );
    return migrated.length > 0
      ? migrated
      : currentUnitIds.includes(legacyQuestionId)
        ? [legacyQuestionId]
        : [];
  };
  const selfGrades = Object.fromEntries(
    Object.entries(session.selfGrades).flatMap(([legacyQuestionId, grade]) => {
      const targets = targetIdsForLegacyUnit(legacyQuestionId);
      const answeredTargets = targets.filter((questionId) => answers[questionId] !== undefined);
      return (answeredTargets.length > 0 ? answeredTargets : targets.slice(0, 1)).map(
        (questionId) => [questionId, grade],
      );
    }),
  );
  const reviewQuestionIds = [...new Set(session.reviewQuestionIds.flatMap(targetIdsForLegacyUnit))];
  const unitConfirmations: NonNullable<B1PracticeSessionRow['unitConfirmations']> = {};
  for (const [legacyQuestionId, confirmation] of Object.entries(session.unitConfirmations ?? {})) {
    for (const questionId of targetIdsForLegacyUnit(legacyQuestionId)) {
      const mappedAnswers: B1AnswerValues = {};
      for (const [legacyFieldId, value] of Object.entries(confirmation.answers)) {
        const target = getB1LegacyAnswerFieldTarget(legacyQuestionId, legacyFieldId);
        const targetQuestionId = target?.questionId ?? legacyQuestionId;
        const targetFieldId = target?.fieldId ?? legacyFieldId;
        if (targetQuestionId === questionId) mappedAnswers[targetFieldId] = value;
      }
      if (Object.keys(mappedAnswers).length > 0) {
        unitConfirmations[questionId] = {
          answers: mappedAnswers,
          confirmedAt: confirmation.confirmedAt,
        };
      }
    }
  }
  const selfGradeUpdatedAt = Object.fromEntries(
    Object.entries(session.selfGradeUpdatedAt ?? {}).flatMap(([legacyQuestionId, updatedAt]) =>
      targetIdsForLegacyUnit(legacyQuestionId)
        .filter((questionId) => selfGrades[questionId] !== undefined)
        .map((questionId) => [questionId, updatedAt]),
    ),
  );
  const legacyCurrentId =
    session.unitIds[Math.min(session.currentIndex, session.unitIds.length - 1)];
  const currentId =
    legacyCurrentId === undefined ? undefined : targetIdsForLegacyUnit(legacyCurrentId)[0];
  const currentIndex = Math.max(0, currentId === undefined ? 0 : currentUnitIds.indexOf(currentId));

  return {
    ...session,
    unitIds: [...currentUnitIds],
    answers,
    unitConfirmations,
    selfGrades,
    selfGradeUpdatedAt,
    reviewQuestionIds,
    currentIndex,
  };
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validatePractice(session: B1PracticeSessionRow): void {
  const caseItem = getB1Case(session.caseId);
  if (
    caseItem === undefined ||
    session.unitIds.length === 0 ||
    !session.unitIds.every((unitId) =>
      caseItem.questionUnits.some((unit) => unit.questionId === unitId),
    )
  ) {
    throw new B1DataError('科目B演習の問題構成が正しくありません。');
  }
  validateB1UnitState(session);
}

function validateMock(session: B1MockSessionRow): void {
  const expectedUnitIds = getB1UnitIds(session.caseIds);
  if (
    session.caseIds.length !== 2 ||
    new Set(session.caseIds).size !== 2 ||
    session.unitIds.length === 0 ||
    new Set(session.unitIds).size !== session.unitIds.length ||
    !sameStringArray(session.unitIds, expectedUnitIds) ||
    new Date(session.deadlineAt).getTime() <= new Date(session.startedAt).getTime() ||
    (session.mockType === 'official_year' &&
      session.caseIds.some((caseId) => getB1Case(caseId)?.year !== session.year))
  ) {
    throw new B1DataError('科目B模試の保存データが正しくありません。');
  }
  validateB1UnitState(session);
}

function createSubmittedMockConfirmations(
  session: B1MockSessionRow,
  confirmedAt: string,
): NonNullable<B1MockSessionRow['unitConfirmations']> {
  const confirmations = { ...session.unitConfirmations };
  for (const questionId of session.unitIds) {
    const unit = getB1QuestionUnit(questionId);
    if (unit === undefined) continue;
    const answers = session.answers[questionId] ?? {};
    if (getB1UnansweredFieldIds(unit, answers).length === 0) {
      confirmations[questionId] ??= { answers: { ...answers }, confirmedAt };
    }
  }
  return confirmations;
}

function validateB1UnitState(
  session: Pick<
    B1PracticeSessionRow,
    'unitIds' | 'unitConfirmations' | 'selfGrades' | 'selfGradeUpdatedAt'
  >,
): void {
  for (const [questionId, confirmation] of Object.entries(session.unitConfirmations ?? {})) {
    const unit = getB1QuestionUnit(questionId);
    if (
      unit === undefined ||
      !session.unitIds.includes(questionId) ||
      !isIsoDate(confirmation.confirmedAt) ||
      getB1UnansweredFieldIds(unit, confirmation.answers).length > 0 ||
      Object.keys(confirmation.answers).some(
        (fieldId) => !unit.answerFields.some((field) => field.fieldId === fieldId),
      )
    ) {
      throw new B1DataError(
        '科目Bの回答確定データに不正な内容があります。入力内容を確認してください。',
      );
    }
  }
  for (const [questionId, updatedAt] of Object.entries(session.selfGradeUpdatedAt ?? {})) {
    if (session.selfGrades[questionId] === undefined || !isIsoDate(updatedAt)) {
      throw new B1DataError(
        '科目Bの自己評価データに不正な内容があります。もう一度評価してください。',
      );
    }
  }
}

function isIsoDate(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

function toPdfMetadata(row: B1PdfFileRow): B1PdfRegistrationMetadata {
  return {
    subjectId: row.subjectId,
    year: row.year,
    fileName: row.fileName,
    mimeType: row.mimeType,
    size: row.size,
    updatedAt: row.updatedAt,
  };
}

function createB1SessionId(prefix: 'practice' | 'mock'): string {
  return `b1-${prefix}-${crypto.randomUUID()}`;
}
