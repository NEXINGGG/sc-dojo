import { describe, expect, it } from 'vitest';
import { getSubjectCatalog } from './catalog';
import { b1QuestionUnits } from './b1';
import {
  b1FailureCauses,
  getB1LearningSupportCatalog,
  loadB1LearningSupportCatalog,
} from './b1LearningSupport';
import { getB1OfficialReviews } from './b1OfficialReview';

describe('B-1学習支援データ', () => {
  it('243設問それぞれに要求分解、公式根拠、失点原因を用意する', async () => {
    const support = await loadB1LearningSupportCatalog();

    expect(support.guidance).toHaveLength(243);
    expect(support.guidanceByQuestionId.size).toBe(b1QuestionUnits.length);
    expect(b1FailureCauses).toHaveLength(11);
    const reviewByQuestionId = new Map(
      getB1OfficialReviews().map((review) => [review.questionId, review]),
    );
    for (const unit of b1QuestionUnits) {
      const entry = support.guidanceByQuestionId.get(unit.questionId);
      expect(entry).toBeDefined();
      expect(entry?.requirementBreakdown.answerTarget).not.toHaveLength(0);
      expect(entry?.requirementBreakdown.requiredAnswerCount).toBeGreaterThan(0);
      expect(entry?.requirementBreakdown.responseChecklist.length).toBeGreaterThan(0);
      expect(entry?.requirementBreakdown.trainingHint).not.toHaveLength(0);
      expect(entry?.officialEvidence.length).toBeGreaterThan(0);
      expect(entry?.officialEvidence.every((evidence) => evidence.pdfPageZeroBased >= 0)).toBe(true);
      expect(entry?.officialEvidence.every((evidence) => evidence.printedPage > 0)).toBe(true);
      expect(entry?.officialEvidence.every((evidence) => evidence.reviewStatus === reviewByQuestionId.get(unit.questionId)?.reviewStatus)).toBe(true);
      expect(entry?.applicableFailureCauseIds.length).toBeGreaterThan(0);

      const guidanceText = JSON.stringify(entry?.requirementBreakdown);
      for (const answer of unit.answerFields.flatMap((field) => field.acceptedAnswers)) {
        if (answer.length >= 3) expect(guidanceText).not.toContain(answer);
      }
    }
  });

  it('A2連動は実在する問題だけを参照し、適用外には理由を持つ', () => {
    const support = getB1LearningSupportCatalog();
    const a2QuestionIds = new Set(getSubjectCatalog('a2').questions.map((question) => question.code));
    const a2CategoryIds = new Set(getSubjectCatalog('a2').categories.map((category) => category.id));

    expect(support.a2Remediations).toHaveLength(243);
    const reviewByQuestionId = new Map(
      getB1OfficialReviews().map((review) => [review.questionId, review]),
    );
    for (const remediation of support.a2Remediations) {
      expect(support.guidanceByQuestionId.has(remediation.questionId)).toBe(true);
      expect(remediation.reviewStatus).toBe(reviewByQuestionId.get(remediation.questionId)?.reviewStatus);
      if (remediation.status === 'linked') {
        expect(remediation.a2QuestionIds.length).toBeGreaterThanOrEqual(3);
        expect(remediation.a2QuestionIds.length).toBeLessThanOrEqual(8);
        expect(new Set(remediation.a2QuestionIds).size).toBe(remediation.a2QuestionIds.length);
        expect(remediation.a2QuestionIds.every((id) => a2QuestionIds.has(id))).toBe(true);
        expect(remediation.a2CategoryIds.every((id) => a2CategoryIds.has(id))).toBe(true);
        expect(remediation.recommendedCount).toBe(remediation.a2QuestionIds.length);
      } else {
        expect(remediation.a2QuestionIds).toEqual([]);
        expect(remediation.a2CategoryIds).toEqual([]);
        expect(remediation.recommendedCount).toBe(0);
        expect(remediation.reason).not.toHaveLength(0);
      }
    }
  });
});
