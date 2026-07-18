import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getCategoryById, getDomainForQuestion, getQuestionByCode } from '../data/catalog';
import { database } from '../database/database';
import type { ExamSessionRow } from '../database/types';
import {
  ExamDataError,
  formatExamRemainingTime,
  getExamName,
  getExamSubmissionSummary,
  getExamTimerState,
  moveExamSession,
  selectExamAnswer,
  toggleExamReview,
  type ExamTimerState,
} from '../domain/exam';
import { ExamRepository } from '../features/exam/examRepository';
import type { ChoiceId } from '../types/question';

const exams = new ExamRepository(database);

export function ExamPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<ExamSessionRow>();
  const [timer, setTimer] = useState<ExamTimerState>();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitConfirming, setIsSubmitConfirming] = useState(false);
  const isAutoSubmitting = useRef(false);
  const isSubmitting = useRef(false);
  const sessionIdForTimer = session?.id;
  const deadlineAtForTimer = session?.deadlineAt;

  const submitExam = useCallback(
    async (reason: 'manual' | 'timeout', targetSessionId: string) => {
      if (isSubmitting.current) {
        return;
      }
      isSubmitting.current = true;
      setIsSaving(true);
      setError(undefined);
      try {
        await exams.submit(targetSessionId, new Date().toISOString(), reason);
        navigate(`/exam/${targetSessionId}/result`, {
          replace: reason === 'timeout',
          state: { timeoutSubmitted: reason === 'timeout' },
        });
      } catch {
        isAutoSubmitting.current = false;
        setError(
          '模試を提出できませんでした。回答は提出されていないため、画面を再読み込みしてからもう一度お試しください。',
        );
      } finally {
        isSubmitting.current = false;
        setIsSaving(false);
        setIsSubmitConfirming(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadSession() {
      if (sessionId === undefined) {
        navigate('/exam', { replace: true });
        return;
      }
      try {
        const loaded = await exams.get(sessionId);
        if (!isCurrent) {
          return;
        }
        if (loaded === undefined) {
          navigate('/exam', {
            replace: true,
            state: { notice: '指定された模試が見つかりませんでした。' },
          });
          return;
        }
        if (loaded.status === 'submitted') {
          navigate(`/exam/${loaded.id}/result`, { replace: true });
          return;
        }
        setSession(loaded);
      } catch {
        if (isCurrent) {
          setError(
            '模試を読み込めませんでした。端末の保存領域を確認して、画面を再読み込みしてください。',
          );
        }
      }
    }

    void loadSession();
    return () => {
      isCurrent = false;
    };
  }, [navigate, sessionId]);

  useEffect(() => {
    if (sessionIdForTimer === undefined || deadlineAtForTimer === undefined) {
      return;
    }
    const activeSessionId = sessionIdForTimer;
    const activeDeadlineAt = deadlineAtForTimer;

    function refreshTimer() {
      const nextTimer = getExamTimerState(activeDeadlineAt);
      setTimer(nextTimer);
      if (nextTimer.status === 'invalid') {
        setError(
          '保存された模試の制限時間を確認できません。模試を破棄して、新しく開始してください。',
        );
        return;
      }
      if (nextTimer.status === 'expired' && !isAutoSubmitting.current) {
        isAutoSubmitting.current = true;
        void submitExam('timeout', activeSessionId);
      }
    }

    refreshTimer();
    const intervalId = window.setInterval(refreshTimer, 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTimer();
      }
    };
    window.addEventListener('focus', refreshTimer);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [deadlineAtForTimer, sessionIdForTimer, submitExam]);

  async function saveSession(nextSession: ExamSessionRow) {
    setIsSaving(true);
    setError(undefined);
    try {
      await exams.saveInProgress(nextSession);
      setSession(nextSession);
    } catch {
      setError(
        '回答を保存できませんでした。端末の保存領域を確認して、再読み込みしてからもう一度お試しください。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (error !== undefined) {
    return (
      <section className="surface-card recovery-card">
        <p className="status-label">模試を続けられません</p>
        <h1>確認してください</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => window.location.reload()} type="button">
          再読み込み
        </button>
      </section>
    );
  }

  if (session === undefined || timer === undefined) {
    return (
      <section aria-busy="true" aria-live="polite" className="surface-card loading-card">
        <h1>模擬試験を読み込んでいます</h1>
        <p>保存した回答と制限時間を確認しています。</p>
      </section>
    );
  }

  const question = getQuestionByCode(session.questionCodes[session.currentIndex]);
  if (question === undefined) {
    return (
      <section className="surface-card recovery-card">
        <h1>模試の問題を読み込めません</h1>
        <p>問題データが更新された可能性があります。模試選択画面から新しく開始してください。</p>
      </section>
    );
  }
  const activeSession = session;
  const currentQuestion = question;

  const selectedChoice = activeSession.answers[currentQuestion.code];
  const review = activeSession.reviewCodes.includes(currentQuestion.code);
  const summary = getExamSubmissionSummary(activeSession);
  const domain = getDomainForQuestion(currentQuestion);
  const category = getCategoryById(currentQuestion.categoryId);
  const isLastQuestion = activeSession.currentIndex === activeSession.questionCodes.length - 1;
  const progress = Math.round(
    ((activeSession.currentIndex + 1) / activeSession.questionCodes.length) * 100,
  );

  function updateAnswer(choiceId: ChoiceId | undefined) {
    try {
      void saveSession(
        selectExamAnswer(activeSession, currentQuestion, choiceId, new Date().toISOString()),
      );
    } catch (caught) {
      setError(
        caught instanceof ExamDataError
          ? caught.message
          : '回答を変更できませんでした。再読み込みしてください。',
      );
    }
  }

  function updateReview() {
    try {
      void saveSession(
        toggleExamReview(activeSession, currentQuestion.code, new Date().toISOString()),
      );
    } catch (caught) {
      setError(
        caught instanceof ExamDataError
          ? caught.message
          : '見直しを変更できませんでした。再読み込みしてください。',
      );
    }
  }

  function moveTo(index: number) {
    try {
      void saveSession(moveExamSession(activeSession, index, new Date().toISOString()));
    } catch (caught) {
      setError(
        caught instanceof ExamDataError
          ? caught.message
          : '問題を移動できませんでした。再読み込みしてください。',
      );
    }
  }

  return (
    <>
      <header className="exam-question-header">
        <div>
          <p className="eyebrow">{getExamName(session.examType)}</p>
          <h1>
            {session.currentIndex + 1} / {session.questionCodes.length} 問
          </h1>
        </div>
        <div
          className={`exam-timer is-${timer.status}`}
          aria-label={`残り時間 ${formatExamRemainingTime(timer.remainingSeconds)}`}
        >
          <span>残り時間</span>
          <strong>{formatExamRemainingTime(timer.remainingSeconds)}</strong>
          {timer.status === 'warning' ? <em>残り10分以下</em> : null}
          {timer.status === 'critical' ? <em>残り5分以下・急いで確認</em> : null}
        </div>
      </header>

      {timer.status === 'warning' || timer.status === 'critical' ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>{timer.status === 'critical' ? '残り5分以下です' : '残り10分以下です'}</strong>
          <p>問題一覧で未回答や見直しを確認できます。</p>
        </section>
      ) : null}

      <div
        aria-label={`進捗 ${session.currentIndex + 1} / ${session.questionCodes.length}`}
        aria-valuemax={session.questionCodes.length}
        aria-valuemin={1}
        aria-valuenow={session.currentIndex + 1}
        className="progress-track"
        role="progressbar"
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <article className="surface-card practice-question-card">
        <div aria-label="問題の分類" className="chip-list">
          {domain !== undefined ? (
            <span className={`chip domain-chip-${domain.id}`}>{domain.name}</span>
          ) : null}
          {category !== undefined ? <span className="chip">{category.name}</span> : null}
          <span className="chip chip-muted">難易度: {question.difficulty}</span>
        </div>
        <h2 className="question-text">{question.question}</h2>
        <fieldset className="answer-choice-list" disabled={isSaving}>
          <legend>答えを1つ選んでください。正誤は提出後に表示します。</legend>
          {question.choices.map((choice) => (
            <label className="answer-choice" key={choice.id}>
              <input
                checked={selectedChoice === choice.id}
                name="exam-answer"
                onChange={() => updateAnswer(choice.id)}
                type="radio"
                value={choice.id}
              />
              <span className="choice-id">{choice.id}</span>
              <span>{choice.text}</span>
            </label>
          ))}
        </fieldset>
        <div className="exam-question-tools">
          <button
            aria-pressed={review}
            className={`secondary-button review-button${review ? ' is-active' : ''}`}
            disabled={isSaving}
            onClick={updateReview}
            type="button"
          >
            {review ? '見直しを解除' : '見直しにする'}
          </button>
          <button
            className="text-button"
            disabled={selectedChoice === undefined || isSaving}
            onClick={() => updateAnswer(undefined)}
            type="button"
          >
            回答を解除
          </button>
        </div>
      </article>

      <section aria-label="問題一覧" className="surface-card exam-question-navigator">
        <div className="exam-question-summary">
          <span>回答済み {summary.answered}問</span>
          <span>未回答 {summary.unanswered}問</span>
          <span>見直し {summary.review}問</span>
        </div>
        <div className="exam-number-grid">
          {session.questionCodes.map((code, index) => {
            const answered = session.answers[code] !== undefined;
            const flagged = session.reviewCodes.includes(code);
            const current = index === session.currentIndex;
            const state = [
              answered ? '回答済み' : '未回答',
              flagged ? '見直し' : '',
              current ? '表示中' : '',
            ]
              .filter(Boolean)
              .join('・');
            return (
              <button
                aria-current={current ? 'step' : undefined}
                aria-label={`問題 ${index + 1}: ${state}`}
                className={`exam-number-button${answered ? ' is-answered' : ''}${flagged ? ' is-review' : ''}${current ? ' is-current' : ''}`}
                disabled={isSaving}
                key={code}
                onClick={() => moveTo(index)}
                type="button"
              >
                {index + 1}
                <span aria-hidden="true">
                  {flagged ? ' 要見直し' : answered ? ' 回答済み' : ' 未回答'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="practice-action-bar">
        <button
          className="secondary-button"
          disabled={session.currentIndex === 0 || isSaving}
          onClick={() => moveTo(session.currentIndex - 1)}
          type="button"
        >
          前の問題
        </button>
        <button
          className="secondary-button"
          disabled={isSaving}
          onClick={() => moveTo(session.currentIndex + 1)}
          type="button"
        >
          {isLastQuestion ? '次の問題へ' : '次の問題'}
        </button>
        <button
          className="primary-button"
          disabled={isSaving}
          onClick={() => setIsSubmitConfirming(true)}
          type="button"
        >
          提出する
        </button>
      </div>

      {isSubmitConfirming ? (
        <ConfirmDialog
          description="提出後は回答を変更できません。未回答・見直しの問題は、問題一覧から確認できます。"
          title="模試を提出しますか？"
        >
          <div className="exam-submit-summary">
            <span>回答済み {summary.answered}問</span>
            <span>未回答 {summary.unanswered}問</span>
            <span>見直し {summary.review}問</span>
            <span>残り時間 {formatExamRemainingTime(timer.remainingSeconds)}</span>
          </div>
          {summary.unanswered > 0 || summary.review > 0 ? (
            <p className="exam-submit-warning">未回答または見直しの問題があります。</p>
          ) : null}
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => void submitExam('manual', activeSession.id)}
            type="button"
          >
            提出する
          </button>
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={() => setIsSubmitConfirming(false)}
            type="button"
          >
            模試へ戻る
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
