import { getQuestionByCode, getSubjectCatalog } from '../../data/catalog';
import type { A1DojoDatabase } from '../../database/database';
import type {
  AnswerAttemptRow,
  LearningDayRow,
  PracticeResultRow,
  PracticeSessionRow,
  QuestionProgressRow,
} from '../../database/types';
import {
  applyAnswerToQuestionProgress,
  createEmptyQuestionProgress,
  createLearningDashboard,
  createPracticeResult,
  getAsiaTokyoDate,
  getPracticeModeForAnswerStatus,
  type LearningDashboard,
} from '../../domain/learning';
import type { SubjectId } from '../../domain/subject';
import type { Question } from '../../types/question';

const readinessByDatabase = new WeakMap<A1DojoDatabase, Promise<void>>();

export class LearningRepository {
  constructor(
    private readonly database: A1DojoDatabase,
    private readonly subjectId: SubjectId = 'a1',
  ) {}

  async getProgress(code: string): Promise<QuestionProgressRow | undefined> {
    await ensureLearningDataReady(this.database);
    if (this.subjectId === 'a1') {
      const row = await this.database.questionProgress.get(code);
      return row?.subjectId === undefined || row.subjectId === 'a1' ? row : undefined;
    }
    return this.database.questionProgress
      .where('[subjectId+code]')
      .equals([this.subjectId, code])
      .first();
  }

  async getProgressMap(): Promise<ReadonlyMap<string, QuestionProgressRow>> {
    await ensureLearningDataReady(this.database);
    const rows = (await this.database.questionProgress.toArray()).filter((row) =>
      matchesSubject(row.subjectId, this.subjectId),
    );
    return new Map(rows.map((row) => [row.code, row]));
  }

  async getAttempts(code: string): Promise<readonly AnswerAttemptRow[]> {
    await ensureLearningDataReady(this.database);
    const attempts = (await this.database.answerAttempts.where('code').equals(code).toArray())
      .filter((row) => matchesSubject(row.subjectId, this.subjectId))
      .sort((left, right) => left.answeredAt.localeCompare(right.answeredAt));
    return attempts.reverse();
  }

  async getPracticeResult(sessionId: string): Promise<PracticeResultRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.practiceResults
      .where('[subjectId+sessionId]')
      .equals([this.subjectId, sessionId])
      .first();
  }

  async getDashboard(referenceDate: Date = new Date()): Promise<LearningDashboard> {
    await ensureLearningDataReady(this.database);
    const [progressRows, learningDays] = await Promise.all([
      this.database.questionProgress
        .toArray()
        .then((rows) => rows.filter((row) => matchesSubject(row.subjectId, this.subjectId))),
      this.database.learningDaysBySubject.where('subjectId').equals(this.subjectId).toArray(),
    ]);
    return createLearningDashboard(
      getSubjectCatalog(this.subjectId).questions,
      new Map(progressRows.map((row) => [row.code, row])),
      learningDays,
      referenceDate,
    );
  }

  async setFavorite(
    code: string,
    favorite: boolean,
    updatedAt: string,
  ): Promise<QuestionProgressRow> {
    await ensureLearningDataReady(this.database);

    return this.database.transaction('rw', this.database.questionProgress, async () => {
      const current = await this.database.questionProgress
        .where('[subjectId+code]')
        .equals([this.subjectId, code])
        .first();
      const base = current ?? createEmptyQuestionProgress(code, updatedAt, this.subjectId);
      const next: QuestionProgressRow = {
        ...base,
        favorite,
        favoriteAt: favorite ? (base.favoriteAt ?? updatedAt) : undefined,
        updatedAt,
      };
      await this.database.questionProgress.put(next);
      return next;
    });
  }

  async recordConfirmedPracticeAnswer(
    session: PracticeSessionRow,
    question: Question,
  ): Promise<{ session: PracticeSessionRow; recorded: boolean }> {
    await ensureLearningDataReady(this.database);
    if (session.subjectId !== this.subjectId || question.subjectId !== this.subjectId) {
      throw new LearningDataError('選択中の科目と異なる学習データは保存できません。');
    }
    const response = session.answers[question.code];

    if (
      response === undefined ||
      !response.confirmed ||
      response.isCorrect === undefined ||
      response.confirmedAt === undefined
    ) {
      throw new LearningDataError('確定済みの回答だけを学習履歴へ保存できます。');
    }
    const isCorrect = response.isCorrect;
    const confirmedAt = response.confirmedAt;

    if (!question.choices.some((choice) => choice.id === response.selectedChoice)) {
      throw new LearningDataError('選択肢の形式に問題があるため、回答を保存できません。');
    }

    return this.database.transaction(
      'rw',
      this.database.practiceSessions,
      this.database.answerAttempts,
      this.database.questionProgress,
      this.database.learningDays,
      this.database.learningDaysBySubject,
      async () => {
        const existing = await getAttemptForSessionQuestion(
          this.database,
          session.subjectId,
          session.id,
          question.code,
        );
        await this.database.practiceSessions.put(session);

        if (existing !== undefined) {
          return { session, recorded: false };
        }

        const attempt = createAttempt(
          session,
          question,
          response.selectedChoice,
          isCorrect,
          confirmedAt,
        );
        await this.database.answerAttempts.add(attempt);
        await updateProgressAndLearningDay(this.database, attempt);

        return { session, recorded: true };
      },
    );
  }

  async completePracticeSession(session: PracticeSessionRow): Promise<PracticeResultRow> {
    await ensureLearningDataReady(this.database);
    if (session.status !== 'completed' || session.completedAt === undefined) {
      throw new LearningDataError('完了済みの通常演習だけを結果として保存できます。');
    }
    const completedAt = session.completedAt;

    return this.database.transaction(
      'rw',
      this.database.practiceSessions,
      this.database.practiceResults,
      async () => {
        await this.database.practiceSessions.put(session);
        const existing = await this.database.practiceResults
          .where('[subjectId+sessionId]')
          .equals([session.subjectId, session.id])
          .first();
        if (existing !== undefined) {
          return existing;
        }
        const result = createPracticeResult(session, completedAt);
        await this.database.practiceResults.add(result);
        return result;
      },
    );
  }
}

