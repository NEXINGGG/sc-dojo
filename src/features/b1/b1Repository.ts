import type { B1Case } from '../../data/b1';
import { getB1Case, getB1UnitIds, getB1QuestionUnit } from '../../data/b1';
import type { A1DojoDatabase } from '../../database/database';
import type {
  B1MockSessionRow,
  B1PdfFileRow,
  B1PdfRegistrationMetadata,
  B1PracticeSessionRow,
  ExamSubmissionReason,
} from '../../database/types';
import { gradeB1Unit, type B1AnswerValues } from '../../domain/b1';

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
    return this.database.b1PracticeSessions.get(id);
  }

  async getInProgressPractice(): Promise<B1PracticeSessionRow | undefined> {
    await this.database.open();
    return this.database.b1PracticeSessions.where('status').equals('in_progress').first();
  }

  async createPractice(
    caseItem: B1Case,
    now = new Date().toISOString(),
  ): Promise<B1PracticeSessionRow> {
    const existing = await this.getInProgressPractice();
    if (existing !== undefined) {
      throw new B1DataError('途中のB-1演習があります。再開するか、先に完了してください。');
    }
    const session: B1PracticeSessionRow = {
      id: createB1SessionId('practice'),
      subjectId: 'b1',
      version: 1,
      status: 'in_progress',
      caseId: caseItem.caseId,
      unitIds: caseItem.questionUnits.map((unit) => unit.questionId),
      answers: {},
      selfGrades: {},
      reviewQuestionIds: [],
      currentIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.b1PracticeSessions.put(session);
    return session;
  }

  async savePractice(session: B1PracticeSessionRow): Promise<void> {
    validatePractice(session);
    await this.database.open();
    await this.database.b1PracticeSessions.put(session);
  }

  async completePractice(
    id: string,
    completedAt = new Date().toISOString(),
  ): Promise<B1PracticeSessionRow> {
    const session = await this.getPractice(id);
    if (session === undefined) throw new B1DataError('B-1演習が見つかりません。');
    const completed: B1PracticeSessionRow = {
      ...session,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    };
    await this.database.b1PracticeSessions.put(completed);
    return completed;
  }

  async getMock(id: string): Promise<B1MockSessionRow | undefined> {
    await this.database.open();
    return this.database.b1MockSessions.get(id);
  }

  async getInProgressMock(): Promise<B1MockSessionRow | undefined> {
    await this.database.open();
    return this.database.b1MockSessions.where('status').equals('in_progress').first();
  }

  async listMocks(): Promise<B1MockSessionRow[]> {
    await this.database.open();
    return this.database.b1MockSessions.orderBy('updatedAt').reverse().toArray();
  }

  async createMock(
    year: number,
    caseIds: readonly string[],
    now = new Date().toISOString(),
  ): Promise<B1MockSessionRow> {
    const existing = await this.getInProgressMock();
    if (existing !== undefined) {
      throw new B1DataError('途中のB-1模試があります。再開するか、先に提出してください。');
    }
    const candidates = caseIds.map((caseId) => getB1Case(caseId));
    if (
      caseIds.length !== 2 ||
      new Set(caseIds).size !== 2 ||
      candidates.some((caseItem) => caseItem === undefined || caseItem.year !== year)
    ) {
      throw new B1DataError('同一年度の3大問から、異なる2大問を選んでください。');
    }
    const unitIds = getB1UnitIds(caseIds);
    const session: B1MockSessionRow = {
      id: createB1SessionId('mock'),
      subjectId: 'b1',
      version: 1,
      status: 'in_progress',
      year,
      caseIds: [...caseIds],
      unitIds,
      answers: {},
      selfGrades: {},
      reviewQuestionIds: [],
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
    if (session === undefined) throw new B1DataError('B-1模試が見つかりません。');
    if (session.status !== 'in_progress') return session;
    const submitted: B1MockSessionRow = {
      ...session,
      status: 'submitted',
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
    if (session === undefined) throw new B1DataError('B-1模試が見つかりません。');
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

  async getProgressSummary(): Promise<B1ProgressSummary> {
    await this.database.open();
    const [practice, mocks] = await Promise.all([
      this.database.b1PracticeSessions.where('status').equals('completed').count(),
      this.database.b1MockSessions.toArray(),
    ]);
    const grades = mocks.flatMap((session) => Object.values(session.selfGrades));
    return {
      completedPracticeCount: practice,
      completedMockCount: mocks.filter((session) => session.status === 'completed').length,
      submittedMockCount: mocks.filter((session) => session.status === 'submitted').length,
      correctSelfGrades: grades.filter((grade) => grade === 'correct').length,
      partialSelfGrades: grades.filter((grade) => grade === 'partial').length,
      reviewSelfGrades: grades.filter((grade) => grade === 'review').length,
    };
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

function validatePractice(session: B1PracticeSessionRow): void {
  const caseItem = getB1Case(session.caseId);
  if (
    caseItem === undefined ||
    session.unitIds.length === 0 ||
    !session.unitIds.every((unitId) =>
      caseItem.questionUnits.some((unit) => unit.questionId === unitId),
    )
  ) {
    throw new B1DataError('B-1演習の問題構成が正しくありません。');
  }
}

function validateMock(session: B1MockSessionRow): void {
  if (
    session.caseIds.length !== 2 ||
    session.unitIds.length === 0 ||
    new Date(session.deadlineAt).getTime() <= new Date(session.startedAt).getTime()
  ) {
    throw new B1DataError('B-1模試の保存データが正しくありません。');
  }
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
