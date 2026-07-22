import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { b1Cases, getB1CasesForYear, getB1CategoryName } from '../data/b1';
import { database } from '../database/database';
import { B1DataError, B1Repository } from '../features/b1/b1Repository';

const repository = new B1Repository(database);

export function B1PracticePage() {
  const navigate = useNavigate();
  const [inProgressId, setInProgressId] = useState<string>();
  const [isStarting, setIsStarting] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void repository.getInProgressPractice().then((session) => setInProgressId(session?.id));
  }, []);

  async function start(caseId: string) {
    const caseItem = b1Cases.find((item) => item.caseId === caseId);
    if (caseItem === undefined) return;
    setIsStarting(caseId);
    setMessage(undefined);
    try {
      const session = await repository.createPractice(caseItem);
      navigate(`/b1/practice/${session.id}`);
    } catch (error) {
      if (error instanceof B1DataError) setMessage(error.message);
      else setMessage('B-1演習を開始できませんでした。端末の保存領域を確認してください。');
    } finally {
      setIsStarting(undefined);
    }
  }

  return (
    <>
      <PageHeader
        description="大問を1つ選び、設問掲載ページを案内しながら答案を入力します。"
        title="B-1演習"
      />
      {inProgressId !== undefined ? (
        <section className="inline-notice inline-notice-info" role="status">
          <strong>途中の演習があります</strong>
          <Link className="text-link" to={`/b1/practice/${inProgressId}`}>
            前回の続きを開く
          </Link>
        </section>
      ) : null}
      {message !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <p>{message}</p>
        </section>
      ) : null}
      {[2025, 2024, 2023].map((year) => (
        <section aria-label={`${year}年度のB-1演習`} className="b1-case-list" key={year}>
          <h2>{year}年度</h2>
          {getB1CasesForYear(year).map((caseItem) => (
            <article className="surface-card b1-case-card" key={caseItem.caseId}>
              <p className="eyebrow">
                問{caseItem.questionNumber}・約{caseItem.estimatedMinutes}分
              </p>
              <h3>{caseItem.title}</h3>
              <p>{caseItem.purposeSummary}</p>
              <p className="muted-text">
                {caseItem.questionUnits.length}解答単位・
                {caseItem.categoryIds.map(getB1CategoryName).join('／')}
              </p>
              <button
                className="primary-button"
                disabled={isStarting !== undefined || inProgressId !== undefined}
                onClick={() => void start(caseItem.caseId)}
                type="button"
              >
                {isStarting === caseItem.caseId ? '開始準備中…' : 'この大問を練習する'}
              </button>
            </article>
          ))}
        </section>
      ))}
    </>
  );
}
