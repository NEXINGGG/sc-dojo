import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  vi.stubEnv('VITE_SC_B_PILOT', 'foundation');
});
import { b1Cases, b1Categories, nwB1Cases } from '../data/b1';
import { getSubjectCatalog, allQuestions } from '../data/catalog';
import { createDatabase, initializeDatabase, type A1DojoDatabase } from '../database/database';
import { reconcileB1Dataset } from '../database/b1DatasetMigration';
import { B1Repository } from '../features/b1/b1Repository';
import { B1LearningSupportRepository } from '../features/b1/b1LearningSupportRepository';
import { DataManagementRepository } from '../features/settings/dataManagementRepository';
import {
  b1Identity,
  b1DocumentId,
  calculateB1ContentHash,
  createB1Manifest,
} from '../domain/b1Identity';
import { scBExamConfig, toggleB1CaseSelection } from '../domain/b1ExamConfig';
import { validateScBDataset } from '../domain/b1DatasetValidation';
import { createQuestionDataIdentity, validateBackupDocumentWithB1 } from '../domain/backup';
import { getB1LearningSupportCatalog } from '../data/b1LearningSupport';
import { recommendB1A2Questions } from '../domain/b1A2Recommendation';
import {
  B1_RESET_ITEM_KEY,
  normalizeRemoteB1PracticeItem,
  readLocalB1PracticeItems,
} from '../features/sync/b1CloudSync';
import type { B1PracticeSessionRow } from '../database/types';

