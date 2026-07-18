import type { PracticeFilters } from '../domain/practice';
import type { ChoiceId } from '../types/question';

export type PracticeAnswerSource =
  'normal_practice' | 'review_unanswered' | 'review_incorrect' | 'review_favorite';

export type AnswerSource =
  PracticeAnswerSource | 'exam' | 'mock_exam_fixed_1' | 'mock_exam_fixed_2' | 'mock_exam_random';

export type ExamType = 'fixed_1' | 'fixed_2' | 'random';
export type ExamSubmissionReason = 'manual' | 'timeout';

export interface QuestionProgressRow {
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
  date: string;
  answerCount: number;
  updatedAt: string;
}

export interface SettingRow {
  key: 'appearance';
  theme: 'system' | 'light' | 'dark';
  fontSize: 'standard' | 'large' | 'extra_large';
  shuffleChoices: boolean;
  updatedAt: string;
}

export interface MetadataRow {
  key: 'storage';
  storageVersion: number;
  questionDataVersion: number;
  updatedAt: string;
}
