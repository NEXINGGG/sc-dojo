import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { questions } from '../data/catalog';
import { database } from '../database/database';
import type { ExamResultRow, ExamSessionRow, ExamType } from '../database/types';
import {
  createExamSession,
  createExamSessionId,
  EXAM_DURATION_SECONDS,
  EXAM_QUESTION_COUNT,
  getExamName,
  selectExamQuestionCodes,
} from '../domain/exam';
import {
  ActiveExamSessionExistsError,
  ExamRepository,
  type ExamTypeHistorySummary,
} from '../features/exam/examRepository';

const exams = new ExamRepository(database);

const examCards: readonly { type: ExamType; description: string }[] = [
  { type: 'fixed_1', description: '問題データで固定された30問を、本番形式で解きます。' },
  { type: 'fixed_2', description: '別の固定30問を、本番形式で解きます。' },
  { type: 'random', description: 'activeな240問から、重複なしで30問を出題します。' },
];

export function ExamSelectionPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ExamType>();
  const [summaries, setSummaries] = useState<Record<ExamType, ExamTypeHistorySummary>>();
  const [history, setHistory] = useState<readonly ExamResultRow[]>([]);
  const [existingSession, setExistingSession] = useState<ExamSessionRow>();
  const [isDiscardConfirming, setIsDiscardConfirming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let isCurrent = true;

    async function loadExamData() {
      try {
        await exams.submitExpiredInProgress();
        const [nextSummaries, nextHistory] = await Promise.all([
          exams.getTypeHistorySummaries(),
          exams.listResults(),
        ]);
        if (isCurrent) {
          setSummaries(nextSummaries);
          setHistory(nextHistory);
        }
      } catch {
        if (isCurrent) {
          setMessage(
            '模試データを確認できませんでした。端末の保存領域を確認して、再読み込みしてください。',
          );
        }
      }
    }

    void loadExamData();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function requestStart() {
    if (selectedType === undefined || isStarting) {
      return;
    }
    setMessage(undefined);
    setIsStarting(true);
    try {
      const inProgress = await exams.getInProgress();
      if (inProgress !== undefined) {
        setExistingSession(inProgress);
        return;
      }
      await startNewExam(selectedType);
    } catch {
      setMessage('模試を開始できませんでした。画面を再読み込みして、もう一度お試しください。');
    } finally {
      setIsStarting(false);
    }
  }

  async function startNewExam(examType: ExamType) {
    const now = new Date().toISOString();
    const session = createExamSession(examType, selectExamQuestionCodes(examType, questions), {
      id: createExamSessionId(),
      now,
    });
    try {
      await exams.createInProgress(session);
      navigate(`/exam/${session.id}`);
    } catch (error) {
      if (error instanceof ActiveExamSessionExistsError) {
        setExistingSession(error.session);
        return;
      }
      throw error;
    }
  }

  async function discardAndStart() {
    if (existingSession === undefined || selectedType === undefined || isStarting) {
      return;
    }
    setIsStarting(true);
    try {
      await exams.discardInProgress(existingSession.id);
      setExistingSession(undefined);
      setIsDiscardConfirming(false);
      await startNewExam(selectedType);
    } catch {
      setMessage(
        '前回の模試を破棄できませんでした。模試以外の学習データは変更されていません。もう一度お試しください。',
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      <PageHeader description="30問・50分の本番形式で、今の実力を確認します。" title="模擬試験" />
      {message !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>確認してください</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <section aria-label="模試を選ぶ" className="exam-selection-list">
        {examCards.map((exam) => (
          <article className="surface-card exam-selection-card" key={exam.type}>
            <h2>{getExamName(exam.type)}</h2>
            <p>{exam.description}</p>
            <dl className="exam-card-details">
              <div>
                <dt>問題数</dt>
                <dd>{EXAM_QUESTION_COUNT}問</dd>
              </div>
              <div>
                <dt>制限時間</dt>
                <dd>{formatMinutes(EXAM_DURATION_SECONDS)}分</dd>
              </div>
              <div>
                <dt>受験回数</dt>
                <dd>{summaries?.[exam.type].attempts ?? 0}回</dd>
              </div>
              <div>
                <dt>直近の得点</dt>
                <dd>{formatScore(summaries?.[exam.type].latest)}</dd>
              </div>
              <div>
                <dt>最高得点</dt>
                <dd>{formatHighestScore(summaries?.[exam.type].highestScore)}</dd>
              </div>
            </dl>
            <button
              aria-pressed={selectedType === exam.type}
              className="secondary-button"
              onClick={() => setSelectedType(exam.type)}
              type="button"
            >
              {selectedType === exam.type ? '選択中' : `${getExamName(exam.type)}を選ぶ`}
            </button>
          </article>
        ))}
      </section>

      {selectedType !== undefined ? (
        <section aria-label="模試開始前の確認" className="surface-card exam-start-confirmation">
          <h2>{getExamName(selectedType)}を開始</h2>
          <ul>
            <li>30問・制限時間50分です。</li>
            <li>模試中は正解・正誤・解説を表示しません。</li>
            <li>未回答でも提出できます。時間切れでは自動提出されます。</li>
            <li>ブラウザを閉じても、回答・見直し・残り時間を再開できます。</li>
          </ul>
          <button
            className="primary-button"
            disabled={isStarting}
            onClick={() => void requestStart()}
            type="button"
          >
            {isStarting ? '開始準備中…' : '模試を開始する'}
          </button>
        </section>
      ) : null}

      <section aria-label="模試履歴" className="surface-card exam-history-card">
        <h2>模試履歴</h2>
        {history.length === 0 ? <p>まだ模試の受験履歴はありません。</p> : null}
        {history.length > 0 ? (
          <ol className="exam-history-list">
            {history.map((result) => (
              <li key={result.id}>
                <Link to={`/exam/${result.examSessionId}/result`}>
                  <strong>{getExamName(result.examType)}</strong>
                  <span>{formatDateTime(result.submittedAt)}</span>
                  <span>
                    {result.correct} / {result.total}問・{result.passed ? '合格' : '不合格'}・
                    {formatElapsed(result.elapsedSeconds)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {existingSession !== undefined && !isDiscardConfirming ? (
        <ConfirmDialog
          description="模試は1件だけ途中保存できます。前回を再開するか、破棄して新しい模試を開始してください。"
          title="途中の模試があります"
        >
          <button
            className="primary-button"
            onClick={() => navigate(`/exam/${existingSession.id}`)}
            type="button"
          >
            前回の模試を再開
          </button>
          <button
            className="secondary-button"
            onClick={() => setIsDiscardConfirming(true)}
            type="button"
          >
            前回を破棄して新しく開始
          </button>
          <button
            className="text-button"
            onClick={() => setExistingSession(undefined)}
            type="button"
          >
            キャンセル
          </button>
        </ConfirmDialog>
      ) : null}

      {existingSession !== undefined && isDiscardConfirming ? (
        <ConfirmDialog
          description="途中の模試の回答と見直しは削除されます。通常演習、学習履歴、お気に入り、過去の模試結果は削除されません。"
          title="前回の模試を破棄しますか？"
        >
          <button
            className="primary-button"
            disabled={isStarting}
            onClick={() => void discardAndStart()}
            type="button"
          >
            破棄して新しく開始
          </button>
          <button
            className="secondary-button"
            onClick={() => setIsDiscardConfirming(false)}
            type="button"
          >
            模試へ戻る
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function formatScore(result: ExamResultRow | undefined): string {
  return result === undefined ? '未受験' : `${result.correct} / ${result.total}問`;
}

function formatHighestScore(score: number | undefined): string {
  return score === undefined ? '未受験' : `${score}点`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatElapsed(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}分${totalSeconds % 60}秒`;
}

function formatMinutes(totalSeconds: number): number {
  return Math.floor(totalSeconds / 60);
}
