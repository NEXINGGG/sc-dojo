import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { b1Cases, getB1QuestionUnit } from '../data/b1';
import { getB1LearningSupportCatalog } from '../data/b1LearningSupport';
import { database } from '../database/database';
import type { B1MockSessionRow, B1PracticeSessionRow } from '../database/types';
import { B1AnswerForm } from '../features/b1/B1AnswerForm';
import { toB1AnswerInputUnit } from '../features/b1/b1AnswerInput';
import {
  B1LearnerEvidencePanel,
  B1PostSubmissionPanel,
  B1RequirementBreakdownPanel,
} from '../features/b1/B1LearningPanels';
import { B1LearningSupportRepository } from '../features/b1/b1LearningSupportRepository';
import { B1PdfReference } from '../features/b1/B1PdfReference';
import { applyB1Answer, B1Repository } from '../features/b1/b1Repository';
import { PracticeSessionRepository } from '../features/practice/practiceSessionRepository';
import {
  createPracticeSession,
  defaultPracticeFilters,
  createPracticeSessionId,
} from '../domain/practice';
import type { B1FailureCauseId } from '../domain/b1LearningSupport';
import { recommendB1A2Questions } from '../domain/b1A2Recommendation';
import { useSubject } from '../features/subjects/SubjectContext';
import { usePwa } from '../features/pwa/PwaContext';

const repository = new B1Repository(database);
const learningSupportRepository = new B1LearningSupportRepository(database);
const a2PracticeSessions = new PracticeSessionRepository(database, 'a2');

export function B1PracticeSessionPage() {
  return <B1SessionPage kind="practice" />;
}

export function B1MockSessionPage() {
  return <B1SessionPage kind="mock" />;
}

