import { b1Cases } from '../../data/b1';
import { b1Identity, sameB1Identity } from '../../domain/b1Identity';
import type { A1DojoDatabase } from '../../database/database';
import type {
  B1PracticeSessionRow,
  B1UnitConfirmation,
  CloudSyncMetadataRow,
  CloudSyncScope,
} from '../../database/types';
import { getB1Case, getB1QuestionUnit } from '../../data/b1';
import type { B1AnswerValues, B1SelfGrade } from '../../domain/b1';
import { getDeviceId } from './deviceId';
import { queueCloudSyncMetadataForActiveUser } from './cloudSyncOutbox';
import {
  CLOUD_SYNC_SCHEMA_VERSION,
  type B1AnswerSyncPayloadV1,
  type B1PracticeDescriptorV1,
  type B1ProgressSyncPayloadV1,
  type CloudLearningSyncItem,
  type LearningSyncItem,
} from './types';

export const B1_CLOUD_SYNC_SCOPES = ['b1.answer', 'b1.progress', 'b1.reset'] as const;
export const B1_RESET_ITEM_KEY =
  b1Cases[0]?.examCode === 'SC'
    ? `practice-sessions:${b1Cases[0].dataset_version}`
    : 'practice-sessions';
export const B1_CLOUD_SYNC_DEBOUNCE_MS = 1_500;

type B1CloudSyncScope = (typeof B1_CLOUD_SYNC_SCOPES)[number];

export function isB1CloudSyncScope(scope: CloudSyncScope): scope is B1CloudSyncScope {
  return B1_CLOUD_SYNC_SCOPES.includes(scope as B1CloudSyncScope);
}

export function isB1CloudSyncDataScope(
  scope: CloudSyncScope,
): scope is 'b1.answer' | 'b1.progress' {
  return scope === 'b1.answer' || scope === 'b1.progress';
}

export async function markB1PracticeForCloudSync(
  database: A1DojoDatabase,
  previous: B1PracticeSessionRow | undefined,
  next: B1PracticeSessionRow,
  deviceId = getDeviceId(),
): Promise<void> {
  const rows = createChangedMetadata(previous, next, deviceId);
  if (rows.length > 0) {
    await database.cloudSyncMetadata.bulkPut(rows);
    await queueCloudSyncMetadataForActiveUser(database, rows, next.updatedAt);
  }
}

export function createB1PracticeTombstones(
  sessions: readonly B1PracticeSessionRow[],
  metadataRows: readonly CloudSyncMetadataRow[],
  deletedAt: string,
  deviceId = getDeviceId(),
): CloudSyncMetadataRow[] {
  const keys = new Map<string, Pick<CloudSyncMetadataRow, 'scope' | 'itemKey'>>();
  for (const session of sessions) {
    addMetadataKey(keys, 'b1.progress', session.id);
    for (const questionId of session.unitIds) {
      if (hasUnitState(session, questionId)) {
        addMetadataKey(keys, 'b1.answer', answerItemKey(session.id, questionId));
      }
    }
  }
  for (const row of metadataRows) {
    if (isB1CloudSyncDataScope(row.scope)) addMetadataKey(keys, row.scope, row.itemKey);
  }
  return [
    ...[...keys.values()].map(({ scope, itemKey }) => ({
      scope,
      itemKey,
      clientUpdatedAt: deletedAt,
      deviceId,
      isDeleted: true,
    })),
    createMetadata('b1.reset', B1_RESET_ITEM_KEY, deletedAt, deviceId, false),
  ];
}

export function createB1PracticeRestoreMetadata(
  restoredSessions: readonly B1PracticeSessionRow[],
  previousSessions: readonly B1PracticeSessionRow[],
  previousMetadata: readonly CloudSyncMetadataRow[],
  restoredAt: string,
  deviceId = getDeviceId(),
): CloudSyncMetadataRow[] {
  const restored = createDesiredMetadata(restoredSessions, restoredAt, deviceId);
  const restoredKeys = new Set(restored.map((row) => metadataKey(row.scope, row.itemKey)));
  const deleted = createB1PracticeTombstones(
    previousSessions,
    previousMetadata,
    restoredAt,
    deviceId,
  ).filter(
    (row) => row.scope !== 'b1.reset' && !restoredKeys.has(metadataKey(row.scope, row.itemKey)),
  );
  return [
    ...restored,
    ...deleted,
    createMetadata('b1.reset', B1_RESET_ITEM_KEY, restoredAt, deviceId, false),
  ];
}

