import { describe, expect, it } from 'vitest';
import type { B1A2Remediation } from './b1LearningSupport';
import { recommendB1A2Questions } from './b1A2Recommendation';

const remediation: B1A2Remediation = {
  questionId: 'B1-2025-Q1-U01',
  status: 'linked',
  a2QuestionIds: ['A2-074', 'A2-078', 'A2-083'],
  a2CategoryIds: ['data_communication_control'],
  reason: '基礎概念を確認するため。',
  prerequisiteTopics: ['OSPF'],
  recommendedCount: 3,
  triggerFailureCauseIds: ['knowledge_gap'],
  reviewStatus: 'verified',
};

describe('B-1からA2への推薦', () => {
  it('知識不足では、重複なしで安定した順序のA2問題を推薦する', () => {
    const input = { remediation, failureCauseIds: ['knowledge_gap'] as const };
    const first = recommendB1A2Questions(input);
    const second = recommendB1A2Questions(input);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: 'recommended',
      a2QuestionIds: remediation.a2QuestionIds,
    });
  });

  it('計算ミスは推薦し、完了済みと存在しないIDを除外して最大件数を守る', () => {
    const result = recommendB1A2Questions({
      remediation,
      failureCauseIds: ['calculation_error'],
      completedA2QuestionIds: ['A2-074'],
      preferredCount: 1,
      hasA2Question: (questionId) => questionId !== 'A2-078',
    });

    expect(result).toMatchObject({ status: 'recommended', a2QuestionIds: ['A2-083'] });
  });

  it('読解だけの失点原因と適用外データではA2を推薦しない', () => {
    expect(
      recommendB1A2Questions({ remediation, failureCauseIds: ['missed_condition'] }),
    ).toMatchObject({ status: 'not_applicable', a2QuestionIds: [] });
    expect(
      recommendB1A2Questions({
        remediation: {
          ...remediation,
          status: 'not_applicable',
          a2QuestionIds: [],
          recommendedCount: 0,
        },
        failureCauseIds: ['knowledge_gap'],
      }),
    ).toMatchObject({ status: 'not_applicable', a2QuestionIds: [] });
  });
});
