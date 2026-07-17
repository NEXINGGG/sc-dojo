import type { PracticeFilters } from '../domain/practice';
import type { ChoiceId } from '../types/question';

export interface QuestionProgressRow {
  code: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  lastChoice?: ChoiceId;
  lastIsCorrect?: boolean;
  lastAnsweredAt?: string;
  favorite: boolean;
  updatedAt: string;
}

export interface AnswerAttemptRow {
  id?: number;
  code: string;
  selectedChoice: ChoiceId;
  isCorrect: boolean;
  answeredAt: string;
  mode: 'practice' | 'exam';
  sessionId: string;
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
  filters: PracticeFilters;
  questionCodes: string[];
  currentIndex: number;
  answers: Record<string, PracticeSessionAnswer>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ExamSessionRow {
  id: string;
  status: 'in_progress';
  examType: 'fixed_1' | 'fixed_2' | 'random';
  questionCodes: string[];
  choiceOrderByCode: Record<string, ChoiceId[]>;
  answers: Record<string, ChoiceId>;
  reviewCodes: string[];
  currentIndex: number;
  startedAt: string;
  deadlineAt: string;
  updatedAt: string;
}

export interface ExamResultRow {
  id: string;
  examSessionId: string;
  examType: 'fixed_1' | 'fixed_2' | 'random';
  completedAt: string;
  elapsedSeconds: number;
  score: number;
  unansweredCount: number;
  categoryResults: Record<string, { answered: number; correct: number }>;
  incorrectCodes: string[];
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
