import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  AnswerAttemptRow,
  B1MockSessionRow,
  B1AnswerAttemptRow,
  B1LearnerEvidenceRow,
  B1LearningReflectionRow,
  B1PdfFileRow,
  B1PracticeSessionRow,
  B1RemediationProgressRow,
  B1PreferenceRow,
  ExamResultRow,
  ExamSessionRow,
  FontSizePreference,
  LearningDayRow,
  MetadataRow,
  PracticeResultRow,
  PracticeSessionRow,
  QuestionProgressRow,
  ReducedMotionPreference,
  SettingRow,
  ThemePreference,
} from './types';
import type { SubjectId } from '../domain/subject';

export const DATABASE_NAME = 'a1-dojo';
export const DATABASE_VERSION = 10;

export class A1DojoDatabase extends Dexie {
  questionProgress!: EntityTable<QuestionProgressRow, 'code'>;
  answerAttempts!: EntityTable<AnswerAttemptRow, 'id'>;
  practiceSessions!: EntityTable<PracticeSessionRow, 'id'>;
  practiceResults!: EntityTable<PracticeResultRow, 'id'>;
  examSessions!: EntityTable<ExamSessionRow, 'id'>;
  examResults!: EntityTable<ExamResultRow, 'id'>;
  learningDays!: EntityTable<LearningDayRow, 'date'>;
  learningDaysBySubject!: Table<LearningDayRow, [SubjectId, string]>;
  settings!: EntityTable<SettingRow, 'key'>;
  metadata!: EntityTable<MetadataRow, 'key'>;
  b1PdfFiles!: Table<B1PdfFileRow, number>;
  b1PracticeSessions!: EntityTable<B1PracticeSessionRow, 'id'>;
  b1MockSessions!: EntityTable<B1MockSessionRow, 'id'>;
  b1LearnerEvidence!: EntityTable<B1LearnerEvidenceRow, 'id'>;
  b1LearningReflections!: EntityTable<B1LearningReflectionRow, 'id'>;
  b1RemediationProgress!: EntityTable<B1RemediationProgressRow, 'id'>;
  b1AnswerAttempts!: EntityTable<B1AnswerAttemptRow, 'id'>;
  b1Preferences!: EntityTable<B1PreferenceRow, 'key'>;

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

    this.version(3).stores({
      questionProgress: '&code, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts: '++id, &[sessionId+code], code, sessionId, answeredAt, mode',
      practiceSessions: '&id, status, updatedAt',
      practiceResults: '&id, &sessionId, completedAt, mode',
      examSessions: '&id, status, updatedAt, deadlineAt, examType',
      examResults: '&id, &examSessionId, examType, submittedAt',
      learningDays: '&date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
    });

    this.version(4)
      .stores({
        questionProgress: '&code, favorite, lastAnsweredAt, lastIsCorrect',
        answerAttempts: '++id, &[sessionId+code], code, sessionId, answeredAt, mode',
        practiceSessions: '&id, status, updatedAt',
        practiceResults: '&id, &sessionId, completedAt, mode',
        examSessions: '&id, status, updatedAt, deadlineAt, examType',
        examResults: '&id, &examSessionId, examType, submittedAt',
        learningDays: '&date, updatedAt',
        settings: '&key, updatedAt',
        metadata: '&key, updatedAt',
      })
      .upgrade(async (transaction) => {
        const settings = transaction.table<SettingRow, 'key'>('settings');
        await settings.toCollection().modify((row) => {
          row.theme = normalizeTheme(row.theme);
          row.fontSize = normalizeFontSize(row.fontSize);
          row.reducedMotion = normalizeReducedMotion(row.reducedMotion);
          row.shuffleChoices = row.shuffleChoices === true;
        });
      });

