import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { b1Cases, getB1QuestionUnit } from '../data/b1';
import { database } from '../database/database';
import type { B1MockSessionRow } from '../database/types';
import { B1DataError, B1Repository, type B1ProgressSummary } from '../features/b1/b1Repository';
import { relevanceLabelText } from '../domain/b1LearningFlow';
import {
  formatB1MockElapsedTime,
  getB1MockElapsedSeconds,
  summarizeB1MockAnswers,
} from '../domain/b1MockExam';

const repository = new B1Repository(database);

export function B1ProgressPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<B1ProgressSummary>();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof repository.listMocks>>>([]);
  const [practices, setPractices] = useState<Awaited<ReturnType<typeof repository.listPractices>>>(
    [],
  );
  const [analytics, setAnalytics] =
    useState<Awaited<ReturnType<typeof repository.getLearningAnalytics>>>();
  const [isOpeningReview, setIsOpeningReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<B1MockSessionRow>();
  const [isDeletingMock, setIsDeletingMock] = useState(false);
  const [mockMessage, setMockMessage] = useState<string>();

  const load = useCallback(async () => {
    try {
      const [nextSummary, nextHistory, nextPractices, nextAnalytics] = await Promise.all([
        repository.getProgressSummary(),
        repository.listMocks(),
        repository.listPractices(),
        repository.getLearningAnalytics(),
      ]);
      setSummary(nextSummary);
      setHistory(nextHistory);
      setPractices(nextPractices);
      setAnalytics(nextAnalytics);
    } catch {
      setMockMessage('科目Bの履歴を読み込めませんでした。ページを再読み込みしてください。');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inProgressPractice = practices.find((session) => session.status === 'in_progress');
  const nextReviewTarget = summary?.reviewTargets[0];

  async function openNextReview() {
    if (nextReviewTarget === undefined) return;
    setIsOpeningReview(true);
    setReviewMessage(undefined);
    try {
      const session = await repository.createReviewPractice(nextReviewTarget.questionId);
      navigate(`/b1/practice/${session.id}`);
    } catch (error) {
      setReviewMessage(
        error instanceof B1DataError
          ? error.message
          : '復習を開始できませんでした。もう一度お試しください。',
      );
    } finally {
      setIsOpeningReview(false);
    }
  }

  async function deleteCompletedMock() {
    if (deleteTarget === undefined) return;
    setIsDeletingMock(true);
    setMockMessage(undefined);
    try {
      await repository.deleteCompletedMock(deleteTarget.id);
      setDeleteTarget(undefined);
      await load();
      setMockMessage(
        '科目B模試履歴を削除しました。通常演習やA-1/A-2の学習データは削除していません。',
      );
    } catch (error) {
      setMockMessage(
        error instanceof B1DataError
          ? error.message
          : '科目B模試履歴を削除できませんでした。もう一度お試しください。',
      );
    } finally {
      setIsDeletingMock(false);
    }
  }

  return (
    <>
      <PageHeader
        description="科目Bの参考判定・自己採点だけを表示します。A-1/A-2の正答率や合否には混ぜません。"
        title="科目B成績"
      />
      <section aria-label="科目B自己採点の集計" className="study-summary-grid">
        <article className="metric-card">
          <span>総ユニット数</span>
          <strong>{summary?.totalUnitCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>未回答</span>
          <strong>{summary?.unansweredUnitCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>回答確定済み</span>
          <strong>{summary?.confirmedUnitCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>自己評価済み</span>
          <strong>{summary?.selfAssessedUnitCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>できた</span>
          <strong>{summary?.correctSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>惜しい</span>
          <strong>{summary?.partialSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>できなかった</span>
          <strong>{summary?.incorrectSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>復習対象</span>
          <strong>{summary?.reviewTargetCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>全体の進捗率</span>
          <strong>{summary?.progressRate ?? 0}%</strong>
        </article>
      </section>
      <section className="surface-card exam-history-card">
        <h2>次に復習する問題</h2>
        {nextReviewTarget === undefined ? (
          <p>復習対象はありません。回答を確定して自己評価を続けましょう。</p>
        ) : (
          <>
            <p>
              {nextReviewTarget.year}年度・{nextReviewTarget.label}（
              {reviewReasonText(nextReviewTarget.reasons)}）
            </p>
            {inProgressPractice !== undefined ? (
              <Link className="primary-button" to={`/b1/practice/${inProgressPractice.id}`}>
                途中の科目B演習を再開する
              </Link>
            ) : (
              <button
                className="primary-button"
                disabled={isOpeningReview}
                onClick={() => void openNextReview()}
                type="button"
              >
                {isOpeningReview ? '復習を開始中…' : 'この問題を復習する'}
              </button>
            )}
          </>
        )}
        {reviewMessage !== undefined ? <p role="status">{reviewMessage}</p> : null}
      </section>
      <section className="surface-card exam-history-card">
        <h2>年度別・問題別の進捗</h2>
        <p>進捗率は、各ユニットで回答を確定した割合です。</p>
        {(summary?.byYear ?? []).map((year) => (
          <details key={year.id}>
            <summary>
              {year.label}: {year.confirmedUnitCount} / {year.totalUnitCount}件（{year.progressRate}
              %）
            </summary>
            <ul className="b1-progress-breakdown-list">
              {(summary?.byCase ?? [])
                .filter((caseItem) => caseItem.id.startsWith(`B1-${year.id}-`))
                .map((caseItem) => (
                  <li key={caseItem.id}>
                    <span>{caseItem.label}</span>
                    <strong>
                      {caseItem.confirmedUnitCount} / {caseItem.totalUnitCount}件（
                      {caseItem.progressRate}%）
                    </strong>
                  </li>
                ))}
            </ul>
          </details>
        ))}
      </section>
      <section className="surface-card exam-history-card">
        <h2>振返りの集計</h2>
        <dl className="b1-requirement-list">
          <div>
            <dt>根拠未入力率</dt>
            <dd>{analytics?.evidenceMissingRate ?? 0}%</dd>
          </div>
          <div>
            <dt>書き直し後改善率</dt>
            <dd>{analytics?.rewriteImprovementRate ?? 0}%</dd>
          </div>
          <div>
            <dt>A2復習後の書き直し率</dt>
            <dd>{analytics?.remediationImprovementRate ?? 0}%</dd>
          </div>
        </dl>
        <h3>失点原因別件数</h3>
        {Object.keys(analytics?.failureCauseCounts ?? {}).length === 0 ? (
          <p>まだ失点原因の記録はありません。</p>
        ) : (
          <ul>
            {Object.entries(analytics?.failureCauseCounts ?? {}).map(([id, count]) => (
              <li key={id}>
                {id}: {count}件
              </li>
            ))}
          </ul>
        )}
        <h3>現在性ラベル別演習数</h3>
        <ul>
          {Object.entries(analytics?.relevancePracticeCounts ?? {}).map(([label, count]) => (
            <li key={label}>
              {relevanceLabelText(label as Parameters<typeof relevanceLabelText>[0])}: {count}件
            </li>
          ))}
        </ul>
      </section>
      <section className="surface-card exam-history-card">
        <h2>科目B通常演習履歴</h2>
        {practices.length === 0 ? (
          <p>まだ科目B通常演習の履歴はありません。</p>
        ) : (
          <ol className="exam-history-list">
            {practices.map((session) => (
              <li key={session.id}>
                <Link to={`/b1/practice/${session.id}`}>
                  <strong>
                    {session.mode === 'practical' ? '実践' : 'トレーニング'}・{session.caseId}
                  </strong>
                  <span>根拠・自己採点・書き直しは設問画面で確認できます</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="surface-card exam-history-card">
        <h2>科目B模試履歴</h2>
        {history.length === 0 ? (
          <p>まだ科目B模試の履歴はありません。</p>
        ) : (
          <ol className="exam-history-list">
            {history.map((session) => {
              const historySummary = getMockHistorySummary(session);
              return (
                <li key={session.id}>
                  <Link to={`/b1/mock/${session.id}`}>
                    <strong>{mockCaseLabel(session)}</strong>
                    <span>
                      {session.status === 'completed'
                        ? '結果確定済み'
                        : session.status === 'submitted'
                          ? '自己採点待ち'
                          : '途中保存中'}
                    </span>
                    <span>
                      {session.submittedAt === undefined
                        ? '90分模試・途中から再開できます'
                        : `${formatB1DateTime(session.submittedAt)}・${formatB1MockElapsedTime(historySummary.elapsedSeconds)}`}
                    </span>
                    <span>
                      解答欄 {historySummary.answers.answeredAnswerFieldCount} /{' '}
                      {historySummary.answers.totalAnswerFieldCount}件・未回答{' '}
                      {historySummary.answers.unansweredAnswerFieldCount}件・見直し{' '}
                      {historySummary.answers.reviewUnitCount}件
                    </span>
                    <span>
                      自己評価: できた {historySummary.correctCount}件 / 惜しい{' '}
                      {historySummary.partialCount}件 / できなかった {historySummary.incorrectCount}
                      件 / 未評価 {historySummary.unassessedCount}件
                    </span>
                  </Link>
                  {session.status === 'completed' ? (
                    <button
                      className="text-button"
                      disabled={isDeletingMock}
                      onClick={() => setDeleteTarget(session)}
                      type="button"
                    >
                      この模試履歴を削除する
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {mockMessage !== undefined ? <p role="status">{mockMessage}</p> : null}
      </section>
      {deleteTarget !== undefined ? (
        <ConfirmDialog
          description="この模試の答案、自己評価、振り返り記録を削除します。通常演習とA-1/A-2の学習データは削除されません。"
          title="確定済みの科目B模試履歴を削除しますか？"
        >
          <button
            className="danger-button"
            disabled={isDeletingMock}
            onClick={() => void deleteCompletedMock()}
            type="button"
          >
            {isDeletingMock ? '削除中…' : '模試履歴を削除する'}
          </button>
          <button
            className="secondary-button"
            disabled={isDeletingMock}
            onClick={() => setDeleteTarget(undefined)}
            type="button"
          >
            戻る
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function reviewReasonText(reasons: readonly string[]): string {
  const labels: Record<string, string> = {
    unanswered: '未回答',
    partial: '惜しい',
    incorrect: 'できなかった',
    manual: '手動で見直し',
  };
  return reasons.map((reason) => labels[reason] ?? reason).join('・');
}

function getMockHistorySummary(session: B1MockSessionRow) {
  const answers = summarizeB1MockAnswers(
    session.unitIds.flatMap((unitId) => {
      const unit = getB1QuestionUnit(unitId);
      return unit === undefined ? [] : [unit];
    }),
    session.answers,
    session.reviewQuestionIds,
  );
  const grades = Object.values(session.selfGrades);
  return {
    answers,
    elapsedSeconds: getB1MockElapsedSeconds(session),
    correctCount: grades.filter((grade) => grade === 'correct').length,
    partialCount: grades.filter((grade) => grade === 'partial').length,
    incorrectCount: grades.filter((grade) => grade === 'incorrect' || grade === 'review').length,
    unassessedCount: session.unitIds.length - grades.length,
  };
}

function mockCaseLabel(session: B1MockSessionRow): string {
  const selectedCases = session.caseIds.flatMap((caseId) => {
    const caseItem = b1Cases.find((item) => item.caseId === caseId);
    return caseItem === undefined ? [] : [caseItem];
  });
  return selectedCases.length === session.caseIds.length
    ? selectedCases
        .map((caseItem) => `${caseItem.year}年度 問${caseItem.questionNumber}`)
        .join('・')
    : `${session.year}年度・科目B模試`;
}

function formatB1DateTime(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(value));
}
