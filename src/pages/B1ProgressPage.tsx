import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import { B1Repository, type B1ProgressSummary } from '../features/b1/b1Repository';

const repository = new B1Repository(database);

export function B1ProgressPage() {
  const [summary, setSummary] = useState<B1ProgressSummary>();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof repository.listMocks>>>([]);

  useEffect(() => {
    void Promise.all([repository.getProgressSummary(), repository.listMocks()]).then(
      ([nextSummary, nextHistory]) => {
        setSummary(nextSummary);
        setHistory(nextHistory);
      },
    );
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
