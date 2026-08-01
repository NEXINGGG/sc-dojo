import { getSubjectCatalog } from './catalog';
import failureCausesPayload from '../../data/b1-failure-causes.json';
import topicAliasesPayload from '../../data/b1-a2-topic-aliases.json';
import {
  b1Cases,
  b1QuestionUnits,
  type B1AnswerField,
  type B1Case,
  type B1QuestionUnit,
} from './b1';
import { getB1QuestionOfficialReview } from './b1OfficialReview';
import {
  B1_FAILURE_CAUSE_IDS,
  type B1A2Remediation,
  type B1AnswerForm,
  type B1EvidenceSourceType,
  type B1FailureCauseDefinition,
  type B1FailureCauseId,
  type B1OfficialEvidence,
  type B1QuestionOfficialReview,
  type B1QuestionGuidance,
} from '../domain/b1LearningSupport';

export const b1FailureCauses = failureCausesPayload.failureCauses as readonly B1FailureCauseDefinition[];

export interface B1LearningSupportCatalog {
  guidance: readonly B1QuestionGuidance[];
  guidanceByQuestionId: ReadonlyMap<string, B1QuestionGuidance>;
  a2Remediations: readonly B1A2Remediation[];
  a2RemediationByQuestionId: ReadonlyMap<string, B1A2Remediation>;
  failureCauses: readonly B1FailureCauseDefinition[];
}

const directionPattern = /通信|経路|送信|宛先|転送|ルート|配送|流入|流出/;
const explanationPattern = /理由|問題|説明|目的|動作|効果|対応|対策|確認|比較/;
const calculationPattern = /計算|帯域|時間|秒|速度|個数|数値|アドレス|CIDR|プレフィックス/;

/**
 * A2 candidates are selected only from terms explicitly recorded for the B-1 case.
 * A missing direct match remains not_applicable instead of falling back to a broad category.
 */
const a2TopicAliases = topicAliasesPayload.aliases as Readonly<Record<string, readonly string[]>>;

let catalogCache: B1LearningSupportCatalog | undefined;

export function getB1LearningSupportCatalog(): B1LearningSupportCatalog {
  catalogCache ??= buildCatalog();
  return catalogCache;
}

export async function loadB1LearningSupportCatalog(): Promise<B1LearningSupportCatalog> {
  return getB1LearningSupportCatalog();
}

function buildCatalog(): B1LearningSupportCatalog {
  const caseByQuestionId = new Map(
    b1Cases.flatMap((caseItem) =>
      caseItem.questionUnits.map((unit) => [unit.questionId, caseItem] as const),
    ),
  );
  const guidance = b1QuestionUnits.map((unit) => {
    const caseItem = caseByQuestionId.get(unit.questionId);
    if (caseItem === undefined) throw new Error(`B-1ケースが見つかりません: ${unit.questionId}`);
    return createGuidance(unit, getB1QuestionOfficialReview(unit, caseItem));
  });
  const a2Remediations = b1QuestionUnits.map((unit) => {
    const caseItem = caseByQuestionId.get(unit.questionId);
    if (caseItem === undefined) throw new Error(`B-1ケースが見つかりません: ${unit.questionId}`);
    return createA2Remediation(unit, caseItem, getB1QuestionOfficialReview(unit, caseItem));
  });
  return {
    guidance,
    guidanceByQuestionId: new Map(guidance.map((entry) => [entry.questionId, entry])),
    a2Remediations,
    a2RemediationByQuestionId: new Map(a2Remediations.map((entry) => [entry.questionId, entry])),
    failureCauses: b1FailureCauses,
  };
}

