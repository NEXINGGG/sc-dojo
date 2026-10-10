import type { Plugin } from 'vite';
import { createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** Official scan extracts are served only by the development pilot, never shipped by build. */
export function scBPilotAssetsPlugin(): Plugin {
  return {
    name: 'sc-b-pilot-assets',
    apply: 'serve',
    configureServer(server) {
      if (process.env.VITE_SC_B_PILOT !== '1') return;
      const directory = fileURLToPath(
        new URL('../data/sc-b-pilot-assets/2025-fall/', import.meta.url),
      );
      server.middlewares.use((req, res, next) => {
        const match =
          /^\/questions\/sc-b\/2025-fall\/((?:page-\d{2}|q[1-4]-(?:figure|table)-\d+)\.png|2025r07a_sc_pm_qs\.pdf)(?:\?.*)?$/.exec(
            req.url ?? '',
          );
        if (!match) return next();
        const path = join(directory, match[1]);
        if (!existsSync(path)) {
          res.statusCode = 404;
          res.end('教材画像が見つかりません');
          return;
        }
        res.setHeader('Content-Type', path.endsWith('.pdf') ? 'application/pdf' : 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(path).pipe(res);
      });
    },
  };
}
