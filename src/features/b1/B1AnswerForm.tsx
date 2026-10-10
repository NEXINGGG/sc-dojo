import { useRef } from 'react';
import type { B1AnswerField, B1QuestionUnit } from '../../data/b1';
import {
  B1_OFFICIAL_GRADING_NOTICE,
  gradeB1Unit,
  type B1AnswerValues,
  type B1SelfGrade,
} from '../../domain/b1';
import type { B1AnswerInputUnit } from './b1AnswerInput';
import { SourceImage } from './B1CaseBody';
import { B1DiagramInput, B1DiagramPreview } from './B1DiagramInput';

export function B1AnswerForm({
  unit,
  referenceUnit,
  values,
  disabled = false,
  revealReference = false,
  selfGrade,
  onChange,
  onSelfGrade,
  onClearSelfGrade,
}: {
  unit: B1AnswerInputUnit;
  referenceUnit?: B1QuestionUnit;
  values: B1AnswerValues;
  disabled?: boolean;
  revealReference?: boolean;
  selfGrade?: B1SelfGrade;
  onChange: (fieldId: string, value: string) => void;
  onSelfGrade?: (grade: B1SelfGrade) => void;
  onClearSelfGrade?: () => void;
}) {
  const composing = useRef(new Set<string>());
  const reference =
    revealReference && referenceUnit !== undefined ? gradeB1Unit(referenceUnit, values) : undefined;

  function updateField(field: Pick<B1AnswerField, 'fieldId' | 'maxLength'>, value: string) {
    const limited =
      composing.current.has(field.fieldId) || field.maxLength === null
        ? value
        : value.slice(0, field.maxLength);
    onChange(field.fieldId, limited);
  }

  function endComposition(field: Pick<B1AnswerField, 'fieldId' | 'maxLength'>, value: string) {
    composing.current.delete(field.fieldId);
    onChange(field.fieldId, field.maxLength === null ? value : value.slice(0, field.maxLength));
  }

  return (
    <section aria-labelledby={`b1-answer-${unit.questionId}`} className="b1-answer-form">
      <p className="eyebrow">答案</p>
      <h2 id={`b1-answer-${unit.questionId}`}>{unit.label}</h2>
      <p className="b1-prompt-summary b1-original-text">
        {unit.promptText ?? `設問の案内（学習用）: ${unit.promptSummary}`}
      </p>
      {unit.promptSourceImages?.length ? (
        <details>
          <summary>設問・解答群を原本で確認する</summary>
          {unit.promptSourceImages.map((p) => (
            <SourceImage key={p.assetUrl} url={p.assetUrl} alt={p.alt} />
          ))}
        </details>
      ) : null}
      <p className="muted-text">
        {unit.promptTextIncluded
          ? '設問本文・図表は、左側（スマートフォンでは本文・図表タブ）で確認してください。'
          : '設問本文・図表は、左側（スマートフォンでは公式PDFタブ）の公式PDFで確認してください。'}
      </p>
      <fieldset className="b1-answer-fieldset" disabled={disabled}>
        <legend>答案を入力</legend>
        {unit.answerFields.map((field) => {
          const value = values[field.fieldId] ?? '';
          return (
            <label
              className="b1-answer-field"
              htmlFor={`${unit.questionId}-${field.fieldId}`}
              key={field.fieldId}
            >
              <span>
                <strong>{field.label}</strong>
                {field.inputKind === 'multi_select'
                  ? `（${field.expectedCount}項目を「、」または改行で区切る）`
                  : field.inputKind === 'sequence'
                    ? `（順番どおりに${field.expectedCount}項目を区切る）`
                    : ''}
              </span>
              {field.choices?.length ? <small>解答群：{field.choices.join('／')}</small> : null}
              {field.answerFormat === 'diagram' ? (
                <B1DiagramInput
                  id={`${unit.questionId}-${field.fieldId}`}
                  value={value}
                  disabled={disabled}
                  onChange={(v) => onChange(field.fieldId, v)}
                />
              ) : isMultiline(field) ? (
                <textarea
                  id={`${unit.questionId}-${field.fieldId}`}
                  maxLength={field.maxLength ?? undefined}
                  disabled={field.gradingExcluded}
                  onChange={(event) => updateField(field, event.currentTarget.value)}
                  onCompositionEnd={(event) => endComposition(field, event.currentTarget.value)}
                  onCompositionStart={() => composing.current.add(field.fieldId)}
                  rows={field.inputKind === 'description' ? 4 : 2}
                  value={value}
                />
              ) : (
                <input
                  id={`${unit.questionId}-${field.fieldId}`}
                  inputMode={inputModeFor(field)}
                  maxLength={field.maxLength ?? undefined}
                  disabled={field.gradingExcluded}
                  onChange={(event) => updateField(field, event.currentTarget.value)}
                  onCompositionEnd={(event) => endComposition(field, event.currentTarget.value)}
                  onCompositionStart={() => composing.current.add(field.fieldId)}
                  value={value}
                />
              )}
              {field.maxLength !== null ? (
                <small>
                  {value.length} / {field.maxLength}字
                </small>
              ) : null}
              {field.notes !== null ? <small>{field.notes}</small> : null}
            </label>
          );
        })}
      </fieldset>
      <p className="b1-grading-notice">{B1_OFFICIAL_GRADING_NOTICE}</p>
      {reference !== undefined ? (
        <section aria-live="polite" className="b1-reference-grade surface-card">
          <h3>模範解答と自分の回答を確認する</h3>
          <p className="muted-text">回答欄ごとに見比べてから、自己評価を記録してください。</p>
          <dl className="b1-answer-comparison">
            {referenceUnit?.answerFields.map((field) => (
              <div key={field.fieldId}>
                <dt>{field.label}</dt>
                <dd>
                  <strong>自分の回答</strong>
                  {field.answerFormat === 'diagram' ? (
                    <B1DiagramPreview value={values[field.fieldId] ?? ''} />
                  ) : (
                    <span>{values[field.fieldId]?.trim() || '未入力'}</span>
                  )}
                </dd>
                <dd>
                  <strong>模範解答・解答例</strong>
                  <span>
                    {field.officialAnswer ??
                      (field.acceptedAnswers.join('／') || '公式PDFで確認してください')}
                  </span>
                </dd>
                {field.acceptableAnswers?.length ? (
                  <dd>
                    <strong>学習用の許容表現例</strong>
                    {field.acceptableAnswers.join('／')}
                  </dd>
                ) : null}
                {field.requiredKeywords?.length ? (
                  <dd>
                    <strong>確認する語・観点</strong>
                    {field.requiredKeywords.join('／')}
                  </dd>
                ) : null}
                {field.scoringPoints?.length ? (
                  <dd>
                    <strong>自己採点のポイント</strong>
                    {field.scoringPoints.join('／')}
                  </dd>
                ) : null}
                {field.gradingNote ? <dd>{field.gradingNote}</dd> : null}
                {field.officialAnswerAsset ? (
                  <dd>
                    <SourceImage
                      url={field.officialAnswerAsset.assetUrl}
                      alt={field.officialAnswerAsset.alt}
                    />
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
          {unit.grading.mode === 'automatic' ? (
            <p
              className={
                reference.automaticCorrect ? 'result-correct-text' : 'result-incorrect-text'
              }
            >
              {reference.automaticCorrect ? '参考判定: 一致' : '参考判定: 要確認'}
            </p>
          ) : null}
          <p>公式解答の観点: {referenceUnit?.grading.officialAnswerConcepts.join('／')}</p>
          {referenceUnit?.explanation ? (
            <section aria-label="学習用解説">
              <h3>学習用解説</h3>
              <dl className="b1-requirement-list">
                <div>
                  <dt>何を問われているか</dt>
                  <dd>{referenceUnit.explanation.asked}</dd>
                </div>
                <div>
                  <dt>本文のどこを見るか</dt>
                  <dd>{referenceUnit.explanation.lookAt}</dd>
                  {referenceUnit.explanation.necessaryKnowledge ? (
                    <>
                      <dt>必要知識</dt>
                      <dd>{referenceUnit.explanation.necessaryKnowledge}</dd>
                    </>
                  ) : null}
                </div>
                <div>
                  <dt>どう考えるか</dt>
                  <dd>{referenceUnit.explanation.reasoning}</dd>
                </div>
                <div>
                  <dt>公式解答との対応</dt>
                  <dd>{referenceUnit.explanation.officialAnswerReason}</dd>
                </div>
                <div>
                  <dt>間違えやすいポイント</dt>
                  <dd>{referenceUnit.explanation.commonMistakes}</dd>
                </div>
              </dl>
              <h3>答えの作り方</h3>
              <ol>
                {referenceUnit.answerStrategy?.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {referenceUnit.commentaryInsight ? <p>{referenceUnit.commentaryInsight}</p> : null}
            </section>
          ) : null}
          <div aria-label="自己評価" className="card-action-row">
            <SelfGradeButton
              active={selfGrade === 'correct'}
              label="できた"
              onClick={() => onSelfGrade?.('correct')}
            />
            <SelfGradeButton
              active={selfGrade === 'partial'}
              label="惜しい"
              onClick={() => onSelfGrade?.('partial')}
            />
            <SelfGradeButton
              active={selfGrade === 'incorrect' || selfGrade === 'review'}
              label="できなかった"
              onClick={() => onSelfGrade?.('incorrect')}
            />
            {selfGrade !== undefined ? (
              <button className="text-button" onClick={onClearSelfGrade} type="button">
                未評価に戻す
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SelfGradeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="secondary-button compact-action"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function isMultiline(field: Pick<B1AnswerField, 'inputKind'>): boolean {
  return (
    field.inputKind === 'description' ||
    field.inputKind === 'multi_select' ||
    field.inputKind === 'sequence'
  );
}

function inputModeFor(field: Pick<B1AnswerField, 'inputKind'>): 'text' | 'numeric' | 'url' {
  if (field.inputKind === 'number') return 'numeric';
  if (field.inputKind === 'url_or_fqdn') return 'url';
  return 'text';
}
