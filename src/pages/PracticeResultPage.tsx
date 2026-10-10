import { QuestionChoiceFigures, QuestionStimuli } from '../components/QuestionStimuli';
import { QuestionExplanation } from '../components/QuestionExplanation';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  getCategoryById,
  getDomainById,
  getQuestionByCode,
  getSubjectCatalog,
} from '../data/catalog';
import { database } from '../database/database';
import type { PracticeSessionRow } from '../database/types';
import type { QuestionProgressRow } from '../database/types';
import {
  completePracticeSession,
  createPracticeSession,
  createPracticeSessionId,
  getPracticeSessionResult,
  selectPracticeQuestions,
} from '../domain/practice';
import {
  ActivePracticeSessionExistsError,
  PracticeSessionRepository,
} from '../features/practice/practiceSessionRepository';
import { LearningRepository } from '../features/learning/learningRepository';
import { useSubject } from '../features/subjects/SubjectContext';

export function PracticeResultPage() {
  const { subjectId } = useSubject();
  const questions = useMemo(() => getSubjectCatalog(subjectId).questions, [subjectId]);
  const practiceSessions = useMemo(
    () => new PracticeSessionRepository(database, subjectId),
    [subjectId],
  );
  const learning = useMemo(() => new LearningRepository(database, subjectId), [subjectId]);
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<PracticeSessionRow>();
  const [error, setError] = useState<string>();
  const [isStartingAgain, setIsStartingAgain] = useState(false);
  const [progressByCode, setProgressByCode] = useState<ReadonlyMap<string, QuestionProgressRow>>(
    new Map(),
  );
  const [favoriteSavingCode, setFavoriteSavingCode] = useState<string>();

  useEffect(() => {
    let isCurrent = true;

    async function loadResult() {
      if (sessionId === undefined) {
        navigate('/practice', { replace: true });
        return;
      }

      try {
        const progress = await learning.getProgressMap();
        const loaded = await practiceSessions.get(sessionId);
        if (!isCurrent) {
          return;
        }
        if (loaded === undefined) {
          navigate('/practice', {
            replace: true,
            state: { notice: '指定された演習結果が見つかりませんでした。' },
          });
          return;
        }
        setProgressByCode(progress);
        if (loaded.status === 'in_progress') {
          const completed = completePracticeSession(loaded, new Date().toISOString());
          await learning.completePracticeSession(completed);
          if (isCurrent) {
            setSession(completed);
          }
          return;
        }
        await learning.completePracticeSession(loaded);
        setSession(loaded);
      } catch {
        if (isCurrent) {
          setError(
            '演習結果を読み込めませんでした。再読み込みしても解決しない場合は、条件設定から新しく始めてください。',
          );
        }
      }
    }

    void loadResult();
    return () => {
      isCurrent = false;
    };
  }, [learning, navigate, practiceSessions, sessionId]);

  const result = useMemo(
    () => (session === undefined ? undefined : getPracticeSessionResult(session)),
    [session],
  );

  async function startWithSameConditions() {
    if (session === undefined) {
      return;
    }
    const progress = await learning.getProgressMap();
    const selectedQuestions = selectPracticeQuestions(
      questions,
      session.filters,
      Math.random,
      progress,
    );
    if (selectedQuestions.length === 0) {
      setError('同じ条件に一致する問題がありません。条件を変更して始めてください。');
      return;
    }

    setIsStartingAgain(true);
    try {
      const now = new Date().toISOString();
      const nextSession = createPracticeSession(
        selectedQuestions.map((question) => question.code),
        session.filters,
        { id: createPracticeSessionId(), now, subjectId },
      );
      await practiceSessions.createInProgress(nextSession);
      navigate(`/practice/${nextSession.id}`);
    } catch (caught) {
      if (caught instanceof ActivePracticeSessionExistsError) {
        setError('別の通常演習が途中です。ホームまたは条件設定から、その演習を再開してください。');
      } else {
        setError(
          '新しい演習を保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
        );
      }
    } finally {
      setIsStartingAgain(false);
    }
  }

  async function toggleFavorite(code: string) {
    const current = progressByCode.get(code);
    setFavoriteSavingCode(code);
    try {
      const updated = await learning.setFavorite(
        code,
        !(current?.favorite ?? false),
        new Date().toISOString(),
      );
      setProgressByCode((previous) => new Map(previous).set(code, updated));
    } catch {
      setError(
        'お気に入りを保存できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
    } finally {
      setFavoriteSavingCode(undefined);
    }
  }

  if (error !== undefined) {
    return (
      <section className="surface-card recovery-card">
        <p className="status-label">確認してください</p>
        <h1>演習結果を表示できません</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => navigate('/practice')} type="button">
          条件設定へ戻る
        </button>
      </section>
    );
  }

  if (session === undefined || result === undefined) {
    return (
      <section aria-busy="true" className="surface-card loading-card">
        <h1>演習結果を集計しています</h1>
        <p>回答内容を確認しています。</p>
      </section>
    );
  }

  const elapsedSeconds = getElapsedSeconds(
    session.createdAt,
    session.completedAt ?? session.updatedAt,
  );

  return (
    <>
      <PageHeader
        description="今回の回答を見直して、次の演習につなげましょう。"
        title="通常演習の結果"
      />
      <section className="surface-card result-summary">
        <p className="result-rate-label">正答率</p>
        <p className="result-rate">{result.correctRate}%</p>
        <div className="result-counts" aria-label="演習結果の内訳">
          <span>正解 {result.correct}問</span>
          <span>不正解 {result.incorrect}問</span>
          <span>未回答 {result.unanswered}問</span>
          <span>所要時間 {formatElapsedTime(elapsedSeconds)}</span>
        </div>
      </section>

      <section className="surface-card result-filters">
        <h2>今回の条件</h2>
        <p>{describeFilters(session, subjectId)}</p>
      </section>

      <section aria-label="問題ごとの結果" className="result-question-list">
        <h2>問題ごとの確認</h2>
        {session.questionCodes.map((code, index) => {
          const question = getQuestionByCode(code, subjectId);
          if (question === undefined) {
            return null;
          }
          const answer = session.answers[code];
          const isFavorite = progressByCode.get(code)?.favorite ?? false;
          const status =
            answer?.confirmed !== true ? '未回答' : answer.isCorrect ? '正解' : '不正解';
          const correctChoice = question.choices.find(
            (choice) => choice.id === question.correctChoice,
          );
          const selectedChoice =
            answer === undefined
              ? undefined
              : question.choices.find((choice) => choice.id === answer.selectedChoice);

          return (
            <details className={`result-question is-${status}`} key={code}>
              <summary>
                <span>問題 {index + 1}</span>
                <strong>{status}</strong>
              </summary>
              <p className="result-question-text">{question.question}</p>
              <QuestionStimuli stimulus={question.stimulus} />
              <QuestionChoiceFigures choices={question.choices} />
              <p>
                あなたの回答:{' '}
                {selectedChoice === undefined
                  ? '未回答'
                  : `${answer?.confirmed === true ? '' : '未確定: '}${selectedChoice.id}. ${selectedChoice.text}`}
              </p>
              <p>
                正解:{' '}
                {correctChoice === undefined
                  ? question.correctChoice
                  : `${correctChoice.id}. ${correctChoice.text}`}
              </p>
              <div className="result-question-actions">
                <button
                  aria-pressed={isFavorite}
                  className="text-button"
                  disabled={favoriteSavingCode === code}
                  onClick={() => void toggleFavorite(code)}
                  type="button"
                >
                  {isFavorite ? '★ お気に入り登録済み' : '☆ お気に入りに追加'}
                </button>
                <Link className="text-link" to={`/history/${code}`}>
                  学習履歴を見る
                </Link>
              </div>
              <QuestionExplanation question={question} />
            </details>
          );
        })}
      </section>

      <div className="result-actions">
        <button
          className="primary-button"
          disabled={isStartingAgain}
          onClick={() => void startWithSameConditions()}
          type="button"
        >
          {isStartingAgain ? '準備中…' : '同じ条件でもう一度'}
        </button>
        <button
          className="secondary-button"
          onClick={() => navigate('/practice', { state: { initialFilters: session.filters } })}
          type="button"
        >
          条件を変える
        </button>
        <button className="text-button" onClick={() => navigate('/')} type="button">
          ホームへ戻る
        </button>
      </div>
    </>
  );
}

function getElapsedSeconds(startedAt: string, completedAt: string): number {
  const elapsedMilliseconds = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(elapsedMilliseconds / 1000));
}

function formatElapsedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds}秒`;
}

function describeFilters(
  session: PracticeSessionRow,
  subjectId: import('../domain/subject').SubjectId,
): string {
  const domain =
    session.filters.domainId === 'all'
      ? undefined
      : getDomainById(session.filters.domainId, subjectId)?.name;
  const categoryText =
    session.filters.categoryIds.length === 0
      ? 'カテゴリ: すべて'
      : `カテゴリ: ${session.filters.categoryIds
          .map((categoryId) => getCategoryById(categoryId, subjectId)?.name ?? categoryId)
          .join('・')}`;
  const countText =
    session.filters.questionCount === 'all'
      ? '出題数: すべて'
      : `出題数: ${session.filters.questionCount}問`;
  const orderText = session.filters.order === 'registered' ? '登録順' : 'ランダム';

  return `系統: ${domain ?? 'すべて'} / ${categoryText} / 難易度: ${session.filters.difficulty} / ${countText} / ${orderText}`;
}
