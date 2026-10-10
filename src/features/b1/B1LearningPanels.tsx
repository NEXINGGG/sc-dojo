import { useEffect, useMemo, useState } from 'react';
import type { B1Case, B1QuestionUnit } from '../../data/b1';
import { getB1LearningSupportCatalog } from '../../data/b1LearningSupport';
import { database } from '../../database/database';
import type { B1AnswerAttemptRow } from '../../database/types';
import { recommendB1A2Questions } from '../../domain/b1A2Recommendation';
import type { B1SelfGrade } from '../../domain/b1';
import {
  type B1AnswerForm,
  type B1EvidenceSourceType,
  type B1FailureCauseId,
  type B1LearningMode,
} from '../../domain/b1LearningSupport';
import { B1LearningSupportRepository } from './b1LearningSupportRepository';

const repository = new B1LearningSupportRepository(database);

const answerFormLabels: Record<B1AnswerForm, string> = {
  term: '用語',
  number: '数値',
  reason: '理由',
  purpose: '目的',
  behavior: '動作・処理',
  setting: '設定内容',
  calculation: '計算結果',
  route: '経路',
  selection: '選択肢から選ぶ',
  other: '原本で指定された形式',
};

const evidenceTypeLabels: Record<B1EvidenceSourceType, string> = {
  log: 'ログ根拠',
  paragraph: '本文根拠',
  figure: '図',
  table: '表',
  calculation: '計算',
  configuration: '設定',
  sequence: 'シーケンス',
  general_knowledge: '技術知識',
};

const catalog = getB1LearningSupportCatalog();

