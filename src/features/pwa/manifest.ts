import { APP_DESCRIPTION, APP_ID, APP_NAME, APP_SHORT_NAME } from '../../app/appIdentity';

export interface PwaManifestDefinition {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: 'ja';
  dir: 'ltr';
  start_url: string;
  scope: string;
  display: 'standalone';
  orientation: 'any';
  theme_color: string;
  background_color: string;
  categories: string[];
  icons: Array<{
    src: string;
    sizes: string;
    type: 'image/png';
    purpose?: 'any' | 'maskable';
  }>;
}

export const DEFAULT_APP_BASE = '/';

export function normalizeAppBase(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_APP_BASE;
  const withLeadingSlash = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function createPwaManifest(base: string): PwaManifestDefinition {
  const normalizedBase = normalizeAppBase(base);
  return {
    id: `${normalizedBase}${APP_ID}`,
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: 'ja',
    dir: 'ltr',
    start_url: `${normalizedBase}#/`,
    scope: normalizedBase,
    display: 'standalone',
    orientation: 'any',
    theme_color: '#2563EB',
    background_color: '#F6F8FC',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: 'icons/a1-dojo-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'icons/a1-dojo-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: 'icons/a1-dojo-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
