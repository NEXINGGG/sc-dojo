import type {
  AnswerAttemptRow,
  B1PracticeSessionRow,
  B1UnitConfirmation,
  CloudSyncScope,
  QuestionProgressRow,
} from '../../database/types';
import type { B1AnswerValues, B1SelfGrade } from '../../domain/b1';

export const CLOUD_SYNC_SCHEMA_VERSION = 1;
export const CLOUD_SYNC_SCOPES = [
  'a1.question',
  'a2.question',
  'b1.answer',
  'b1.progress',
  'b1.reset',
] as const satisfies readonly CloudSyncScope[];

export type SyncedAnswerAttempt = Omit<AnswerAttemptRow, 'id'>;

export interface LearningSyncPayloadV1 {
  progress: QuestionProgressRow | null;
  answerAttempts: SyncedAnswerAttempt[];
}

export interface B1PracticeDescriptorV1 {
  id: string;
  subjectId: 'b1';
  version: B1PracticeSessionRow['version'];
  mode: B1PracticeSessionRow['mode'];
  caseId: string;
  unitIds: string[];
  createdAt: string;
}

export interface B1AnswerSyncPayloadV1 {
  kind: 'b1.answer';
  session: B1PracticeDescriptorV1;
  questionId: string;
  answers: B1AnswerValues;
  unitConfirmation?: B1UnitConfirmation;
  selfGrade?: B1SelfGrade;
  selfGradeUpdatedAt?: string;
  review: boolean;
  requirementDisclosed: boolean;
  attemptIds: string[];
}

export interface B1ProgressSyncPayloadV1 {
  kind: 'b1.progress';
  session: B1PracticeDescriptorV1;
  status: B1PracticeSessionRow['status'];
  currentIndex: number;
  completedAt?: string;
}

export interface B1SyncTombstonePayloadV1 {
  kind: 'b1.tombstone';
}

export interface B1ResetSyncPayloadV1 {
  kind: 'b1.reset';
  resetAt: string;
}

export type CloudSyncPayloadV1 =
  | LearningSyncPayloadV1
  | B1AnswerSyncPayloadV1
  | B1ProgressSyncPayloadV1
  | B1SyncTombstonePayloadV1
  | B1ResetSyncPayloadV1;

export interface LearningSyncItem {
  scope: CloudSyncScope;
  itemKey: string;
  schemaVersion: typeof CLOUD_SYNC_SCHEMA_VERSION;
  payload: CloudSyncPayloadV1;
  clientUpdatedAt: string;
  deviceId: string;
  isDeleted: boolean;
}

export interface CloudLearningSyncItem extends Omit<LearningSyncItem, 'payload'> {
  userId: string;
  payload: unknown;
}

export interface CloudLearningSyncUpsert extends LearningSyncItem {
  userId: string;
}

export interface CloudSyncGateway {
  fetchItems(userId: string): Promise<readonly CloudLearningSyncItem[]>;
  upsertItems(items: readonly CloudLearningSyncUpsert[]): Promise<void>;
}
