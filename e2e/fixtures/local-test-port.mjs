import { createServer } from 'node:net';

export async function localTestPort() {
  const socket = createServer();
  await new Promise((done, reject) => {
    socket.once('error', reject);
    socket.listen(0, 'localhost', done);
  });
  const address = socket.address();
  if (!address || typeof address === 'string') throw new Error('テスト用ポートを取得できません。');
  const port = address.port;
  await new Promise((done, reject) => socket.close((error) => error ? reject(error) : done()));
  return port;
}
