import { ScBMockSelection } from './ScBMockSelection';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { b1AvailableYears, b1Cases, getB1CasesForYear, getEffectiveB1Relevance } from '../data/b1';
import { database } from '../database/database';
import { B1DataError, B1Repository } from '../features/b1/b1Repository';
import { filterB1CasesForMock, relevanceLabelText } from '../domain/b1LearningFlow';
import type { B1MockType } from '../domain/b1LearningSupport';

const repository = new B1Repository(database);

export function B1MockSelectionPage() {
  return b1Cases[0]?.examCode === 'SC' ? <ScBMockSelection /> : <NwBMockSelection />;
}

function NwBMockSelection() {
  const navigate = useNavigate();
  const [year, setYear] = useState(b1AvailableYears[0] ?? 2025);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [inProgressId, setInProgressId] = useState<string>();
  const [historyCount, setHistoryCount] = useState(0);
  const [message, setMessage] = useState<string>();
  const [isStarting, setIsStarting] = useState(false);
  const [isStartConfirming, setIsStartConfirming] = useState(false);
  const [isDiscardConfirming, setIsDiscardConfirming] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [mockType, setMockType] = useState<B1MockType>('official_year');
  const cases = useMemo(
    () =>
      mockType === 'official_year'
        ? getB1CasesForYear(year)
        : filterB1CasesForMock(b1Cases, mockType),
    [mockType, year],
  );
  const selectedCases = useMemo(
    () =>
      caseIds.flatMap((caseId) => {
        const caseItem = b1Cases.find((item) => item.caseId === caseId);
        return caseItem === undefined ? [] : [caseItem];
      }),
    [caseIds],
  );
  const selectedUnitCount = selectedCases.reduce(
    (count, caseItem) => count + caseItem.questionUnits.length,
    0,
  );

  useEffect(() => {
    void Promise.all([repository.getInProgressMock(), repository.listMocks()])
      .then(([session, all]) => {
        setInProgressId(session?.id);
        setHistoryCount(all.filter((item) => item.status === 'completed').length);
      })
      .catch(() =>
        setMessage('科目B模試の保存データを読み込めませんでした。再読み込みしてください。'),
      );
  }, []);

  function switchYear(nextYear: number) {
    setYear(nextYear);
    setCaseIds([]);
    setIsStartConfirming(false);
  }

  function switchMockType(next: B1MockType) {
    setMockType(next);
    setCaseIds([]);
    setIsStartConfirming(false);
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
      const session = await repository.createMock(year, caseIds, mockType);
      navigate(`/b1/mock/${session.id}`);
    } catch (error) {
      setMessage(
        error instanceof B1DataError ? error.message : '科目B模試を開始できませんでした。',
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function discardInProgressMock() {
    if (inProgressId === undefined) return;
    setIsDiscarding(true);
    setMessage(undefined);
    try {
      await repository.discardInProgressMock(inProgressId);
      setInProgressId(undefined);
      setIsDiscardConfirming(false);
      setMessage('途中の科目B模試を破棄しました。新しい模試を開始できます。');
    } catch (error) {
      setMessage(
        error instanceof B1DataError ? error.message : '途中の科目B模試を破棄できませんでした。',
      );
    } finally {
      setIsDiscarding(false);
    }
  }

  return (
    <>
      <PageHeader
        description="同一年度の3大問から2大問を選択します。制限時間は90分です。"
        title="科目B模試"
      />
      <p className="exam-subject-summary">
        2大問・90分・提出後に参考判定と自己採点を行います。IPAの正式採点ではありません。
      </p>
      <fieldset className="settings-fieldset" disabled={isStarting || inProgressId !== undefined}>
        <legend>模試種別</legend>
        <div className="settings-option-list">
          <label className="setting-option">
            <input
              checked={mockType === 'current_focus'}
              name="b1-mock-type"
              onChange={() => switchMockType('current_focus')}
              type="radio"
            />
            現行対策模試（現在も重要・発展形を中心）
          </label>
          <label className="setting-option">
            <input
              checked={mockType === 'all_years'}
              name="b1-mock-type"
              onChange={() => switchMockType('all_years')}
              type="radio"
            />
            全年度模試（全ラベル）
          </label>
          <label className="setting-option">
            <input
              checked={mockType === 'legacy_reading'}
              name="b1-mock-type"
              onChange={() => switchMockType('legacy_reading')}
              type="radio"
            />
            旧技術を含む読解強化模試
          </label>
          <label className="setting-option">
            <input
              checked={mockType === 'official_year'}
              name="b1-mock-type"
              onChange={() => switchMockType('official_year')}
              type="radio"
            />
            公式年度模試（同一年度の3大問から2問）
          </label>
        </div>
      </fieldset>
      {inProgressId !== undefined ? (
        <section className="inline-notice inline-notice-info" role="status">
          <strong>途中の科目B模試があります</strong>
          <Link className="text-link" to={`/b1/mock/${inProgressId}`}>
            模試を再開する
          </Link>
          <button
            className="text-button"
            disabled={isDiscarding}
            onClick={() => setIsDiscardConfirming(true)}
            type="button"
          >
            この途中模試を破棄して新しく開始する
          </button>
        </section>
      ) : null}
      {message !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <p>{message}</p>
        </section>
      ) : null}
      {mockType === 'official_year' ? (
        <fieldset className="settings-fieldset" disabled={isStarting || inProgressId !== undefined}>
          <legend>年度</legend>
          <div className="settings-option-list">
            {b1AvailableYears.map((item) => (
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
      ) : null}
      <section aria-label="模試の大問を選択" className="b1-case-list">
        <h2>2大問を選択（{caseIds.length} / 2）</h2>
        {cases.map((caseItem) => (
          <article className="surface-card b1-case-card" key={caseItem.caseId}>
            <h3>
              問{caseItem.questionNumber}: {caseItem.title}
            </h3>
            <p>{caseItem.purposeSummary}</p>
            <p className="chip-list" aria-label="現在性ラベル">
              {[
                ...new Set(
                  caseItem.questionUnits.flatMap((unit) => {
                    const relevance = getEffectiveB1Relevance(caseItem.caseId, unit.questionId);
                    return relevance === undefined ? [] : [relevance.label];
                  }),
                ),
              ].map((label) => (
                <span className="chip chip-muted" key={label}>
                  {relevanceLabelText(label)}
                </span>
              ))}
            </p>
            <label className="setting-option" htmlFor={`b1-case-${caseItem.caseId}`}>
              <input
                checked={caseIds.includes(caseItem.caseId)}
                disabled={
                  isStarting ||
                  isStartConfirming ||
                  inProgressId !== undefined ||
                  (!caseIds.includes(caseItem.caseId) && caseIds.length >= 2)
                }
                id={`b1-case-${caseItem.caseId}`}
                onChange={() => toggleCase(caseItem.caseId)}
                type="checkbox"
              />
              この大問を選ぶ
            </label>
          </article>
        ))}
      </section>
      {cases.length < 2 ? (
        <p className="inline-notice inline-notice-warning" role="status">
          この模試種別に一致する大問が不足しているため、2大問の模試を開始できません。
        </p>
      ) : null}
      <button
        className="primary-button"
        disabled={
          caseIds.length !== 2 ||
          cases.length < 2 ||
          isStarting ||
          isStartConfirming ||
          inProgressId !== undefined
        }
        onClick={() => setIsStartConfirming(true)}
        type="button"
      >
        {isStarting ? '開始準備中…' : '開始内容を確認する'}
      </button>
      <p className="muted-text">確定済み科目B模試: {historyCount}回</p>
      {isStartConfirming ? (
        <ConfirmDialog
          description="試験中は模範解答・ヒントを表示しません。途中で閉じても、この端末で再開できます。"
          title="この内容で科目B模試を開始しますか？"
        >
          <dl className="b1-mock-summary-list">
            <div>
              <dt>模試種別</dt>
              <dd>{mockTypeLabel(mockType)}</dd>
            </div>
            <div>
              <dt>選択した大問</dt>
              <dd>
                {selectedCases
                  .map((caseItem) => `${caseItem.year}年度 問${caseItem.questionNumber}`)
                  .join('・')}
              </dd>
            </div>
            <div>
              <dt>解答単位</dt>
              <dd>{selectedUnitCount}件</dd>
            </div>
            <div>
              <dt>制限時間</dt>
              <dd>90分</dd>
            </div>
          </dl>
          <button
            className="primary-button"
            disabled={isStarting}
            onClick={() => void start()}
            type="button"
          >
            {isStarting ? '開始準備中…' : 'この内容で開始する'}
          </button>
          <button
            className="secondary-button"
            disabled={isStarting}
            onClick={() => setIsStartConfirming(false)}
            type="button"
          >
            選び直す
          </button>
        </ConfirmDialog>
      ) : null}
      {isDiscardConfirming ? (
        <ConfirmDialog
          description="入力済みの答案、見直し指定、途中状態が削除されます。通常演習や確定済みの模試履歴は削除されません。"
          title="途中の科目B模試を破棄しますか？"
        >
          <button
            className="danger-button"
            disabled={isDiscarding}
            onClick={() => void discardInProgressMock()}
            type="button"
          >
            {isDiscarding ? '破棄中…' : '途中模試を破棄する'}
          </button>
          <button
            className="secondary-button"
            disabled={isDiscarding}
            onClick={() => setIsDiscardConfirming(false)}
            type="button"
          >
            戻る
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function mockTypeLabel(mockType: B1MockType): string {
  return {
    current_focus: '現行対策模試',
    all_years: '全年度模試',
    legacy_reading: '旧技術を含む読解強化模試',
    official_year: '公式年度模試',
  }[mockType];
}
