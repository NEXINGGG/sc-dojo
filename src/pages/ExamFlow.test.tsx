import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { questions } from '../data/catalog';
import { database } from '../database/database';
import { createExamSession } from '../domain/exam';

beforeEach(async () => {
  await database.examSessions.clear();
  await database.examResults.clear();
  await database.answerAttempts.clear();
  await database.questionProgress.clear();
  await database.learningDays.clear();
  window.location.hash = '#/exam';
});

afterEach(async () => {
  cleanup();
  await database.examSessions.clear();
  await database.examResults.clear();
  await database.answerAttempts.clear();
  await database.questionProgress.clear();
  await database.learningDays.clear();
  window.location.hash = '#/';
});

describe('模擬試験の画面', () => {
  it('固定模試1を開始し、回答・解除・見直し・問題一覧・提出・結果履歴を利用できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: '模擬試験' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '固定模試1を選ぶ' }));
    expect(screen.getByRole('heading', { name: '固定模試1を開始' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '模試を開始する' }));

    expect(await screen.findByRole('heading', { name: '1 / 30 問' })).toBeInTheDocument();
    expect(screen.queryByText('解説')).not.toBeInTheDocument();
    const choices = screen.getAllByRole('radio');
    await user.click(choices[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: '回答を解除' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '見直しにする' }));
    expect(await screen.findByRole('button', { name: '見直しを解除' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '回答を解除' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /問題 1: 未回答・見直し・表示中/ }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /問題 2: 未回答/ }));
    expect(await screen.findByRole('heading', { name: '2 / 30 問' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提出する' }));
    const dialog = await screen.findByRole('dialog', { name: '模試を提出しますか？' });
    expect(within(dialog).getByText('未回答 30問')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '提出する' }));

    expect(await screen.findByRole('heading', { name: '不合格' })).toBeInTheDocument();
    expect(screen.getByText('解説')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '☆ お気に入りに追加' }));
    expect(await screen.findByRole('button', { name: '★ お気に入り登録済み' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '模試選択へ' }));
    expect(await screen.findByRole('heading', { name: '模擬試験' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /固定模試1/ })).toBeInTheDocument();
  });

  it.each([
    ['固定模試2を選ぶ', '固定模試2を開始'],
    ['ランダム模試を選ぶ', 'ランダム模試を開始'],
  ])('%sから開始できる', async (selectLabel, confirmationHeading) => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: selectLabel }));
    expect(screen.getByRole('heading', { name: confirmationHeading })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '模試を開始する' }));
    expect(await screen.findByRole('heading', { name: '1 / 30 問' })).toBeInTheDocument();
  });

  it('期限切れの途中模試を開くと確認なしで自動提出して結果へ移動する', async () => {
    const session = createExamSession(
      'fixed_1',
      questions.slice(180, 210).map((question) => question.code),
      { id: 'expired-exam', now: '2000-01-01T00:00:00.000Z' },
    );
    await database.examSessions.put(session);
    window.location.hash = `#/exam/${session.id}`;
    render(<App />);

    expect(await screen.findByRole('heading', { name: '不合格' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('制限時間終了により自動提出されました');
    await expect(database.examResults.get(session.id)).resolves.toMatchObject({
      submissionReason: 'timeout',
    });
  });
});
