import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getCategoryById, getDomainForQuestion, getQuestionByCode } from '../data/catalog';
import { database } from '../database/database';
import type { AnswerAttemptRow, QuestionProgressRow } from '../database/types';
import { LearningRepository } from '../features/learning/learningRepository';

const learning = new LearningRepository(database);

export function QuestionHistoryPage() {
  const { questionCode } = useParams();
  const navigate = useNavigate();
  const question = questionCode === undefined ? undefined : getQuestionByCode(questionCode);
  const resolvedQuestionCode = question?.code;
  const [progress, setProgress] = useState<QuestionProgressRow>();
  const [attempts, setAttempts] = useState<readonly AnswerAttemptRow[]>();
  const [error, setError] = useState<string>();
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadHistory() {
      if (resolvedQuestionCode === undefined) {
        return;
      }
      try {
        const [loadedProgress, loadedAttempts] = await Promise.all([
          learning.getProgress(resolvedQuestionCode),
          learning.getAttempts(resolvedQuestionCode),
        ]);
        if (isCurrent) {
          setProgress(loadedProgress);
          setAttempts(loadedAttempts);
        }
      } catch {
        if (isCurrent) {
          setError(
            '学習履歴を読み込めませんでした。端末の保存領域を確認して、再読み込みしてください。',
          );
        }
      }
    }

    void loadHistory();
    return () => {
      isCurrent = false;
    };
  }, [resolvedQuestionCode]);

  async function toggleFavorite() {
    if (question === undefined || isFavoriteSaving) {
      return;
    }
    setIsFavoriteSaving(true);
    try {
      const updated = await learning.setFavorite(
        question.code,
        !(progress?.favorite ?? false),
        new Date().toISOString(),
      );
      setProgress(updated);
    } catch {
      setError(
        'お気に入りを保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
    } finally {
      setIsFavoriteSaving(false);
    }
  }

  if (question === undefined) {
    return (
      <section className="surface-card recovery-card">
        <h1>問題が見つかりません</h1>
        <p>指定された問題は、現在の問題データにありません。</p>
        <Link className="primary-button" to="/practice">
          演習条件へ戻る
        </Link>
      </section>
    );
  }

  if (error !== undefined) {
    return (
      <section className="surface-card recovery-card">
        <h1>学習履歴を表示できません</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => window.location.reload()} type="button">
          再読み込み
        </button>
      </section>
    );
  }

  const isLoading = attempts === undefined;
  const isAnswered = (progress?.attemptCount ?? 0) > 0;
  const domain = getDomainForQuestion(question);
  const category = getCategoryById(question.categoryId);

  return (
    <>
      <PageHeader
        description="この問題での回答回数と、これまでの回答を確認できます。"
        title="問題の学習履歴"
      />
      <section className="surface-card question-history-card">
        <div className="history-header-row">
          <div>
            <p className="eyebrow">{question.code}</p>
            <h2>問題の状態</h2>
          </div>
          <button
            aria-pressed={progress?.favorite ?? false}
            className="secondary-button favorite-button"
            disabled={isFavoriteSaving}
            onClick={() => void toggleFavorite()}
            type="button"
          >
            {progress?.favorite ? '★ お気に入り登録済み' : '☆ お気に入りに追加'}
          </button>
        </div>
        <div className="chip-list" aria-label="問題の分類">
          {domain !== undefined ? (
            <span className={`chip domain-chip-${domain.id}`}>{domain.name}</span>
          ) : null}
          {category !== undefined ? <span className="chip">{category.name}</span> : null}
          <span className="chip chip-muted">難易度: {question.difficulty}</span>
        </div>
        <p className="history-status">
          {isAnswered
            ? progress?.lastIsCorrect
              ? '最新回答: 正解'
              : '最新回答: 不正解'
            : '未回答'}
        </p>
        <dl className="history-metrics">
          <div>
            <dt>回答回数</dt>
            <dd>{progress?.attemptCount ?? 0}回</dd>
          </div>
          <div>
            <dt>正解回数</dt>
            <dd>{progress?.correctCount ?? 0}回</dd>
          </div>
          <div>
            <dt>不正解回数</dt>
            <dd>{progress?.incorrectCount ?? 0}回</dd>
          </div>
          <div>
            <dt>最終回答</dt>
            <dd>
              {progress?.lastAnsweredAt === undefined
                ? 'まだありません'
                : formatDateTime(progress.lastAnsweredAt)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="surface-card question-history-card">
        <h2>問題</h2>
        <p className="question-text">{question.question}</p>
        {isAnswered ? (
          <details>
            <summary>正解と解説を表示する</summary>
            <p>正解: {question.correctChoice}</p>
            <h3>解説</h3>
            <p>{question.explanation}</p>
            <h3>覚える一行</h3>
            <p>{question.memoryPoint}</p>
          </details>
        ) : (
          <p className="muted-text">未回答のため、正解と解説は表示していません。</p>
        )}
      </section>

      <section aria-label="回答履歴一覧" className="surface-card question-history-card">
        <h2>回答履歴</h2>
        {isLoading ? <p aria-live="polite">回答履歴を読み込んでいます。</p> : null}
        {!isLoading && attempts.length === 0 ? <p>まだ回答履歴はありません。</p> : null}
        {!isLoading && attempts.length > 0 ? (
          <ol className="attempt-history-list">
            {attempts.map((attempt) => (
              <li key={attempt.id ?? `${attempt.sessionId}-${attempt.code}`}>
                <strong>{attempt.isCorrect ? '正解' : '不正解'}</strong>
                <span>選択: {attempt.selectedChoice}</span>
                <span>{formatDateTime(attempt.answeredAt)}</span>
                <span>{formatSource(attempt.mode)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <div className="result-actions">
        <button className="secondary-button" onClick={() => navigate(-1)} type="button">
          前の画面へ戻る
        </button>
        <Link className="text-link" to="/practice">
          演習条件へ
        </Link>
      </div>
    </>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSource(source: AnswerAttemptRow['mode']): string {
  switch (source) {
    case 'review_unanswered':
      return '未回答の復習';
    case 'review_incorrect':
      return '誤答の復習';
    case 'review_favorite':
      return 'お気に入りの演習';
    case 'exam':
      return '模擬試験';
    default:
      return '通常演習';
  }
}
