import { useRef } from 'react';
import type { B1AnswerField, B1QuestionUnit } from '../../data/b1';
import {
  B1_OFFICIAL_GRADING_NOTICE,
  gradeB1Unit,
  type B1AnswerValues,
  type B1SelfGrade,
} from '../../domain/b1';

export function B1AnswerForm({
  unit,
  values,
  disabled = false,
  revealReference = false,
  selfGrade,
  onChange,
  onSelfGrade,
}: {
  unit: B1QuestionUnit;
  values: B1AnswerValues;
  disabled?: boolean;
  revealReference?: boolean;
  selfGrade?: B1SelfGrade;
  onChange: (fieldId: string, value: string) => void;
  onSelfGrade?: (grade: B1SelfGrade) => void;
}) {
  const composing = useRef(new Set<string>());
  const reference = revealReference ? gradeB1Unit(unit, values) : undefined;

  function updateField(field: B1AnswerField, value: string) {
    const limited =
      composing.current.has(field.fieldId) || field.maxLength === null
        ? value
        : value.slice(0, field.maxLength);
    onChange(field.fieldId, limited);
  }

  function endComposition(field: B1AnswerField, value: string) {
    composing.current.delete(field.fieldId);
    onChange(field.fieldId, field.maxLength === null ? value : value.slice(0, field.maxLength));
  }

  return (
    <section aria-labelledby={`b1-answer-${unit.questionId}`} className="b1-answer-form">
      <p className="eyebrow">答案</p>
      <h2 id={`b1-answer-${unit.questionId}`}>{unit.label}</h2>
      <p className="b1-prompt-summary">設問の趣旨: {unit.promptSummary}</p>
      <p className="muted-text">
        設問本文・図表は、左側（スマートフォンでは公式PDFタブ）の公式PDFで確認してください。
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
              {isMultiline(field) ? (
                <textarea
                  id={`${unit.questionId}-${field.fieldId}`}
                  maxLength={field.maxLength ?? undefined}
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
          <h3>提出後の参考判定・自己採点</h3>
          {unit.grading.mode === 'automatic' ? (
            <p
              className={
                reference.automaticCorrect ? 'result-correct-text' : 'result-incorrect-text'
              }
            >
              {reference.automaticCorrect ? '参考判定: 一致' : '参考判定: 要確認'}
            </p>
          ) : null}
          {unit.grading.mode !== 'automatic' ? (
            <>
              <p>公式解答の観点: {unit.grading.officialAnswerConcepts.join('／')}</p>
              <div className="card-action-row">
                <SelfGradeButton
                  active={selfGrade === 'correct'}
                  label="正解相当"
                  onClick={() => onSelfGrade?.('correct')}
                />
                <SelfGradeButton
                  active={selfGrade === 'partial'}
                  label="部分点相当"
                  onClick={() => onSelfGrade?.('partial')}
                />
                <SelfGradeButton
                  active={selfGrade === 'review'}
                  label="復習が必要"
                  onClick={() => onSelfGrade?.('review')}
                />
              </div>
            </>
          ) : null}
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

function isMultiline(field: B1AnswerField): boolean {
  return (
    field.inputKind === 'description' ||
    field.inputKind === 'multi_select' ||
    field.inputKind === 'sequence'
  );
}

function inputModeFor(field: B1AnswerField): 'text' | 'numeric' | 'url' {
  if (field.inputKind === 'number') return 'numeric';
  if (field.inputKind === 'url_or_fqdn') return 'url';
  return 'text';
}