export async function readLocalB1PracticeItems(
  database: A1DojoDatabase,
  metadataRows: readonly CloudSyncMetadataRow[],
  deviceId: string,
  now: () => string,
): Promise<LearningSyncItem[]> {
  const sessions = await database.b1PracticeSessions.toArray();
  const metadataByKey = new Map(
    metadataRows
      .filter((row) => isB1CloudSyncScope(row.scope))
      .map((row) => [metadataKey(row.scope, row.itemKey), row]),
  );
  const representedKeys = new Set<string>();
  const items: LearningSyncItem[] = [];

  const resetKey = metadataKey('b1.reset', B1_RESET_ITEM_KEY);
  const resetMetadata = metadataByKey.get(resetKey);
  if (resetMetadata !== undefined) {
    representedKeys.add(resetKey);
    if (!resetMetadata.isDeleted) items.push(createResetItem(resetMetadata));
  }

  for (const session of sessions) {
    const progressKey = metadataKey('b1.progress', session.id);
    representedKeys.add(progressKey);
    const progressMetadata = await resolveMetadata(
      database,
      metadataByKey.get(progressKey),
      'b1.progress',
      session.id,
      session.updatedAt,
      deviceId,
      true,
    );
    metadataByKey.set(progressKey, progressMetadata);
    items.push(
      progressMetadata.isDeleted
        ? createB1TombstoneItem(progressMetadata)
        : createProgressItem(session, progressMetadata),
    );

    for (const questionId of session.unitIds) {
      const itemKey = answerItemKey(session.id, questionId);
      const key = metadataKey('b1.answer', itemKey);
      const existingMetadata = metadataByKey.get(key);
      const hasState = hasUnitState(session, questionId);
      if (!hasState && existingMetadata === undefined) continue;

      representedKeys.add(key);
      const metadata = await resolveMetadata(
        database,
        existingMetadata,
        'b1.answer',
        itemKey,
        session.updatedAt,
        deviceId,
        hasState,
        now,
      );
      metadataByKey.set(key, metadata);
      items.push(
        metadata.isDeleted
          ? createB1TombstoneItem(metadata)
          : createAnswerItem(session, questionId, metadata),
      );
    }
  }

  for (const [key, metadata] of metadataByKey) {
    if (representedKeys.has(key)) continue;
    const tombstone = metadata.isDeleted
      ? metadata
      : { ...metadata, clientUpdatedAt: now(), deviceId, isDeleted: true };
    if (!metadata.isDeleted) await database.cloudSyncMetadata.put(tombstone);
    items.push(createB1TombstoneItem(tombstone));
  }

  return items;
}

export async function applyRemoteB1PracticeItem(
  database: A1DojoDatabase,
  item: LearningSyncItem,
): Promise<void> {
  if (item.scope === 'b1.reset') {
    if (!isB1ResetPayload(item.payload)) throw new Error('科目Bリセット境界が正しくありません。');
  } else if (item.scope === 'b1.progress') {
    await applyProgressItem(database, item);
  } else if (item.scope === 'b1.answer') {
    await applyAnswerItem(database, item);
  } else {
    throw new Error('科目B同期対象ではないscopeです。');
  }

  await database.cloudSyncMetadata.put({
    scope: item.scope,
    itemKey: item.itemKey,
    clientUpdatedAt: item.clientUpdatedAt,
    deviceId: item.deviceId,
    isDeleted: item.isDeleted,
  });
}

/** Foreign datasets stay in the cloud and cannot affect active answers or reset boundaries. */
export function isCompatibleB1RemoteItem(item: CloudLearningSyncItem): boolean {
  if (item.scope === 'b1.reset') return item.itemKey === B1_RESET_ITEM_KEY;
  if (item.isDeleted)
    return (
      b1Cases[0]?.examCode !== 'SC' || item.itemKey.startsWith(`b1-${b1Cases[0].dataset_version}-`)
    );
  if (!isRecord(item.payload) || !isRecord(item.payload.session)) return true;
  const descriptor = item.payload.session;
  if (typeof descriptor.caseId !== 'string') return true;
  const caseItem = getB1Case(descriptor.caseId);
  if (!caseItem) return false;
  if (caseItem.examCode !== 'SC' && descriptor.identity === undefined) return true;
  return sameB1Identity(
    descriptor.identity as import('../../domain/b1Identity').B1ContentIdentity | undefined,
    b1Identity(caseItem),
  );
}

