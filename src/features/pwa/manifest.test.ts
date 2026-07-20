import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPwaManifest, normalizeAppBase } from './manifest';

describe('PWA Manifest設定', () => {
  it('必須項目とインストール用アイコンを定義する', () => {
    const manifest = createPwaManifest('/');

    expect(manifest).toMatchObject({
      name: 'ネットワークスペシャリスト NW道場',
      short_name: 'NW道場',
      lang: 'ja',
      display: 'standalone',
      start_url: '/#/',
      scope: '/',
      categories: ['education', 'productivity'],
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'icons/a1-dojo-192.png', sizes: '192x192' }),
        expect.objectContaining({ src: 'icons/a1-dojo-512.png', sizes: '512x512' }),
        expect.objectContaining({
          src: 'icons/a1-dojo-maskable-512.png',
          purpose: 'maskable',
        }),
      ]),
    );
  });

  it('サブディレクトリ公開時もbaseとstart_url・scopeを揃える', () => {
    const base = normalizeAppBase('dojo');
    const manifest = createPwaManifest(base);

    expect(base).toBe('/dojo/');
    expect(manifest.start_url).toBe('/dojo/#/');
    expect(manifest.scope).toBe('/dojo/');
  });

  it('manifestとApple向けのローカルアイコンが存在する', () => {
    for (const name of [
      'a1-dojo-192.png',
      'a1-dojo-512.png',
      'a1-dojo-maskable-512.png',
      'a1-dojo-apple-touch-icon.png',
      'a1-dojo-icon.svg',
    ]) {
      expect(existsSync(resolve('public/icons', name))).toBe(true);
    }
  });
});