function createGuidance(
  unit: B1QuestionUnit,
  review: B1QuestionOfficialReview,
): B1QuestionGuidance {
  return {
    questionId: unit.questionId,
    requirementBreakdown: {
      answerTarget: answerTarget(unit.answerFields),
      targetObject: '公式問題冊子で指定された機器、通信、設定又は状態',
      targetEnvironment: '問題文、構成図又は表に示された対象環境',
      situation: '設問の条件と本文・図表の事実を照合する場面',
      ...(directionPattern.test(unit.promptSummary)
        ? { trafficDirection: { from: '送信元又は起点として示された対象', to: '宛先又は到達点として示された対象' } }
        : {}),
      answerForm: answerForm(unit),
      requiredAnswerCount: unit.answerFields.reduce((total, field) => total + field.expectedCount, 0),
      maxLength: sharedMaxLength(unit.answerFields),
      responseChecklist: [
        '設問の条件、回答数、字数制限を確認する',
        '対象となる機器、通信、設定又は状態を特定する',
        '指定された形式で答案を見直す',
      ],
      constraints: constraints(unit.answerFields),
      commonTraps: commonTraps(unit),
      trainingHint: '本文、図表、設問の条件を順に照合し、何をどの形式で答えるかを整理する。',
    },
    officialEvidence: createEvidence(unit, review),
    applicableFailureCauseIds: applicableFailureCauses(unit),
  };
}

function answerTarget(fields: readonly B1AnswerField[]): string {
  if (fields.length > 1) return '設問で指定された複数の答案欄を、指定数だけ埋める';
  if (fields[0]?.inputKind === 'description') return '設問で求められた説明を、指定の条件に沿って記述する';
  return '設問で指定された答案欄を、指定の形式で埋める';
}

function answerForm(unit: B1QuestionUnit): B1AnswerForm {
  if (unit.answerFields.some((field) => field.inputKind === 'number')) return 'number';
  if (unit.answerFields.some((field) => field.inputKind === 'cidr')) return 'route';
  if (unit.answerFields.some((field) => field.inputKind === 'multi_select')) return 'selection';
  if (calculationPattern.test(unit.promptSummary)) return 'calculation';
  if (explanationPattern.test(unit.promptSummary)) return 'reason';
  return unit.answerFields.some((field) => field.inputKind === 'description') ? 'behavior' : 'term';
}

function sharedMaxLength(fields: readonly B1AnswerField[]): number | null {
  const lengths = [...new Set(fields.map((field) => field.maxLength).filter((value): value is number => value !== null))];
  return lengths.length === 1 && fields.every((field) => field.maxLength !== null) ? lengths[0] : null;
}

function constraints(fields: readonly B1AnswerField[]): readonly string[] {
  const required = fields.reduce((total, field) => total + field.expectedCount, 0);
  const limits = [...new Set(fields.map((field) => field.maxLength).filter((value): value is number => value !== null))];
  return [
    required > 1 ? `合計${required}件の回答欄を確認する` : '回答欄の指定を確認する',
    ...(limits.length === 0 ? [] : ['字数上限は各答案欄の指定に従う']),
  ];
}

function commonTraps(unit: B1QuestionUnit): readonly string[] {
  return [
    '本文、図表、設問で示された対象範囲を混同しない',
    ...(directionPattern.test(unit.promptSummary) ? ['通信又は経路の向きを逆にしない'] : []),
    ...(unit.answerFields.some((field) => field.maxLength !== null)
      ? ['字数又は回答数の条件を見落とさない']
      : []),
  ];
}

function createEvidence(
  unit: B1QuestionUnit,
  review: B1QuestionOfficialReview,
): readonly B1OfficialEvidence[] {
  const pdfPages = toPageArray(unit.sourcePromptLocator.pdfPageZeroBased);
  const printedPages = toPageArray(unit.sourcePromptLocator.printedPage);
  const sourceType = evidenceSourceType(unit);
  return pdfPages.map((pdfPageZeroBased, index) => {
    const figureRef = unit.sourcePromptLocator.figureRefs[0] ?? null;
    const tableRef = unit.sourcePromptLocator.tableRefs[0] ?? null;
    return {
      evidenceId: `${unit.questionId}-E${String(index + 1).padStart(2, '0')}`,
      sourceType,
      printedPage: printedPages[index] ?? printedPages[0] ?? pdfPageZeroBased + 1,
      pdfPageZeroBased,
      reference: evidenceReference(unit, figureRef, tableRef),
      figureRef,
      tableRef,
      summary: '設問の条件、対象及び回答形式を確認するための公式問題冊子上の記述。',
      reason: '本文又は図表の事実と設問条件を照合して、答案の対象範囲を決めるため。',
      reviewStatus: review.reviewStatus,
    };
  });
}