export function normalizeRemoteB1PracticeItem(item: CloudLearningSyncItem): LearningSyncItem {
  if (!isB1CloudSyncScope(item.scope)) {
    throw new Error('科目B同期対象ではないscopeです。');
  }
  if (item.scope === 'b1.reset') {
    if (
      item.isDeleted ||
      item.itemKey !== B1_RESET_ITEM_KEY ||
      !isRecord(item.payload) ||
      item.payload.kind !== 'b1.reset' ||
      !isIsoDate(item.payload.resetAt) ||
      item.payload.resetAt !== item.clientUpdatedAt
    ) {
      throw new Error('科目Bリセット境界の形式が正しくありません。');
    }
    return {
      ...item,
      payload: { kind: 'b1.reset', resetAt: item.payload.resetAt },
    };
  }
  if (item.isDeleted) {
    validateTombstoneKey(item.scope, item.itemKey);
    return { ...item, payload: { kind: 'b1.tombstone' } };
  }
  if (!isRecord(item.payload)) throw new Error('科目B同期データの形式が正しくありません。');

  if (item.scope === 'b1.progress') {
    const payload = parseProgressPayload(item.payload);
    if (item.itemKey !== payload.session.id) {
      throw new Error('科目B進捗のitem_keyが正しくありません。');
    }
    return { ...item, payload };
  }

  const payload = parseAnswerPayload(item.payload);
  if (item.itemKey !== answerItemKey(payload.session.id, payload.questionId)) {
    throw new Error('科目B回答のitem_keyが正しくありません。');
  }
  return { ...item, payload };
}

function createChangedMetadata(
  previous: B1PracticeSessionRow | undefined,
  next: B1PracticeSessionRow,
  deviceId: string,
): CloudSyncMetadataRow[] {
  const rows: CloudSyncMetadataRow[] = [];
  if (previous === undefined || progressSnapshot(previous) !== progressSnapshot(next)) {
    rows.push(createMetadata('b1.progress', next.id, next.updatedAt, deviceId, false));
  }

  const unitIds = new Set([...(previous?.unitIds ?? []), ...next.unitIds]);
  for (const questionId of unitIds) {
    if (
      previous !== undefined &&
      unitSnapshot(previous, questionId) === unitSnapshot(next, questionId)
    ) {
      continue;
    }
    const hasState = hasUnitState(next, questionId);
    if (previous === undefined && !hasState) continue;
    rows.push(
      createMetadata(
        'b1.answer',
        answerItemKey(next.id, questionId),
        next.updatedAt,
        deviceId,
        !hasState,
      ),
    );
  }
  return rows;
}

function createDesiredMetadata(
  sessions: readonly B1PracticeSessionRow[],
  updatedAt: string,
  deviceId: string,
): CloudSyncMetadataRow[] {
  const rows: CloudSyncMetadataRow[] = [];
  for (const session of sessions) {
    rows.push(createMetadata('b1.progress', session.id, updatedAt, deviceId, false));
    for (const questionId of session.unitIds) {
      if (hasUnitState(session, questionId)) {
        rows.push(
          createMetadata(
            'b1.answer',
            answerItemKey(session.id, questionId),
            updatedAt,
            deviceId,
            false,
          ),
        );
      }
    }
  }
  return rows;
}

async function resolveMetadata(
  database: A1DojoDatabase,
  existing: CloudSyncMetadataRow | undefined,
  scope: B1CloudSyncScope,
  itemKey: string,
  localUpdatedAt: string,
  deviceId: string,
  hasState: boolean,
  now: () => string = () => new Date().toISOString(),
): Promise<CloudSyncMetadataRow> {
  let resolved = existing;
  if (resolved === undefined) {
    resolved = createMetadata(scope, itemKey, localUpdatedAt, deviceId, !hasState);
  } else if (hasState && resolved.isDeleted && resolved.clientUpdatedAt < localUpdatedAt) {
    resolved = createMetadata(scope, itemKey, localUpdatedAt, deviceId, false);
  } else if (!hasState && !resolved.isDeleted) {
    resolved = createMetadata(scope, itemKey, now(), deviceId, true);
  }
  if (resolved !== existing) await database.cloudSyncMetadata.put(resolved);
  return resolved;
}

