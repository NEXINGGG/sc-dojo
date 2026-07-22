import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getB1CasesForYear } from '../data/b1';
import { database } from '../database/database';
import { B1DataError, B1Repository } from '../features/b1/b1Repository';

const repository = new B1Repository(database);

export function B1MockSelectionPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(2025);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [inProgressId, setInProgressId] = useState<string>();
  const [historyCount, setHistoryCount] = useState(0);
  const [message, setMessage] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const cases = useMemo(() => getB1CasesForYear(year), [year]);

  useEffect(() => {
    void Promise.all([repository.getInProgressMock(), repository.listMocks()]).then(
      ([session, all]) => {
        setInProgressId(session?.id);
        setHistoryCount(all.filter((item) => item.status === 'completed').length);
      },
    );
  }, []);

  function switchYear(nextYear: number) {
    setYear(nextYear);
    setCaseIds([]);
  }

  function toggleCase(caseId: string) {
    setCaseIds((current) =>
      current.includes(caseId)
        ? current.filter((id) => id !== caseId)
        : current.length === 2
          ? current
          : [...current, caseId],
    );
  }

  async function start() {
    setIsStarting(true);
    setMessage(undefined);
    try {
      const session = await repository.createMock(year, caseIds);
      navigate(`/b1/mock/${session.id}`);
    } catch (error) {
      setMessage(error instanceof B1DataError ? error.message : 'B-1模試を開始できませんでした。');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      <PageHeader
        description="同一年度の3大問から2大問を選択します。制限時間は90分です。"
        title="B-1模試"
      />
      <p className="exam-subject-summary">
        2大問・90分・提出後に参考判定と自己採点を行います。IPAの正式採点ではありません。
      </p>
      {inProgressId !== undefined ? (
        <section className="inline-notice inline-notice-info" role="status">
          <strong>途中のB-1模試があります</strong>
          <Link className="text-link" to={`/b1/mock/${inProgressId}`}>
            模試を再開する
          </Link>
        </section>
      ) : null}
      {message !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <p>{message}</p>
        </section>
      ) : null}
      <fieldset className="settings-fieldset" disabled={isStarting || inProgressId !== undefined}>
        <legend>年度</legend>
        <div className="settings-option-list">
          {[2025, 2024, 2023].map((item) => (
            <label className="setting-option" htmlFor={`b1-year-${item}`} key={item}>
              <input
                checked={year === item}
                id={`b1-year-${item}`}
                name="b1-year"
                onChange={() => switchYear(item)}
                type="radio"
              />
              {item}年度
            </label>
          ))}
        </div>
      </fieldset>
      <section aria-label="模試の大問を選択" className="b1-case-list">
        <h2>2大問を選択（{caseIds.length} / 2）</h2>
        {cases.map((caseItem) => (
          <article className="surface-card b1-case-card" key={caseItem.caseId}>
            <h3>
              問{caseItem.questionNumber}: {caseItem.title}
            </h3>
            <p>{caseItem.purposeSummary}</p>
            <label className="setting-option" htmlFor={`b1-case-${caseItem.caseId}`}>
              <input
                checked={caseIds.includes(caseItem.caseId)}
                disabled={!caseIds.includes(caseItem.caseId) && caseIds.length >= 2}
                id={`b1-case-${caseItem.caseId}`}
                onChange={() => toggleCase(caseItem.caseId)}
                type="checkbox"
              />
              この大問を選ぶ
            </label>
          </article>
        ))}
      </section>
      <button
        className="primary-button"
        disabled={caseIds.length !== 2 || isStarting || inProgressId !== undefined}
        onClick={() => void start()}
        type="button"
      >
        {isStarting ? '開始準備中…' : '90分のB-1模試を開始する'}
      </button>
      <p className="muted-text">確定済みB-1模試: {historyCount}回</p>
    </>
  );
}
