export const B1_FAILURE_CAUSE_IDS = [
  'knowledge_gap',
  'missed_condition',
  'wrong_scope',
  'traffic_direction',
  'diagram_misread',
  'evidence_missed',
  'missing_element',
  'causality_weak',
  'wording_length',
  'calculation_error',
  'time_management',
] as const;

export type B1FailureCauseId = (typeof B1_FAILURE_CAUSE_IDS)[number];
export type B1ReviewStatus = 'completed' | 'needs_review';
export type B1ReviewScope = 'official_pdf_recheck' | 'phase1_review_preserved';
export type B1AnswerForm =
  | 'term'
  | 'number'
  | 'reason'
  | 'purpose'
  | 'behavior'
  | 'setting'
  | 'calculation'
  | 'route'
  | 'selection'
  | 'other';
export type B1EvidenceSourceType =
  | 'paragraph'
  | 'figure'
  | 'table'
  | 'calculation'
  | 'configuration'
  | 'sequence'
  | 'general_knowledge';

export type B1LearningMode = 'training' | 'practical' | 'mock90';
export type B1MockType = 'official_year' | 'current_focus' | 'all_years' | 'legacy_reading';

export interface B1RelevanceFilter {
  current_core: boolean;
  modern_successor: boolean;
  historical_context: boolean;
  low_current_priority: boolean;
}

export const defaultB1RelevanceFilter: B1RelevanceFilter = {
  current_core: true,
  modern_successor: true,
  historical_context: false,
  low_current_priority: false,
};

export interface B1FailureCauseDefinition {
  id: B1FailureCauseId;
  displayName: string;
  description: string;
}

export interface B1RequirementBreakdown {
  answerTarget: string;
  targetObject: string;
  targetEnvironment: string;
  situation: string;
  trafficDirection?: { from: string; to: string };
  answerForm: B1AnswerForm;
  requiredAnswerCount: number;
  maxLength: number | null;
  responseChecklist: readonly string[];
  constraints: readonly string[];
  commonTraps: readonly string[];
  trainingHint: string;
}

export interface B1OfficialEvidence {
  evidenceId: string;
  sourceType: B1EvidenceSourceType;
  printedPage: number;
  pdfPageZeroBased: number;
  reference: string;
  figureRef: string | null;
  tableRef: string | null;
  summary: string;
  reason: string;
  reviewStatus: B1ReviewStatus;
}

export interface B1ReviewChecklist {
  maxLengthChecked: boolean;
  answerFieldCountChecked: boolean;
  figureTableUnderlineChecked: boolean;
  requirementBreakdownChecked: boolean;
  answerLeakageChecked: boolean;
  officialEvidenceChecked: boolean;
  a2RemediationChecked: boolean;
  failureCausesChecked: boolean;
}

export interface B1QuestionOfficialReview {
  questionId: string;
  caseId: string;
  year: number;
  reviewStatus: B1ReviewStatus;
  reviewScope: B1ReviewScope;
  reviewedAt: string;
  reviewedAgainstQuestionPdf: boolean;
  reviewedAgainstAnswerPdf: boolean;
  reviewedAgainstCommentaryPdf: boolean;
  questionPdfPages: readonly number[];
  answerPdfPages: readonly number[];
  commentaryPdfPages: readonly number[];
  questionPdfPageCount: number;
  answerPdfPageCount: number;
  commentaryPdfPageCount: number;
  checklist: B1ReviewChecklist;
  reviewNotes: string;
}

export interface B1QuestionGuidance {
  questionId: string;
  requirementBreakdown: B1RequirementBreakdown;
  officialEvidence: readonly B1OfficialEvidence[];
  applicableFailureCauseIds: readonly B1FailureCauseId[];
}

export type B1A2RemediationStatus = 'linked' | 'not_applicable';

export interface B1A2Remediation {
  questionId: string;
  status: B1A2RemediationStatus;
  a2QuestionIds: readonly string[];
  a2CategoryIds: readonly string[];
  reason: string;
  prerequisiteTopics: readonly string[];
  recommendedCount: number;
  triggerFailureCauseIds: readonly B1FailureCauseId[];
  reviewStatus: B1ReviewStatus;
}

export interface B1LearnerEvidence {
  id: string;
  version: 1 | 2;
  sessionId: string;
  questionId: string;
  sourceType?: B1EvidenceSourceType;
  printedPage?: number;
  location?: string;
  evidenceId?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface B1LearningReflection {
  id: string;
  version: 1 | 2;
  sessionId: string;
  questionId: string;
  failureCauseIds: readonly B1FailureCauseId[];
  selfAssessment: 'understood' | 'partial' | 'review_needed' | 'correct' | 'incorrect';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type B1RemediationProgressStatus = 'in_progress' | 'completed' | 'cancelled';

export interface B1RemediationProgress {
  id: string;
  version: 1 | 2;
  originQuestionId: string;
  originSessionId: string;
  originCaseId?: string;
  failureCauseIds: readonly B1FailureCauseId[];
  a2QuestionIds: readonly string[];
  completedA2QuestionIds: readonly string[];
  status: B1RemediationProgressStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export function isB1FailureCauseId(value: unknown): value is B1FailureCauseId {
  return typeof value === 'string' && (B1_FAILURE_CAUSE_IDS as readonly string[]).includes(value);
}
