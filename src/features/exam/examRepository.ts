import { getQuestionByCode } from '../../data/catalog';
import type { A1DojoDatabase } from '../../database/database';
import type {
  AnswerAttemptRow,
  ExamResultRow,
  ExamSessionRow,
  ExamSubmissionReason,
  ExamType,
  LearningDayRow,
} from '../../database/types';
import { applyAnswerToQuestionProgress, getAsiaTokyoDate } from '../../domain/learning';
import {
  ExamDataError,
  getExamAnswerSource,
  getExamTimerState,
  gradeExam,
} from '../../domain/exam';
import { ensureLearningDataReady } from '../learning/learningRepository';
import type { SubjectId } from '../../domain/subject';
import { markQuestionForCloudSync } from '../sync/cloudSyncLocalRepository';
import { notifyCloudSyncNeeded } from '../sync/syncEvents';

export interface ExamTypeHistorySummary {
  attempts: number;
  latest?: ExamResultRow;
  highestScore?: number;
}

export interface ExamOverview {
  inProgress?: ExamSessionRow;
  latestResult?: ExamResultRow;
  totalAttempts: number;
}

export class ActiveExamSessionExistsError extends Error {
  constructor(readonly session: ExamSessionRow) {
    super('途中の模擬試験があります。');
    this.name = 'ActiveExamSessionExistsError';
  }
}

export class ExamPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamPersistenceError';
  }
}

export class ExamRepository {
  constructor(
    private readonly database: A1DojoDatabase,
    private readonly subjectId: SubjectId = 'a1',
  ) {}

  async get(sessionId: string): Promise<ExamSessionRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.examSessions
      .where('[subjectId+id]')
      .equals([this.subjectId, sessionId])
      .first();
  }

  async getInProgress(): Promise<ExamSessionRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.examSessions
      .where('[subjectId+status]')
      .equals([this.subjectId, 'in_progress'])
      .first();
  }

  async createInProgress(session: ExamSessionRow): Promise<void> {
    await ensureLearningDataReady(this.database);
    if (session.status !== 'in_progress' || session.subjectId !== this.subjectId) {
      throw new ExamPersistenceError('開始前の模試だけを保存できます。');
    }

    await this.database.transaction('rw', this.database.examSessions, async () => {
      const existing = await this.getInProgress();
      if (existing !== undefined) {
        throw new ActiveExamSessionExistsError(existing);
      }
      await this.database.examSessions.add(session);
    });
  }

  async saveInProgress(session: ExamSessionRow): Promise<void> {
    await ensureLearningDataReady(this.database);
    if (session.status !== 'in_progress' || session.subjectId !== this.subjectId) {
      throw new ExamPersistenceError('提出済みの模試は変更できません。');
    }

    await this.database.transaction('rw', this.database.examSessions, async () => {
      const current = await this.get(session.id);
      if (current === undefined) {
        throw new ExamPersistenceError('保存済みの模試が見つかりません。');
      }
      if (current.status !== 'in_progress') {
        throw new ExamPersistenceError('提出済みの模試は変更できません。');
      }
      await this.database.examSessions.put(session);
    });
  }

  async discardInProgress(sessionId: string): Promise<void> {
    await ensureLearningDataReady(this.database);
    await this.database.transaction('rw', this.database.examSessions, async () => {
      const current = await this.get(sessionId);
      if (current?.status === 'in_progress') {
        await this.database.examSessions.delete(sessionId);
      }
    });
  }

  async submit(
    sessionId: string,
    submittedAt: string,
    submissionReason: ExamSubmissionReason,
  ): Promise<{ result: ExamResultRow; created: boolean }> {
    await ensureLearningDataReady(this.database);

    const submission = await this.database.transaction(
      'rw',
      [
        this.database.examSessions,
        this.database.examResults,
        this.database.answerAttempts,
        this.database.questionProgress,
        this.database.learningDays,
        this.database.learningDaysBySubject,
        this.database.cloudSyncMetadata,
      ],
      async () => {
        const existingResult = await this.database.examResults
          .where('[subjectId+examSessionId]')
          .equals([this.subjectId, sessionId])
          .first();
        if (existingResult !== undefined) {
          return { result: existingResult, created: false };
        }

        const session = await this.get(sessionId);
        if (session === undefined) {
          throw new ExamPersistenceError('保存済みの模試が見つかりません。');
        }
        if (session.status !== 'in_progress') {
          throw new ExamPersistenceError(
            '提出済みの模試結果を確認できません。再読み込みしてください。',
          );
        }

        let result: ExamResultRow;
        try {
          result = gradeExam(
            session,
            new Map(
              session.questionCodes
                .map((code) => [code, getQuestionByCode(code, this.subjectId)] as const)
                .filter(
                  (entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] =>
                    entry[1] !== undefined,
                ),
            ),
            submittedAt,
            submissionReason,
          );
        } catch (error) {
          if (error instanceof ExamDataError) {
            throw new ExamPersistenceError(error.message);
          }
          throw error;
        }

        const submittedSession: ExamSessionRow = {
          ...session,
          status: 'submitted',
          submittedAt,
          submissionReason,
          updatedAt: submittedAt,
        };
        await this.database.examSessions.put(submittedSession);
        await this.database.examResults.add(result);
        await saveExamAnswerAttempts(this.database, result);

        return { result, created: true };
      },
    );
    if (submission.created) {
      notifyCloudSyncNeeded();
    }
    return submission;
  }

  async submitExpiredInProgress(
    now: Date = new Date(),
  ): Promise<{ result: ExamResultRow; created: boolean } | undefined> {
    const session = await this.getInProgress();
    if (session === undefined) {
      return undefined;
    }
    const timer = getExamTimerState(session.deadlineAt, now);
    if (timer.status === 'invalid') {
      throw new ExamPersistenceError(
        '保存された模試の制限時間を確認できません。模試画面で内容を確認してください。',
      );
    }
    if (timer.status !== 'expired') {
      return undefined;
    }
    return this.submit(session.id, now.toISOString(), 'timeout');
  }

  async getResult(sessionId: string): Promise<ExamResultRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.examResults
      .where('[subjectId+examSessionId]')
      .equals([this.subjectId, sessionId])
      .first();
  }

  async listResults(): Promise<readonly ExamResultRow[]> {
    await ensureLearningDataReady(this.database);
    const results = await this.database.examResults
      .where('subjectId')
      .equals(this.subjectId)
      .sortBy('submittedAt');
    results.reverse();
    return results;
  }

  async getTypeHistorySummaries(): Promise<Record<ExamType, ExamTypeHistorySummary>> {
    const results = await this.listResults();
    const summaries: Record<ExamType, ExamTypeHistorySummary> = {
      fixed_1: { attempts: 0 },
      fixed_2: { attempts: 0 },
      random: { attempts: 0 },
    };

    for (const result of results) {
      const summary = summaries[result.examType];
      summary.attempts += 1;
      summary.latest ??= result;
      summary.highestScore = Math.max(summary.highestScore ?? 0, result.score);
    }
    return summaries;
  }

  async getOverview(): Promise<ExamOverview> {
    const [inProgress, results] = await Promise.all([this.getInProgress(), this.listResults()]);
    return {
      inProgress,
      latestResult: results[0],
      totalAttempts: results.length,
    };
  }
}

