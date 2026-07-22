import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { database } from '../database/database';

afterEach(async () => {
  cleanup();
  window.location.hash = '#/';
  await database.b1PdfFiles.clear();
  await database.b1PracticeSessions.clear();
  await database.b1MockSessions.clear();
  await database.settings.clear();
});

describe('B-1 answer flow', () => {
  it('selects B-1, opens the official-PDF answer workspace, and autosaves an answer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('radio', { name: /B-1/ }));
    await screen.findByRole('heading', { name: 'B-1 ホーム' });
    await user.click(screen.getByRole('link', { name: /B-1演習を始める/ }));
    await screen.findByRole('heading', { name: 'B-1演習' });
    await user.click(screen.getAllByRole('button', { name: /この大問を練習する/ })[0]);

    expect(await screen.findByRole('link', { name: '公式PDFを開く' })).toHaveAttribute(
      'target',
      '_blank',
    );
    const answer = screen.getAllByRole('textbox')[0];
    await user.type(answer, 'バックボーン');

    await waitFor(async () => {
      const session = await database.b1PracticeSessions.toCollection().first();
      expect(session?.answers[session.unitIds[0]]).toEqual({ a: 'バックボーン' });
    });
  });
});
