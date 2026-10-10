import type { B1ContentIdentity } from '../domain/b1Identity';
import type { PracticeFilters } from '../domain/practice';
import type { SubjectId } from '../domain/subject';
import type { ChoiceId } from '../types/question';
import type { QuestionDatasetManifest } from '../domain/questionManifest';

export interface QuestionDatasetArchiveRow {
  id: string;
  archiveVersion: 1;
  archivedAt: string;
  previousDatasetVersion: string;
  nextDatasetVersion: string;
  previousManifest?: QuestionDatasetManifest;
  changedCodes: string[];
  data: {
    progress: QuestionProgressRow[];
    attempts: AnswerAttemptRow[];
    practiceSessions: PracticeSessionRow[];
    practiceResults: PracticeResultRow[];
    examSessions: ExamSessionRow[];
    examResults: ExamResultRow[];
    learningDays: LearningDayRow[];
    syncMetadata: CloudSyncMetadataRow[];
    syncOutbox: CloudSyncOutboxRow[];
  };
}

export type A2DatasetArchiveRow = QuestionDatasetArchiveRow;
import type { B1AnswerValues, B1SelfGrade } from '../domain/b1';
import type {
  B1LearnerEvidence,
  B1LearningReflection,
  B1LearningMode,
  B1MockType,
  B1RelevanceFilter,
  B1RemediationProgress,
} from '../domain/b1LearningSupport';

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

export type CloudSyncScope =
  'a1.question' | 'a2.question' | 'b1.answer' | 'b1.progress' | 'b1.reset';

export interface CloudSyncMetadataRow {
  scope: CloudSyncScope;
  itemKey: string;
  clientUpdatedAt: string;
  deviceId: string;
  isDeleted: boolean;
}

export interface CloudSyncStateRow {
  key: 'cloud-sync';
  ownerUserId?: string;
  lastSuccessfulSyncAt?: string;
  updatedAt: string;
}

export type CloudSyncFailureKind = 'transient' | 'auth' | 'permanent';

export interface CloudSyncOutboxRow {
  userId: string;
  scope: CloudSyncScope;
  itemKey: string;
  clientUpdatedAt: string;
  deviceId: string;
  queuedAt: string;
  lastAttemptAt?: string;
  retryCount: number;
  nextRetryAt?: string;
  failureKind?: CloudSyncFailureKind;
  errorCode?: string;
}

export interface B1PdfFileRow {
  documentId?: string;
  subjectId: 'b1';
  year: number;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  blob: Blob;
}

export interface B1PdfRegistrationMetadata {
  documentId?: string;
  subjectId: 'b1';
  year: number;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
}

/** A frozen copy of every answer field at the point a learner confirms a unit. */
export interface B1UnitConfirmation {
  answers: B1AnswerValues;
  confirmedAt: string;
}

export interface B1PracticeSessionRow {
  identity?: B1ContentIdentity;
  id: string;
  subjectId: 'b1';
  version: 1 | 2 | 3;
  status: 'in_progress' | 'completed';
  mode?: Exclude<B1LearningMode, 'mock90' | 'mock150'>;
  caseId: string;
  unitIds: string[];
  answers: Record<string, B1AnswerValues>;
  /**
   * Phase 4 confirmation snapshots.  The optional shape keeps records created
   * by the earlier B-1 releases readable before they are migrated.
   */
  unitConfirmations?: Record<string, B1UnitConfirmation>;
  selfGrades: Record<string, B1SelfGrade>;
  selfGradeUpdatedAt?: Record<string, string>;
  reviewQuestionIds: string[];
  requirementDisclosureQuestionIds?: string[];
  attemptIdsByQuestion?: Record<string, string[]>;
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface B1MockSessionRow {
  caseIdentities?: Record<string, B1ContentIdentity>;
  presentedCaseIds?: string[];
  examRuleId?: string;
  id: string;
  subjectId: 'b1';
  version: 1 | 2 | 3;
  status: 'in_progress' | 'submitted' | 'completed';
  year: number;
  mode?: 'mock90' | 'mock150';
  mockType?: B1MockType;
  caseIds: string[];
  unitIds: string[];
  answers: Record<string, B1AnswerValues>;
  unitConfirmations?: Record<string, B1UnitConfirmation>;
  selfGrades: Record<string, B1SelfGrade>;
  selfGradeUpdatedAt?: Record<string, string>;
  reviewQuestionIds: string[];
  requirementDisclosureQuestionIds?: string[];
  attemptIdsByQuestion?: Record<string, string[]>;
  currentIndex: number;
  startedAt: string;
  deadlineAt: string;
  updatedAt: string;
  submittedAt?: string;
  submissionReason?: ExamSubmissionReason;
  completedAt?: string;
}

export interface B1AnswerAttemptRow {
  identity?: B1ContentIdentity;
  id: string;
  version: 1;
  sessionId: string;
  questionId: string;
  attemptNumber: number;
  answers: B1AnswerValues;
  characterCount: number;
  selfGrade?: B1SelfGrade;
  failureCauseIds: readonly import('../domain/b1LearningSupport').B1FailureCauseId[];
  createdAt: string;
  updatedAt: string;
  remediationCompletedBefore?: boolean;
}

export interface B1PreferenceRow {
  key: 'b1-learning-preferences';
  version: 1;
  relevanceFilter: B1RelevanceFilter;
  updatedAt: string;
  favoriteCaseIds?: readonly string[];
}

export type B1LearnerEvidenceRow = B1LearnerEvidence;
export type B1LearningReflectionRow = B1LearningReflection;
export type B1RemediationProgressRow = B1RemediationProgress;

export interface B1DocumentRow extends B1PdfFileRow {
  documentId: string;
}
