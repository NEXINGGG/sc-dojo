import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve, relative, isAbsolute } from 'node:path';

const root = resolve(process.argv[2]);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/sc-material/')) {
    response.writeHead(404).end();
    return;
  }
  const pathname = decodeURIComponent(url.pathname.slice('/sc-material/'.length)) || 'index.html';
  const file = resolve(root, pathname);
  const pathInRoot = relative(root, file);
  if (pathInRoot.startsWith('..') || isAbsolute(pathInRoot)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const bytes = readFileSync(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(0, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${server.address().port}/sc-material/`);
});
