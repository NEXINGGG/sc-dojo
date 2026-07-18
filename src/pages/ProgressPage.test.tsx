import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { categories, questions } from '../data/catalog';
import { database } from '../database/database';
import type { AnswerAttemptRow } from '../database/types';

async function clearLearningData() {
  await Promise.all([
    database.practiceSessions.clear(),
    database.practiceResults.clear(),
    database.examSessions.clear(),
    database.examResults.clear(),
    database.answerAttempts.clear(),
    database.questionProgress.clear(),
    database.learningDays.clear(),
  ]);
}

function createAttempt(code: string, selectedChoice: 'A' | 'B' | 'C' | 'D'): AnswerAttemptRow {
  const question = questions.find((item) => item.code === code);
  if (question === undefined) {
    throw new Error('テスト問題が見つかりません。');
  }
  return {
    code,
    selectedChoice,
    correctChoice: question.correctChoice,
    isCorrect: selectedChoice === question.correctChoice,
    answeredAt: '2026-07-18T00:00:00.000Z',
    mode: 'normal_practice',
    sessionId: `progress-${code}`,
    version: 1,
  };
}

beforeEach(async () => {
  await clearLearningData();
  window.location.hash = '#/progress';
});

afterEach(async () => {
  cleanup();
  await clearLearningData();
  window.location.hash = '#/';
});

describe('成績画面', () => {
  it('履歴がなくても主要な成績・期間・空状態を表示できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: '成績' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'カテゴリ別成績' })).toBeInTheDocument();
    expect(screen.getByText('現在、強い苦手分野はありません')).toBeInTheDocument();
    expect(screen.getByText('まだ模試を受験していません')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '直近7日' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '直近7日' }));
    expect(await screen.findByText('直近7日の全回答実績')).toBeInTheDocument();
  });

  it('カテゴリ詳細へ移動し、カテゴリから誤答演習を開始できる', async () => {
    const firstCategory = categories[0];
    const categoryQuestions = questions
      .filter((question) => question.categoryId === firstCategory.id)
      .slice(0, 3);
    await database.answerAttempts.bulkAdd(
      categoryQuestions.map((question) =>
        createAttempt(question.code, question.correctChoice === 'A' ? 'B' : 'A'),
      ),
    );
    const user = userEvent.setup();
    render(<App />);

    const categoryHeadings = await screen.findAllByRole('heading', { name: firstCategory.name });
    const categoryCard = categoryHeadings
      .map((heading) => heading.closest('article'))
      .find((card) => card !== null && within(card).queryByRole('link', { name: '詳細' }) !== null);
    if (categoryCard === null) {
      throw new Error('カテゴリカードが見つかりません。');
    }
    await user.click(within(categoryCard).getByRole('link', { name: '詳細' }));
    expect(
      await screen.findByRole('heading', { name: `${firstCategory.name}の成績` }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '問題一覧' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '問題の状態で絞り込む' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '誤答を復習' }));
    expect(await screen.findByRole('heading', { name: '通常演習' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /現在間違えている/ })).toBeChecked(),
    );
  });
});
