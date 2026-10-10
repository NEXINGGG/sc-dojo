import { fileURLToPath } from 'node:url';
// Test/build-only opt-in. The production catalog continues to import questions.json.
export function scA1CandidatePlugin() {
  return {
    name: 'sc-a1-candidate-validation',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (
        process.env.SC_A1_CANDIDATE === '1' &&
        source === '../../data/questions.json' &&
        importer?.replace(/\\/g, '/').endsWith('/src/data/catalog.ts')
      ) {
        return fileURLToPath(new URL('../data/sc-a1-v1-candidate.json', import.meta.url));
      }
      return null;
    },
  };
}
