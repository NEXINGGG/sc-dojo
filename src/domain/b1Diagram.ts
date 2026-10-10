export interface B1Diagram {
  strokes: number[][];
  note: string;
}
const prefix = 'diagram:v1:';
export function parseB1Diagram(value: string): B1Diagram {
  if (!value.startsWith(prefix)) return { strokes: [], note: value };
  try {
    const parsed: unknown = JSON.parse(value.slice(prefix.length));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('strokes' in parsed) ||
      !('note' in parsed)
    )
      return { strokes: [], note: '' };
    const { strokes, note } = parsed;
    if (
      typeof note !== 'string' ||
      !Array.isArray(strokes) ||
      strokes.length > 100 ||
      !strokes.every(
        (line: unknown) =>
          Array.isArray(line) &&
          line.length >= 2 &&
          line.length <= 2000 &&
          line.length % 2 === 0 &&
          line.every(
            (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 600,
          ),
      )
    )
      return { strokes: [], note: '' };
    return { strokes, note };
  } catch {
    return { strokes: [], note: '' };
  }
}
export function serializeB1Diagram(diagram: B1Diagram): string {
  return diagram.strokes.length || diagram.note.trim() ? prefix + JSON.stringify(diagram) : '';
}
