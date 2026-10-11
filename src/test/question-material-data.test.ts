import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  processQuestionContentHashes,
  validateQuestionMaterialData,
} from '../../scripts/question-material-data.mjs';
import { createQuestionMaterialFixture } from './questionMaterialFixture';
import a1Payload from '../../data/questions.json';
import a2Payload from '../../data/a2-questions.json';
import a2Categories from '../../data/a2-categories.json';
import { createCatalog, type RawQuestionPayload } from '../data/catalog';

let temporary: string;
beforeEach(() => {
  temporary = mkdtempSync(join(tmpdir(), 'sc-material-'));
  mkdirSync(join(temporary, 'questions/sc/a2'), { recursive: true });
});
afterEach(() => {
  rmSync(temporary, { recursive: true, force: true });
});
const options = () => ({ publicDirectory: temporary });
const updated = (): RawQuestionPayload =>
  processQuestionContentHashes(createQuestionMaterialFixture(), { ...options(), mode: 'update' })
    .payload;

describe('教材データ検証とhashツール', () => {
  it('既存240問ずつを新フィールドなしで受け入れる', () => {
    expect(validateQuestionMaterialData(a1Payload)).toEqual([]);
    expect(validateQuestionMaterialData(a2Payload)).toEqual([]);
  });
  it('カタログに教材版・hash・出典・図表を保持する', () => {
    const payload = updated();
    expect(validateQuestionMaterialData(payload, options())).toEqual([]);
    const catalog = createCatalog('a2', payload, a2Categories);
    expect(catalog.datasetVersion).toBe('sc-a2-test-v1');
    expect(catalog.questions[0]).toMatchObject({
      sourceId: 'SC-2099-SPRING-Q01',
      contentHash: payload.questions[0].content_hash,
      datasetVersion: catalog.datasetVersion,
      stimulus: payload.questions[0].stimulus,
      source: payload.questions[0].source,
    });
  });
  it('source_idを別codeに割り当てた重複を検出する', () => {
    const payload = updated();
    payload.questions.push({ ...payload.questions[0], id: 1002, code: 'A2-002' });
    expect(validateQuestionMaterialData(payload, options()).join('\n')).toContain('source_id重複');
  });
  it.each(['year', 'term', 'source_id', 'official_question_url'] as const)(
    '不正な%sを検出する',
    (key) => {
      const payload = updated();
      const source = payload.questions[0].source as unknown as Record<string, unknown>;
      source[key] = key === 'year' ? 2024.5 : 'invalid';
      expect(validateQuestionMaterialData(payload, options()).join('\n')).toContain(key);
    },
  );
  it('新教材にはhashと版を要求し、厳格モードを明示できる', () => {
    const payload = createQuestionMaterialFixture();
    expect(validateQuestionMaterialData(payload, options()).join('\n')).toContain('content_hash');
    delete payload.metadata.dataset_version;
    expect(
      validateQuestionMaterialData(payload, { ...options(), strictScA2: true }).join('\n'),
    ).toContain('dataset_version');
  });
  it.each([
    { type: 'table', headers: ['a', 'b'], rows: [['a']] },
    { type: 'code', content: '' },
    { type: 'image', src: 'https://example.com/a.svg' },
  ])('不正な図表を検出する: $type', (stimulus) => {
    const payload = updated();
    (payload.questions[0] as unknown as Record<string, unknown>).stimulus = [stimulus];
    expect(validateQuestionMaterialData(payload, options()).join('\n')).toContain(stimulus.type);
  });
  it('画像hashを生成し、alt欠落・ファイル欠落・画像上書きを検出する', () => {
    const file = join(temporary, 'questions/sc/a2/test.svg');
    writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg"><text>テスト</text></svg>');
    const payload = createQuestionMaterialFixture();
    payload.questions[0].choices[0].stimulus = [
      { type: 'image', src: 'questions/sc/a2/test.svg', alt: 'テスト図', asset_sha256: '' },
    ];
    const result = processQuestionContentHashes(payload, { ...options(), mode: 'update' });
    expect(result.errors).toEqual([]);
    expect(result.payload.questions[0].choices[0].stimulus[0].asset_sha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(validateQuestionMaterialData(result.payload, options())).toEqual([]);
    const withoutAlt = structuredClone(result.payload);
    delete withoutAlt.questions[0].choices[0].stimulus[0].alt;
    expect(validateQuestionMaterialData(withoutAlt, options()).join('\n')).toContain('image.alt');
    writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg"><text>変更</text></svg>');
    expect(validateQuestionMaterialData(result.payload, options()).join('\n')).toContain(
      'asset_sha256',
    );
    const changed = processQuestionContentHashes(result.payload, { ...options(), mode: 'update' });
    expect(changed.payload.questions[0].content_hash).not.toBe(
      result.payload.questions[0].content_hash,
    );
    rmSync(file);
    expect(validateQuestionMaterialData(result.payload, options()).join('\n')).toContain('image:');
  });
  it('SVGのLFからCRLFへの変更も実バイトのhash不一致として拒否する', () => {
    const file = join(temporary, 'questions/sc/a2/test.svg');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg">\n<text>テスト</text>\n</svg>\n';
    writeFileSync(file, svg);
    const payload = createQuestionMaterialFixture();
    payload.questions[0].stimulus = [
      { type: 'image', src: 'questions/sc/a2/test.svg', alt: 'テスト図', asset_sha256: '' },
    ];
    const result = processQuestionContentHashes(payload, { ...options(), mode: 'update' });
    expect(result.errors).toEqual([]);
    expect(result.payload.questions[0].stimulus[0].asset_sha256).toBe(
      createHash('sha256').update(svg).digest('hex'),
    );
    writeFileSync(file, svg.replaceAll('\n', '\r\n'));
    const checked = processQuestionContentHashes(result.payload, { ...options(), mode: 'check' });
    expect(checked.errors.join('\n')).toContain('image.asset_sha256');
    expect(checked.payload).toEqual(result.payload);
    writeFileSync(file, svg);
    expect(validateQuestionMaterialData(result.payload, options())).toEqual([]);
  });
  it('CLIのcheckが不整合を検出し、ファイルを変更しない', () => {
    const file = join(temporary, 'questions.json');
    writeFileSync(file, JSON.stringify(createQuestionMaterialFixture()));
    const cli = resolve('scripts/update-question-content-hashes.mjs');
    execFileSync(process.execPath, [cli, file, '--update'], { windowsHide: true });
    const original = readFileSync(file, 'utf8');
    execFileSync(process.execPath, [cli, file, '--check'], { windowsHide: true });
    expect(readFileSync(file, 'utf8')).toBe(original);
    const changed = JSON.parse(original);
    changed.questions[0].question += '変更';
    writeFileSync(file, JSON.stringify(changed));
    expect(() =>
      execFileSync(process.execPath, [cli, file, '--check'], { windowsHide: true, stdio: 'pipe' }),
    ).toThrow();
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(changed));
    expect(validateQuestionMaterialData(changed, options()).join('\n')).toContain('content_hash');
  });
});
