import type { PracticeFilters } from '../domain/practice';
import type { SubjectId } from '../domain/subject';
import type { ChoiceId } from '../types/question';
import type { B1AnswerValues, B1SelfGrade } from '../domain/b1';

export type PracticeAnswerSource =
  'normal_practice' | 'review_unanswered' | 'review_incorrect' | 'review_favorite';

export type AnswerSource =
  PracticeAnswerSource | 'exam' | 'mock_exam_fixed_1' | 'mock_exam_fixed_2' | 'mock_exam_random';

export type ExamType = 'fixed_1' | 'fixed_2' | 'random';
export type ExamSubmissionReason = 'manual' | 'timeout';

export interface QuestionProgressRow {
  subjectId: SubjectId;
  code: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  firstAnsweredAt?: string;
  lastChoice?: ChoiceId;
  lastIsCorrect?: boolean;
  lastAnsweredAt?: string;
  favorite: boolean;
  favoriteAt?: string;
  updatedAt: string;
}

export interface AnswerAttemptRow {
  id?: number;
  subjectId: SubjectId;
  code: string;
  selectedChoice: ChoiceId;
  correctChoice: ChoiceId;
  isCorrect: boolean;
  answeredAt: string;
  mode: AnswerSource;
  sessionId: string;
  version: 1;
}

export interface PracticeSessionAnswer {
  selectedChoice: ChoiceId;
  confirmed: boolean;
  selectedAt: string;
  isCorrect?: boolean;
  confirmedAt?: string;
}

export interface PracticeSessionRow {
  id: string;
  subjectId: SubjectId;
  version: 1;
  status: 'in_progress' | 'completed';
  mode?: PracticeAnswerSource;
  filters: PracticeFilters;
  questionCodes: string[];
  currentIndex: number;
  answers: Record<string, PracticeSessionAnswer>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PracticeResultRow {
  id: string;
  subjectId: SubjectId;
  version: 1;
  sessionId: string;
  mode: PracticeAnswerSource;
  startedAt: string;
  completedAt: string;
  filters: PracticeFilters;
  questionCodes: string[];
  confirmedQuestionCodes: string[];
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  correctRate: number;
  elapsedSeconds: number;
}

export interface ExamSessionRow {
  id: string;
  subjectId: SubjectId;
  version: 1;
  status: 'in_progress' | 'submitted';
  examType: ExamType;
  questionCodes: string[];
  answers: Record<string, ChoiceId>;
  reviewCodes: string[];
  currentIndex: number;
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  submissionReason?: ExamSubmissionReason;
  updatedAt: string;
}

export interface ExamQuestionResultRow {
  code: string;
  selectedChoice?: ChoiceId;
  correctChoice: ChoiceId;
  isCorrect?: boolean;
  review: boolean;
}

export interface ExamScoreBreakdownRow {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
}

export interface ExamResultRow {
  id: string;
  subjectId: SubjectId;
  version: 1;
  examSessionId: string;
  examType: ExamType;
  questionCodes: string[];
  questionResults: Record<string, ExamQuestionResultRow>;
  reviewCodes: string[];
  startedAt: string;
  submittedAt: string;
  deadlineAt: string;
  elapsedSeconds: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  correctRate: number;
  passed: boolean;
  submissionReason: ExamSubmissionReason;
  categoryResults: Record<string, ExamScoreBreakdownRow>;
  domainResults: Record<string, ExamScoreBreakdownRow>;
}

export interface LearningDayRow {
  subjectId: SubjectId;
  date: string;
  answerCount: number;
  updatedAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontSizePreference = 'small' | 'standard' | 'large' | 'extra_large';
export type ReducedMotionPreference = 'system' | 'reduce' | 'no_preference';

export interface SettingRow {
  key: 'appearance';
  selectedSubject: SubjectId;
  theme: ThemePreference;
  fontSize: FontSizePreference;
  reducedMotion: ReducedMotionPreference;
  shuffleChoices: boolean;
  updatedAt: string;
}

export interface MetadataRow {
  key: 'storage';
  storageVersion: number;
  questionDataVersion: number;
  updatedAt: string;
}

export interface B1PdfFileRow {
  subjectId: 'b1';
  year: number;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  blob: Blob;
}

export interface B1PdfRegistrationMetadata {
  subjectId: 'b1';
  year: number;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
}

export interface B1PracticeSessionRow {
  id: string;
  subjectId: 'b1';
  version: 1;
  status: 'in_progress' | 'completed';
  caseId: string;
  unitIds: string[];
  answers: Record<string, B1AnswerValues>;
  selfGrades: Record<string, B1SelfGrade>;
  reviewQuestionIds: string[];
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface B1MockSessionRow {
  id: string;
  subjectId: 'b1';
  version: 1;
  status: 'in_progress' | 'submitted' | 'completed';
  year: number;
  caseIds: string[];
  unitIds: string[];
  answers: Record<string, B1AnswerValues>;
  selfGrades: Record<string, B1SelfGrade>;
  reviewQuestionIds: string[];
  currentIndex: number;
  startedAt: string;
  deadlineAt: string;
  updatedAt: string;
  submittedAt?: string;
  submissionReason?: ExamSubmissionReason;
  completedAt?: string;
}
