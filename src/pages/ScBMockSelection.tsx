import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { b1Cases } from '../data/b1';
import { isScBFoundationPilot, isScBPilot } from '../data/pilotMode';
import { database } from '../database/database';
import { B1Repository } from '../features/b1/b1Repository';
import { scBExamConfig, toggleB1CaseSelection } from '../domain/b1ExamConfig';
import { PageHeader } from '../components/PageHeader';

const repository = new B1Repository(database);

export function ScBMockSelection() {
  const navigate = useNavigate();
  const [examSetId, setExamSetId] = useState(b1Cases[0]?.examSetId);
  const [selected, setSelected] = useState<string[]>([]);
  const [inProgressId, setInProgressId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const cases = b1Cases.filter((item) => item.examSetId === examSetId);
  useEffect(() => {
    void repository
      .getInProgressMock()
      .then((row) => setInProgressId(row?.status === 'in_progress' ? row.id : undefined))
      .catch(() => setMessage('保存データを読み込めませんでした。再読み込みしてください。'));
  }, []);
  async function start() {
    setBusy(true);
    try {
      const session = await repository.createMock(cases[0].year, selected);
      navigate(`/b1/mock/${session.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '開始できませんでした。再試行してください。',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="科目B模試"
        description={`${scBExamConfig.presentedCount}問から${scBExamConfig.selectedCount}問を選び、${scBExamConfig.durationSeconds / 60}分で解答します。`}
      />
      {isScBPilot ? (
        <p className="inline-notice inline-notice-warning">
          {isScBFoundationPilot
            ? '開発用の架空pilot教材です。正式過去問ではありません。'
            : 'IPA公式2025年度秋期の4問を使う開発用pilotです。正式教材への切替前の検証用です。'}
        </p>
      ) : null}
      <p>選択画面では問題番号と試験回を表示します。開始後に本文・図表・設問を確認できます。</p>
      {inProgressId ? (
        <Link className="primary-button" to={`/b1/mock/${inProgressId}`}>
          模試を再開する
        </Link>
      ) : null}
      <label className="setting-option">
        試験回
        <select
          value={examSetId}
          disabled={busy || !!inProgressId}
          onChange={(event) => {
            setExamSetId(event.target.value);
            setSelected([]);
          }}
        >
          {[...new Set(b1Cases.map((item) => item.examSetId))].map((id) => (
            <option key={id} value={id}>
              {(() => {
                const item = b1Cases.find((c) => c.examSetId === id);
                return `${item?.year}年度${item?.term === 'spring' ? '春期' : '秋期'}`;
              })()}
            </option>
          ))}
        </select>
      </label>
      <section aria-label="模試の大問を選択" className="b1-case-list">
        <h2>2問を選択（{selected.length} / 2）</h2>
        {cases.map((item) => (
          <article className="surface-card" key={item.caseId}>
            <h3>
              {item.year}年度 問{item.questionNumber}
            </h3>
            <label className="setting-option">
              <input
                type="checkbox"
                aria-label={`問${item.questionNumber}を選ぶ`}
                checked={selected.includes(item.caseId)}
                disabled={busy || !!inProgressId}
                onChange={() => {
                  const result = toggleB1CaseSelection(selected, item.caseId);
                  setSelected(result.selected);
                  setMessage(result.message);
                }}
              />
              この大問を選ぶ
            </label>
          </article>
        ))}
      </section>
      {message ? (
        <p role="status" className="inline-notice inline-notice-warning">
          {message}
        </p>
      ) : null}
      <p>
        制限時間: {scBExamConfig.durationSeconds / 60}
        分。開始時から計測し、途中で閉じても締切は変わりません。提出後に自己採点します。
      </p>
      <button
        className="primary-button"
        type="button"
        disabled={
          selected.length !== scBExamConfig.selectedCount ||
          cases.length !== scBExamConfig.presentedCount ||
          busy ||
          !!inProgressId
        }
        onClick={() => void start()}
      >
        {scBExamConfig.durationSeconds / 60}分模試を開始する
      </button>
    </>
  );
}
