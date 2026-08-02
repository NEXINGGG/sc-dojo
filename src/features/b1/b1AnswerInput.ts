import type { B1AnswerField, B1QuestionUnit } from '../../data/b1';

export type B1AnswerInputUnit = Omit<B1QuestionUnit, 'answerFields' | 'grading'> & {
  answerFields: readonly Omit<B1AnswerField, 'acceptedAnswers'>[];
  grading: Omit<B1QuestionUnit['grading'], 'officialAnswerConcepts'>;
};

/** Creates the answer-entry view model without accepted answers or official concepts. */
export function toB1AnswerInputUnit(unit: B1QuestionUnit): B1AnswerInputUnit {
  return {
    ...unit,
    answerFields: unit.answerFields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      inputKind: field.inputKind,
      maxLength: field.maxLength,
      orderMatters: field.orderMatters,
      expectedCount: field.expectedCount,
      notes: field.notes,
      ...(field.legacyAnswerSource === undefined
        ? {}
        : { legacyAnswerSource: field.legacyAnswerSource }),
    })),
    grading: {
      mode: unit.grading.mode,
      exactAutomaticEligible: unit.grading.exactAutomaticEligible,
      notice: unit.grading.notice,
      caution: unit.grading.caution,
    },
  };
}
