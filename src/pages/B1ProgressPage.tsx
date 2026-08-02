import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import { B1Repository, type B1ProgressSummary } from '../features/b1/b1Repository';
import { relevanceLabelText } from '../domain/b1LearningFlow';

const repository = new B1Repository(database);

export function B1ProgressPage() {
  const [summary, setSummary] = useState<B1ProgressSummary>();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof repository.listMocks>>>([]);
  const [practices, setPractices] = useState<Awaited<ReturnType<typeof repository.listPractices>>>(
    [],
  );
  const [analytics, setAnalytics] =
    useState<Awaited<ReturnType<typeof repository.getLearningAnalytics>>>();

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

  return (
    <>
      <PageHeader
        description="B-1の参考判定・自己採点だけを表示します。A-1/A-2の正答率や合否には混ぜません。"
        title="B-1成績"
      />
      <section aria-label="B-1自己採点の集計" className="study-summary-grid">
        <article className="metric-card">
          <span>正解相当</span>
          <strong>{summary?.correctSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>部分点相当</span>
          <strong>{summary?.partialSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>復習が必要</span>
          <strong>{summary?.reviewSelfGrades ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>完了した模試</span>
          <strong>{summary?.completedMockCount ?? 0}回</strong>
        </article>
        <article className="metric-card">
          <span>根拠を記録</span>
          <strong>{summary?.learnerEvidenceCount ?? 0}件</strong>
        </article>
        <article className="metric-card">
          <span>答案の書き直し</span>
          <strong>{summary?.rewriteCount ?? 0}回</strong>
        </article>
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