const databases: A1DojoDatabase[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of databases.splice(0)) await db.delete();
});
function newDatabase() {
  const db = createDatabase(`sc-b-foundation-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

describe('SC科目B基盤', () => {
  it('4問・SCカテゴリ・A-2 codeを検証しA-1/A-2正式240問を維持する', () => {
    expect(b1Cases).toHaveLength(4);
    expect(b1Categories).toHaveLength(12);
    expect(nwB1Cases).toHaveLength(27);
    for (const subject of ['a1', 'a2'] as const)
      expect(getSubjectCatalog(subject).questions).toHaveLength(240);
    const codes = new Set(getSubjectCatalog('a2').questions.map((q) => q.code));
    const categories = new Set(b1Categories.map((c) => c.categoryId));
    expect(validateScBDataset(b1Cases, codes, categories)).toEqual([]);
    const copy = structuredClone(b1Cases);
    copy[0].questionUnits[0].relatedA2QuestionIds = ['A2-MISSING'];
    expect(validateScBDataset(copy, codes, categories).join()).toContain('正式A-2');
    expect(b1Cases.every((item) => item.dataset_version === 'sc-b-pilot-v1')).toBe(true);
  });
  it('0/1/2問を選択でき、3問目を断り、解除して選び直せる', () => {
    let selected: string[] = [];
    selected = toggleB1CaseSelection(selected, 'Q1').selected;
    expect(selected).toEqual(['Q1']);
    selected = toggleB1CaseSelection(selected, 'Q3').selected;
    expect(toggleB1CaseSelection(selected, 'Q4')).toEqual({
      selected,
      message: expect.stringContaining('解除'),
    });
    selected = toggleB1CaseSelection(selected, 'Q1').selected;
    expect(toggleB1CaseSelection(selected, 'Q4').selected).toEqual(['Q3', 'Q4']);
    expect(scBExamConfig).toMatchObject({
      presentedCount: 4,
      selectedCount: 2,
      durationSeconds: 9000,
    });
  });
  it('本文・設問・図表・欄はhashを変え、解説・支援・許容例は変えない', () => {
    const original = b1Cases[0];
    const hash = calculateB1ContentHash(original);
    const aid = structuredClone(original);
    aid.commentarySummary = '解説改訂';
    aid.questionUnits[0].answerFields[0].officialAnswer = '解答例改訂';
    aid.questionUnits[0].answerFields[0].acceptableAnswers = ['別表現'];
    aid.questionUnits[0].answerFields[0].requiredKeywords = ['改訂'];
    aid.questionUnits[0].answerFields[0].scoringPoints = ['改訂'];
    aid.questionUnits[0].answerFields[0].gradingNote = '改訂';
    aid.questionUnits[0].guidance!.requirementBreakdown.trainingHint = '補助改訂';
    expect(calculateB1ContentHash(aid)).toBe(hash);
    const windowsText = structuredClone(original);
    const unixText = structuredClone(original);
    windowsText.body.sections![0].paragraphs[0].text += '\r\nカ\u3099';
    unixText.body.sections![0].paragraphs[0].text += '\nガ';
    expect(calculateB1ContentHash(windowsText)).toBe(calculateB1ContentHash(unixText));
    for (const mutate of [
      (item: typeof original) => {
        item.body.sections![0].paragraphs[0].text += '変更';
      },
      (item: typeof original) => {
        item.body.materials![0].text += '変更';
      },
      (item: typeof original) => {
        item.questionUnits[0].promptText += '変更';
      },
      (item: typeof original) => {
        item.questionUnits[0].answerFields[0].maxLength = 30;
      },
    ]) {
      const item = structuredClone(original);
      mutate(item);
      expect(calculateB1ContentHash(item)).not.toBe(hash);
    }
  });
  it('150分模試で途中保存・再開・大問切替・答案と見直し保持・提出・自己採点できる', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    await expect(repo.createMock(2099, [])).rejects.toThrow('2大問');
    await expect(repo.createMock(2099, [b1Cases[0].caseId])).rejects.toThrow('2大問');
    const mock = await repo.createMock(2099, [b1Cases[0].caseId, b1Cases[2].caseId]);
    expect(mock.mode).toBe('mock150');
    expect(mock.presentedCaseIds).toHaveLength(4);
    expect(new Date(mock.deadlineAt).getTime() - new Date(mock.startedAt).getTime()).toBe(9000000);
    const saved = {
      ...mock,
      currentIndex: 2,
      answers: {
        [mock.unitIds[0]]: { a: '記録と権限を照合する' },
        [mock.unitIds[2]]: { a: '対策を検討する' },
      },
      reviewQuestionIds: [mock.unitIds[0]],
    };
    await repo.saveMock(saved);
    db.close();
    await db.open();
    expect(await new B1Repository(db).getMock(mock.id)).toMatchObject(saved);
    const submitted = await repo.submitMock(mock.id, 'manual');
    expect(submitted.status).toBe('submitted');
    expect(submitted.answers).toEqual(saved.answers);
    await expect(repo.saveMock({ ...saved, answers: {} })).rejects.toThrow('変更できません');
    await repo.saveMock({
      ...submitted,
      selfGrades: Object.fromEntries(
        mock.unitIds.map((id, i) => [
          id,
          i === 0 ? ('correct' as const) : i === 1 ? ('partial' as const) : ('incorrect' as const),
        ]),
      ),
    });
    expect((await repo.completeMock(mock.id)).status).toBe('completed');
    const rewrite = await repo.createReviewPractice(mock.unitIds[0]);
    await repo.savePractice({
      ...rewrite,
      answers: { [mock.unitIds[0]]: { a: '書き直した答案' } },
    });
    expect((await repo.getMock(mock.id))?.answers).toEqual(saved.answers);
    expect((await repo.getPractice(rewrite.id))?.answers[mock.unitIds[0]]).toEqual({
      a: '書き直した答案',
    });
  });
  it('再起動時も時間切れ提出し部分答案を保持する。提出再実行は冪等', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    const mock = await repo.createMock(
      2099,
      b1Cases.slice(0, 2).map((item) => item.caseId),
    );
    await repo.saveMock({ ...mock, answers: { [mock.unitIds[0]]: { a: '途中の答案' } } });
    vi.spyOn(Date, 'now').mockReturnValue(new Date(mock.deadlineAt).getTime() + 1);
    const expired = await repo.getMock(mock.id);
    expect(expired).toMatchObject({
      status: 'submitted',
      submissionReason: 'timeout',
      answers: { [mock.unitIds[0]]: { a: '途中の答案' } },
    });
    expect(await repo.submitMock(mock.id, 'manual')).toEqual(expired);
  });
  it('根拠・SC失点原因・振り返り・明示A-2復習リンクを保存する', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    const support = new B1LearningSupportRepository(db);
    const practice = await repo.createPractice(b1Cases[0]);
    const unit = b1Cases[0].questionUnits[0];
    const evidence = await support.saveLearnerEvidence({
      sessionId: practice.id,
      questionId: unit.questionId,
      sourceType: 'log',
      location: 'L1 / P1',
      note: '本文の権限とログを照合する',
    });
    expect(evidence.identity).toEqual(b1Identity(b1Cases[0]));
    expect((await support.listLearnerEvidenceBySession(practice.id))[0]).toEqual(evidence);
    await support.saveLearningReflection({
      sessionId: practice.id,
      questionId: unit.questionId,
      failureCauseIds: ['sc_b_auth_access_confusion'],
      selfAssessment: 'partial',
    });
    const catalog = getB1LearningSupportCatalog();
    expect(catalog.failureCauses.every((cause) => cause.id.startsWith('sc_b_'))).toBe(true);
    expect(
      catalog.guidanceByQuestionId.get(unit.questionId)?.requirementBreakdown.trafficDirection,
    ).toBeUndefined();
    const recommendation = recommendB1A2Questions({
      remediation: catalog.a2RemediationByQuestionId.get(unit.questionId)!,
      failureCauseIds: ['sc_b_knowledge_gap'],
    });
    expect(recommendation.a2QuestionIds).toEqual(unit.relatedA2QuestionIds);
  });
  it('NW履歴と支援・同期を退避し、移行再実行とv2切替で混ざらない', async () => {
    const db = newDatabase();
    await db.open();
    const nw = nwB1Cases[0];
    const legacy: B1PracticeSessionRow = {
      id: 'legacy-session',
      subjectId: 'b1',
      version: 3,
      status: 'in_progress',
      caseId: nw.caseId,
      unitIds: nw.questionUnits.map((u) => u.questionId),
      answers: { [nw.questionUnits[0].questionId]: { a: 'NW答案' } },
      selfGrades: {},
      reviewQuestionIds: [],
      currentIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.b1PracticeSessions.put(legacy);
    await db.b1LearnerEvidence.put({
      id: 'legacy-evidence',
      version: 2,
      sessionId: legacy.id,
      questionId: legacy.unitIds[0],
      note: '旧根拠',
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    });
    await db.cloudSyncMetadata.put({
      scope: 'b1.progress',
      itemKey: legacy.id,
      clientUpdatedAt: legacy.updatedAt,
      deviceId: 'old',
      isDeleted: false,
    });
    await db.b1PdfFiles.put({
      subjectId: 'b1',
      year: 2025,
      fileName: 'nw.pdf',
      mimeType: 'application/pdf',
      size: 4,
      updatedAt: legacy.updatedAt,
      blob: new Blob(['%PDF']),
    });
    await initializeDatabase(db);
    await initializeDatabase(db);
    expect(await db.b1DatasetArchives.count()).toBe(1);
    expect(await db.b1PracticeSessions.count()).toBe(0);
    const archive = (await db.b1DatasetArchives.toArray())[0];
    expect(archive.previousDatasetVersion).toBe('nw-b1-v4');
    expect(archive.data.practiceSessions[0].answers).toEqual(legacy.answers);
    expect(archive.data.learnerEvidence).toHaveLength(1);
    expect(archive.data.syncMetadata).toHaveLength(1);
    expect(await db.b1PdfFiles.count()).toBe(1);
    const current = await new B1Repository(db).createPractice(b1Cases[0]);
    const next = createB1Manifest(b1Cases);
    next.datasetVersion = 'sc-b-v2';
    for (const identity of Object.values(next.cases)) identity.datasetVersion = 'sc-b-v2';
    await reconcileB1Dataset(db, next);
    await reconcileB1Dataset(db, next);
    expect(await db.b1PracticeSessions.get(current.id)).toBeUndefined();
    expect(await db.b1DatasetArchives.count()).toBe(2);
  });
  it('PDFはNW/SC・dataset・期・PM1/PM2を区別して旧登録を維持する', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    const file = new File(['%PDF-1.7'], 'sc.pdf', { type: 'application/pdf' });
    const pm1 = { ...b1Cases[0], originalSection: 'pm1' as const };
    const pm2 = { ...b1Cases[0], originalSection: 'pm2' as const };
    await repo.savePdf(2099, file);
    await repo.savePdf(pm1, file);
    await repo.savePdf(pm2, file);
    expect(b1DocumentId(pm1)).not.toBe(b1DocumentId(pm2));
    expect(b1DocumentId({ ...pm1, dataset_version: 'sc-b-v2' })).not.toBe(b1DocumentId(pm1));
    expect(await repo.getPdf(pm1)).toMatchObject({ documentId: b1DocumentId(pm1) });
    await repo.removePdf(pm2);
    expect(await repo.getPdf(pm1)).toBeDefined();
    expect(await repo.getPdf(2099)).toBeDefined();
  });
  it('SCのidentity欠落行を現在教材へ結び付けず退避し、A-1/A-2履歴を変更しない', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    const session = await repo.createPractice(b1Cases[0]);
    const unidentified = { ...session, identity: undefined };
    await db.b1PracticeSessions.put(unidentified);
    for (const subjectId of ['a1', 'a2'] as const) {
      const code = getSubjectCatalog(subjectId).questions[0].code;
      await db.questionProgress.put({
        subjectId,
        code,
        favorite: true,
        attemptCount: 1,
        correctCount: 1,
        incorrectCount: 0,
        updatedAt: session.updatedAt,
      });
    }
    await db.b1LearnerEvidence.put({
      id: 'orphan-nw',
      version: 2,
      sessionId: 'removed-legacy-session',
      questionId: 'B1-1999-Q1-OLD',
      note: '旧孤立根拠',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
    const progress = await db.questionProgress.toArray();
    await reconcileB1Dataset(db);
    await reconcileB1Dataset(db);
    expect(await db.b1PracticeSessions.count()).toBe(0);
    expect(await db.b1DatasetArchives.count()).toBe(1);
    expect(await db.questionProgress.toArray()).toEqual(progress);
    expect(await db.b1LearnerEvidence.count()).toBe(0);
    expect((await db.b1DatasetArchives.toArray())[0].data.learnerEvidence[0].id).toBe('orphan-nw');
  });
  it('バックアップv7が識別・退避を往復し、不正退避・hashを拒否する', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    await repo.createPractice(b1Cases[0]);
    const manifest = createB1Manifest(b1Cases);
    const next = structuredClone(manifest);
    next.cases[b1Cases[0].caseId].contentHash = `sha256:v1:${'a'.repeat(64)}`;
    await reconcileB1Dataset(db, next);
    const management = new DataManagementRepository(db);
    const backup = await management.createBackup();
    expect(backup.backupVersion).toBe(7);
    expect(backup.data.b1.datasetArchives).toHaveLength(1);
    const result = await validateBackupDocumentWithB1(
      backup,
      allQuestions,
      createQuestionDataIdentity(allQuestions, 1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('valid backup rejected');
    await management.restore(result.value);
    expect(await db.b1DatasetArchives.count()).toBe(1);
    const bad = structuredClone(backup);
    bad.data.b1.datasetArchives![0].data.practiceSessions[0].identity!.contentHash = 'bad';
    expect(
      (
        await validateBackupDocumentWithB1(
          bad,
          allQuestions,
          createQuestionDataIdentity(allQuestions, 1),
        )
      ).ok,
    ).toBe(false);
  });
  it('sc:b1同期がdataset/source/hashとreset境界を検証する', async () => {
    const db = newDatabase();
    const repo = new B1Repository(db);
    await repo.createPractice(b1Cases[0]);
    const local = await readLocalB1PracticeItems(
      db,
      await db.cloudSyncMetadata.toArray(),
      'device',
      () => new Date().toISOString(),
    );
    const item = local.find((entry) => entry.scope === 'b1.progress')!;
    const remote = { ...item, userId: 'user' };
    expect(normalizeRemoteB1PracticeItem(remote).payload).toHaveProperty(
      'session.identity.datasetVersion',
      'sc-b-pilot-v1',
    );
    for (const key of ['datasetVersion', 'sourceId', 'contentHash'] as const) {
      const bad = structuredClone(remote);
      if (bad.payload.kind !== 'b1.progress') throw new Error('progress fixture required');
      bad.payload.session.identity![key] = 'old';
      expect(() => normalizeRemoteB1PracticeItem(bad)).toThrow('一致しません');
    }
    expect(B1_RESET_ITEM_KEY).toContain('sc-b-pilot-v1');
  });
});
