import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { validateQuestionPrecache } from '../../scripts/validate-question-precache.mjs';

describe('教材画像precache成果物検証', () => {
  it('コピー・revisionを照合し、キャッシュ漏れと画像変更を検出する', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'sc-precache-'));
    const publicDirectory = join(temporary, 'public');
    const distDirectory = join(temporary, 'dist');
    const src = 'questions/sc/a2/test.webp';
    try {
      for (const directory of [publicDirectory, distDirectory])
        mkdirSync(join(directory, 'questions/sc/a2'), { recursive: true });
      const content = 'test-image-bytes';
      for (const directory of [publicDirectory, distDirectory])
        writeFileSync(join(directory, src), content);
      const revision = createHash('md5').update(content).digest('hex');
      const sw = `precacheAndRoute(${JSON.stringify([{ url: src, revision }])})`;
      expect(validateQuestionPrecache(publicDirectory, distDirectory, sw)).toEqual([]);
      expect(
        validateQuestionPrecache(publicDirectory, distDirectory, 'precacheAndRoute([])').join('\n'),
      ).toContain('precache');
      writeFileSync(join(distDirectory, src), 'changed-bytes');
      expect(validateQuestionPrecache(publicDirectory, distDirectory, sw).join('\n')).toContain(
        '一致しません',
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
