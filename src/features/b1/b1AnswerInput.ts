import type { B1AnswerField, B1QuestionUnit } from '../../data/b1';

export type B1AnswerInputUnit = Omit<
  B1QuestionUnit,
  | 'answerFields'
  | 'grading'
  | 'explanation'
  | 'answerStrategy'
  | 'evidenceRefs'
  | 'guidance'
  | 'commentaryInsight'
  | 'answerConcepts'
> & {
  answerFields: readonly Omit<
    B1AnswerField,
    | 'acceptedAnswers'
    | 'officialAnswer'
    | 'acceptableAnswers'
    | 'requiredKeywords'
    | 'scoringPoints'
    | 'gradingNote'
    | 'officialAnswerAsset'
  >[];
  grading: Omit<B1QuestionUnit['grading'], 'officialAnswerConcepts'>;
};

/** Creates the answer-entry view model without accepted answers or official concepts. */
export function toB1AnswerInputUnit(unit: B1QuestionUnit): B1AnswerInputUnit {
  return {
    questionId: unit.questionId,
    label: unit.label,
    promptSummary: unit.promptSummary,
    promptText: unit.promptText,
    promptSourceImages: unit.promptSourceImages,
    answerType: unit.answerType,
    gradingMode: unit.gradingMode,
    readyForApp: unit.readyForApp,
    promptTextIncluded: unit.promptTextIncluded,
    requiresManualPromptTranscription: unit.requiresManualPromptTranscription,
    sourcePromptLocator: unit.sourcePromptLocator,
    answerFields: unit.answerFields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      inputKind: field.inputKind,
      maxLength: field.maxLength,
      orderMatters: field.orderMatters,
      expectedCount: field.expectedCount,
      notes: field.notes,
      choices: field.choices,
      gradingExcluded: field.gradingExcluded,
      answerFormat: field.answerFormat,
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