function createProgressItem(
  session: B1PracticeSessionRow,
  metadata: CloudSyncMetadataRow,
): LearningSyncItem {
  const payload: B1ProgressSyncPayloadV1 = {
    kind: 'b1.progress',
    session: createDescriptor(session),
    status: session.status,
    currentIndex: session.currentIndex,
    completedAt: session.completedAt,
  };
  return createItem(metadata, payload);
}

function createAnswerItem(
  session: B1PracticeSessionRow,
  questionId: string,
  metadata: CloudSyncMetadataRow,
): LearningSyncItem {
  const payload: B1AnswerSyncPayloadV1 = {
    kind: 'b1.answer',
    session: createDescriptor(session),
    questionId,
    answers: { ...(session.answers[questionId] ?? {}) },
    unitConfirmation: cloneConfirmation(session.unitConfirmations?.[questionId]),
    selfGrade: session.selfGrades[questionId],
    selfGradeUpdatedAt: session.selfGradeUpdatedAt?.[questionId],
    review: session.reviewQuestionIds.includes(questionId),
    requirementDisclosed: session.requirementDisclosureQuestionIds?.includes(questionId) ?? false,
    attemptIds: [...(session.attemptIdsByQuestion?.[questionId] ?? [])],
  };
  return createItem(metadata, payload);
}

function createItem(
  metadata: CloudSyncMetadataRow,
  payload: LearningSyncItem['payload'],
): LearningSyncItem {
  return {
    scope: metadata.scope,
    itemKey: metadata.itemKey,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload,
    clientUpdatedAt: metadata.clientUpdatedAt,
    deviceId: metadata.deviceId,
    isDeleted: false,
  };
}

function createB1TombstoneItem(metadata: CloudSyncMetadataRow): LearningSyncItem {
  return {
    scope: metadata.scope,
    itemKey: metadata.itemKey,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload: { kind: 'b1.tombstone' },
    clientUpdatedAt: metadata.clientUpdatedAt,
    deviceId: metadata.deviceId,
    isDeleted: true,
  };
}

function createResetItem(metadata: CloudSyncMetadataRow): LearningSyncItem {
  return {
    scope: 'b1.reset',
    itemKey: B1_RESET_ITEM_KEY,
    schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
    payload: { kind: 'b1.reset', resetAt: metadata.clientUpdatedAt },
    clientUpdatedAt: metadata.clientUpdatedAt,
    deviceId: metadata.deviceId,
    isDeleted: false,
  };
}

async function applyProgressItem(database: A1DojoDatabase, item: LearningSyncItem): Promise<void> {
  if (item.isDeleted) {
    await database.b1PracticeSessions.delete(item.itemKey);
    return;
  }
  if (!isB1ProgressPayload(item.payload)) throw new Error('科目B進捗データが正しくありません。');
  const existing = await database.b1PracticeSessions.get(item.payload.session.id);
  const base = mergeDescriptor(existing, item.payload.session, item.clientUpdatedAt);
  await database.b1PracticeSessions.put({
    ...base,
    status: item.payload.status,
    currentIndex: item.payload.currentIndex,
    completedAt: item.payload.completedAt,
    updatedAt: maxDate(base.updatedAt, item.clientUpdatedAt),
  });
}

