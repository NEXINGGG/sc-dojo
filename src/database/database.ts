import Dexie, { type EntityTable } from 'dexie';
import type {
  AnswerAttemptRow,
  ExamResultRow,
  ExamSessionRow,
  LearningDayRow,
  MetadataRow,
  PracticeResultRow,
  PracticeSessionRow,
  QuestionProgressRow,
  SettingRow,
} from './types';

export const DATABASE_NAME = 'a1-dojo';
export const DATABASE_VERSION = 2;

export class A1DojoDatabase extends Dexie {
  questionProgress!: EntityTable<QuestionProgressRow, 'code'>;
  answerAttempts!: EntityTable<AnswerAttemptRow, 'id'>;
  practiceSessions!: EntityTable<PracticeSessionRow, 'id'>;
  practiceResults!: EntityTable<PracticeResultRow, 'id'>;
  examSessions!: EntityTable<ExamSessionRow, 'id'>;
  examResults!: EntityTable<ExamResultRow, 'id'>;
  learningDays!: EntityTable<LearningDayRow, 'date'>;
  settings!: EntityTable<SettingRow, 'key'>;
  metadata!: EntityTable<MetadataRow, 'key'>;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores({
      questionProgress: '&code, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts: '++id, code, answeredAt, mode, sessionId',
      practiceSessions: '&id, status, updatedAt',
      examSessions: '&id, status, updatedAt, deadlineAt',
      examResults: '&id, examSessionId, completedAt',
      learningDays: '&date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
    });

    this.version(2).stores({
      questionProgress: '&code, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts: '++id, &[sessionId+code], code, sessionId, answeredAt, mode',
      practiceSessions: '&id, status, updatedAt',
      practiceResults: '&id, &sessionId, completedAt, mode',
      examSessions: '&id, status, updatedAt, deadlineAt',
      examResults: '&id, examSessionId, completedAt',
      learningDays: '&date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
    });
  }
}

export function createDatabase(name = DATABASE_NAME): A1DojoDatabase {
  return new A1DojoDatabase(name);
}

export const database = createDatabase();

export async function initializeDatabase(target = database): Promise<void> {
  await target.open();
}
