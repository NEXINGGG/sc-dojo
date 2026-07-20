import { getSubjectCatalog } from '../../data/catalog';
import { database, type A1DojoDatabase } from '../../database/database';
import {
  buildProgressAnalytics,
  type AnalyticsPeriod,
  type ProgressAnalytics,
} from '../../domain/progress';
import { ensureLearningDataReady } from '../learning/learningRepository';
import type { SubjectId } from '../../domain/subject';

export class ProgressRepository {
  constructor(
    private readonly targetDatabase: A1DojoDatabase = database,
    private readonly subjectId: SubjectId = 'a1',
  ) {}

  async getAnalytics(
    period: AnalyticsPeriod = '30d',
    now: Date = new Date(),
  ): Promise<ProgressAnalytics> {
    await ensureLearningDataReady(this.targetDatabase);

    const [attempts, progressRows, practiceResults, examResults] = await Promise.all([
      this.targetDatabase.answerAttempts
        .toArray()
        .then((rows) => rows.filter((row) => matchesSubject(row.subjectId, this.subjectId))),
      this.targetDatabase.questionProgress
        .toArray()
        .then((rows) => rows.filter((row) => matchesSubject(row.subjectId, this.subjectId))),
      this.targetDatabase.practiceResults
        .toArray()
        .then((rows) => rows.filter((row) => matchesSubject(row.subjectId, this.subjectId))),
      this.targetDatabase.examResults
        .toArray()
        .then((rows) => rows.filter((row) => matchesSubject(row.subjectId, this.subjectId))),
    ]);

    return buildProgressAnalytics(
      getSubjectCatalog(this.subjectId).questions,
      {
        attempts,
        progressRows,
        practiceResults,
        examResults,
        period,
        now,
      },
      getSubjectCatalog(this.subjectId).categories,
      getSubjectCatalog(this.subjectId).domains,
    );
  }
}

function matchesSubject(value: SubjectId | undefined, subjectId: SubjectId): boolean {
  return value === subjectId || (value === undefined && subjectId === 'a1');
}
