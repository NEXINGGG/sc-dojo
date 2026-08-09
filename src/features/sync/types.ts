import type { AnswerAttemptRow, CloudSyncScope, QuestionProgressRow } from '../../database/types';

export const CLOUD_SYNC_SCHEMA_VERSION = 1;
export const CLOUD_SYNC_SCOPES = [
  'a1.question',
  'a2.question',
] as const satisfies readonly CloudSyncScope[];

export type SyncedAnswerAttempt = Omit<AnswerAttemptRow, 'id'>;

export interface LearningSyncPayloadV1 {
  progress: QuestionProgressRow | null;
  answerAttempts: SyncedAnswerAttempt[];
}

export interface LearningSyncItem {
  scope: CloudSyncScope;
  itemKey: string;
  schemaVersion: typeof CLOUD_SYNC_SCHEMA_VERSION;
  payload: LearningSyncPayloadV1;
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
