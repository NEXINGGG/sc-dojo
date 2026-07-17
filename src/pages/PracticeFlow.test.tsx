import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { questions } from '../data/catalog';
import { database } from '../database/database';
import {
  completePracticeSession,
  confirmPracticeAnswer,
  createPracticeSession,
  defaultPracticeFilters,
} from '../domain/practice';

beforeEach(async () => {
  await database.practiceSessions.clear();
  await database.practiceResults.clear();
  await database.answerAttempts.clear();
  await database.questionProgress.clear();
  await database.learningDays.clear();
  window.location.hash = '#/practice';
});

afterEach(async () => {
  cleanup();
  await database.practiceSessions.clear();
  await database.practiceResults.clear();
  await database.answerAttempts.clear();
  await database.questionProgress.clear();
  await database.learningDays.clear();
  window.location.hash = '#/';
});

describe('通常演習の画面', () => {
  it('条件設定から回答を確定し、途中セッションを保存する', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('出題予定: 10問')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'この条件で始める' }));

    expect(await screen.findByRole('heading', { name: '1 / 10 問' })).toBeInTheDocument();
    const choices = screen.getAllByRole('radio');
    await user.click(choices[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: '回答する' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '回答する' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/正解です|不正解です/);
    await waitFor(async () => {
      const session = await database.practiceSessions.toCollection().first();
      expect(session?.answers[session.questionCodes[0]]?.confirmed).toBe(true);
    });

    await user.click(screen.getByRole('link', { name: 'ホーム' }));
    expect(await screen.findByText('1 / 240問')).toBeInTheDocument();
  });

  it('回答状態を現在間違えている問題にすると、その問題だけで復習を始められる', async () => {
    const firstQuestion = questions[0];
    await database.questionProgress.put({
      code: firstQuestion.code,
      attemptCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      favorite: false,
      lastChoice: firstQuestion.correctChoice === 'A' ? 'B' : 'A',
      lastIsCorrect: false,
      lastAnsweredAt: '2026-07-17T00:00:00.000Z',
      updatedAt: '2026-07-17T00:00:00.000Z',
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('radio', { name: /現在間違えている/ }));
    expect(screen.getByText('出題予定: 1問')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'この条件で始める' }));

    expect(await screen.findByRole('heading', { name: '1 / 1 問' })).toBeInTheDocument();
    await waitFor(async () => {
      const session = await database.practiceSessions.toCollection().first();
      expect(session?.mode).toBe('review_incorrect');
      expect(session?.questionCodes).toEqual([firstQuestion.code]);
    });
  });

  it('問題画面のお気に入りと学習履歴画面を利用できる', async () => {
    const firstQuestion = questions[0];
    const session = createPracticeSession([firstQuestion.code], defaultPracticeFilters, {
      id: 'favorite-and-history',
      now: '2026-07-17T00:00:00.000Z',
    });
    await database.practiceSessions.put(session);
    window.location.hash = `#/practice/${session.id}`;
    const user = userEvent.setup();
    render(<App />);

    const favoriteButton = await screen.findByRole('button', { name: '☆ お気に入りに追加' });
    await user.click(favoriteButton);
    await waitFor(async () => {
      const progress = await database.questionProgress.get(firstQuestion.code);
      expect(progress?.favorite).toBe(true);
    });

    await user.click(screen.getByRole('link', { name: 'この問題の学習履歴を見る' }));
    expect(await screen.findByRole('heading', { name: '問題の学習履歴' })).toBeInTheDocument();
    expect(screen.getByText('まだ回答履歴はありません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '★ お気に入り登録済み' })).toBeInTheDocument();
  });

  it('条件を初期状態へ戻せる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'ランダム' }));
    await user.click(screen.getByRole('button', { name: '初期状態へ戻す' }));

    expect(screen.getByRole('radio', { name: '登録順' })).toBeChecked();
    expect(screen.getByText('出題予定: 10問')).toBeInTheDocument();
  });

  it('ホームから保存済みの途中演習を再開できる', async () => {
    const session = createPracticeSession(
      questions.slice(0, 10).map((question) => question.code),
      defaultPracticeFilters,
      { id: 'resume-session', now: '2026-07-17T00:00:00.000Z' },
    );
    await database.practiceSessions.put({ ...session, currentIndex: 3 });
    window.location.hash = '#/';
    render(<App />);

    expect(
      await screen.findByRole('link', { name: '前回の続きから再開（4 / 10問）' }),
    ).toBeInTheDocument();
  });

  it('完了済みセッションの結果と問題ごとの解説を表示する', async () => {
    const [firstQuestion, secondQuestion] = questions;
    const created = createPracticeSession(
      [firstQuestion.code, secondQuestion.code],
      defaultPracticeFilters,
      {
        id: 'result-session',
        now: '2026-07-17T00:00:00.000Z',
      },
    );
    const firstAnswer = confirmPracticeAnswer(
      created,
      firstQuestion,
      firstQuestion.correctChoice,
      '2026-07-17T00:01:00.000Z',
    );
    if (!firstAnswer.ok) {
      throw new Error('テスト用の回答を確定できませんでした。');
    }
    const secondAnswer = confirmPracticeAnswer(
      firstAnswer.session,
      secondQuestion,
      secondQuestion.correctChoice === 'A' ? 'B' : 'A',
      '2026-07-17T00:02:00.000Z',
    );
    if (!secondAnswer.ok) {
      throw new Error('テスト用の回答を確定できませんでした。');
    }
    await database.practiceSessions.put(
      completePracticeSession(secondAnswer.session, '2026-07-17T00:03:00.000Z'),
    );
    window.location.hash = '#/practice/result-session/result';
    render(<App />);

    expect(await screen.findByRole('heading', { name: '通常演習の結果' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('解説').length).toBeGreaterThan(0);
  });
});
