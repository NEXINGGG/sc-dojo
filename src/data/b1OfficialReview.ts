import officialReviewPayload from '../../data/b1-phase2-official-review.json';
import { b1Cases, b1QuestionUnits, type B1Case, type B1QuestionUnit } from './b1';
import {
  type B1QuestionOfficialReview,
  type B1ReviewChecklist,
  type B1ReviewScope,
  type B1ReviewStatus,
} from '../domain/b1LearningSupport';

interface B1CaseOfficialReviewManifest {
  caseId: string;
  reviewStatus: B1ReviewStatus;
  reviewScope: B1ReviewScope;
  reviewedAt: string;
  reviewedAgainstQuestionPdf: boolean;
  reviewedAgainstAnswerPdf: boolean;
  reviewedAgainstCommentaryPdf: boolean;
  answerPdfPages: readonly number[];
  commentaryPdfPages: readonly number[];
  questionPdfPageCount: number;
  answerPdfPageCount: number;
  commentaryPdfPageCount: number;
  checklist: B1ReviewChecklist;
  reviewNotes: string;
}

const caseReviews = officialReviewPayload.caseReviews as readonly B1CaseOfficialReviewManifest[];
const reviewByCaseId = new Map(caseReviews.map((review) => [review.caseId, review]));
const caseByQuestionId = new Map(
  b1Cases.flatMap((caseItem) =>
    caseItem.questionUnits.map((unit) => [unit.questionId, caseItem] as const),
  ),
);

export function getB1QuestionOfficialReview(
  unit: B1QuestionUnit,
  caseItem: B1Case,
): B1QuestionOfficialReview {
  const review = reviewByCaseId.get(caseItem.caseId);
  if (review === undefined) throw new Error(`B-1公式レビューが見つかりません: ${caseItem.caseId}`);

  return {
    questionId: unit.questionId,
    caseId: caseItem.caseId,
    year: caseItem.year,
    reviewStatus: review.reviewStatus,
    reviewScope: review.reviewScope,
    reviewedAt: review.reviewedAt,
    reviewedAgainstQuestionPdf: review.reviewedAgainstQuestionPdf,
    reviewedAgainstAnswerPdf: review.reviewedAgainstAnswerPdf,
    reviewedAgainstCommentaryPdf: review.reviewedAgainstCommentaryPdf,
    questionPdfPages: toPageArray(unit.sourcePromptLocator.pdfPageZeroBased).map((page) => page + 1),
    answerPdfPages: review.answerPdfPages,
    commentaryPdfPages: review.commentaryPdfPages,
    questionPdfPageCount: review.questionPdfPageCount,
    answerPdfPageCount: review.answerPdfPageCount,
    commentaryPdfPageCount: review.commentaryPdfPageCount,
    checklist: review.checklist,
    reviewNotes: `${review.reviewNotes} 対象: ${unit.label}。`,
  };
}

export function getB1OfficialReviews(): readonly B1QuestionOfficialReview[] {
  return b1QuestionUnits.map((unit) => {
    const caseItem = caseByQuestionId.get(unit.questionId);
    if (caseItem === undefined) throw new Error(`B-1ケースが見つかりません: ${unit.questionId}`);
    return getB1QuestionOfficialReview(unit, caseItem);
  });
}

export function isCompletedOfficialReview(review: B1QuestionOfficialReview): boolean {
  return getB1OfficialReviewProblems(review).length === 0 && review.reviewStatus === 'completed';
}

export function getB1OfficialReviewProblems(
  review: B1QuestionOfficialReview,
): readonly string[] {
  const problems: string[] = [];
  if (!['completed', 'needs_review'].includes(review.reviewStatus)) {
    problems.push('reviewStatus');
  }
  if (!review.reviewNotes.trim()) problems.push('reviewNotes');
  if (review.reviewStatus === 'needs_review' && !review.reviewNotes.trim()) {
    problems.push('needs_review_notes');
  }
  if (
    review.reviewStatus === 'completed' &&
    ![
      review.reviewedAgainstQuestionPdf,
      review.reviewedAgainstAnswerPdf,
      review.reviewedAgainstCommentaryPdf,
      ...Object.values(review.checklist),
    ].every(Boolean)
  ) {
    problems.push('completed_checklist');
  }
  for (const [label, pages, pageCount] of [
    ['question', review.questionPdfPages, review.questionPdfPageCount],
    ['answer', review.answerPdfPages, review.answerPdfPageCount],
    ['commentary', review.commentaryPdfPages, review.commentaryPdfPageCount],
  ] as const) {
    if (!pages.length || !pages.every((page) => page > 0 && page <= pageCount)) {
      problems.push(`${label}_pdf_pages`);
    }
  }
  return problems;
}

function toPageArray(value: number | readonly number[]): readonly number[] {
  return typeof value === 'number' ? [value] : value;
}
