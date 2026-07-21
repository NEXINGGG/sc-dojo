import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPwaManifest } from '../features/pwa/manifest';

const readProjectFile = (file: string) => readFileSync(resolve(file), 'utf8');

describe('Cloudflare Pages公開設定', () => {
  it('ドメイン直下公開用のManifestパスがHashRouterと整合する', () => {
    const manifest = createPwaManifest('/');

    expect(manifest.start_url).toBe('/#/');
    expect(manifest.scope).toBe('/');
  });

  it('Cloudflare Pagesヘッダーで不要な権限と長期キャッシュを制御する', () => {
    const headers = readProjectFile('public/_headers');

    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('Permissions-Policy:');
    expect(headers).toContain('/sw.js');
    expect(headers).toContain('Cache-Control: no-cache, no-store, must-revalidate');
    expect(headers).toContain('/manifest.webmanifest');
    expect(headers).toContain('/assets/*');
    expect(headers).toContain('immutable');
    expect(headers).toMatch(/\/index\.html\s+Cache-Control: no-cache, must-revalidate/s);
    expect(headers).toMatch(/\/manifest\.webmanifest\s+Cache-Control: no-cache, must-revalidate/s);
    expect(headers).toMatch(/\/sw\.js\s+Cache-Control: no-cache, no-store, must-revalidate/s);
    expect(headers).not.toContain(
      '/index.html\n  Cache-Control: public, max-age=31536000, immutable',
    );
    expect(headers).not.toContain(
      '/manifest.webmanifest\n  Cache-Control: public, max-age=31536000, immutable',
    );
    expect(headers).not.toContain('/sw.js\n  Cache-Control: public, max-age=31536000, immutable');
  });

  it('個人利用向けの検索除外設定をソースに含める', () => {
    expect(readProjectFile('public/robots.txt')).toMatch(/Disallow:\s*\//);
    expect(readProjectFile('index.html')).toMatch(
      /name="robots" content="noindex, nofollow, noarchive"/,
    );
    expect(existsSync(resolve('.node-version'))).toBe(true);
  });
});
