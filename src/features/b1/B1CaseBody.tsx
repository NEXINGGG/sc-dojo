import type { ReactNode } from 'react';
import type { B1Case, B1Material, B1Paragraph, B1QuestionUnit } from '../../data/b1';

export function B1CaseBody({ caseItem, unit }: { caseItem: B1Case; unit: B1QuestionUnit }) {
  const sections = caseItem.body.sections ?? [];
  const materials = caseItem.body.materials ?? [];
  const paragraphs = sections.flatMap((section) => section.paragraphs);
  const prefix = `body-${caseItem.caseId}-`;
  const order = caseItem.body.readingOrder ?? [
    ...sections.flatMap((section) => [
      { kind: 'heading' as const, id: section.id },
      ...section.paragraphs.map((p) => ({ kind: 'paragraph' as const, id: p.id })),
    ]),
    ...materials.map((m) => ({ kind: 'material' as const, id: m.id })),
  ];
  return (
    <section className="surface-card b1-case-body" aria-label="問題本文・図表">
      <h2>問{caseItem.questionNumber} 問題本文・図表</h2>
      {caseItem.source.provider === 'IPA' ? (
        <p className="muted-text">
          出典：IPA {caseItem.year}年度{caseItem.term === 'spring' ? '春期' : '秋期'}{' '}
          情報処理安全確保支援士 午後試験。解説・根拠参照は学習用に作成しています。
        </p>
      ) : null}
      <details>
        <summary>本文内の移動</summary>
        <nav aria-label="本文の参照位置" className="card-action-row">
          {[
            ...sections.map((s) => ({ id: s.id, label: s.heading })),
            ...materials.map((m) => ({ id: m.id, label: m.caption })),
          ].map((entry) => (
            <button
              className="secondary-button"
              key={entry.id}
              type="button"
              onClick={() =>
                document.getElementById(prefix + entry.id)?.scrollIntoView({ block: 'start' })
              }
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </details>
      {caseItem.body.figureTableInventory?.length ? (
        <details>
          <summary>図・表・コード・ログの位置</summary>
          <nav className="card-action-row" aria-label="図表の参照位置">
            {caseItem.body.figureTableInventory.map((m) => (
              <button
                type="button"
                className="secondary-button"
                key={m.id}
                onClick={() =>
                  document.getElementById(prefix + m.pageRef)?.scrollIntoView({ block: 'start' })
                }
              >
                {m.label} {m.caption}（{m.printedPage}ページ）
              </button>
            ))}
          </nav>
        </details>
      ) : null}
      {order.map((entry) => {
        if (entry.kind === 'heading')
          return (
            <h3 id={prefix + entry.id} key={entry.id}>
              {sections.find((s) => s.id === entry.id)?.heading}
            </h3>
          );
        if (entry.kind === 'paragraph') {
          const p = paragraphs.find((p) => p.id === entry.id);
          return p ? (
            <p className="b1-original-text" id={prefix + p.id} key={p.id}>
              <small>
                {p.id}（{p.printedPage ?? '—'}ページ）
              </small>
              <br />
              {underlinedText(p)}
            </p>
          ) : null;
        }
        const material = materials.find((m) => m.id === entry.id);
        return material ? (
          <MaterialView key={entry.id} prefix={prefix} material={material} />
        ) : null;
      })}
      <h3>{unit.label}</h3>
      <p className="b1-original-text">
        {unit.promptText ?? `設問の案内（学習用）: ${unit.promptSummary}`}
      </p>
      {!caseItem.body.originalPageMode && caseItem.body.originalPages?.length ? (
        <details className="b1-original-pages">
          <summary>公式問題冊子のページ画像で照合する</summary>
          {caseItem.body.originalPages.map((page) => (
            <figure key={page.printedPage}>
              <figcaption>{page.printedPage}ページ（IPA原本）</figcaption>
              <SourceImage
                url={page.assetUrl}
                alt={`IPA ${caseItem.year}年度${caseItem.term === 'spring' ? '春期' : '秋期'} SC 午後 問${caseItem.questionNumber} ${page.printedPage}ページの原本全体。本文、図表、注記、設問を含む。`}
              />
            </figure>
          ))}
        </details>
      ) : null}
    </section>
  );
}

function MaterialView({ material: m, prefix }: { material: B1Material; prefix: string }) {
  return (
    <figure id={prefix + m.id} className="b1-material" data-material-id={m.id}>
      <figcaption>
        {m.caption}（{m.printedPage ?? '—'}ページ）
      </figcaption>
      {m.renderText && m.headers && m.rows ? (
        <div className="b1-material-scroll" role="region" aria-label={m.caption} tabIndex={0}>
          <table>
            <thead>
              <tr>
                {m.headers.map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => {
                    const spans = m.cellSpans ?? [];
                    if (spans.some((s) => (s.row !== i || s.column !== j) &&
                      i >= s.row && i < s.row + (s.rowSpan ?? 1) &&
                      j >= s.column && j < s.column + (s.colSpan ?? 1))) return null;
                    const span = spans.find((s) => s.row === i && s.column === j);
                    return j === 0 ? (
                      <th scope="row" key={j} rowSpan={span?.rowSpan} colSpan={span?.colSpan}>
                        {underlinedText({ text: cell, underlines: m.underlines })}
                      </th>
                    ) : (
                      <td key={j} rowSpan={span?.rowSpan} colSpan={span?.colSpan}>{underlinedText({ text: cell, underlines: m.underlines })}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (m.kind === 'text' || m.kind === 'figure') && (m.renderText || !m.assetUrl) ? (
        <p className="b1-original-text">{underlinedText(m)}</p>
      ) : m.renderText || !m.assetUrl ? (
        <pre tabIndex={0}><code>{m.text}</code></pre>
      ) : null}
      {m.tableNotes?.map((note) => <p className="b1-original-text" key={note}>{note}</p>)}
      {m.assetUrl ? (
        m.renderText ? (
          <details>
            <summary>{m.classification === 'D' ? '再構成図を確認' : '原本画像・注記を確認'}</summary>
            <SourceImage url={m.assetUrl} alt={m.text} />
          </details>
        ) : (
          <SourceImage url={m.assetUrl} alt={m.text} />
        )
      ) : null}
    </figure>
  );
}

export function SourceImage({ url, alt }: { url: string; alt: string }) {
  const src = `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
  return (
    <>
      <img className="b1-source-image" src={src} alt={alt} loading="lazy" />
      <details>
        <summary>原寸で拡大して読む（横スクロール）</summary>
        <div
          className="b1-material-scroll"
          role="region"
          aria-label="拡大した原本画像"
          tabIndex={0}
        >
          <img className="b1-source-image-full" src={src} alt={alt} loading="lazy" />
        </div>
      </details>
    </>
  );
}

function underlinedText(p: Pick<B1Paragraph, 'text' | 'underlines'>): ReactNode {
  const marks = (p.underlines ?? [])
    .map((mark) => ({ ...mark, index: p.text.indexOf(mark.text) }))
    .filter((mark) => mark.index >= 0)
    .sort((a, b) => a.index - b.index);
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const mark of marks) {
    parts.push(
      p.text.slice(offset, mark.index),
      <u key={mark.label} data-underline={mark.label}>
        {mark.text}
      </u>,
    );
    offset = mark.index + mark.text.length;
  }
  parts.push(p.text.slice(offset));
  return parts;
}