async function applyAnswerItem(database: A1DojoDatabase, item: LearningSyncItem): Promise<void> {
  if (item.isDeleted) {
    const { sessionId, questionId } = parseAnswerItemKey(item.itemKey);
    const existing = await database.b1PracticeSessions.get(sessionId);
    if (existing !== undefined) {
      await database.b1PracticeSessions.put(
        removeUnitState(existing, questionId, item.clientUpdatedAt),
      );
    }
    return;
  }
  if (!isB1AnswerPayload(item.payload)) throw new Error('科目B回答データが正しくありません。');
  const existing = await database.b1PracticeSessions.get(item.payload.session.id);
  const base = mergeDescriptor(existing, item.payload.session, item.clientUpdatedAt);
  const questionId = item.payload.questionId;
  const next: B1PracticeSessionRow = {
    ...base,
    answers: { ...base.answers, [questionId]: { ...item.payload.answers } },
    unitConfirmations: setOptionalEntry(
      base.unitConfirmations,
      questionId,
      cloneConfirmation(item.payload.unitConfirmation),
    ),
    selfGrades: setOptionalEntry(base.selfGrades, questionId, item.payload.selfGrade),
    selfGradeUpdatedAt: setOptionalEntry(
      base.selfGradeUpdatedAt,
      questionId,
      item.payload.selfGradeUpdatedAt,
    ),
    reviewQuestionIds: setMembership(base.reviewQuestionIds, questionId, item.payload.review),
    requirementDisclosureQuestionIds: setMembership(
      base.requirementDisclosureQuestionIds ?? [],
      questionId,
      item.payload.requirementDisclosed,
    ),
    attemptIdsByQuestion: setOptionalEntry(
      base.attemptIdsByQuestion,
      questionId,
      item.payload.attemptIds.length > 0 ? [...item.payload.attemptIds] : undefined,
    ),
    updatedAt: maxDate(base.updatedAt, item.clientUpdatedAt),
  };
  await database.b1PracticeSessions.put(next);
}

function mergeDescriptor(
  existing: B1PracticeSessionRow | undefined,
  descriptor: B1PracticeDescriptorV1,
  updatedAt: string,
): B1PracticeSessionRow {
  if (existing !== undefined) {
    if (
      existing.id !== descriptor.id ||
      existing.caseId !== descriptor.caseId ||
      (descriptor.identity !== undefined &&
        !sameB1Identity(existing.identity, descriptor.identity)) ||
      JSON.stringify(existing.unitIds) !== JSON.stringify(descriptor.unitIds)
    ) {
      throw new Error('科目Bセッションの構成が一致しません。');
    }
    return existing;
  }
  return {
    ...descriptor,
    status: 'in_progress',
    answers: {},
    unitConfirmations: {},
    selfGrades: {},
    selfGradeUpdatedAt: {},
    reviewQuestionIds: [],
    requirementDisclosureQuestionIds: [],
    attemptIdsByQuestion: {},
    currentIndex: 0,
    updatedAt,
  };
}

function removeUnitState(
  session: B1PracticeSessionRow,
  questionId: string,
  updatedAt: string,
): B1PracticeSessionRow {
  return {
    ...session,
    answers: removeEntry(session.answers, questionId),
    unitConfirmations: removeEntry(session.unitConfirmations, questionId),
    selfGrades: removeEntry(session.selfGrades, questionId),
    selfGradeUpdatedAt: removeEntry(session.selfGradeUpdatedAt, questionId),
    reviewQuestionIds: setMembership(session.reviewQuestionIds, questionId, false),
    requirementDisclosureQuestionIds: setMembership(
      session.requirementDisclosureQuestionIds ?? [],
      questionId,
      false,
    ),
    attemptIdsByQuestion: removeEntry(session.attemptIdsByQuestion, questionId),
    updatedAt: maxDate(session.updatedAt, updatedAt),
  };
}

function parseProgressPayload(value: Record<string, unknown>): B1ProgressSyncPayloadV1 {
  const session = parseDescriptor(value.session);
  if (
    value.kind !== 'b1.progress' ||
    (value.status !== 'in_progress' && value.status !== 'completed') ||
    !Number.isInteger(value.currentIndex) ||
    Number(value.currentIndex) < 0 ||
    Number(value.currentIndex) >= session.unitIds.length ||
    !isOptionalIsoDate(value.completedAt) ||
    (value.status === 'completed' && value.completedAt === undefined)
  ) {
    throw new Error('科目B進捗データの形式が正しくありません。');
  }
  return {
    kind: 'b1.progress',
    session,
    status: value.status,
    currentIndex: Number(value.currentIndex),
    completedAt: value.completedAt,
  };
}

