import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  getCategoryById,
  getDomainForQuestion,
  getQuestionByCode,
  questions,
} from '../data/catalog';
import { database } from '../database/database';
import type { PracticeSessionRow } from '../database/types';
import {
  confirmPracticeAnswer,
  completePracticeSession,
  movePracticeSession,
  selectPracticeAnswer,
  validatePracticeSession,
} from '../domain/practice';
import { PracticeSessionRepository } from '../features/practice/practiceSessionRepository';
import { LearningRepository } from '../features/learning/learningRepository';
import type { ChoiceId } from '../types/question';

const practiceSessions = new PracticeSessionRepository(database);
const learning = new LearningRepository(database);
const catalogCodes = new Set(questions.map((question) => question.code));

export function PracticeQuestionPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<PracticeSessionRow>();
  const [loadError, setLoadError] = useState<string>();
  const [selectedChoice, setSelectedChoice] = useState<ChoiceId>();
  const [isSaving, setIsSaving] = useState(false);
  const [showInterruptDialog, setShowInterruptDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>();
  const feedbackRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadSession() {
      if (sessionId === undefined) {
        navigate('/practice', {
          replace: true,
          state: { notice: '指定された演習が見つかりませんでした。条件を選んで始めてください。' },
        });
        return;
      }

      try {
        const loaded = await practiceSessions.get(sessionId);
        if (!isCurrent) {
          return;
        }
        if (loaded === undefined) {
          navigate('/practice', {
            replace: true,
            state: { notice: '指定された演習が見つかりませんでした。条件を選んで始めてください。' },
          });
          return;
        }
        if (loaded.status === 'completed') {
          navigate(`/practice/${loaded.id}/result`, { replace: true });
          return;
        }
        setSession(loaded);
      } catch {
        if (isCurrent) {
          setLoadError(
            '演習データを読み込めませんでした。端末の保存領域を確認して、再読み込みしてください。',
          );
        }
      }
    }

    void loadSession();
    return () => {
      isCurrent = false;
    };
  }, [navigate, sessionId]);

  const validation =
    session === undefined ? undefined : validatePracticeSession(session, catalogCodes);
  const currentQuestion =
    session === undefined
      ? undefined
      : getQuestionByCode(session.questionCodes[session.currentIndex]);
  const currentResponse =
    session === undefined || currentQuestion === undefined
      ? undefined
      : session.answers[currentQuestion.code];
  const currentAnswer = currentResponse?.confirmed ? currentResponse : undefined;
  const currentQuestionCode = currentQuestion?.code;

  useEffect(() => {
    setSelectedChoice(currentResponse?.selectedChoice);
  }, [currentResponse?.selectedChoice, session?.currentIndex]);

  useEffect(() => {
    if (currentAnswer !== undefined) {
      feedbackRef.current?.focus();
    }
  }, [currentAnswer]);

  useEffect(() => {
    let isCurrent = true;

    async function loadFavorite() {
      if (currentQuestionCode === undefined) {
        return;
      }
      try {
        const progress = await learning.getProgress(currentQuestionCode);
        if (isCurrent) {
          setIsFavorite(progress?.favorite ?? false);
        }
      } catch {
        if (isCurrent) {
          setActionMessage(
            'お気に入りの状態を読み込めませんでした。再読み込みして、もう一度お試しください。',
          );
        }
      }
    }

    void loadFavorite();
    return () => {
      isCurrent = false;
    };
  }, [currentQuestionCode]);

  async function saveSession(nextSession: PracticeSessionRow): Promise<boolean> {
    setIsSaving(true);
    setLoadError(undefined);
    try {
      await practiceSessions.save(nextSession);
      setSession(nextSession);
      return true;
    } catch {
      setLoadError(
        '回答を保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmAnswer() {
    if (session === undefined || currentQuestion === undefined || selectedChoice === undefined) {
      return;
    }

    const result = confirmPracticeAnswer(
      session,
      currentQuestion,
      selectedChoice,
      new Date().toISOString(),
    );
    if (!result.ok) {
      setLoadError(
        'この回答は確定できませんでした。画面を再読み込みして、もう一度お試しください。',
      );
      return;
    }
    setIsSaving(true);
    setLoadError(undefined);
    try {
      const saved = await learning.recordConfirmedPracticeAnswer(result.session, currentQuestion);
      setSession(saved.session);
    } catch {
      setLoadError(
        '回答履歴を保存できませんでした。回答と履歴は更新されていないため、端末の保存領域を確認して、もう一度お試しください。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleFavorite() {
    if (currentQuestion === undefined || isFavoriteSaving) {
      return;
    }

    setIsFavoriteSaving(true);
    setActionMessage(undefined);
    try {
      const progress = await learning.setFavorite(
        currentQuestion.code,
        !isFavorite,
        new Date().toISOString(),
      );
      setIsFavorite(progress.favorite);
    } catch {
      setActionMessage(
        'お気に入りを保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
    } finally {
      setIsFavoriteSaving(false);
    }
  }

  async function selectAnswer(choiceId: ChoiceId) {
    if (session === undefined || currentQuestion === undefined || currentAnswer !== undefined) {
      return;
    }

    setSelectedChoice(choiceId);
    const result = selectPracticeAnswer(
      session,
      currentQuestion,
      choiceId,
      new Date().toISOString(),
    );
    if (!result.ok) {
      setLoadError(
        '選択した回答を保存できませんでした。画面を再読み込みして、もう一度お試しください。',
      );
      return;
    }
    await saveSession(result.session);
  }

  async function moveTo(index: number) {
    if (session === undefined || isSaving) {
      return;
    }
    await saveSession(movePracticeSession(session, index, new Date().toISOString()));
  }

  async function showResult() {
    if (session === undefined || isSaving) {
      return;
    }
    const completed = completePracticeSession(session, new Date().toISOString());
    setIsSaving(true);
    try {
      await learning.completePracticeSession(completed);
      setSession(completed);
      navigate(`/practice/${completed.id}/result`);
    } catch {
      setLoadError(
        '演習結果を保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function discardSession() {
    if (session === undefined) {
      return;
    }
    setIsSaving(true);
    try {
      await practiceSessions.remove(session.id);
      navigate('/practice', { replace: true, state: { notice: '途中の通常演習を破棄しました。' } });
    } catch {
      setLoadError('途中の演習を破棄できませんでした。時間をおいて、もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  }

  if (loadError !== undefined) {
    return <PracticeRecovery error={loadError} onRetry={() => window.location.reload()} />;
  }

  if (session === undefined || validation === undefined) {
    return (
      <section aria-busy="true" aria-live="polite" className="surface-card loading-card">
        <h1>通常演習を読み込んでいます</h1>
        <p>保存した出題順を確認しています。</p>
      </section>
    );
  }

  if (!validation.valid) {
    return (
      <PracticeRecovery
        error="保存された演習の内容に問題があります。問題データが更新された可能性があります。"
        onDiscard={() => void discardSession()}
      />
    );
  }

  if (currentQuestion === undefined) {
    return (
      <PracticeRecovery
        error="保存された演習の問題を読み込めません。問題データが更新された可能性があります。"
        onDiscard={() => void discardSession()}
      />
    );
  }

  const domain = getDomainForQuestion(currentQuestion);
  const category = getCategoryById(currentQuestion.categoryId);
  const progress = Math.round(((session.currentIndex + 1) / session.questionCodes.length) * 100);
  const isLastQuestion = session.currentIndex === session.questionCodes.length - 1;

  return (
    <>
      <header className="practice-question-header">
        <div>
          <p className="eyebrow">通常演習</p>
          <h1>
            {session.currentIndex + 1} / {session.questionCodes.length} 問
          </h1>
        </div>
        <div className="practice-header-actions">
          <button
            aria-pressed={isFavorite}
            className="secondary-button favorite-button"
            disabled={isFavoriteSaving}
            onClick={() => void toggleFavorite()}
            type="button"
          >
            {isFavorite ? '★ お気に入り登録済み' : '☆ お気に入りに追加'}
          </button>
          <button
            className="secondary-button"
            onClick={() => setShowInterruptDialog(true)}
            type="button"
          >
            中断する
          </button>
        </div>
      </header>

      {actionMessage !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>確認してください</strong>
          <p>{actionMessage}</p>
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
        <div className="chip-list" aria-label="問題の分類">
          {domain !== undefined ? (
            <span className={`chip domain-chip-${domain.id}`}>{domain.name}</span>
          ) : null}
          {category !== undefined ? <span className="chip">{category.name}</span> : null}
          <span className="chip chip-muted">{currentQuestion.subcategory}</span>
          <span className="chip chip-muted">難易度: {currentQuestion.difficulty}</span>
        </div>
        <h2 className="question-text">{currentQuestion.question}</h2>

        <fieldset className="answer-choice-list" disabled={currentAnswer !== undefined || isSaving}>
          <legend>答えを1つ選んでください</legend>
          {currentQuestion.choices.map((choice) => {
            const isSelected = selectedChoice === choice.id;
            const isCorrect =
              currentAnswer !== undefined && choice.id === currentQuestion.correctChoice;
            const isIncorrectSelection =
              currentAnswer !== undefined &&
              isSelected &&
              choice.id !== currentQuestion.correctChoice;
            const className = [
              'answer-choice',
              isCorrect ? 'is-correct' : '',
              isIncorrectSelection ? 'is-incorrect' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <label className={className} key={choice.id}>
                <input
                  checked={isSelected}
                  name="practice-answer"
                  onChange={() => void selectAnswer(choice.id)}
                  type="radio"
                  value={choice.id}
                />
                <span className="choice-id">{choice.id}</span>
                <span>{choice.text}</span>
                {isCorrect ? <strong>正解</strong> : null}
                {isIncorrectSelection ? <strong>あなたの回答</strong> : null}
              </label>
            );
          })}
        </fieldset>

        {currentAnswer !== undefined ? (
          <section
            className={`answer-feedback ${currentAnswer.isCorrect ? 'is-correct' : 'is-incorrect'}`}
            ref={feedbackRef}
            tabIndex={-1}
          >
            <p className="answer-feedback-status" role="status">
              {currentAnswer.isCorrect ? '正解です' : '不正解です'}
            </p>
            <p>
              あなたの回答: {currentAnswer.selectedChoice} / 正解: {currentQuestion.correctChoice}
            </p>
            <h3>解説</h3>
            <p>{currentQuestion.explanation}</p>
            <h3>覚える一行</h3>
            <p>{currentQuestion.memoryPoint}</p>
          </section>
        ) : null}
        <Link className="text-link history-link" to={`/history/${currentQuestion.code}`}>
          この問題の学習履歴を見る
        </Link>
      </article>

      <div className="practice-action-bar">
        <button
          className="secondary-button"
          disabled={session.currentIndex === 0 || isSaving}
          onClick={() => void moveTo(session.currentIndex - 1)}
          type="button"
        >
          前の問題
        </button>
        {currentAnswer === undefined ? (
          <button
            className="primary-button"
            disabled={selectedChoice === undefined || isSaving}
            onClick={() => void confirmAnswer()}
            type="button"
          >
            回答する
          </button>
        ) : isLastQuestion ? (
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => void showResult()}
            type="button"
          >
            結果を見る
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => void moveTo(session.currentIndex + 1)}
            type="button"
          >
            次の問題
          </button>
        )}
      </div>

      {showInterruptDialog ? (
        <ConfirmDialog
          description="回答と現在位置は保存済みです。ホームへ戻っても、あとで続きから再開できます。"
          title="通常演習を中断しますか？"
        >
          <button className="primary-button" onClick={() => navigate('/')} type="button">
            保存してホームへ戻る
          </button>
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={() => void discardSession()}
            type="button"
          >
            破棄する
          </button>
          <button
            className="text-button"
            onClick={() => setShowInterruptDialog(false)}
            type="button"
          >
            演習を続ける
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

interface PracticeRecoveryProps {
  error: string;
  onRetry?: () => void;
  onDiscard?: () => void;
}

function PracticeRecovery({ error, onRetry, onDiscard }: PracticeRecoveryProps) {
  const navigate = useNavigate();

  return (
    <section className="surface-card recovery-card">
      <p className="status-label">通常演習を開けませんでした</p>
      <h1>演習を再開できません</h1>
      <p>{error}</p>
      <div className="recovery-actions">
        {onRetry !== undefined ? (
          <button className="primary-button" onClick={onRetry} type="button">
            再読み込み
          </button>
        ) : null}
        <button className="secondary-button" onClick={() => navigate('/practice')} type="button">
          条件設定へ戻る
        </button>
        {onDiscard !== undefined ? (
          <button className="text-button danger-text-button" onClick={onDiscard} type="button">
            この演習を破棄する
          </button>
        ) : null}
      </div>
    </section>
  );
}
