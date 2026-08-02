import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  b1AvailableYears,
  b1Cases,
  getB1CasesForYear,
  getB1CategoryName,
  getEffectiveB1Relevance,
} from '../data/b1';
import { database } from '../database/database';
import { B1DataError, B1Repository } from '../features/b1/b1Repository';
import { B1PreferencesRepository } from '../features/b1/b1PreferencesRepository';
import { matchesB1RelevanceFilter, relevanceLabelText } from '../domain/b1LearningFlow';
import type { B1LearningMode, B1RelevanceFilter } from '../domain/b1LearningSupport';

const repository = new B1Repository(database);
const preferences = new B1PreferencesRepository(database);

export function B1PracticePage() {
  const navigate = useNavigate();
  const [inProgressId, setInProgressId] = useState<string>();
  const [isStarting, setIsStarting] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [mode, setMode] = useState<Exclude<B1LearningMode, 'mock90'>>('training');
  const [relevanceFilter, setRelevanceFilter] = useState<B1RelevanceFilter>();

  useEffect(() => {
    void Promise.all([repository.getInProgressPractice(), preferences.get()]).then(
      ([session, saved]) => {
        setInProgressId(session?.id);
        setRelevanceFilter(saved.relevanceFilter);
      },
    );
  }, []);

  async function start(caseId: string) {
    const caseItem = b1Cases.find((item) => item.caseId === caseId);
    if (caseItem === undefined) return;
    setIsStarting(caseId);
    setMessage(undefined);
    try {
      const session = await repository.createPractice(caseItem, mode);
      navigate(`/b1/practice/${session.id}`);
    } catch (error) {
      if (error instanceof B1DataError) setMessage(error.message);
      else setMessage('B-1演習を開始できませんでした。端末の保存領域を確認してください。');
    } finally {
      setIsStarting(undefined);
    }
  }

  async function setLabel(label: keyof B1RelevanceFilter, checked: boolean) {
    const current = relevanceFilter;
    if (current === undefined) return;
    const next = { ...current, [label]: checked };
    setRelevanceFilter(next);
    try {
      await preferences.save(next);
    } catch {
      setMessage('現在性フィルターを保存できませんでした。再試行してください。');
    }
  }

  async function resetFilter() {
    try {
      const next = await preferences.reset();
      setRelevanceFilter(next.relevanceFilter);
    } catch {
      setMessage('現在性フィルターをリセットできませんでした。');
    }
  }

  return (
    <>
      <PageHeader
        description="大問を1つ選び、設問掲載ページを案内しながら答案を入力します。"
        title="B-1演習"
      />
      <fieldset className="settings-fieldset" disabled={inProgressId !== undefined}>
        <legend>演習モード</legend>
        <div className="settings-option-list">
          <label className="setting-option">
            <input
              checked={mode === 'training'}
              name="b1-practice-mode"
              onChange={() => setMode('training')}
              type="radio"
            />
            トレーニング（設問要求を表示）
          </label>
          <label className="setting-option">
            <input
              checked={mode === 'practical'}
              name="b1-practice-mode"
              onChange={() => setMode('practical')}
              type="radio"
            />
            実践（必要なときだけ設問の読み方を見る）
          </label>
        </div>
      </fieldset>
      {relevanceFilter !== undefined ? (
        <fieldset className="settings-fieldset">
          <legend>現在性で絞り込む</legend>
          <div className="settings-option-list">
            {(Object.keys(relevanceFilter) as (keyof B1RelevanceFilter)[]).map((label) => (
              <label className="setting-option" key={label}>
                <input
                  checked={relevanceFilter[label]}
                  onChange={(event) => void setLabel(label, event.currentTarget.checked)}
                  type="checkbox"
                />
                {relevanceLabelText(label)}
              </label>
            ))}
          </div>
          <button className="text-button" onClick={() => void resetFilter()} type="button">
            初期状態へリセット
          </button>
        </fieldset>
      ) : null}
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
      {b1AvailableYears.map((year) => (
        <section aria-label={`${year}年度のB-1演習`} className="b1-case-list" key={year}>
          <h2>{year}年度</h2>
          {getB1CasesForYear(year)
            .filter(
              (caseItem) =>
                relevanceFilter === undefined ||
                matchesB1RelevanceFilter(caseItem, relevanceFilter),
            )
            .map((caseItem) => (
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
          {getB1CasesForYear(year).filter(
            (caseItem) =>
              relevanceFilter === undefined || matchesB1RelevanceFilter(caseItem, relevanceFilter),
          ).length === 0 ? (
            <p className="muted-text">この年度には現在のフィルターに一致する大問がありません。</p>
          ) : null}
        </section>
      ))}
    </>
  );
}
