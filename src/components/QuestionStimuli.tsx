import { useEffect, useRef, useState } from 'react';
import type { Choice, QuestionStimulus } from '../types/question';
import { questionImageUrl } from '../features/pwa/questionAssets.mjs';

interface Props {
  stimulus?: readonly QuestionStimulus[];
  assetBase?: string;
}

export function QuestionStimuli({ stimulus, assetBase = import.meta.env.BASE_URL }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    const update = () => {
      setHasOverflow(
        [...element.querySelectorAll<HTMLElement>('.question-stimulus-scroll')].some(
          (item) => item.scrollWidth > item.clientWidth,
        ),
      );
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [stimulus]);
  if (stimulus === undefined || stimulus.length === 0) return null;
  return (
    <div className="question-stimuli" ref={containerRef}>
      {hasOverflow ? (
        <p className="stimulus-scroll-hint">表・コードは左右にスクロールできます。</p>
      ) : null}
      {stimulus.map((item, index) => {
        switch (item.type) {
          case 'table':
            return (
              <div
                className="question-stimulus-scroll"
                key={index}
                tabIndex={0}
                role="region"
                aria-label={item.caption ?? '問題の表'}
              >
                <table className="question-table">
                  {item.caption === undefined ? null : <caption>{item.caption}</caption>}
                  <thead>
                    <tr>
                      {item.headers.map((header, column) => (
                        <th key={column} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, column) => (
                          <td key={column}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'code':
            return (
              <figure className="question-code" key={index}>
                {item.caption === undefined ? null : <figcaption>{item.caption}</figcaption>}
                <pre
                  className="question-stimulus-scroll"
                  tabIndex={0}
                  aria-label={item.caption ?? '問題のコード・ログ'}
                >
                  <code>{item.content}</code>
                </pre>
              </figure>
            );
          case 'image':
            return (
              <QuestionImage
                key={`${index}:${item.src}:${item.asset_sha256}`}
                image={item}
                assetBase={assetBase}
              />
            );
        }
      })}
    </div>
  );
}

function QuestionImage({
  image,
  assetBase,
}: {
  image: Extract<QuestionStimulus, { type: 'image' }>;
  assetBase: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = questionImageUrl(image.src, assetBase);
  return (
    <figure className="question-image">
      {failed || src === undefined ? (
        <p role="alert">
          図を表示できません。オンラインでアプリを更新してから、問題を開き直してください。代替説明:{' '}
          {image.alt}
        </p>
      ) : (
        <img src={src} alt={image.alt} onError={() => setFailed(true)} />
      )}
      {image.caption === undefined ? null : <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}

export function QuestionChoiceContent({ choice }: { choice: Choice }) {
  if (choice.stimulus === undefined || choice.stimulus.length === 0)
    return <span>{choice.text}</span>;
  return (
    <div className="choice-content">
      <span>{choice.text}</span>
      <QuestionStimuli stimulus={choice.stimulus} />
    </div>
  );
}

export function QuestionChoiceFigures({ choices }: { choices: readonly Choice[] }) {
  if (!choices.some((choice) => (choice.stimulus?.length ?? 0) > 0)) return null;
  return (
    <div className="result-choice-stimuli">
      {choices.map((choice) => (
        <div key={choice.id}>
          <p>
            {choice.id}. {choice.text}
          </p>
          <QuestionStimuli stimulus={choice.stimulus} />
        </div>
      ))}
    </div>
  );
}
