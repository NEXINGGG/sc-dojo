import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { database } from '../database/database';
import { B1ProgressPage } from './B1ProgressPage';

afterEach(async () => {
  cleanup();
  await Promise.all([
    database.b1PracticeSessions.clear(),
    database.b1MockSessions.clear(),
    database.b1LearnerEvidence.clear(),
    database.b1AnswerAttempts.clear(),
  ]);
});

describe('B-1進捗画面', () => {
  it('保存データがない場合も、未回答と復習対象を安全に表示する', async () => {
    render(
      <MemoryRouter>
        <B1ProgressPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('総ユニット数')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('243件').length).toBeGreaterThan(0));
    expect(screen.getByText('未回答')).toBeInTheDocument();
    expect(screen.getByText('復習対象')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'この問題を復習する' })).toBeEnabled();
  });
});