    this.version(5)
      .stores({
        questionProgress:
          '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
        answerAttempts:
          '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
        practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
        practiceResults:
          '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
        examSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
        examResults:
          '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
        // Retained for a safe, reversible migration from the v1-v4 date-only key.
        learningDays: '&date, subjectId, updatedAt',
        learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
        settings: '&key, updatedAt',
        metadata: '&key, updatedAt',
      })
      .upgrade(async (transaction) => {
        const subjectId: SubjectId = 'a1';
        const addA1Subject = <T extends { subjectId?: SubjectId }>(row: T) => {
          row.subjectId ??= subjectId;
        };

        await Promise.all([
          transaction.table('questionProgress').toCollection().modify(addA1Subject),
          transaction.table('answerAttempts').toCollection().modify(addA1Subject),
          transaction.table('practiceSessions').toCollection().modify(addA1Subject),
          transaction.table('practiceResults').toCollection().modify(addA1Subject),
          transaction.table('examSessions').toCollection().modify(addA1Subject),
          transaction.table('examResults').toCollection().modify(addA1Subject),
          transaction.table('learningDays').toCollection().modify(addA1Subject),
          transaction
            .table<SettingRow, 'key'>('settings')
            .toCollection()
            .modify((row) => {
              row.selectedSubject ??= subjectId;
            }),
        ]);

        const legacyLearningDays = await transaction
          .table<LearningDayRow, 'date'>('learningDays')
          .toArray();
        const scopedLearningDays = transaction.table<LearningDayRow, [SubjectId, string]>(
          'learningDaysBySubject',
        );
        for (const day of legacyLearningDays) {
          await scopedLearningDays.put({ ...day, subjectId: day.subjectId ?? subjectId });
        }
      });

    this.version(6).stores({
      questionProgress:
        '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts:
        '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
      practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
      practiceResults:
        '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
      examSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
      examResults:
        '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
      learningDays: '&date, subjectId, updatedAt',
      learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
      b1PdfFiles: '&year, updatedAt',
      b1PracticeSessions: '&id, status, caseId, updatedAt',
      b1MockSessions: '&id, status, year, updatedAt, deadlineAt',
    });

    this.version(7)
      .stores({
        questionProgress:
          '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
        answerAttempts:
          '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
        practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
        practiceResults:
          '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
        examSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
        examResults:
          '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
        learningDays: '&date, subjectId, updatedAt',
        learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
        settings: '&key, updatedAt',
        metadata: '&key, updatedAt',
        b1PdfFiles: '&year, subjectId, updatedAt',
        b1PracticeSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
        b1MockSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
      })
      .upgrade(async (transaction) => {
        const addB1Subject = <T extends { subjectId?: 'b1' }>(row: T) => {
          row.subjectId ??= 'b1';
        };
        await Promise.all([
          transaction.table('b1PdfFiles').toCollection().modify(addB1Subject),
          transaction.table('b1PracticeSessions').toCollection().modify(addB1Subject),
          transaction.table('b1MockSessions').toCollection().modify(addB1Subject),
        ]);
      });

    this.version(8).stores({
      questionProgress:
        '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
      answerAttempts:
        '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
      practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
      practiceResults:
        '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
      examSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
      examResults:
        '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
      learningDays: '&date, subjectId, updatedAt',
      learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
      settings: '&key, updatedAt',
      metadata: '&key, updatedAt',
      b1PdfFiles: '&year, subjectId, updatedAt',
      b1PracticeSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
      b1MockSessions:
        '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
      b1LearnerEvidence: '&id, &[sessionId+questionId], sessionId, questionId, updatedAt',
      b1LearningReflections: '&id, &[sessionId+questionId], sessionId, questionId, updatedAt',
      b1RemediationProgress:
        '&id, [originQuestionId+status], originQuestionId, originSessionId, status, updatedAt',
    });

