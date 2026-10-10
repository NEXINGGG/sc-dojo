import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QuestionChoiceContent, QuestionStimuli } from './QuestionStimuli';
import { questionImageUrl } from '../features/pwa/questionAssets.mjs';
afterEach(cleanup);

describe('問題の任意図表表示', () => {
  it('図表なしではDOMを追加せず従来の選択肢spanを返す', () => {
    const { container } = render(<QuestionStimuli />);
    expect(container).toBeEmptyDOMElement();
    render(<QuestionChoiceContent choice={{ id: 'A', text: '既存の選択肢' }} />);
    expect(screen.getByText('既存の選択肢').tagName).toBe('SPAN');
  });
  it('HTML tableとscope付き見出しを表示し、HTML文字列をエスケープする', () => {
    render(
      <QuestionStimuli
        stimulus={[
          {
            type: 'table',
            headers: ['項目', '値'],
            rows: [['<script>alert(1)</script>', '3']],
            caption: '入力表',
          },
        ]}
      />,
    );
    expect(screen.getByRole('table', { name: '入力表' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    expect(screen.getByRole('region')).toHaveClass('question-stimulus-scroll');
    expect(screen.getByRole('cell', { name: '<script>alert(1)</script>' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('codeの空白・改行をそのままpre/codeへ表示する', () => {
    const content = 'SELECT *\n  FROM table;\n\t<sample>';
    render(<QuestionStimuli stimulus={[{ type: 'code', content, caption: 'SQL' }]} />);
    const pre = screen.getByLabelText('SQL');
    expect(pre.tagName).toBe('PRE');
    expect(pre.querySelector('code')?.textContent).toBe(content);
    expect(pre).toHaveClass('question-stimulus-scroll');
  });
  it('ローカル画像のalt/captionとサブパスを保持し、失敗時は次の行動を示す', () => {
    render(
      <QuestionStimuli
        assetBase="/sc/"
        stimulus={[
          {
            type: 'image',
            src: 'questions/sc/a2/test.svg',
            alt: '通信経路',
            caption: '構成図',
            asset_sha256: 'a'.repeat(64),
          },
        ]}
      />,
    );
    const img = screen.getByRole('img', { name: '通信経路' });
    expect(img).toHaveAttribute('src', '/sc/questions/sc/a2/test.svg');
    expect(screen.getByText('構成図')).toBeInTheDocument();
    fireEvent.error(img);
    expect(screen.getByRole('alert')).toHaveTextContent('オンラインでアプリを更新');
  });
  it('外部・経路遡及画像を描画せず、選択肢の図表も表示する', () => {
    expect(questionImageUrl('../test.svg', '/')).toBeUndefined();
    expect(questionImageUrl('https://example.com/test.svg', '/')).toBeUndefined();
    render(
      <QuestionChoiceContent
        choice={{
          id: 'A',
          text: '選択肢の表',
          stimulus: [{ type: 'table', headers: ['値'], rows: [['1']] }],
        }}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
