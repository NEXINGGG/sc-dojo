import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { b1QuestionUnits } from './b1';
import {
  getB1OfficialReviewProblems,
  getB1OfficialReviews,
  isCompletedOfficialReview,
} from './b1OfficialReview';

describe('B-1公式PDFレビュー証跡', () => {
  it('全243設問に重複のないレビュー行とPDFページ証跡を持つ', () => {
    const reviews = getB1OfficialReviews();

    expect(reviews).toHaveLength(243);
    expect(new Set(reviews.map((review) => review.questionId)).size).toBe(243);
    expect(new Set(reviews.map((review) => review.questionId))).toEqual(
      new Set(b1QuestionUnits.map((unit) => unit.questionId)),
    );
    for (const review of reviews) {
      expect(review.reviewStatus).toBe('completed');
      expect(isCompletedOfficialReview(review)).toBe(true);
      expect(review.questionPdfPages.length).toBeGreaterThan(0);
      expect(review.questionPdfPages.every((page) => page <= review.questionPdfPageCount)).toBe(
        true,
      );
      expect(review.answerPdfPages.every((page) => page <= review.answerPdfPageCount)).toBe(true);
      expect(review.commentaryPdfPages.every((page) => page <= review.commentaryPdfPageCount)).toBe(
        true,
      );
    }
  });

  it('追加18大問・160設問を公式PDF再照合として記録し、既存83設問を保持する', () => {
    const reviews = getB1OfficialReviews();
    const rechecked = reviews.filter((review) => review.reviewScope === 'official_pdf_recheck');
    const preserved = reviews.filter((review) => review.reviewScope === 'phase1_review_preserved');

    expect(rechecked).toHaveLength(160);
    expect(preserved).toHaveLength(83);
    expect(new Set(rechecked.map((review) => review.year))).toEqual(
      new Set([2016, 2017, 2018, 2019, 2021, 2022]),
    );
    expect(rechecked.every((review) => review.reviewedAt === '2026-07-28')).toBe(true);
  });

  it('未解決理由、completedの確認フラグ、PDFページ証跡の欠落を検出する', () => {
    const [review] = getB1OfficialReviews();
    expect(review).toBeDefined();
    if (review === undefined) return;

    expect(
      getB1OfficialReviewProblems({ ...review, reviewStatus: 'needs_review', reviewNotes: '' }),
    ).toContain('needs_review_notes');
    expect(
      getB1OfficialReviewProblems({
        ...review,
        reviewedAgainstAnswerPdf: false,
      }),
    ).toContain('completed_checklist');
    expect(
      getB1OfficialReviewProblems({ ...review, answerPdfPages: [] }),
    ).toContain('answer_pdf_pages');
    expect(
      getB1OfficialReviewProblems({
        ...review,
        questionPdfPages: [review.questionPdfPageCount + 1],
      }),
    ).toContain('question_pdf_pages');
  });

  it('生成済みレビューCSVは243件の全設問を持つ', () => {
    const [header, ...rows] = readFileSync('reports/b1-phase2-guidance-review.csv', 'utf8')
      .trim()
      .split(/\r?\n/);

    expect(header).toContain('reviewedAgainstCommentaryPdf');
    expect(rows).toHaveLength(243);
  });
});
