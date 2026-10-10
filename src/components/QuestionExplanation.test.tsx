import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import pilot from '../../data/sc-a2-pilot-30.json';
import a1Candidate from '../../data/sc-a1-v1-candidate.json';
import { getSubjectCatalog, toQuestion, type RawQuestion } from '../data/catalog';
import { QuestionExplanation } from './QuestionExplanation';

afterEach(cleanup);
it('共通午前Iの公式A-1問題を年度・期・問番号と原本リンクで表示する', () => {
  const question = toQuestion(a1Candidate.questions[6] as RawQuestion, 'a1', 'sc-a1-v1');
  render(<QuestionExplanation question={question} />);
  expect(screen.getByText(/2024年度 春期 午前I 問1/)).toBeVisible();
  expect(screen.getByText(/高度試験・情報処理安全確保支援士試験 共通/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'IPA公式問題' })).toHaveAttribute(
    'href',
    question.source.official_question_url,
  );
  expect(screen.getByRole('link', { name: 'IPA公式解答' })).toHaveAttribute(
    'href',
    question.source.official_answer_url,
  );
});
it('教材の各項目を推奨順に表示し、出典を公式リンクで示す', () => {
  const question = toQuestion(pilot.questions[0] as RawQuestion, 'a2');
  render(<QuestionExplanation question={question} />);
  expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
    '解説',
    '選択肢ごとの解説',
    '試験での見分け方',
    '覚える一行',
    '関連用語',
    '出典',
  ]);
  for (const id of ['A', 'B', 'C', 'D'])
    expect(screen.getByText(new RegExp(`^${id}：`))).toBeVisible();
  expect(screen.getByText(/2017年度 春期 午前II 問5/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'IPA公式問題' })).toHaveAttribute(
    'href',
    question.source.official_question_url,
  );
});
it('旧教材は解説と記憶ポイントの表示を維持する', () => {
  render(<QuestionExplanation question={getSubjectCatalog('a1').questions[0]} />);
  expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['解説', '覚える一行']);
  expect(screen.queryByRole('link', { name: 'IPA公式問題' })).not.toBeInTheDocument();
});