function parseAnswerPayload(value: Record<string, unknown>): B1AnswerSyncPayloadV1 {
  const session = parseDescriptor(value.session);
  if (
    value.kind !== 'b1.answer' ||
    typeof value.questionId !== 'string' ||
    !session.unitIds.includes(value.questionId) ||
    typeof value.review !== 'boolean' ||
    typeof value.requirementDisclosed !== 'boolean' ||
    !Array.isArray(value.attemptIds) ||
    !value.attemptIds.every(isNonEmptyString) ||
    new Set(value.attemptIds).size !== value.attemptIds.length ||
    !isOptionalSelfGrade(value.selfGrade) ||
    !isOptionalIsoDate(value.selfGradeUpdatedAt)
  ) {
    throw new Error('科目B回答データの形式が正しくありません。');
  }
  const answers = parseAnswers(value.answers, value.questionId);
  const unitConfirmation = parseConfirmation(value.unitConfirmation, value.questionId);
  return {
    kind: 'b1.answer',
    session,
    questionId: value.questionId,
    answers,
    unitConfirmation,
    selfGrade: value.selfGrade,
    selfGradeUpdatedAt: value.selfGradeUpdatedAt,
    review: value.review,
    requirementDisclosed: value.requirementDisclosed,
    attemptIds: [...value.attemptIds],
  };
}

function parseDescriptor(value: unknown): B1PracticeDescriptorV1 {
  if (!isRecord(value)) throw new Error('科目Bセッション情報が正しくありません。');
  if (
    !isNonEmptyString(value.id) ||
    value.subjectId !== 'b1' ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3) ||
    (value.mode !== undefined && value.mode !== 'training' && value.mode !== 'practical') ||
    !isNonEmptyString(value.caseId) ||
    !Array.isArray(value.unitIds) ||
    !value.unitIds.every(isNonEmptyString) ||
    new Set(value.unitIds).size !== value.unitIds.length ||
    !isIsoDate(value.createdAt)
  ) {
    throw new Error('科目Bセッション情報が正しくありません。');
  }
  const caseItem = getB1Case(value.caseId);
  const expectedUnitIds = caseItem?.questionUnits.map((unit) => unit.questionId);
  if (
    caseItem?.examCode === 'SC' &&
    !sameB1Identity(
      value.identity as import('../../domain/b1Identity').B1ContentIdentity | undefined,
      b1Identity(caseItem),
    )
  ) {
    throw new Error('科目B教材のdataset・source・contentが一致しません。旧履歴は取り込みません。');
  }
  if (
    expectedUnitIds === undefined ||
    JSON.stringify(value.unitIds) !== JSON.stringify(expectedUnitIds)
  ) {
    throw new Error('科目Bセッションの問題構成が正しくありません。');
  }
  return {
    id: value.id,
    subjectId: 'b1',
    version: value.version,
    mode: value.mode,
    identity: caseItem ? b1Identity(caseItem) : undefined,
    caseId: value.caseId,
    unitIds: [...value.unitIds],
    createdAt: value.createdAt,
  };
}

function parseAnswers(value: unknown, questionId: string): B1AnswerValues {
  if (!isRecord(value)) throw new Error('科目B回答欄の形式が正しくありません。');
  const unit = getB1QuestionUnit(questionId);
  if (unit === undefined) throw new Error('科目B設問が見つかりません。');
  const allowedFields = new Set(unit.answerFields.map((field) => field.fieldId));
  const answers: B1AnswerValues = {};
  for (const [fieldId, answer] of Object.entries(value)) {
    if (!allowedFields.has(fieldId) || typeof answer !== 'string') {
      throw new Error('科目B回答欄の形式が正しくありません。');
    }
    answers[fieldId] = answer;
  }
  return answers;
}

function parseConfirmation(value: unknown, questionId: string) {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !isIsoDate(value.confirmedAt)) {
    throw new Error('科目B回答確定データの形式が正しくありません。');
  }
  return { answers: parseAnswers(value.answers, questionId), confirmedAt: value.confirmedAt };
}

function validateTombstoneKey(scope: B1CloudSyncScope, itemKey: string): void {
  if (scope === 'b1.reset') throw new Error('科目Bリセット境界は削除できません。');
  if (scope === 'b1.progress') {
    if (!isNonEmptyString(itemKey)) throw new Error('科目B進捗のitem_keyが正しくありません。');
    return;
  }
  parseAnswerItemKey(itemKey);
}

function parseAnswerItemKey(itemKey: string): { sessionId: string; questionId: string } {
  const separator = itemKey.indexOf(':');
  const sessionId = itemKey.slice(0, separator);
  const questionId = itemKey.slice(separator + 1);
  if (
    separator <= 0 ||
    !isNonEmptyString(sessionId) ||
    getB1QuestionUnit(questionId) === undefined
  ) {
    throw new Error('科目B回答のitem_keyが正しくありません。');
  }
  return { sessionId, questionId };
}

