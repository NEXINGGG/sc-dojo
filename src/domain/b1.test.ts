import { describe, expect, it } from 'vitest';
import { getB1QuestionUnit } from '../data/b1';
import { gradeB1Unit, normalizeB1Answer } from './b1';

describe('B-1 reference grading', () => {
  it('normalizes full-width punctuation, number separators, and IP/CIDR notation', () => {
    expect(normalizeB1Answer(' ＰｏＥ＋ ', 'term')).toBe('poe+');
    expect(normalizeB1Answer('１２０，０００', 'number')).toBe('120000');
    expect(normalizeB1Answer(' 172.016.000.001／２４ ', 'cidr')).toBe('172.16.0.1/24');
  });

  it('handles unordered multi-select and ordered sequences independently', () => {
    const unordered = getB1QuestionUnit('B1-2025-Q1-U05');
    const sequence = getB1QuestionUnit('B1-2025-Q3-U09');
    expect(unordered).toBeDefined();
    expect(sequence).toBeDefined();
    if (unordered === undefined || sequence === undefined) return;

    expect(gradeB1Unit(unordered, { osaka: 'ウ', tokyo: 'イ、ア' }).automaticCorrect).toBe(true);
    expect(gradeB1Unit(sequence, { route: 'B, A, H, I, E, I, K' }).automaticCorrect).toBe(true);
    expect(gradeB1Unit(sequence, { route: 'A, B, H, I, E, I, K' }).automaticCorrect).toBe(false);
  });
});
