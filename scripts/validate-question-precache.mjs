import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { questionImageExtensions } from '../src/features/pwa/questionAssets.mjs';

export function validateQuestionPrecache(
  publicDirectory,
  distDirectory,
  serviceWorker,
  options = {},
) {
  const errors = [];
  const entries = new Map(
    [
      ...serviceWorker.matchAll(
        /(?:"url"|url)\s*:\s*["']([^"']+)["']\s*,\s*(?:"revision"|revision)\s*:\s*["']([^"']+)["']/g,
      ),
    ].map((match) => [match[1], match[2]]),
  );
  const root = join(publicDirectory, 'questions');
  for (const file of listImages(root)) {
    if (options.includeScB === false && file.startsWith('sc/b/')) continue;
    const assetPath = `questions/${file}`;
    try {
      const source = readFileSync(join(root, file));
      const output = readFileSync(join(distDirectory, assetPath));
      if (!source.equals(output)) errors.push(`${assetPath}: build出力が元画像と一致しません`);
      // Workbox revisions for public files are the MD5 of their bytes.
      if (entries.get(assetPath) !== createHash('md5').update(output).digest('hex'))
        errors.push(`${assetPath}: revision付きprecacheがありません、又は画像内容と一致しません`);
    } catch (error) {
      errors.push(`${assetPath}: ${error.message}`);
    }
  }
  return errors;
}

function listImages(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return entries.flatMap((entry) => {
    if (entry.isDirectory())
      return listImages(join(directory, entry.name)).map((file) => `${entry.name}/${file}`);
    const extension = entry.name.split('.').at(-1);
    return entry.isFile() && questionImageExtensions.includes(extension) ? [entry.name] : [];
  });
}