function createDescriptor(session: B1PracticeSessionRow): B1PracticeDescriptorV1 {
  return {
    id: session.id,
    subjectId: 'b1',
    version: session.version,
    mode: session.mode,
    identity: session.identity,
    caseId: session.caseId,
    unitIds: [...session.unitIds],
    createdAt: session.createdAt,
  };
}

function hasUnitState(session: B1PracticeSessionRow, questionId: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(session.answers, questionId) ||
    session.unitConfirmations?.[questionId] !== undefined ||
    session.selfGrades[questionId] !== undefined ||
    session.selfGradeUpdatedAt?.[questionId] !== undefined ||
    session.reviewQuestionIds.includes(questionId) ||
    (session.requirementDisclosureQuestionIds?.includes(questionId) ?? false) ||
    (session.attemptIdsByQuestion?.[questionId]?.length ?? 0) > 0
  );
}

function progressSnapshot(session: B1PracticeSessionRow): string {
  return JSON.stringify({
    descriptor: createDescriptor(session),
    status: session.status,
    currentIndex: session.currentIndex,
    completedAt: session.completedAt,
  });
}

function unitSnapshot(session: B1PracticeSessionRow, questionId: string): string {
  return JSON.stringify({
    hasState: hasUnitState(session, questionId),
    answers: session.answers[questionId],
    unitConfirmation: session.unitConfirmations?.[questionId],
    selfGrade: session.selfGrades[questionId],
    selfGradeUpdatedAt: session.selfGradeUpdatedAt?.[questionId],
    review: session.reviewQuestionIds.includes(questionId),
    requirementDisclosed: session.requirementDisclosureQuestionIds?.includes(questionId) ?? false,
    attemptIds: session.attemptIdsByQuestion?.[questionId],
  });
}

function createMetadata(
  scope: B1CloudSyncScope,
  itemKey: string,
  clientUpdatedAt: string,
  deviceId: string,
  isDeleted: boolean,
): CloudSyncMetadataRow {
  return { scope, itemKey, clientUpdatedAt, deviceId, isDeleted };
}

function answerItemKey(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}

function metadataKey(scope: CloudSyncScope, itemKey: string): string {
  return `${scope}\u0000${itemKey}`;
}

function addMetadataKey(
  keys: Map<string, Pick<CloudSyncMetadataRow, 'scope' | 'itemKey'>>,
  scope: B1CloudSyncScope,
  itemKey: string,
): void {
  keys.set(metadataKey(scope, itemKey), { scope, itemKey });
}

function setMembership(values: readonly string[], value: string, included: boolean): string[] {
  const withoutValue = values.filter((item) => item !== value);
  return included ? [...withoutValue, value] : withoutValue;
}

function setOptionalEntry<T>(
  record: Readonly<Record<string, T>> | undefined,
  key: string,
  value: T | undefined,
): Record<string, T> {
  const next = { ...(record ?? {}) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

function removeEntry<T>(
  record: Readonly<Record<string, T>> | undefined,
  key: string,
): Record<string, T> {
  const next = { ...(record ?? {}) };
  delete next[key];
  return next;
}

function cloneConfirmation(value: B1UnitConfirmation | undefined): B1UnitConfirmation | undefined {
  return value === undefined
    ? undefined
    : { answers: { ...value.answers }, confirmedAt: value.confirmedAt };
}

function maxDate(left: string, right: string): string {
  return left.localeCompare(right) < 0 ? right : left;
}

function isB1ProgressPayload(value: LearningSyncItem['payload']): value is B1ProgressSyncPayloadV1 {
  return isRecord(value) && value.kind === 'b1.progress';
}

function isB1AnswerPayload(value: LearningSyncItem['payload']): value is B1AnswerSyncPayloadV1 {
  return isRecord(value) && value.kind === 'b1.answer';
}

function isB1ResetPayload(
  value: LearningSyncItem['payload'],
): value is { kind: 'b1.reset'; resetAt: string } {
  return isRecord(value) && value.kind === 'b1.reset' && isIsoDate(value.resetAt);
}

function isOptionalSelfGrade(value: unknown): value is B1SelfGrade | undefined {
  return (
    value === undefined ||
    value === 'correct' ||
    value === 'partial' ||
    value === 'incorrect' ||
    value === 'review'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function isOptionalIsoDate(value: unknown): value is string | undefined {
  return value === undefined || isIsoDate(value);
}