export class LearningDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearningDataError';
  }
}

export function ensureLearningDataReady(database: A1DojoDatabase): Promise<void> {
  const existing = readinessByDatabase.get(database);
  if (existing !== undefined) {
    return existing;
  }

  const readiness = backfillLegacyPracticeData(database).catch((error: unknown) => {
    // IndexedDBが一時的に利用できない場合、再読み込みや空き容量確保後に再試行できるようにする。
    readinessByDatabase.delete(database);
    throw error;
  });
  readinessByDatabase.set(database, readiness);
  return readiness;
}

async function backfillLegacyPracticeData(database: A1DojoDatabase): Promise<void> {
  await database.open();
  const sessions = await database.practiceSessions.toArray();

  for (const session of sessions) {
    try {
      await database.transaction(
        'rw',
        database.answerAttempts,
        database.questionProgress,
        database.learningDays,
        database.learningDaysBySubject,
        database.practiceResults,
        async () => {
          const subjectId = session.subjectId ?? 'a1';
          for (const [code, response] of Object.entries(session.answers)) {
            if (
              !response.confirmed ||
              response.isCorrect === undefined ||
              response.confirmedAt === undefined ||
              !session.questionCodes.includes(code)
            ) {
              continue;
            }
            const question = getQuestionByCode(code, subjectId);
            if (
              question === undefined ||
              !question.choices.some((choice) => choice.id === response.selectedChoice)
            ) {
              continue;
            }
            const existing = await getAttemptForSessionQuestion(
              database,
              subjectId,
              session.id,
              code,
            );
            if (existing !== undefined) {
              continue;
            }
            const attempt = createAttempt(
              session,
              question,
              response.selectedChoice,
              response.isCorrect,
              response.confirmedAt,
            );
            await database.answerAttempts.add(attempt);
            await updateProgressAndLearningDay(database, attempt);
          }

          if (session.status === 'completed' && session.completedAt !== undefined) {
            const existingResult = await database.practiceResults
              .where('[subjectId+sessionId]')
              .equals([subjectId, session.id])
              .first();
            if (existingResult === undefined) {
              await database.practiceResults.add(
                createPracticeResult(session, session.completedAt),
              );
            }
          }
        },
      );
    } catch {
      // A migration failure must never discard the original Phase 3 session.
    }
  }
}

function createAttempt(
  session: PracticeSessionRow,
  question: Question,
  selectedChoice: AnswerAttemptRow['selectedChoice'],
  isCorrect: boolean,
  answeredAt: string,
): Omit<AnswerAttemptRow, 'id'> {
  return {
    subjectId: session.subjectId,
    code: question.code,
    selectedChoice,
    correctChoice: question.correctChoice,
    isCorrect,
    answeredAt,
    mode: session.mode ?? getPracticeModeForAnswerStatus(session.filters.answerStatus ?? 'all'),
    sessionId: session.id,
    version: 1,
  };
}

async function getAttemptForSessionQuestion(
  database: A1DojoDatabase,
  subjectId: SubjectId,
  sessionId: string,
  code: string,
): Promise<AnswerAttemptRow | undefined> {
  return database.answerAttempts
    .where('[subjectId+sessionId+code]')
    .equals([subjectId, sessionId, code])
    .first();
}

async function updateProgressAndLearningDay(
  database: A1DojoDatabase,
  attempt: Omit<AnswerAttemptRow, 'id'>,
): Promise<void> {
  const currentProgress = await database.questionProgress
    .where('[subjectId+code]')
    .equals([attempt.subjectId, attempt.code])
    .first();
  await database.questionProgress.put(applyAnswerToQuestionProgress(currentProgress, attempt));

  const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
  const currentDay = await database.learningDaysBySubject.get([attempt.subjectId, date]);
  const nextDay: LearningDayRow = {
    subjectId: attempt.subjectId,
    date,
    answerCount: (currentDay?.answerCount ?? 0) + 1,
    updatedAt: attempt.answeredAt,
  };
  await database.learningDaysBySubject.put(nextDay);
  if (attempt.subjectId === 'a1') {
    await database.learningDays.put(nextDay);
  }
}

function matchesSubject(value: SubjectId | undefined, subjectId: SubjectId): boolean {
  return value === subjectId || (value === undefined && subjectId === 'a1');
}