export function B1RequirementBreakdownPanel({
  unit,
  mode,
  expanded,
  onToggle,
}: {
  unit: B1QuestionUnit;
  mode: Exclude<B1LearningMode, 'mock90' | 'mock150'>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const guidance = catalog.guidanceByQuestionId.get(unit.questionId);
  if (guidance === undefined) return null;
  const detailsId = `b1-requirements-${unit.questionId}`;
  const alwaysOpen = mode === 'training';
  const showDetails = alwaysOpen || expanded;
  const breakdown = guidance.requirementBreakdown;
  return (
    <section aria-labelledby={`${detailsId}-heading`} className="surface-card b1-learning-panel">
      <div className="b1-panel-heading">
        <div>
          <p className="eyebrow">設問要求</p>
          <h2 id={`${detailsId}-heading`}>何を確認して答えるか</h2>
        </div>
        {!alwaysOpen ? (
          <button
            aria-controls={detailsId}
            aria-expanded={showDetails}
            className="secondary-button compact-action"
            onClick={onToggle}
            type="button"
          >
            {showDetails ? '設問の読み方を閉じる' : '設問の読み方を見る'}
          </button>
        ) : null}
      </div>
      {showDetails ? (
        <dl id={detailsId} className="b1-requirement-list">
          <Requirement label="何を答えるか" value={breakdown.answerTarget} />
          <Requirement label="対象" value={breakdown.targetObject} />
          <Requirement label="対象環境" value={breakdown.targetEnvironment} />
          <Requirement label="状況" value={breakdown.situation} />
          {breakdown.trafficDirection !== undefined ? (
            <Requirement
              label="通信方向"
              value={`${breakdown.trafficDirection.from} → ${breakdown.trafficDirection.to}`}
            />
          ) : null}
          <Requirement label="回答形式" value={answerFormLabels[breakdown.answerForm]} />
          <Requirement label="回答数" value={`${breakdown.requiredAnswerCount}件`} />
          <Requirement
            label="制約"
            value={breakdown.constraints.join('／') || '公式問題冊子の指定を確認'}
          />
          <Requirement label="答案に含める要素" value={breakdown.responseChecklist.join('／')} />
          <Requirement label="よくある読み違い" value={breakdown.commonTraps.join('／')} />
          <Requirement label="トレーニングヒント" value={breakdown.trainingHint} />
        </dl>
      ) : null}
    </section>
  );
}

function Requirement({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function B1LearnerEvidencePanel({
  sessionId,
  unit,
  defaultPrintedPage,
  caseItem,
}: {
  sessionId: string;
  unit: B1QuestionUnit;
  defaultPrintedPage: number;
  caseItem?: B1Case;
}) {
  const [entries, setEntries] = useState<
    Awaited<ReturnType<typeof repository.listLearnerEvidenceBySession>>
  >([]);
  const [sourceType, setSourceType] = useState<B1EvidenceSourceType>('paragraph');
  const [printedPage, setPrintedPage] = useState(String(defaultPrintedPage));
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [evidenceId, setEvidenceId] = useState('');
  const locations = [
    ...(caseItem?.body.sections?.flatMap((s) =>
      s.paragraphs.map((p) => ({
        id: p.id,
        label: `${p.id}：${p.text.slice(0, 30)}`,
        page: p.printedPage,
        type: 'paragraph' as const,
      })),
    ) ?? []),
    ...(caseItem?.body.materials?.map((m) => ({
      id: m.id,
      label: m.caption,
      page: m.printedPage,
      type: m.kind === 'code' ? ('configuration' as const) : m.kind,
    })) ?? []),
  ];

  async function reload() {
    try {
      const next = await repository.listLearnerEvidenceBySession(sessionId);
      setEntries(next.filter((entry) => entry.questionId === unit.questionId));
    } catch {
      setMessage('根拠記録を読み込めませんでした。再読み込みしてもう一度お試しください。');
    }
  }

  useEffect(() => {
    setPrintedPage(String(defaultPrintedPage));
    setEditingId(undefined);
    setNote('');
    setLocation('');
    setEvidenceId('');
    void reload();
    // reload is intentionally scoped to the persisted session/question pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, unit.questionId, defaultPrintedPage]);

  async function saveEntry() {
    setIsSaving(true);
    setMessage(undefined);
    try {
      await repository.saveLearnerEvidence({
        ...(editingId === undefined ? {} : { id: editingId }),
        sessionId,
        questionId: unit.questionId,
        sourceType,
        ...(printedPage.trim() ? { printedPage: Number(printedPage) } : {}),
        ...(location.trim() ? { location } : {}),
        note,
        ...(evidenceId ? { evidenceId } : {}),
      });
      setEditingId(undefined);
      setNote('');
      setLocation('');
      setEvidenceId('');
      await reload();
      setMessage('根拠を端末に保存しました。外部へ送信しません。');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '根拠を保存できませんでした。再試行してください。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await repository.deleteLearnerEvidence(id);
      await reload();
      setMessage('根拠を削除しました。');
    } catch {
      setMessage('根拠を削除できませんでした。再試行してください。');
    }
  }

  function edit(entry: (typeof entries)[number]) {
    setEditingId(entry.id);
    setSourceType(entry.sourceType ?? 'paragraph');
    setPrintedPage(entry.printedPage === undefined ? '' : String(entry.printedPage));
    setLocation(entry.location ?? '');
    setNote(entry.note);
    setEvidenceId(entry.evidenceId ?? '');
  }

  return (
    <section
      aria-labelledby={`b1-evidence-${unit.questionId}`}
      className="surface-card b1-learning-panel"
    >
      <p className="eyebrow">利用者根拠</p>
      <h2 id={`b1-evidence-${unit.questionId}`}>答案の根拠を記録</h2>
      <p className="muted-text">根拠がなくても提出できます。記録はこの端末内だけに保存します。</p>
      <div className="b1-evidence-fields">
        {locations.length ? (
          <label className="b1-evidence-note">
            本文・図表から根拠を選ぶ
            <select
              value={evidenceId}
              onChange={(event) => {
                const id = event.currentTarget.value;
                setEvidenceId(id);
                const target = locations.find((l) => l.id === id);
                if (target) {
                  setLocation(target.id);
                  setSourceType(
                    target.type === 'image'
                      ? 'figure'
                      : target.type === 'text'
                        ? 'paragraph'
                        : target.type,
                  );
                  setPrintedPage(String(target.page ?? defaultPrintedPage));
                }
              }}
            >
              <option value="">参照位置を手入力する</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          根拠種別
          <select
            onChange={(event) => setSourceType(event.currentTarget.value as B1EvidenceSourceType)}
            value={sourceType}
          >
            {Object.entries(evidenceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          印刷ページ
          <input
            inputMode="numeric"
            min="1"
            onChange={(event) => setPrintedPage(event.currentTarget.value)}
            value={printedPage}
          />
        </label>
        <label>
          参照位置
          <input
            onChange={(event) => setLocation(event.currentTarget.value)}
            placeholder="例: 図2の矢印"
            value={location}
          />
        </label>
        <label className="b1-evidence-note">
          メモ
          <textarea
            onChange={(event) => setNote(event.currentTarget.value)}
            rows={3}
            value={note}
          />
        </label>
      </div>
      <button
        className="secondary-button"
        disabled={isSaving || note.trim().length === 0}
        onClick={() => void saveEntry()}
        type="button"
      >
        {editingId === undefined ? '根拠を追加' : '根拠を更新'}
      </button>
      <p aria-live="polite" className="muted-text">
        根拠 {entries.length}件{message === undefined ? '' : `・${message}`}
      </p>
      {entries.length > 0 ? (
        <ul className="b1-evidence-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{evidenceTypeLabels[entry.sourceType ?? 'paragraph']}</strong>
              <span>
                {entry.printedPage === undefined ? 'ページ未指定' : `${entry.printedPage}ページ`}
              </span>
              {entry.location !== undefined ? <span>{entry.location}</span> : null}
              <p>{entry.note}</p>
              <button className="text-button" onClick={() => edit(entry)} type="button">
                編集
              </button>
              <button
                className="text-button danger-text-button"
                onClick={() => void remove(entry.id)}
                type="button"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function B1PostSubmissionPanel({
  caseItem,
  sessionId,
  unit,
  selfGrade,
  onSelfGrade,
  onOpenPdfPage,
  attempts,
  onStartRewrite,
  onFinishRewrite,
  isRewriting,
  rewriteInPractice = false,
  onStartA2,
  onFailureCauses,
}: {
  caseItem: B1Case;
  sessionId: string;
  unit: B1QuestionUnit;
  selfGrade?: B1SelfGrade;
  onSelfGrade: (value: B1SelfGrade) => void;
  onOpenPdfPage: (page: number) => void;
  attempts: readonly B1AnswerAttemptRow[];
  onStartRewrite: () => void;
  onFinishRewrite: () => void;
  isRewriting: boolean;
  rewriteInPractice?: boolean;
  onStartA2: (failureCauseIds: readonly B1FailureCauseId[]) => void;
  onFailureCauses: (failureCauseIds: readonly B1FailureCauseId[]) => void;
}) {
  const guidance = catalog.guidanceByQuestionId.get(unit.questionId);
  const remediation = catalog.a2RemediationByQuestionId.get(unit.questionId);
  const [failureCauseIds, setFailureCauseIds] = useState<readonly B1FailureCauseId[]>([]);
  const [message, setMessage] = useState<string>();
  const requiresCauses =
    selfGrade === 'partial' || selfGrade === 'incorrect' || selfGrade === 'review';

  useEffect(() => {
    let active = true;
    void repository
      .getLearningReflection(sessionId, unit.questionId)
      .then((reflection) => {
        if (active) setFailureCauseIds(reflection?.failureCauseIds ?? []);
      })
      .catch(() => {
        if (active) setMessage('振返りを読み込めませんでした。');
      });
    return () => {
      active = false;
    };
  }, [sessionId, unit.questionId]);

  async function updateFailureCauses(next: readonly B1FailureCauseId[]) {
    setFailureCauseIds(next);
    if (!requiresCauses) return;
    try {
      await repository.saveLearningReflection({
        sessionId,
        questionId: unit.questionId,
        selfAssessment: selfGrade === 'partial' ? 'partial' : 'incorrect',
        failureCauseIds: next,
      });
      onFailureCauses(next);
      setMessage('失点原因を保存しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '失点原因を保存できませんでした。');
    }
  }

  const recommendation = useMemo(
    () =>
      remediation === undefined
        ? undefined
        : recommendB1A2Questions({ remediation, failureCauseIds }),
    [failureCauseIds, remediation],
  );
  if (guidance === undefined) return null;
  return (
    <section aria-label="提出後の振返り" className="b1-post-submission">
      <section className="surface-card b1-learning-panel">
        <p className="eyebrow">{caseItem.examCode === 'SC' ? '教材の根拠' : '公式根拠'}</p>
        <h2>
          {caseItem.examCode === 'SC' ? '本文・図表・ログで確認する位置' : '公式PDFで確認する位置'}
        </h2>
        {guidance.officialEvidence.map((evidence) => (
          <article className="b1-official-evidence" key={evidence.evidenceId}>
            <strong>
              {evidenceTypeLabels[evidence.sourceType]}・{evidence.printedPage}ページ
            </strong>
            <p>{evidence.reference}</p>
            <p>{evidence.summary}</p>
            <p>{evidence.reason}</p>
            <button
              className="text-button"
              onClick={() => onOpenPdfPage(evidence.printedPage)}
              type="button"
            >
              このページを開く
            </button>
          </article>
        ))}
        <p className="muted-text">
          {caseItem.examCode === 'SC'
            ? '本文の段落・セクション・図表の位置を確認して根拠を記録してください。'
            : 'PDF未登録時は上の公式PDFを開くボタンから確認し、オフライン用に端末へ登録できます。'}
        </p>
      </section>
      <section className="surface-card b1-learning-panel">
        <p className="eyebrow">自己採点</p>
        <h2>答案を振り返る</h2>
        <div className="card-action-row">
          {(
            [
              ['correct', 'できた'],
              ['partial', '惜しい'],
              ['incorrect', 'できなかった'],
            ] as const
          ).map(([grade, label]) => (
            <button
              aria-pressed={selfGrade === grade}
              className="secondary-button compact-action"
              key={grade}
              onClick={() => onSelfGrade(grade)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {requiresCauses ? (
          <fieldset className="b1-failure-causes">
            <legend>失点原因（複数選択）</legend>
            {catalog.failureCauses
              .filter(
                (cause) =>
                  caseItem.examCode === 'SC' ||
                  guidance.applicableFailureCauseIds.includes(cause.id),
              )
              .map((cause) => (
                <label key={cause.id}>
                  <input
                    aria-label={cause.displayName}
                    checked={failureCauseIds.includes(cause.id)}
                    onChange={(event) =>
                      void updateFailureCauses(
                        event.currentTarget.checked
                          ? [...failureCauseIds, cause.id]
                          : failureCauseIds.filter((id) => id !== cause.id),
                      )
                    }
                    type="checkbox"
                  />
                  {cause.displayName}
                  {caseItem.examCode === 'SC' &&
                  guidance.applicableFailureCauseIds.includes(cause.id)
                    ? '（この設問の推奨）'
                    : ''}
                </label>
              ))}
          </fieldset>
        ) : null}
        {message !== undefined ? (
          <p aria-live="polite" className="muted-text">
            {message}
          </p>
        ) : null}
      </section>
      <section className="surface-card b1-learning-panel">
        <p className="eyebrow">A2連動復習</p>
        <h2>次に取り組むこと</h2>
        {recommendation === undefined ? (
          <p>推薦情報を読み込めませんでした。</p>
        ) : recommendation.status === 'recommended' ? (
          <>
            <p>
              {recommendation.a2QuestionIds.length}問のA2復習を推薦します。{recommendation.reason}
            </p>
            <button
              className="primary-button"
              disabled={!requiresCauses || failureCauseIds.length === 0}
              onClick={() => onStartA2(failureCauseIds)}
              type="button"
            >
              A2復習を開始する
            </button>
          </>
        ) : (
          <>
            <p>{recommendation.notApplicableReason}</p>
            {failureCauseIds.includes('time_management') ? (
              <p>時間を計りながら、同じ科目B設問をもう一度解くことをおすすめします。</p>
            ) : null}
          </>
        )}
      </section>
      <section className="surface-card b1-learning-panel">
        <p className="eyebrow">答案の書き直し</p>
        <h2>前の答案を残して書き直す</h2>
        {rewriteInPractice ? (
          <p>
            提出した模試答案を残し、この設問から別の演習を開始します。書き直しも途中保存できます。
          </p>
        ) : null}
        <p>
          保存済みattempt: {attempts.length}件
          {attempts.length > 1
            ? `（最新: ${attempts[attempts.length - 1]?.characterCount ?? 0}字）`
            : ''}
        </p>
        {attempts.length > 0 ? (
          <ol className="b1-attempt-list">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                attempt {attempt.attemptNumber}: {attempt.characterCount}字・
                {attempt.selfGrade ?? '未採点'}
              </li>
            ))}
          </ol>
        ) : null}
        {isRewriting ? (
          <button className="primary-button" onClick={onFinishRewrite} type="button">
            書き直した答案を保存する
          </button>
        ) : (
          <button className="secondary-button" onClick={onStartRewrite} type="button">
            {rewriteInPractice ? '演習で答案を書き直す' : '答案を書き直す'}
          </button>
        )}
      </section>
      <p className="sr-only">{caseItem.caseId}</p>
    </section>
  );
}