    this.version(9)
      .stores({
        questionProgress:
          '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
        answerAttempts:
          '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
        practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
        practiceResults:
          '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
        examSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
        examResults:
          '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
        learningDays: '&date, subjectId, updatedAt',
        learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
        settings: '&key, updatedAt',
        metadata: '&key, updatedAt',
        b1PdfFiles: '&year, subjectId, updatedAt',
        b1PracticeSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
        b1MockSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
        // The Phase 2 compound unique index prevented more than one learner
        // evidence item per question. Keep the lookup index but make it non-unique.
        b1LearnerEvidence: '&id, [sessionId+questionId], sessionId, questionId, updatedAt',
        b1LearningReflections: '&id, &[sessionId+questionId], sessionId, questionId, updatedAt',
        b1RemediationProgress:
          '&id, [originQuestionId+status], originQuestionId, originSessionId, status, updatedAt',
        b1AnswerAttempts: '&id, [sessionId+questionId], sessionId, questionId, updatedAt',
        b1Preferences: '&key, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('b1PracticeSessions')
          .toCollection()
          .modify((row: Record<string, unknown>) => {
            row.version = 2;
            row.mode ??= 'training';
            row.requirementDisclosureQuestionIds ??= [];
            row.attemptIdsByQuestion ??= {};
          });
        await transaction
          .table('b1MockSessions')
          .toCollection()
          .modify((row: Record<string, unknown>) => {
            row.version = 2;
            row.mode ??= 'mock90';
            row.mockType ??= 'official_year';
            row.requirementDisclosureQuestionIds ??= [];
            row.attemptIdsByQuestion ??= {};
          });
      });

    this.version(10)
      .stores({
        questionProgress:
          '&code, &[subjectId+code], subjectId, favorite, lastAnsweredAt, lastIsCorrect',
        answerAttempts:
          '++id, &[sessionId+code], &[subjectId+sessionId+code], [subjectId+code], subjectId, code, sessionId, answeredAt, mode',
        practiceSessions: '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt',
        practiceResults:
          '&id, &sessionId, &[subjectId+id], &[subjectId+sessionId], subjectId, completedAt, mode',
        examSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, updatedAt, deadlineAt, examType',
        examResults:
          '&id, &examSessionId, &[subjectId+id], &[subjectId+examSessionId], subjectId, examType, submittedAt',
        learningDays: '&date, subjectId, updatedAt',
        learningDaysBySubject: '&[subjectId+date], subjectId, date, updatedAt',
        settings: '&key, updatedAt',
        metadata: '&key, updatedAt',
        b1PdfFiles: '&year, subjectId, updatedAt',
        b1PracticeSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, caseId, updatedAt',
        b1MockSessions:
          '&id, &[subjectId+id], [subjectId+status], subjectId, status, year, updatedAt, deadlineAt',
        b1LearnerEvidence: '&id, [sessionId+questionId], sessionId, questionId, updatedAt',
        b1LearningReflections: '&id, &[sessionId+questionId], sessionId, questionId, updatedAt',
        b1RemediationProgress:
          '&id, [originQuestionId+status], originQuestionId, originSessionId, status, updatedAt',
        b1AnswerAttempts: '&id, [sessionId+questionId], sessionId, questionId, updatedAt',
        b1Preferences: '&key, updatedAt',
      })
      .upgrade(async (transaction) => {
        const upgradeSession = (row: Record<string, unknown>) => {
          row.version = 3;
          row.unitConfirmations ??= {};
          row.selfGradeUpdatedAt ??= {};
        };
        await Promise.all([
          transaction.table('b1PracticeSessions').toCollection().modify(upgradeSession),
          transaction.table('b1MockSessions').toCollection().modify(upgradeSession),
        ]);
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

function normalizeTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function normalizeFontSize(value: unknown): FontSizePreference {
  return value === 'small' || value === 'large' || value === 'extra_large' || value === 'standard'
    ? value
    : 'standard';
}

function normalizeReducedMotion(value: unknown): ReducedMotionPreference {
  return value === 'reduce' || value === 'no_preference' || value === 'system' ? value : 'system';
}
