import type { B1AnswerField, B1QuestionUnit } from '../data/b1';

export const B1_OFFICIAL_GRADING_NOTICE =
  'アプリの判定は学習用の参考判定であり、IPAの正式採点ではありません。';

export type B1AnswerValues = Record<string, string>;
/**
 * `review` is retained only for sessions created before Phase 3.  New screens
 * write `incorrect`, which is the wording shown to learners.
 */
export type B1SelfGrade = 'correct' | 'partial' | 'incorrect' | 'review';

export interface B1AutomaticFieldGrade {
  fieldId: string;
  answered: boolean;
  isCorrect?: boolean;
}

export interface B1UnitGrade {
  mode: B1QuestionUnit['grading']['mode'];
  automaticFields: readonly B1AutomaticFieldGrade[];
  automaticCorrect?: boolean;
}

export function normalizeB1Answer(value: string, inputKind: B1AnswerField['inputKind']): string {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[，、]/g, ',')
    .replace(/[．。]/g, '.')
    .toLocaleLowerCase('en-US');

  if (inputKind === 'number') {
    return normalized.replace(/,/g, '');
  }
  if (inputKind === 'ip_address' || inputKind === 'cidr') {
    return normalizeIpOrCidr(normalized);
  }
  return normalized;
}

export function gradeB1Unit(unit: B1QuestionUnit, answers: B1AnswerValues): B1UnitGrade {
  const automaticFields = unit.answerFields.map((field) => {
    const value = answers[field.fieldId] ?? '';
    const answered = value.trim().length > 0;
    if (field.gradingExcluded) return { fieldId: field.fieldId, answered: false };
    if (unit.grading.mode !== 'automatic' || field.acceptedAnswers.length === 0 || !answered) {
      return { fieldId: field.fieldId, answered };
    }
    return {
      fieldId: field.fieldId,
      answered,
      isCorrect: matchesAcceptedAnswer(value, field),
    };
  });
  const automaticCorrect =
    unit.grading.mode !== 'automatic'
      ? undefined
      : automaticFields.length > 0 && automaticFields.every((field) => field.isCorrect === true);
  return { mode: unit.grading.mode, automaticFields, automaticCorrect };
}

export function hasB1Answer(values: B1AnswerValues): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

function matchesAcceptedAnswer(value: string, field: B1AnswerField): boolean {
  const normalizedValue = normalizeB1Answer(value, field.inputKind);
  const normalizedAccepted = field.acceptedAnswers.map((answer) =>
    normalizeB1Answer(answer, field.inputKind),
  );
  if (field.expectedCount > 1 || !field.orderMatters) {
    const answerItems = splitAnswers(normalizedValue);
    const acceptedItems = normalizedAccepted.flatMap(splitAnswers);
    if (
      answerItems.length !== field.expectedCount ||
      acceptedItems.length !== field.expectedCount
    ) {
      return false;
    }
    const left = field.orderMatters ? answerItems : answerItems.slice().sort();
    const right = field.orderMatters ? acceptedItems : acceptedItems.slice().sort();
    return left.every((item, index) => item === right[index]);
  }
  return normalizedAccepted.includes(normalizedValue);
}

function splitAnswers(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIpOrCidr(value: string): string {
  const compact = value.replace(/\s+/g, '');
  const [address, prefix] = compact.split('/');
  const normalizedAddress = address
    .split('.')
    .map((part) => (part !== '' && /^\d+$/.test(part) ? String(Number(part)) : part))
    .join('.');
  if (prefix === undefined) {
    return normalizedAddress;
  }
  return `${normalizedAddress}/${/^\d+$/.test(prefix) ? String(Number(prefix)) : prefix}`;
}
