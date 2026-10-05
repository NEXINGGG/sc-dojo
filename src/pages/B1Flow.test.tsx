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

describe('科目B answer flow', () => {
  it('selects 科目B, opens the official-PDF answer workspace, and autosaves an answer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('radio', { name: /科目B/ }));
    await screen.findByRole('heading', { name: '科目B ホーム' });
    await user.click(screen.getByRole('link', { name: /科目B演習を始める/ }));
    await screen.findByRole('heading', { name: '科目B演習' });
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

  it('shows the selected 科目B mock contents for confirmation before creating the session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('radio', { name: /科目B/ }));
    await user.click(screen.getByRole('link', { name: '科目B模試を開始' }));
    await screen.findByRole('heading', { name: '科目B模試', level: 1 });
    const caseChoices = screen.getAllByRole('checkbox', { name: 'この大問を選ぶ' });
    await user.click(caseChoices[0]);
    await user.click(caseChoices[1]);
    await user.click(screen.getByRole('button', { name: '開始内容を確認する' }));

    expect(
      await screen.findByRole('heading', { name: 'この内容で科目B模試を開始しますか？' }),
    ).toBeInTheDocument();
    expect(screen.getByText('制限時間')).toBeInTheDocument();
    expect(screen.getByText('90分')).toBeInTheDocument();
    await expect(database.b1MockSessions.count()).resolves.toBe(0);

    await user.click(screen.getByRole('button', { name: 'この内容で開始する' }));
    await waitFor(async () => {
      expect(await database.b1MockSessions.count()).toBe(1);
    });
  });

  it('keeps mock90 support out of the pre-submit DOM and autosaves before navigation', async () => {
    const user = userEvent.setup();
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

    const answer = screen
      .getAllByRole('textbox')
      .find((element) => element.id.startsWith(`${session.unitIds[0]}-`));
    if (answer === undefined) throw new Error('A 科目B mock answer field is required');
    await user.type(answer, '模試の回答');
    const nextButton = screen.getByRole('button', { name: '次へ' });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    await waitFor(async () => {
      const saved = await database.b1MockSessions.get(session.id);
      expect(saved?.answers[session.unitIds[0]]).toEqual({ a: '模試の回答' });
      expect(saved?.currentIndex).toBe(1);
    });
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

    await waitFor(
      async () => {
        const saved = await database.b1PracticeSessions.get(session.id);
        expect(saved?.unitConfirmations?.[session.unitIds[0]]).toMatchObject({
          answers: Object.fromEntries(
            b1Cases[0].questionUnits[0].answerFields.map((field) => [field.fieldId, '入力済み']),
          ),
        });
      },
      { timeout: 5_000 },
    );
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
