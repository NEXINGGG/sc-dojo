import type { B1A2Remediation, B1FailureCauseId } from './b1LearningSupport';

export interface B1A2RecommendationInput {
  remediation: B1A2Remediation;
  failureCauseIds: readonly B1FailureCauseId[];
  completedA2QuestionIds?: readonly string[];
  preferredCount?: number;
  hasA2Question?: (questionId: string) => boolean;
}

export interface B1A2Recommendation {
  originQuestionId: string;
  status: 'recommended' | 'not_applicable';
  a2QuestionIds: readonly string[];
  reason: string;
  notApplicableReason?: string;
}

const remediationTriggers = new Set<B1FailureCauseId>(['knowledge_gap', 'calculation_error']);

/** A stable, side-effect-free selector for the Phase 3 remediation UI. */
export function recommendB1A2Questions(input: B1A2RecommendationInput): B1A2Recommendation {
  const { remediation } = input;
  const hasRelevantCause = input.failureCauseIds.some((id) => remediationTriggers.has(id));
  if (!hasRelevantCause) {
    return notApplicable(
      remediation.questionId,
      '知識不足又は計算ミスが選ばれていないため、科目Bの再読・再演習を優先します。',
    );
  }
  if (remediation.status === 'not_applicable') {
    return notApplicable(remediation.questionId, remediation.reason);
  }

  const completed = new Set(input.completedA2QuestionIds ?? []);
  const limit = Math.max(
    0,
    Math.min(input.preferredCount ?? remediation.recommendedCount, remediation.recommendedCount),
  );
  const candidates = remediation.a2QuestionIds.filter(
    (questionId) => !completed.has(questionId) && (input.hasA2Question?.(questionId) ?? true),
  );
  const a2QuestionIds = [...new Set(candidates)].slice(0, limit);
  if (a2QuestionIds.length === 0) {
    return notApplicable(
      remediation.questionId,
      'この設問に紐付く未完了のA2復習問題はありません。元の科目B設問を見直してください。',
    );
  }
  return {
    originQuestionId: remediation.questionId,
    status: 'recommended',
    a2QuestionIds,
    reason: remediation.reason,
  };
}

function notApplicable(originQuestionId: string, reason: string): B1A2Recommendation {
  return {
    originQuestionId,
    status: 'not_applicable',
    a2QuestionIds: [],
    reason,
    notApplicableReason: reason,
  };
}
