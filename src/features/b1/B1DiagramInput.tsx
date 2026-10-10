import { useRef, useState, type PointerEvent } from 'react';
import { parseB1Diagram, serializeB1Diagram, type B1Diagram } from '../../domain/b1Diagram';

export function B1DiagramInput({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const diagram = parseB1Diagram(value);
  const [activeStroke, setActiveStroke] = useState<number[]>([]);
  const active = useRef<number[]>([]);
  function point(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [
      Math.round(Math.min(600, Math.max(0, ((event.clientX - bounds.left) * 600) / bounds.width))),
      Math.round(Math.min(400, Math.max(0, ((event.clientY - bounds.top) * 400) / bounds.height))),
    ];
  }
  function finish() {
    if (active.current.length)
      onChange(serializeB1Diagram({ ...diagram, strokes: [...diagram.strokes, active.current] }));
    active.current = [];
    setActiveStroke([]);
  }
  return (
    <div className="b1-diagram-input">
      <p>指やマウスで図を描けます。文字・配置は下の説明欄にも記録してください。</p>
      <svg
        viewBox="0 0 600 400"
        className="b1-diagram-canvas"
        aria-label="図示答案の描画欄"
        onPointerDown={(event) => {
          if (disabled || diagram.strokes.length >= 100) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          active.current = point(event);
          setActiveStroke(active.current);
        }}
        onPointerMove={(event) => {
          if (!active.current.length || disabled || active.current.length >= 2000) return;
          active.current = [...active.current, ...point(event)];
          setActiveStroke(active.current);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <DiagramStrokes
          diagram={{
            ...diagram,
            strokes: [...diagram.strokes, activeStroke].filter((s) => s.length),
          }}
        />
      </svg>
      <button
        className="secondary-button"
        disabled={disabled || !diagram.strokes.length}
        type="button"
        onClick={() =>
          onChange(serializeB1Diagram({ ...diagram, strokes: diagram.strokes.slice(0, -1) }))
        }
      >
        直前の線を戻す
      </button>
      <label htmlFor={id}>図の説明・配置・記入する文字</label>
      <textarea
        id={id}
        disabled={disabled}
        rows={4}
        value={diagram.note}
        onChange={(event) =>
          onChange(serializeB1Diagram({ ...diagram, note: event.currentTarget.value }))
        }
      />
    </div>
  );
}
export function B1DiagramPreview({ value }: { value: string }) {
  const diagram = parseB1Diagram(value);
  return (
    <div>
      {diagram.strokes.length ? (
        <svg
          viewBox="0 0 600 400"
          className="b1-diagram-canvas"
          role="img"
          aria-label="保存した図示答案"
        >
          <DiagramStrokes diagram={diagram} />
        </svg>
      ) : null}
      <p>{diagram.note || (diagram.strokes.length ? '図示答案' : '未入力')}</p>
    </div>
  );
}
function DiagramStrokes({ diagram }: { diagram: B1Diagram }) {
  return diagram.strokes.map((line, i) => (
    <polyline
      key={i}
      points={Array.from(
        { length: line.length / 2 },
        (_, j) => `${line[j * 2]},${line[j * 2 + 1]}`,
      ).join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ));
}
