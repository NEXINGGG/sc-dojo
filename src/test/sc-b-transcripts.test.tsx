import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import payload from '../../data/sc-b-cases-2023-2025-ready.json';
import type { B1Case } from '../data/b1';
import { B1CaseBody } from '../features/b1/B1CaseBody';
import { calculateB1ContentHash } from '../domain/b1Identity';

afterEach(cleanup);
const cases = payload.cases as unknown as B1Case[];
describe('原本からのSC B転記', () => {
  it.each(cases)('$source_idは全ページ画像なしで本文・原文設問・全図表を表示する', (c) => {
    for (const unit of c.questionUnits) {
      render(<B1CaseBody caseItem={c} unit={unit} />);
      expect(screen.getByText((_text, node) => node?.tagName === 'P' && node.textContent === unit.promptText)).toBeVisible();
      expect(screen.queryByText(/設問の案内（学習用）/)).toBeNull();
      expect(screen.queryByText('公式問題冊子のページ画像で照合する')).toBeNull();
      for (const ref of unit.evidenceRefs!)
        expect(document.getElementById(`body-${c.caseId}-${ref}`)).not.toBeNull();
      cleanup();
    }
  });
  it('結合セル・表注記・図中の下線・ログの空白を失わない', () => {
    render(<B1CaseBody caseItem={cases[1]} unit={cases[1].questionUnits[0]} />);
    const table = document.getElementById(`body-${cases[1].caseId}-table-3`)!;
    expect(table.querySelectorAll('td[rowspan="3"]')).toHaveLength(2);
    expect(table).toHaveTextContent('複数のVLAN IDが割当て可能');
    cleanup();
    render(<B1CaseBody caseItem={cases[2]} unit={cases[2].questionUnits[0]} />);
    expect(document.querySelector('u[data-underline="⑥"]')).toHaveTextContent('WebAuthn');
    cleanup();
    render(<B1CaseBody caseItem={cases[0]} unit={cases[0].questionUnits[0]} />);
    const code = document.getElementById(`body-${cases[0].caseId}-figure-4`)!.querySelector('code')!;
    expect(code.textContent).toContain('17:   form.append("uploadfile", file);\n18:   form.append("token", token);');
  });
  it('表注記・結合・図中下線の変更は同一教材hashにならない', () => {
    const table = structuredClone(cases[1]);
    table.body.materials!.find((m) => m.id === 'table-3')!.cellSpans = [];
    expect(calculateB1ContentHash(table)).not.toBe(cases[1].content_hash);
    const note = structuredClone(cases[1]);
    note.body.materials!.find((m) => m.id === 'table-3')!.tableNotes = ['別の条件'];
    expect(calculateB1ContentHash(note)).not.toBe(cases[1].content_hash);
    const mark = structuredClone(cases[2]);
    mark.body.materials!.find((m) => m.id === 'figure-2')!.underlines = [];
    expect(calculateB1ContentHash(mark)).not.toBe(cases[2].content_hash);
  });
  it('見開きのリスク表を同じ番号で結合し，公式の3解答例を組合せとして残す', () => {
    const c = cases[3];
    render(<B1CaseBody caseItem={c} unit={c.questionUnits[0]} />);
    const table = document.getElementById(`body-${c.caseId}-table-4`)!;
    expect(table.querySelectorAll('thead th')).toHaveLength(9);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(table.querySelector('td[rowspan="5"]')).toHaveTextContent('W社従業員');
    expect(table).toHaveTextContent('［あ］');
    expect(table).toHaveTextContent('［か］');
    for (const field of c.questionUnits[2].answerFields) {
      expect(field.officialAnswer).toContain('公式例①：');
      expect(field.officialAnswer).toContain('公式例②：');
      expect(field.officialAnswer).toContain('公式例③：');
      expect(field.acceptableAnswers).toEqual([]);
    }
  });
  it('表内の下線と2024春の物理ページ差，検証コードを保持する', () => {
    const c = cases[4];
    render(<B1CaseBody caseItem={c} unit={c.questionUnits[2]} />);
    expect(document.querySelector('u[data-underline="①"]')).toHaveTextContent('ライブラリQ');
    const code = c.body.materials!.find((m) => m.id === 'figure-8')!.text;
    expect(atob(code.split('/Base64/')[1].slice(0,-1))).toBe('wget http://a2.b2.c2.d2/index.html');
    expect(c.questionUnits[0].sourcePromptLocator?.printedPage).toEqual([11]);
    expect(c.questionUnits[0].sourcePromptLocator?.pdfPageZeroBased).toEqual([11]);
  });
});