function toPageArray(value: number | readonly number[]): readonly number[] {
  return typeof value === 'number' ? [value] : value;
}

function evidenceSourceType(unit: B1QuestionUnit): B1EvidenceSourceType {
  if (unit.sourcePromptLocator.figureRefs.length > 0) return 'figure';
  if (unit.sourcePromptLocator.tableRefs.length > 0) return 'table';
  if (calculationPattern.test(unit.promptSummary)) return 'calculation';
  if (/設定|構成/.test(unit.promptSummary)) return 'configuration';
  if (/順序|手順|シーケンス/.test(unit.promptSummary)) return 'sequence';
  return 'paragraph';
}

function evidenceReference(unit: B1QuestionUnit, figureRef: string | null, tableRef: string | null): string {
  if (figureRef !== null) return `公式問題冊子の${figureRef}`;
  if (tableRef !== null) return `公式問題冊子の${tableRef}`;
  if (unit.sourcePromptLocator.underlineRefs.length > 0) {
    return `公式問題冊子の下線${unit.sourcePromptLocator.underlineRefs[0]}付近`;
  }
  return `公式問題冊子の${unit.label}`;
}

function applicableFailureCauses(unit: B1QuestionUnit): readonly B1FailureCauseId[] {
  const result = new Set<B1FailureCauseId>(['missed_condition', 'evidence_missed']);
  const isDescription = unit.answerFields.some((field) => field.inputKind === 'description');
  const isCalculation = calculationPattern.test(unit.promptSummary) || unit.answerFields.some((field) => field.inputKind === 'number' || field.inputKind === 'cidr');
  if (!isDescription) result.add('knowledge_gap');
  if (isDescription) {
    result.add('missing_element');
    result.add('causality_weak');
    result.add('wording_length');
  }
  if (isCalculation) result.add('calculation_error');
  if (directionPattern.test(unit.promptSummary)) result.add('traffic_direction');
  if (unit.sourcePromptLocator.figureRefs.length > 0 || unit.sourcePromptLocator.tableRefs.length > 0) result.add('diagram_misread');
  if (unit.answerFields.length >= 4) result.add('time_management');
  return B1_FAILURE_CAUSE_IDS.filter((id) => result.has(id));
}

function createA2Remediation(
  unit: B1QuestionUnit,
  caseItem: B1Case,
  review: B1QuestionOfficialReview,
): B1A2Remediation {
  const a2Questions = getSubjectCatalog('a2').questions;
  const aliases = caseItem.topics.flatMap((topic) => a2TopicAliases[topic] ?? []);
  const candidates = a2Questions.filter((question) =>
    aliases.some((alias) => question.subcategory.includes(alias) || question.question.includes(alias)),
  );
  const uniqueCandidates = [...new Map(candidates.map((question) => [question.code, question])).values()];
  const selected = uniqueCandidates.slice(0, 3);
  const isCalculation = answerForm(unit) === 'calculation' || answerForm(unit) === 'number';
  const triggerFailureCauseIds: B1FailureCauseId[] = [
    'knowledge_gap',
    ...(isCalculation ? ['calculation_error' as const] : []),
  ];
  if (selected.length < 3) {
    return {
      questionId: unit.questionId,
      status: 'not_applicable',
      a2QuestionIds: [],
      a2CategoryIds: [],
      reason: '公式設問の個別条件へ直接対応するA2問題を、十分な件数で特定できないため。',
      prerequisiteTopics: [],
      recommendedCount: 0,
      triggerFailureCauseIds: [],
      reviewStatus: review.reviewStatus,
    };
  }
  return {
    questionId: unit.questionId,
    status: 'linked',
    a2QuestionIds: selected.map((question) => question.code),
    a2CategoryIds: [...new Set(selected.map((question) => question.categoryId))],
    reason: 'ケースで扱う基礎概念をA2の四肢択一で確認してから、元のB-1設問へ戻るため。',
    prerequisiteTopics: caseItem.topics.filter((topic) => a2TopicAliases[topic] !== undefined).slice(0, 3),
    recommendedCount: selected.length,
    triggerFailureCauseIds,
    reviewStatus: review.reviewStatus,
  };
}
