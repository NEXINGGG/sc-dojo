import { QuestionStimuli } from '../components/QuestionStimuli';
import { QuestionExplanation } from '../components/QuestionExplanation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getCategoryById, getDomainById, getQuestionByCode } from '../data/catalog';
import { database } from '../database/database';
import type { ExamResultRow, QuestionProgressRow } from '../database/types';
import { getExamName } from '../domain/exam';
import { ExamRepository } from '../features/exam/examRepository';
import { LearningRepository } from '../features/learning/learningRepository';
import { getSubjectConfig } from '../domain/subject';
import { useSubject } from '../features/subjects/SubjectContext';

export function ExamResultPage() {
  const { subjectId } = useSubject();
  const subject = getSubjectConfig(subjectId);
  const exams = useMemo(() => new ExamRepository(database, subjectId), [subjectId]);
  const learning = useMemo(() => new LearningRepository(database, subjectId), [subjectId]);
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [result, setResult] = useState<ExamResultRow>();
  const [progressByCode, setProgressByCode] = useState<ReadonlyMap<string, QuestionProgressRow>>(
    new Map(),
  );
  const [detailIndex, setDetailIndex] = useState(0);
  const [error, setError] = useState<string>();
  const [favoriteSavingCode, setFavoriteSavingCode] = useState<string>();

  useEffect(() => {
    let isCurrent = true;

    async function loadResult() {
      if (sessionId === undefined) {
        navigate('/exam', { replace: true });
        return;
      }
      try {
        const [loadedResult, progress] = await Promise.all([
          exams.getResult(sessionId),
          learning.getProgressMap(),
        ]);
        if (!isCurrent) {
          return;
        }
        if (loadedResult === undefined) {
          navigate('/exam', {
            replace: true,
            state: { notice: '指定された模試結果が見つかりませんでした。' },
          });
          return;
        }
        setResult(loadedResult);
        setProgressByCode(progress);
      } catch {
        if (isCurrent) {
          setError(
            '模試結果を読み込めませんでした。画面を再読み込みして、もう一度お試しください。',
          );
        }
      }
    }

    void loadResult();
    return () => {
      isCurrent = false;
    };
  }, [exams, learning, navigate, sessionId]);

  useEffect(() => {
    if (result !== undefined) {
      headingRef.current?.focus();
    }
  }, [result]);

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
        <h1>模試結果を表示できません</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => window.location.reload()} type="button">
          再読み込み
        </button>
      </section>
    );
  }

  if (result === undefined) {
    return (
      <section aria-busy="true" className="surface-card loading-card">
        <h1>模試結果を読み込んでいます</h1>
      </section>
    );
  }

  const currentCode = result.questionCodes[detailIndex];
  const question = getQuestionByCode(currentCode, subjectId);
  const questionResult = result.questionResults[currentCode];

  return (
    <>
      <PageHeader
        description={`${getExamName(result.examType)}の結果です。次の復習につなげましょう。`}
        title="模試結果"
      />
      {location.state?.timeoutSubmitted === true || result.submissionReason === 'timeout' ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>制限時間終了により自動提出されました</strong>
          <p>未回答の問題は未回答として採点しています。</p>
        </section>
      ) : null}

      <section
        className={`surface-card exam-result-summary${result.passed ? ' is-passed' : ' is-failed'}`}
      >
        <h1 ref={headingRef} tabIndex={-1}>
          {result.passed ? '合格' : '不合格'}
        </h1>
        <p className="result-rate">
          {result.correct} / {result.total}問
        </p>
        <p>
          100点換算 {result.score}点（正解数 ÷ {subject.exam.questionCount} × 100を四捨五入）
        </p>
        <p>
          合格基準: {subject.exam.passingCorrectCount}問以上（{subject.exam.passingScorePercent}%）
        </p>
        <div aria-label="模試結果の内訳" className="result-counts">
          <span>正解 {result.correct}問</span>
          <span>不正解 {result.incorrect}問</span>
          <span>未回答 {result.unanswered}問</span>
          <span>正答率 {result.correctRate}%</span>
          <span>経過時間 {formatElapsed(result.elapsedSeconds)}</span>
          <span>{result.submissionReason === 'timeout' ? '時間切れ提出' : '手動提出'}</span>
        </div>
      </section>

      <ResultBreakdown
        heading="カテゴリ別成績"
        rows={Object.entries(result.categoryResults).map(([id, value]) => ({
          label: getCategoryById(id, subjectId)?.name ?? id,
          ...value,
        }))}
      />
      <ResultBreakdown
        heading="系統別成績"
        rows={Object.entries(result.domainResults).map(([id, value]) => ({
          label: getDomainById(id, subjectId)?.name ?? id,
          ...value,
        }))}
      />

      <section aria-label="問題一覧" className="surface-card exam-result-navigator">
        <h2>問題一覧</h2>
        <div className="exam-number-grid">
          {result.questionCodes.map((code, index) => {
            const item = result.questionResults[code];
            const label =
              item?.isCorrect === true ? '正解' : item?.isCorrect === false ? '不正解' : '未回答';
            return (
              <button
                aria-current={index === detailIndex ? 'step' : undefined}
                aria-label={`問題 ${index + 1}: ${label}${item?.review ? '・見直し' : ''}`}
                className={`exam-number-button is-result${item?.isCorrect === true ? ' is-correct' : item?.isCorrect === false ? ' is-incorrect' : ' is-unanswered'}${item?.review ? ' is-review' : ''}${index === detailIndex ? ' is-current' : ''}`}
                key={code}
                onClick={() => setDetailIndex(index)}
                type="button"
              >
                {index + 1}
                <span aria-hidden="true">{item?.review ? ' 見直し' : ` ${label}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      {question !== undefined && questionResult !== undefined ? (
        <section className="surface-card exam-result-question">
          <p className="eyebrow">問題 {detailIndex + 1}</p>
          <h2 className="question-text">{question.question}</h2>
          <QuestionStimuli stimulus={question.stimulus} />
          {question.choices.some((choice) => (choice.stimulus?.length ?? 0) > 0) ? (
            <div className="result-choice-stimuli">
              {question.choices.map((choice) => (
                <div key={choice.id}>
                  <p>
                    {choice.id}. {choice.text}
                  </p>
                  <QuestionStimuli stimulus={choice.stimulus} />
                </div>
              ))}
            </div>
          ) : null}
          <div className="chip-list">
            <span className="chip">
              {getCategoryById(question.categoryId, subjectId)?.name ?? question.categoryId}
            </span>
            <span className="chip chip-muted">{question.subcategory}</span>
            <span className="chip chip-muted">難易度: {question.difficulty}</span>
            {questionResult.review ? <span className="chip review-chip">見直し指定</span> : null}
          </div>
          <p>あなたの回答: {formatChoice(question, questionResult.selectedChoice)}</p>
          <p>正解: {formatChoice(question, questionResult.correctChoice)}</p>
          <p
            className={
              questionResult.isCorrect === true ? 'result-correct-text' : 'result-incorrect-text'
            }
          >
            {questionResult.isCorrect === true
              ? '正解'
              : questionResult.isCorrect === false
                ? '不正解'
                : '未回答'}
          </p>
          <QuestionExplanation question={question} />
          <button
            aria-pressed={progressByCode.get(question.code)?.favorite ?? false}
            className="secondary-button favorite-button"
            disabled={favoriteSavingCode === question.code}
            onClick={() => void toggleFavorite(question.code)}
            type="button"
          >
            {progressByCode.get(question.code)?.favorite
              ? '★ お気に入り登録済み'
              : '☆ お気に入りに追加'}
          </button>
        </section>
      ) : null}

      <div className="result-actions">
        <button
          className="secondary-button"
          disabled={detailIndex === 0}
          onClick={() => setDetailIndex((index) => index - 1)}
          type="button"
        >
          前の問題
        </button>
        <button
          className="secondary-button"
          disabled={detailIndex === result.questionCodes.length - 1}
          onClick={() => setDetailIndex((index) => index + 1)}
          type="button"
        >
          次の問題
        </button>
        <Link className="primary-button" to="/exam">
          模試選択へ
        </Link>
      </div>
    </>
  );
}

interface ResultBreakdownProps {
  heading: string;
  rows: readonly { label: string; total: number; correct: number; unanswered: number }[];
}

function ResultBreakdown({ heading, rows }: ResultBreakdownProps) {
  return (
    <section className="surface-card exam-breakdown-card">
      <h2>{heading}</h2>
      <ul>
        {rows.map((row) => (
          <li key={row.label}>
            <strong>{row.label}</strong>
            <span>
              正解 {row.correct} / {row.total}問・未回答 {row.unanswered}問
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatChoice(
  question: NonNullable<ReturnType<typeof getQuestionByCode>>,
  choiceId: string | undefined,
): string {
  if (choiceId === undefined) {
    return '未回答';
  }
  const choice = question.choices.find((item) => item.id === choiceId);
  return choice === undefined ? choiceId : `${choice.id}. ${choice.text}`;
}

function formatElapsed(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}分${totalSeconds % 60}秒`;
}