function B1SessionPage({ kind }: { kind: 'practice' | 'mock' }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { selectSubject } = useSubject();
  const { confirmPersistenceSaved, reportPersistenceFailure } = usePwa();
  const [session, setSession] = useState<B1PracticeSessionRow | B1MockSessionRow>();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<'pdf' | 'answer'>('answer');
  const [isSubmitConfirming, setIsSubmitConfirming] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>();
  const [attempts, setAttempts] = useState<
    Awaited<ReturnType<typeof repository.listAnswerAttempts>>
  >([]);
  const [isRewriting, setIsRewriting] = useState(false);
  const [requestedPdfPage, setRequestedPdfPage] = useState<number>();
  const sessionRef = useRef<B1PracticeSessionRow | B1MockSessionRow | undefined>(undefined);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);
  const timeoutSubmitting = useRef(false);
  const submitInFlight = useRef(false);

  const load = useCallback(async () => {
    if (sessionId === undefined) {
      navigate(kind === 'mock' ? '/exam' : '/practice', { replace: true });
      return;
    }
    try {
      const loaded =
        kind === 'mock'
          ? await repository.getMock(sessionId)
          : await repository.getPractice(sessionId);
      if (loaded === undefined) {
        navigate(kind === 'mock' ? '/exam' : '/practice', { replace: true });
        return;
      }
      sessionRef.current = loaded;
      setSession(loaded);
    } catch {
      setError('保存したB-1答案を読み込めませんでした。端末の保存領域を確認してください。');
    }
  }, [kind, navigate, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitMock = useCallback(
    async (reason: 'manual' | 'timeout') => {
      if (sessionId === undefined || submitInFlight.current) return;
      submitInFlight.current = true;
      setIsSaving(true);
      try {
        await saveQueue.current;
        const submitted = await repository.submitMock(sessionId, reason);
        await createInitialAttempts(submitted);
        sessionRef.current = submitted;
        setSession(submitted);
        confirmPersistenceSaved();
        setIsSubmitConfirming(false);
      } catch {
        timeoutSubmitting.current = false;
        reportPersistenceFailure('B-1模試の提出状態を保存できませんでした。');
        setError('B-1模試を提出できませんでした。再読み込みして、もう一度お試しください。');
      } finally {
        submitInFlight.current = false;
        setIsSaving(false);
      }
    },
    [confirmPersistenceSaved, reportPersistenceFailure, sessionId],
  );

  useEffect(() => {
    if (kind !== 'mock' || session === undefined || session.status !== 'in_progress') return;
    const mockSession = session as B1MockSessionRow;
    const refresh = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(mockSession.deadlineAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0 && !timeoutSubmitting.current) {
        timeoutSubmitting.current = true;
        void submitMock('timeout');
      }
    };
    refresh();
    const timerId = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timerId);
      window.removeEventListener('focus', refresh);
    };
  }, [kind, session, submitMock]);

  const currentUnit = useMemo(
    () =>
      session === undefined ? undefined : getB1QuestionUnit(session.unitIds[session.currentIndex]),
    [session],
  );
  const caseItem = useMemo(
    () =>
      currentUnit === undefined
        ? undefined
        : b1Cases.find((item) =>
            item.questionUnits.some((unit) => unit.questionId === currentUnit.questionId),
          ),
    [currentUnit],
  );

  useEffect(() => {
    if (sessionId === undefined || currentUnit === undefined) return;
    let active = true;
    void repository
      .listAnswerAttempts(sessionId, currentUnit.questionId)
      .then((next) => {
        if (active) setAttempts(next);
      })
      .catch(() => {
        if (active) setError('答案の書き直し履歴を読み込めませんでした。');
      });
    setIsRewriting(false);
    return () => {
      active = false;
    };
  }, [currentUnit, sessionId]);

  function save(next: B1PracticeSessionRow | B1MockSessionRow) {
    const previous = sessionRef.current;
    sessionRef.current = next;
    setSession(next);
    setIsSaving(true);
    setError(undefined);
    const revision = ++saveRevision.current;
    const pending = saveQueue.current.then(async () => {
      if (kind === 'mock') await repository.saveMock(next as B1MockSessionRow);
      else await repository.savePractice(next as B1PracticeSessionRow);
      confirmPersistenceSaved();
    });
    saveQueue.current = pending.catch(() => undefined);
    void pending
      .catch(() => {
        if (sessionRef.current === next) {
          sessionRef.current = previous;
          setSession(previous);
        }
        reportPersistenceFailure('B-1答案を端末へ保存できませんでした。');
        setError('答案を保存できませんでした。端末の保存領域を確認してください。');
      })
      .finally(() => {
        if (revision === saveRevision.current) setIsSaving(false);
      });
  }

  function changeAnswer(fieldId: string, value: string) {
    const active = sessionRef.current;
    if (
      active === undefined ||
      currentUnit === undefined ||
      (active.status !== 'in_progress' && !isRewriting)
    )
      return;
    const next = {
      ...active,
      answers: applyB1Answer(active.answers, currentUnit.questionId, fieldId, value),
      updatedAt: new Date().toISOString(),
    };
    save(next);
  }

  function changeSelfGrade(grade: 'correct' | 'partial' | 'incorrect' | 'review') {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined || active.status === 'in_progress')
      return;
    save({
      ...active,
      selfGrades: { ...active.selfGrades, [currentUnit.questionId]: grade },
      updatedAt: new Date().toISOString(),
    });
    void repository
      .updateLatestAnswerAttempt(active.id, currentUnit.questionId, {
        selfGrade: grade,
        failureCauseIds: [],
      })
      .then((updated) => {
        if (updated !== undefined) {
          setAttempts((current) =>
            current.map((attempt) => (attempt.id === updated.id ? updated : attempt)),
          );
        }
      });
  }

  function setSelfGrade(grade: 'correct' | 'partial' | 'incorrect' | 'review') {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined || active.status === 'in_progress')
      return;
    save({
      ...active,
      selfGrades: { ...active.selfGrades, [currentUnit.questionId]: grade },
      updatedAt: new Date().toISOString(),
    });
    void repository
      .updateLatestAnswerAttempt(active.id, currentUnit.questionId, {
        selfGrade: grade,
        failureCauseIds: [],
      })
      .then((updated) => {
        if (updated !== undefined) {
          setAttempts((current) =>
            current.map((attempt) => (attempt.id === updated.id ? updated : attempt)),
          );
        }
      });
    if (grade === 'correct') {
      void learningSupportRepository
        .saveLearningReflection({
          sessionId: active.id,
          questionId: currentUnit.questionId,
          selfAssessment: 'correct',
          failureCauseIds: [],
        })
        .catch(() => setError('自己採点を保存できませんでした。もう一度お試しください。'));
    }
  }

  function toggleRequirement() {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined || active.status !== 'in_progress')
      return;
    const disclosed = active.requirementDisclosureQuestionIds ?? [];
    const alreadyOpen = disclosed.includes(currentUnit.questionId);
    save({
      ...active,
      requirementDisclosureQuestionIds: alreadyOpen
        ? disclosed.filter((id) => id !== currentUnit.questionId)
        : [...disclosed, currentUnit.questionId],
      updatedAt: new Date().toISOString(),
    });
  }

  async function startRewrite() {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined) return;
    try {
      await repository.createAnswerAttempt({
        sessionId: active.id,
        questionId: currentUnit.questionId,
        answers: active.answers[currentUnit.questionId] ?? {},
        selfGrade: active.selfGrades[currentUnit.questionId],
      });
      const next = {
        ...active,
        answers: { ...active.answers, [currentUnit.questionId]: {} },
        updatedAt: new Date().toISOString(),
      };
      save(next);
      setAttempts(await repository.listAnswerAttempts(active.id, currentUnit.questionId));
      setIsRewriting(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '答案の書き直しを開始できませんでした。');
    }
  }

  async function finishRewrite() {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined) return;
    try {
      const remediations = await learningSupportRepository.listRemediationsByOriginQuestion(
        currentUnit.questionId,
      );
      await repository.createAnswerAttempt({
        sessionId: active.id,
        questionId: currentUnit.questionId,
        answers: active.answers[currentUnit.questionId] ?? {},
        selfGrade: active.selfGrades[currentUnit.questionId],
        remediationCompletedBefore: remediations.some(
          (progress) => progress.status === 'completed',
        ),
      });
      setAttempts(await repository.listAnswerAttempts(active.id, currentUnit.questionId));
      setIsRewriting(false);
    } catch {
      setError('書き直した答案を保存できませんでした。再試行してください。');
    }
  }

  async function startA2Review(failureCauseIds: readonly B1FailureCauseId[]) {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined || caseItem === undefined) return;
    const remediation = getB1LearningSupportCatalog().a2RemediationByQuestionId.get(
      currentUnit.questionId,
    );
    if (remediation === undefined) {
      setError('A2推薦情報を読み込めませんでした。元のB-1設問を見直してください。');
      return;
    }
    const recommendation = recommendB1A2Questions({ remediation, failureCauseIds });
    if (recommendation.status !== 'recommended') {
      setError(recommendation.notApplicableReason ?? 'この設問にA2推薦はありません。');
      return;
    }
    try {
      const progress = await learningSupportRepository.startRemediation({
        originQuestionId: currentUnit.questionId,
        originSessionId: active.id,
        originCaseId: caseItem.caseId,
        failureCauseIds,
        a2QuestionIds: recommendation.a2QuestionIds,
      });
      const now = new Date().toISOString();
      const a2Session = createPracticeSession(
        recommendation.a2QuestionIds,
        { ...defaultPracticeFilters, questionCount: 'all', order: 'registered' },
        { id: createPracticeSessionId(), now, subjectId: 'a2' },
      );
      await a2PracticeSessions.createInProgress(a2Session);
      await selectSubject('a2');
      navigate(`/practice/${a2Session.id}?b1Remediation=${progress.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'A2復習を開始できませんでした。途中のA2演習を確認してから再試行してください。',
      );
    }
  }

  async function createInitialAttempts(active: B1PracticeSessionRow | B1MockSessionRow) {
    await Promise.all(
      active.unitIds.map(async (questionId) => {
        const existing = await repository.listAnswerAttempts(active.id, questionId);
        if (existing.length > 0) return;
        await repository.createAnswerAttempt({
          sessionId: active.id,
          questionId,
          answers: active.answers[questionId] ?? {},
          selfGrade: active.selfGrades[questionId],
        });
      }),
    );
  }

  function move(delta: number) {
    const active = sessionRef.current;
    if (active === undefined) return;
    const nextIndex = Math.max(0, Math.min(active.unitIds.length - 1, active.currentIndex + delta));
    save({ ...active, currentIndex: nextIndex, updatedAt: new Date().toISOString() });
  }

  function toggleReview() {
    const active = sessionRef.current;
    if (active === undefined || currentUnit === undefined || active.status !== 'in_progress')
      return;
    const reviewed = active.reviewQuestionIds.includes(currentUnit.questionId);
    save({
      ...active,
      reviewQuestionIds: reviewed
        ? active.reviewQuestionIds.filter((id) => id !== currentUnit.questionId)
        : [...active.reviewQuestionIds, currentUnit.questionId],
      updatedAt: new Date().toISOString(),
    });
  }

  async function completePractice() {
    if (sessionId === undefined) return;
    setIsSaving(true);
    try {
      await saveQueue.current;
      const completed = await repository.completePractice(sessionId);
      await createInitialAttempts(completed);
      sessionRef.current = completed;
      setSession(completed);
      confirmPersistenceSaved();
      setIsSubmitConfirming(false);
    } catch {
      setError('B-1演習を完了できませんでした。');
    } finally {
      setIsSaving(false);
    }
  }

  async function completeMock() {
    if (sessionId === undefined) return;
    setIsSaving(true);
    try {
      await saveQueue.current;
      const completed = await repository.completeMock(sessionId);
      sessionRef.current = completed;
      setSession(completed);
      confirmPersistenceSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'B-1模試の結果を確定できませんでした。');
    } finally {
      setIsSaving(false);
    }
  }

  if (error !== undefined) {
    return (
      <section className="surface-card recovery-card">
        <h1>確認してください</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => void load()} type="button">
          再読み込み
        </button>
      </section>
    );
  }
  if (session === undefined || currentUnit === undefined || caseItem === undefined) {
    return (
      <section aria-busy="true" aria-live="polite" className="surface-card loading-card">
        <h1>B-1答案を読み込んでいます</h1>
        <p>保存した答案と公式PDFの参照位置を確認しています。</p>
      </section>
    );
  }

  const isInProgress = session.status === 'in_progress';
  const isMock = kind === 'mock';
  const learningMode = isMock ? 'mock90' : (session.mode ?? 'training');
  const revealReference = !isInProgress;
  const unanswered = session.unitIds.filter((unitId) =>
    Object.values(session.answers[unitId] ?? {}).every((value) => value.trim() === ''),
  ).length;
  const reviewed = session.reviewQuestionIds.includes(currentUnit.questionId);
  const answerInputUnit = toB1AnswerInputUnit(currentUnit);

  return (
    <>
      <header className="b1-session-header">
        <div>
          <p className="eyebrow">
            {isMock ? 'B-1模試' : 'B-1演習'}・{caseItem.year}年度 問{caseItem.questionNumber}
          </p>
          <h1>{currentUnit.label}</h1>
          <p>
            {session.currentIndex + 1} / {session.unitIds.length} 解答単位・未回答 {unanswered}件
          </p>
        </div>
        {isMock && isInProgress ? (
          <div className={`exam-timer${(remainingSeconds ?? 0) < 300 ? ' is-warning' : ''}`}>
            <span>残り時間</span>
            <strong>{formatRemaining(remainingSeconds ?? 0)}</strong>
          </div>
        ) : null}
      </header>
      <p className="b1-grading-notice">
        アプリの判定はIPAの正式採点ではありません。模試中は正答・解答概念・判定結果を表示しません。
      </p>
      <div className="b1-mobile-tabs" role="tablist" aria-label="B-1表示を切り替え">
        <button
          aria-selected={tab === 'pdf'}
          onClick={() => setTab('pdf')}
          role="tab"
          type="button"
        >
          公式PDF
        </button>
        <button
          aria-selected={tab === 'answer'}
          onClick={() => setTab('answer')}
          role="tab"
          type="button"
        >
          答案
        </button>
      </div>
      <div className={`b1-workspace b1-tab-${tab}`}>
        <div className="b1-workspace-pdf">
          <B1PdfReference
            caseItem={caseItem}
            requestedPrintedPage={requestedPdfPage}
            unit={currentUnit}
          />
        </div>
        <div className="b1-workspace-answer">
          {learningMode !== 'mock90' ? (
            <B1RequirementBreakdownPanel
              expanded={(session.requirementDisclosureQuestionIds ?? []).includes(
                currentUnit.questionId,
              )}
              mode={learningMode}
              onToggle={toggleRequirement}
              unit={currentUnit}
            />
          ) : null}
          <B1AnswerForm
            disabled={!isInProgress && !isRewriting}
            onChange={changeAnswer}
            onSelfGrade={changeSelfGrade}
            revealReference={revealReference}
            selfGrade={session.selfGrades[currentUnit.questionId]}
            referenceUnit={revealReference ? currentUnit : undefined}
            unit={answerInputUnit}
            values={session.answers[currentUnit.questionId] ?? {}}
          />
          {isInProgress && learningMode !== 'mock90' ? (
            <B1LearnerEvidencePanel
              defaultPrintedPage={
                Array.isArray(currentUnit.sourcePromptLocator.printedPage)
                  ? currentUnit.sourcePromptLocator.printedPage[0]
                  : currentUnit.sourcePromptLocator.printedPage
              }
              sessionId={session.id}
              unit={currentUnit}
            />
          ) : null}
        </div>
      </div>
      {!isInProgress ? (
        <B1PostSubmissionPanel
          attempts={attempts}
          caseItem={caseItem}
          isRewriting={isRewriting}
          onFinishRewrite={() => void finishRewrite()}
          onFailureCauses={(failureCauseIds) => {
            if (sessionId === undefined) return;
            void repository
              .updateLatestAnswerAttempt(sessionId, currentUnit.questionId, {
                selfGrade: session.selfGrades[currentUnit.questionId],
                failureCauseIds,
              })
              .then((updated) => {
                if (updated !== undefined) {
                  setAttempts((current) =>
                    current.map((attempt) => (attempt.id === updated.id ? updated : attempt)),
                  );
                }
              });
          }}
          onOpenPdfPage={(page) => {
            setRequestedPdfPage(page);
            setTab('pdf');
          }}
          onSelfGrade={setSelfGrade}
          onStartA2={(failureCauseIds) => void startA2Review(failureCauseIds)}
          onStartRewrite={() => void startRewrite()}
          selfGrade={session.selfGrades[currentUnit.questionId]}
          sessionId={session.id}
          unit={currentUnit}
        />
      ) : null}
      <div className="b1-session-tools">
        <button
          className={`secondary-button review-button${reviewed ? ' is-active' : ''}`}
          disabled={!isInProgress || isSaving}
          onClick={toggleReview}
          type="button"
        >
          {reviewed ? '見直しを外す' : '見直しにする'}
        </button>
        <button
          className="secondary-button"
          disabled={isSaving || session.currentIndex === 0}
          onClick={() => move(-1)}
          type="button"
        >
          前へ
        </button>
        <button
          className="secondary-button"
          disabled={isSaving || session.currentIndex === session.unitIds.length - 1}
          onClick={() => move(1)}
          type="button"
        >
          次へ
        </button>
        {isInProgress ? (
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => setIsSubmitConfirming(true)}
            type="button"
          >
            {isMock ? '模試を提出する' : '演習を完了して確認する'}
          </button>
        ) : null}
      </div>
      <nav aria-label="解答単位一覧" className="exam-number-grid b1-number-grid">
        {session.unitIds.map((unitId, index) => (
          <button
            aria-label={`${index + 1}番 ${session.reviewQuestionIds.includes(unitId) ? '見直し' : ''}`}
            className={`exam-number-button${index === session.currentIndex ? ' is-current' : ''}${Object.values(session.answers[unitId] ?? {}).some((value) => value.trim() !== '') ? ' is-answered' : ''}${session.reviewQuestionIds.includes(unitId) ? ' is-review' : ''}`}
            key={unitId}
            onClick={() =>
              save({ ...session, currentIndex: index, updatedAt: new Date().toISOString() })
            }
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </nav>
      {isMock && session.status === 'submitted' ? (
        <section className="surface-card b1-finalize-card">
          <h2>自己採点を完了してください</h2>
          <p>各記述答案で「正解相当」「部分点相当」「復習が必要」を選択後に結果を確定します。</p>
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => void completeMock()}
            type="button"
          >
            結果を確定する
          </button>
        </section>
      ) : null}
      {isMock && session.status === 'completed' ? (
        <section className="surface-card b1-finalize-card">
          <h2>結果を確定しました</h2>
          <p>参考判定と自己採点はB-1専用の成績へ保存しました。</p>
          <Link className="primary-button" to="/progress">
            B-1成績を見る
          </Link>
        </section>
      ) : null}
      {kind === 'practice' && session.status === 'completed' ? (
        <section className="surface-card b1-finalize-card">
          <h2>演習を完了しました</h2>
          <p>設問ごとの参考判定と自己採点を確認できます。</p>
          <Link className="primary-button" to="/practice">
            別の大問を練習する
          </Link>
        </section>
      ) : null}
      {isSubmitConfirming ? (
        <ConfirmDialog
          description={
            isMock
              ? `未回答は${unanswered}件です。提出後に参考判定と自己採点を表示します。`
              : `未回答は${unanswered}件です。完了後に参考判定と自己採点を表示します。`
          }
          title={isMock ? 'B-1模試を提出しますか？' : 'B-1演習を完了しますか？'}
        >
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => void (isMock ? submitMock('manual') : completePractice())}
            type="button"
          >
            {isMock ? '提出する' : '完了する'}
          </button>
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={() => setIsSubmitConfirming(false)}
            type="button"
          >
            戻る
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function formatRemaining(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