async function saveExamAnswerAttempts(
  database: A1DojoDatabase,
  result: ExamResultRow,
): Promise<void> {
  for (const code of result.questionCodes) {
    const questionResult = result.questionResults[code];
    if (
      questionResult === undefined ||
      questionResult.selectedChoice === undefined ||
      questionResult.isCorrect === undefined
    ) {
      continue;
    }
    const existing = await database.answerAttempts
      .where('[subjectId+sessionId+code]')
      .equals([result.subjectId, result.examSessionId, code])
      .first();
    if (existing !== undefined) {
      continue;
    }

    const attempt: Omit<AnswerAttemptRow, 'id'> = {
      subjectId: result.subjectId,
      code,
      selectedChoice: questionResult.selectedChoice,
      correctChoice: questionResult.correctChoice,
      isCorrect: questionResult.isCorrect,
      answeredAt: result.submittedAt,
      mode: getExamAnswerSource(result.examType),
      sessionId: result.examSessionId,
      version: 1,
    };
    await database.answerAttempts.add(attempt);

    const progress = await database.questionProgress
      .where('[subjectId+code]')
      .equals([result.subjectId, code])
      .first();
    await database.questionProgress.put(applyAnswerToQuestionProgress(progress, attempt));
    await markQuestionForCloudSync(database, result.subjectId, code, result.submittedAt);
    const date = getAsiaTokyoDate(new Date(result.submittedAt));
    const currentDay = await database.learningDaysBySubject.get([result.subjectId, date]);
    const nextDay: LearningDayRow = {
      subjectId: result.subjectId,
      date,
      answerCount: (currentDay?.answerCount ?? 0) + 1,
      updatedAt: result.submittedAt,
    };
    await database.learningDaysBySubject.put(nextDay);
    if (result.subjectId === 'a1') {
      await database.learningDays.put(nextDay);
    }
  }
}
