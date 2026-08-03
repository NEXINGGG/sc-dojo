import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { database } from '../database/database';
import { b1Cases } from '../data/b1';
import { B1Repository } from '../features/b1/b1Repository';

afterEach(async () => {
  cleanup();
  window.location.hash = '#/';
  await database.b1PdfFiles.clear();
  await database.b1PracticeSessions.clear();
  await database.b1MockSessions.clear();
  await database.b1LearnerEvidence.clear();
  await database.b1LearningReflections.clear();
  await database.b1RemediationProgress.clear();
  await database.b1AnswerAttempts.clear();
  await database.b1Preferences.clear();
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
    expect(screen.getByRole('heading', { name: '2016年度' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /この大問を練習する/ })[0]);

    expect(
      await screen.findByRole('link', { name: '公式PDFを開く' }, { timeout: 5_000 }),
    ).toHaveAttribute('target', '_blank');
    const answer = screen.getAllByRole('textbox')[0];
    await user.type(answer, 'バックボーン');

    await waitFor(async () => {
      const session = await database.b1PracticeSessions.toCollection().first();
      expect(session?.answers[session.unitIds[0]]).toEqual({ a: 'バックボーン' });
    });
  });

  it('keeps mock90 support and answer-revealing content out of the pre-submit DOM', async () => {
    const repository = new B1Repository(database);
    const session = await repository.createMock(
      2025,
      [b1Cases[0].caseId, b1Cases[1].caseId],
      'official_year',
    );
    window.location.hash = `#/b1/mock/${session.id}`;
    render(<App />);

    await screen.findAllByRole('heading', { name: '設問1(1)' });
    expect(screen.queryByText('何を確認して答えるか')).not.toBeInTheDocument();
    expect(screen.queryByText('公式根拠')).not.toBeInTheDocument();
    expect(screen.queryByText('A2連動復習')).not.toBeInTheDocument();
    expect(screen.queryByText('失点原因（複数選択）')).not.toBeInTheDocument();
  });

  it('restores a confirmed answer and its self-assessment after a page refresh', async () => {
    const user = userEvent.setup();
    const repository = new B1Repository(database);
    const session = await repository.createPractice(b1Cases[0]);
    window.location.hash = `#/b1/practice/${session.id}`;
    const firstRender = render(<App />);

    const answerFields = (await screen.findAllByRole('textbox')).filter((element) =>
      element.id.startsWith(`${session.unitIds[0]}-`),
    );
    for (const answer of answerFields) {
      await user.type(answer, '入力済み');
    }
    await user.click(screen.getByRole('button', { name: '回答を確定して模範解答を確認する' }));

    await waitFor(async () => {
      const saved = await database.b1PracticeSessions.get(session.id);
      expect(saved?.unitConfirmations?.[session.unitIds[0]]).toMatchObject({
        answers: Object.fromEntries(
          b1Cases[0].questionUnits[0].answerFields.map((field) => [field.fieldId, '入力済み']),
        ),
      });
    });
    await user.click(screen.getByRole('button', { name: '惜しい' }));
    await waitFor(async () => {
      const saved = await database.b1PracticeSessions.get(session.id);
      expect(saved?.selfGrades[session.unitIds[0]]).toBe('partial');
      expect(saved?.selfGradeUpdatedAt?.[session.unitIds[0]]).toContain('T');
    });

    firstRender.unmount();
    render(<App />);
    await screen.findByText('回答を確定済みです');
    const restoredAnswer = screen
      .getAllByRole('textbox')
      .find((element) => element.id.startsWith(`${session.unitIds[0]}-`));
    expect(restoredAnswer).toBeDefined();
    if (restoredAnswer !== undefined) expect(restoredAnswer).toBeDisabled();
    expect(screen.getByRole('button', { name: '惜しい' })).toHaveAttribute('aria-pressed', 'true');
  });
});
