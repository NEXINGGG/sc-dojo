import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import { B1DataError, B1Repository, type B1ProgressSummary } from '../features/b1/b1Repository';
import { relevanceLabelText } from '../domain/b1LearningFlow';

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

  useEffect(() => {
    void Promise.all([
      repository.getProgressSummary(),
      repository.listMocks(),
      repository.listPractices(),
      repository.getLearningAnalytics(),
    ]).then(([nextSummary, nextHistory, nextPractices, nextAnalytics]) => {
      setSummary(nextSummary);
      setHistory(nextHistory);
      setPractices(nextPractices);
      setAnalytics(nextAnalytics);
    });
  }, []);

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

  return (
    <>
      <PageHeader
        description="B-1の参考判定・自己採点だけを表示します。A-1/A-2の正答率や合否には混ぜません。"
        title="B-1成績"
      />
      <section aria-label="B-1自己採点の集計" className="study-summary-grid">
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
                途中のB-1演習を再開する
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
        <h2>B-1通常演習履歴</h2>
        {practices.length === 0 ? (
          <p>まだB-1通常演習の履歴はありません。</p>
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
        <h2>B-1模試履歴</h2>
        {history.length === 0 ? (
          <p>まだB-1模試の履歴はありません。</p>
        ) : (
          <ol className="exam-history-list">
            {history.map((session) => (
              <li key={session.id}>
                <Link to={`/b1/mock/${session.id}`}>
                  <strong>
                    {session.year}年度・問{session.caseIds.map((id) => id.slice(-1)).join('・')}
                  </strong>
                  <span>
                    {session.status === 'completed'
                      ? '結果確定済み'
                      : session.status === 'submitted'
                        ? '自己採点待ち'
                        : '途中保存中'}
                  </span>
                  <span>
                    {session.submittedAt === undefined
                      ? '90分模試'
                      : new Intl.DateTimeFormat('ja-JP', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'Asia/Tokyo',
                        }).format(new Date(session.submittedAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
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
