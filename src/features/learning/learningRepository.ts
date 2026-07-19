import { getQuestionByCode, questions } from '../../data/catalog';
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
import type { Question } from '../../types/question';

const readinessByDatabase = new WeakMap<A1DojoDatabase, Promise<void>>();

export class LearningRepository {
  constructor(private readonly database: A1DojoDatabase) {}

  async getProgress(code: string): Promise<QuestionProgressRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.questionProgress.get(code);
  }

  async getProgressMap(): Promise<ReadonlyMap<string, QuestionProgressRow>> {
    await ensureLearningDataReady(this.database);
    const rows = await this.database.questionProgress.toArray();
    return new Map(rows.map((row) => [row.code, row]));
  }

  async getAttempts(code: string): Promise<readonly AnswerAttemptRow[]> {
    await ensureLearningDataReady(this.database);
    const attempts = await this.database.answerAttempts
      .where('code')
      .equals(code)
      .sortBy('answeredAt');
    return attempts.reverse();
  }

  async getPracticeResult(sessionId: string): Promise<PracticeResultRow | undefined> {
    await ensureLearningDataReady(this.database);
    return this.database.practiceResults.get(sessionId);
  }

  async getDashboard(referenceDate: Date = new Date()): Promise<LearningDashboard> {
    await ensureLearningDataReady(this.database);
    const [progressRows, learningDays] = await Promise.all([
      this.database.questionProgress.toArray(),
      this.database.learningDays.toArray(),
    ]);
    return createLearningDashboard(
      questions,
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
      const current = await this.database.questionProgress.get(code);
      const base = current ?? createEmptyQuestionProgress(code, updatedAt);
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
      async () => {
        const existing = await getAttemptForSessionQuestion(
          this.database,
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
        const existing = await this.database.practiceResults.get(session.id);
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
        database.practiceResults,
        async () => {
          for (const [code, response] of Object.entries(session.answers)) {
            if (
              !response.confirmed ||
              response.isCorrect === undefined ||
              response.confirmedAt === undefined ||
              !session.questionCodes.includes(code)
            ) {
              continue;
            }
            const question = getQuestionByCode(code);
            if (
              question === undefined ||
              !question.choices.some((choice) => choice.id === response.selectedChoice)
            ) {
              continue;
            }
            const existing = await getAttemptForSessionQuestion(database, session.id, code);
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
            const existingResult = await database.practiceResults.get(session.id);
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
  sessionId: string,
  code: string,
): Promise<AnswerAttemptRow | undefined> {
  return database.answerAttempts.where('[sessionId+code]').equals([sessionId, code]).first();
}

async function updateProgressAndLearningDay(
  database: A1DojoDatabase,
  attempt: Omit<AnswerAttemptRow, 'id'>,
): Promise<void> {
  const currentProgress = await database.questionProgress.get(attempt.code);
  await database.questionProgress.put(applyAnswerToQuestionProgress(currentProgress, attempt));

  const date = getAsiaTokyoDate(new Date(attempt.answeredAt));
  const currentDay = await database.learningDays.get(date);
  const nextDay: LearningDayRow = {
    date,
    answerCount: (currentDay?.answerCount ?? 0) + 1,
    updatedAt: attempt.answeredAt,
  };
  await database.learningDays.put(nextDay);
}
