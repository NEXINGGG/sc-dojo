import { categories, domains, questions } from '../../data/catalog';
import { database, type A1DojoDatabase } from '../../database/database';
import {
  buildProgressAnalytics,
  type AnalyticsPeriod,
  type ProgressAnalytics,
} from '../../domain/progress';
import { ensureLearningDataReady } from '../learning/learningRepository';

export class ProgressRepository {
  constructor(private readonly targetDatabase: A1DojoDatabase = database) {}

  async getAnalytics(
    period: AnalyticsPeriod = '30d',
    now: Date = new Date(),
  ): Promise<ProgressAnalytics> {
    await ensureLearningDataReady(this.targetDatabase);

    const [attempts, progressRows, practiceResults, examResults] = await Promise.all([
      this.targetDatabase.answerAttempts.toArray(),
      this.targetDatabase.questionProgress.toArray(),
      this.targetDatabase.practiceResults.toArray(),
      this.targetDatabase.examResults.toArray(),
    ]);

    return buildProgressAnalytics(
      questions,
      {
        attempts,
        progressRows,
        practiceResults,
        examResults,
        period,
        now,
      },
      categories,
      domains,
    );
  }
}
