import { describe, expect, it } from 'vitest';
import { b1Cases } from '../data/b1';
import { questionDataVersion, questions } from '../data/catalog';
import { createExamSession, gradeExam } from './exam';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  MAX_BACKUP_FILE_SIZE_BYTES,
  createBackupDocument,
  createBackupFileName,
  createQuestionDataIdentity,
  parseBackupJson,
  serializeBackup,
  validateBackupDocument,
  validateBackupDocumentWithB1,
  validateBackupFileSize,
  type BackupCreateInput,
} from './backup';
import { createPracticeSession, defaultPracticeFilters } from './practice';

const exportedAt = '2026-07-18T00:00:00.000Z';
const identity = createQuestionDataIdentity(questions, questionDataVersion);
const firstQuestion = questions[0];
const secondQuestion = questions[1];

function createInput(overrides: Partial<BackupCreateInput> = {}): BackupCreateInput {
  return {
    exportedAt,
    appVersion: '0.1.0',
    databaseSchemaVersion: 4,
    questionData: identity,
    answerHistory: [
      {
        id: 1,
        code: firstQuestion.code,
        selectedChoice: firstQuestion.correctChoice,
        correctChoice: firstQuestion.correctChoice,
        isCorrect: true,
        answeredAt: exportedAt,
        mode: 'normal_practice',
        sessionId: 'practice-result-1',
        version: 1,
      },
    ],
    favorites: [{ code: secondQuestion.code, favoriteAt: exportedAt }],
    normalPracticeSessions: [
      createPracticeSession([secondQuestion.code], defaultPracticeFilters, {
        id: 'practice-in-progress',
        now: exportedAt,
      }),
    ],
    normalPracticeResults: [],
    mockExamSessions: [],
    mockExamResults: [],
    learningDays: [{ date: '2026-07-18', answerCount: 1, updatedAt: exportedAt }],
    settings: [
      {
        key: 'appearance',
        theme: 'dark',
        fontSize: 'large',
        reducedMotion: 'reduce',
        shuffleChoices: false,
        updatedAt: exportedAt,
      },
    ],
    ...overrides,
  };
}

