import { useEffect, useMemo, useRef, useState } from 'react';
import type { B1Case, B1QuestionUnit } from '../../data/b1';
import { database } from '../../database/database';
import { usePwa } from '../pwa/PwaContext';
import { B1Repository } from './b1Repository';

const repository = new B1Repository(database);

export function B1PdfReference({ caseItem, unit }: { caseItem: B1Case; unit: B1QuestionUnit }) {
  const { isOnline } = usePwa();
  const [localUrl, setLocalUrl] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const objectUrl = useRef<string | undefined>(undefined);
  const printedPages = useMemo(
    () =>
      Array.isArray(unit.sourcePromptLocator.printedPage)
        ? unit.sourcePromptLocator.printedPage
        : [unit.sourcePromptLocator.printedPage],
    [unit.sourcePromptLocator.printedPage],
  );
  const pageFragment = useMemo(() => `#page=${printedPages[0]}`, [printedPages]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setMessage(undefined);
    void repository
      .getPdf(caseItem.year)
      .then((row) => {
        if (!active || row === undefined) return;
        replaceObjectUrl(row.blob);
        setFileName(row.fileName);
      })
      .catch(() => {
        if (active) setMessage('登録済みPDFを読み込めませんでした。もう一度登録してください。');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl.current !== undefined) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = undefined;
      }
    };
  }, [caseItem.year]);

  async function registerPdf(file: File | undefined) {
    if (file === undefined) return;
    setMessage(undefined);
    try {
      await repository.savePdf(caseItem.year, file);
      setMessage(`${caseItem.year}年度の公式問題PDFをこの端末へ登録しました。外部送信はしません。`);
      replaceObjectUrl(file);
      setFileName(file.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDFを登録できませんでした。');
    }
  }

  async function removePdf() {
    try {
      await repository.removePdf(caseItem.year);
      if (objectUrl.current !== undefined) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = undefined;
      }
      setLocalUrl(undefined);
      setFileName(undefined);
      setMessage('この端末に登録したPDFを削除しました。');
    } catch {
      setMessage('登録済みPDFを削除できませんでした。');
    }
  }

  const referenceUrl =
    localUrl ?? (isOnline ? `${caseItem.source.questionPdfUrl}${pageFragment}` : undefined);

  return (
    <section aria-label="公式PDF" className="b1-pdf-reference surface-card">
      <div className="b1-reference-heading">
        <div>
          <p className="eyebrow">公式PDF</p>
          <h2>
            {caseItem.year}年度 問{caseItem.questionNumber}
          </h2>
        </div>
        <a
          className="secondary-button compact-action"
          href={`${caseItem.source.questionPdfUrl}${pageFragment}`}
          rel="noreferrer"
          target="_blank"
        >
          公式PDFを開く
        </a>
      </div>
      <p>
        設問掲載ページ: <strong>{printedPages.join('・')}ページ</strong>
        {unit.sourcePromptLocator.figureRefs.length > 0
          ? `（${unit.sourcePromptLocator.figureRefs.join('・')}を確認）`
          : ''}
        {unit.sourcePromptLocator.tableRefs.length > 0
          ? `（${unit.sourcePromptLocator.tableRefs.join('・')}を確認）`
          : ''}
      </p>
      {referenceUrl !== undefined ? (
        <iframe
          className="b1-pdf-frame"
          src={referenceUrl}
          title={`${caseItem.year}年度 問${caseItem.questionNumber} 公式問題PDF`}
        />
      ) : (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>問題本文を表示できません</strong>
          <p>
            オフラインで、{caseItem.year}
            年度の公式問題PDFがこの端末に登録されていません。IPAからPDFをダウンロードして、下のボタンから登録してください。
          </p>
        </section>
      )}
      <div className="b1-pdf-register">
        <label className="file-input-label" htmlFor={`b1-pdf-${caseItem.year}`}>
          {caseItem.year}年度のPDFを端末へ登録
        </label>
        <input
          accept="application/pdf,.pdf"
          id={`b1-pdf-${caseItem.year}`}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            void registerPdf(file);
          }}
          type="file"
        />
        {fileName !== undefined ? (
          <p className="muted-text">
            登録済み: {fileName}{' '}
            <button className="text-button" onClick={() => void removePdf()} type="button">
              削除
            </button>
          </p>
        ) : isLoading ? (
          <p className="muted-text">登録済みPDFを確認しています。</p>
        ) : null}
        {message !== undefined ? (
          <p className="muted-text" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );

  function replaceObjectUrl(blob: Blob) {
    if (objectUrl.current !== undefined) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(blob);
    setLocalUrl(objectUrl.current);
  }
}