describe('バックアップ形式', () => {
  it('安定した問題IDフィンガープリントと人が読めるJSONを作成できる', () => {
    const reversed = createQuestionDataIdentity([...questions].reverse(), questionDataVersion);
    const document = createBackupDocument(createInput());
    const serialized = serializeBackup(document);

    expect(reversed).toEqual(identity);
    expect(document.format).toBe(BACKUP_FORMAT);
    expect(document.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(document.backupVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(serialized).toContain('\n  "format"');
    expect(serialized).not.toContain(firstQuestion.question);
    expect(serialized).not.toContain(firstQuestion.explanation);
  });

  it('正常なデータを検証し、表示設定とプレビューを返す', () => {
    const result = validateBackupDocument(createBackupDocument(createInput()), questions, identity);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.preview).toMatchObject({
      answerHistoryCount: 1,
      favoriteCount: 1,
      normalPracticeSessionCount: 1,
      learningDayCount: 1,
      questionDataMatches: true,
    });
    expect(result.value.preview.settings).toMatchObject({ theme: 'dark', fontSize: 'large' });
  });

  it('JSON・形式・将来の形式バージョン・必須項目を安全に拒否できる', () => {
    expect(parseBackupJson('{', questions, identity)).toMatchObject({ ok: false });
    expect(validateBackupDocument({ format: 'other' }, questions, identity)).toMatchObject({
      ok: false,
    });
    expect(
      validateBackupDocument(
        { ...createBackupDocument(createInput()), formatVersion: 7 },
        questions,
        identity,
      ),
    ).toMatchObject({ ok: false });
    expect(
      validateBackupDocument({ format: BACKUP_FORMAT, formatVersion: 1 }, questions, identity),
    ).toMatchObject({ ok: false });
  });

  it('未知の問題IDと不正な選択肢を除外し、既知の有効データだけをプレビューできる', () => {
    const input = createInput({
      answerHistory: [
        ...createInput().answerHistory,
        {
          id: 2,
          code: 'A1-999',
          selectedChoice: 'A',
          correctChoice: 'A',
          isCorrect: true,
          answeredAt: exportedAt,
          mode: 'normal_practice',
          sessionId: 'unknown',
          version: 1,
        },
        {
          id: 3,
          code: secondQuestion.code,
          selectedChoice: 'Z' as 'A',
          correctChoice: secondQuestion.correctChoice,
          isCorrect: false,
          answeredAt: exportedAt,
          mode: 'normal_practice',
          sessionId: 'invalid-choice',
          version: 1,
        },
      ],
    });
    const result = validateBackupDocument(createBackupDocument(input), questions, identity);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.preview.unknownQuestionIdCount).toBe(1);
    expect(result.value.preview.excludedRecordCount).toBeGreaterThanOrEqual(2);
    expect(result.value.document.data.answerHistory).toHaveLength(1);
  });

  it('重複データと不正な学習日を除外し、不正な設定は初期値へ補正する', () => {
    const input = createInput({
      favorites: [{ code: firstQuestion.code }, { code: firstQuestion.code }],
      learningDays: [{ date: '2026-02-30', answerCount: 1, updatedAt: exportedAt }],
      settings: [
        {
          key: 'appearance',
          theme: 'unexpected' as 'dark',
          fontSize: 'unexpected' as 'large',
          reducedMotion: 'unexpected' as 'reduce',
          shuffleChoices: false,
          updatedAt: exportedAt,
        },
      ],
    });
    const result = validateBackupDocument(createBackupDocument(input), questions, identity);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.document.data.favorites).toHaveLength(1);
    expect(result.value.document.data.learningDays).toHaveLength(0);
    expect(result.value.preview.settings).toMatchObject({
      theme: 'system',
      fontSize: 'standard',
      reducedMotion: 'system',
    });
  });

  it('未知の問題を含む途中セッション全体を復元対象から外す', () => {
    const session = createPracticeSession([firstQuestion.code], defaultPracticeFilters, {
      id: 'invalid-session',
      now: exportedAt,
    });
    const invalidSession = { ...session, questionCodes: [firstQuestion.code, 'A1-999'] };
    const result = validateBackupDocument(
      createBackupDocument(createInput({ normalPracticeSessions: [invalidSession] })),
      questions,
      identity,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.document.data.normalPracticeSessions).toHaveLength(0);
    expect(result.value.preview.unknownQuestionIdCount).toBe(1);
  });

  it('模試結果を30問・選択肢・採点結果の整合性で検証する', () => {
    const session = createExamSession(
      'fixed_1',
      questions.slice(0, 30).map((question) => question.code),
      {
        id: 'exam-result-1',
        now: exportedAt,
      },
    );
    session.answers[session.questionCodes[0]] = firstQuestion.correctChoice;
    const result = gradeExam(
      session,
      new Map(questions.map((question) => [question.code, question])),
      exportedAt,
      'manual',
    );
    const valid = validateBackupDocument(
      createBackupDocument(createInput({ mockExamResults: [result] })),
      questions,
      identity,
    );
    const invalid = validateBackupDocument(
      createBackupDocument(createInput({ mockExamResults: [{ ...result, score: 100 }] })),
      questions,
      identity,
    );

    expect(valid).toMatchObject({ ok: true });
    expect(invalid).toMatchObject({ ok: true });
    if (invalid.ok) {
      expect(invalid.value.document.data.mockExamResults).toHaveLength(0);
    }
  });

  it('B-1 sessions and PDF metadata round-trip without PDF blobs, and older backups default to empty B-1 data', () => {
    const caseItem = b1Cases[0];
    const secondCaseItem = b1Cases[1];
    const mockSession = {
      id: 'b1-mock-1',
      subjectId: 'b1' as const,
      version: 3 as const,
      status: 'submitted' as const,
      year: caseItem.year,
      mode: 'mock90' as const,
      mockType: 'official_year' as const,
      caseIds: [caseItem.caseId, secondCaseItem.caseId],
      unitIds: [...caseItem.questionUnits, ...secondCaseItem.questionUnits].map(
        (unit) => unit.questionId,
      ),
      answers: {},
      unitConfirmations: {},
      selfGrades: {},
      selfGradeUpdatedAt: {},
      reviewQuestionIds: [],
      requirementDisclosureQuestionIds: [],
      attemptIdsByQuestion: {},
      currentIndex: 0,
      startedAt: exportedAt,
      deadlineAt: '2026-07-18T01:30:00.000Z',
      updatedAt: exportedAt,
      submittedAt: exportedAt,
      submissionReason: 'manual' as const,
    };
    const b1 = {
      practiceSessions: [
        {
          id: 'b1-practice-1',
          subjectId: 'b1' as const,
          version: 1 as const,
          status: 'in_progress' as const,
          caseId: caseItem.caseId,
          unitIds: caseItem.questionUnits.map((unit) => unit.questionId),
          answers: { [caseItem.questionUnits[0].questionId]: { a: 'バックボーン' } },
          selfGrades: {},
          reviewQuestionIds: [],
          currentIndex: 0,
          createdAt: exportedAt,
          updatedAt: exportedAt,
        },
      ],
      mockSessions: [mockSession],
      pdfRegistrations: [
        {
          subjectId: 'b1' as const,
          year: 2025,
          fileName: 'ipa-2025.pdf',
          mimeType: 'application/pdf',
          size: 1234,
          updatedAt: exportedAt,
        },
      ],
      learnerEvidence: [],
      learningReflections: [],
      remediationProgress: [],
    };
    const document = createBackupDocument(createInput({ b1 }));
    const result = validateBackupDocument(document, questions, identity);
    const oldVersion = validateBackupDocument(
      {
        ...document,
        formatVersion: 2,
        backupVersion: 2,
        data: { ...document.data, b1: undefined },
      },
      questions,
      identity,
    );

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.document.data.b1).toMatchObject(b1);
      expect(JSON.stringify(result.value.document.data.b1)).not.toContain('blob');
      expect(result.value.document.data.b1.mockSessions).toMatchObject([
        { id: 'b1-mock-1', status: 'submitted', reviewQuestionIds: [] },
      ]);
    }
    expect(oldVersion).toMatchObject({ ok: true });
    if (oldVersion.ok) {
      expect(oldVersion.value.document.data.b1).toEqual({
        practiceSessions: [],
        mockSessions: [],
        pdfRegistrations: [],
        learnerEvidence: [],
        learningReflections: [],
        remediationProgress: [],
        answerAttempts: [],
        preferences: [],
      });
    }
  });

  it('B-1 Phase 4の回答確定・評価日時をバックアップし、不正な回答欄は復元前に拒否する', async () => {
    const caseItem = b1Cases[0];
    const unit = caseItem.questionUnits[0];
    const answers = Object.fromEntries(unit.answerFields.map((field) => [field.fieldId, '回答']));
    const b1 = {
      practiceSessions: [
        {
          id: 'b1-phase4-backup',
          subjectId: 'b1' as const,
          version: 3 as const,
          status: 'in_progress' as const,
          mode: 'training' as const,
          caseId: caseItem.caseId,
          unitIds: caseItem.questionUnits.map((item) => item.questionId),
          answers: { [unit.questionId]: answers },
          unitConfirmations: {
            [unit.questionId]: { answers, confirmedAt: exportedAt },
          },
          selfGrades: { [unit.questionId]: 'partial' as const },
          selfGradeUpdatedAt: { [unit.questionId]: exportedAt },
          reviewQuestionIds: [unit.questionId],
          requirementDisclosureQuestionIds: [],
          attemptIdsByQuestion: {},
          currentIndex: 0,
          createdAt: exportedAt,
          updatedAt: exportedAt,
        },
      ],
      mockSessions: [],
      pdfRegistrations: [],
      learnerEvidence: [],
      learningReflections: [],
      remediationProgress: [],
      answerAttempts: [],
      preferences: [],
    };
    const document = createBackupDocument(createInput({ b1 }));
    const valid = await validateBackupDocumentWithB1(document, questions, identity);
    const invalid = await validateBackupDocumentWithB1(
      {
        ...document,
        data: {
          ...document.data,
          b1: {
            ...document.data.b1,
            practiceSessions: [
              {
                ...b1.practiceSessions[0],
                unitConfirmations: {
                  [unit.questionId]: {
                    answers: { unknownField: '不正' },
                    confirmedAt: exportedAt,
                  },
                },
              },
            ],
          },
        },
      },
      questions,
      identity,
    );

    expect(valid).toMatchObject({ ok: true });
    if (valid.ok) {
      expect(valid.value.document.data.b1.practiceSessions[0]).toMatchObject({
        unitConfirmations: { [unit.questionId]: { answers, confirmedAt: exportedAt } },
        selfGradeUpdatedAt: { [unit.questionId]: exportedAt },
      });
    }
    expect(invalid).toMatchObject({ ok: true });
    if (invalid.ok) {
      expect(invalid.value.document.data.b1.practiceSessions).toHaveLength(0);
    }
  });

  it('B-1の根拠・振返り・A2復習進捗を往復し、不正な参照は復元前に拒否する', async () => {
    const questionId = b1Cases[0].questionUnits[0].questionId;
    const b1 = {
      practiceSessions: [],
      mockSessions: [],
      pdfRegistrations: [],
      learnerEvidence: [
        {
          id: 'b1-evidence-1',
          version: 1 as const,
          sessionId: 'b1-session-1',
          questionId,
          note: '設問条件を確認した。',
          createdAt: exportedAt,
          updatedAt: exportedAt,
        },
      ],
      learningReflections: [
        {
          id: 'b1-reflection-1',
          version: 1 as const,
          sessionId: 'b1-session-1',
          questionId,
          failureCauseIds: ['knowledge_gap' as const],
          selfAssessment: 'review_needed' as const,
          createdAt: exportedAt,
          updatedAt: exportedAt,
        },
      ],
      remediationProgress: [
        {
          id: 'b1-remediation-1',
          version: 1 as const,
          originQuestionId: questionId,
          originSessionId: 'b1-session-1',
          failureCauseIds: ['knowledge_gap' as const],
          a2QuestionIds: ['A2-061'],
          completedA2QuestionIds: ['A2-061'],
          status: 'completed' as const,
          createdAt: exportedAt,
          updatedAt: exportedAt,
          completedAt: exportedAt,
        },
      ],
    };
    const document = createBackupDocument(createInput({ b1 }));
    const valid = await validateBackupDocumentWithB1(document, questions, identity);
    const invalid = await validateBackupDocumentWithB1(
      {
        ...document,
        data: {
          ...document.data,
          b1: {
            ...document.data.b1,
            learningReflections: [
              { ...b1.learningReflections[0], failureCauseIds: ['not-a-cause'] },
            ],
          },
        },
      },
      questions,
      identity,
    );

    expect(valid).toMatchObject({ ok: true });
    if (valid.ok) {
      expect(valid.value.document.data.b1).toMatchObject({
        learnerEvidence: [{ questionId }],
        learningReflections: [{ failureCauseIds: ['knowledge_gap'] }],
        remediationProgress: [{ a2QuestionIds: ['A2-061'] }],
      });
    }
    expect(invalid).toMatchObject({ ok: false });
  });

  it('ファイルサイズとファイル名を安全に扱う', () => {
    expect(validateBackupFileSize(MAX_BACKUP_FILE_SIZE_BYTES)).toBeUndefined();
    expect(validateBackupFileSize(MAX_BACKUP_FILE_SIZE_BYTES + 1)).toMatchObject({ ok: false });
    expect(createBackupFileName(new Date('2026-07-18T00:00:00.000Z'))).toMatch(
      /^nw-a1-dojo-backup-20260718-\d{6}\.json$/,
    );
  });
});
