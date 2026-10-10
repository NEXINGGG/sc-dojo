import { describe, expect, it } from 'vitest';
// @ts-expect-error The deployment CLI helper is JavaScript.
import { findUnexpectedLocalPaths } from './deployment-paths.mjs';

describe('配布物の端末絶対パス検査', () => {
  it('IPAログの省略パスとJavaのログラベルをパス漏えいと誤認しない', () => {
    expect(findUnexpectedLocalPaths('C:\\（省略）\\powershell.exe')).toEqual([]);
    expect(findUnexpectedLocalPaths('C:\\\\（省略）\\\\powershell.exeの通信量')).toEqual([]);
    expect(findUnexpectedLocalPaths('log.debug("error:\\" + e); System.out.println("SQL:\\" + sql);')).toEqual([]);
  });
  it('実際の端末パスと許容パスに似た別パスは拒否する', () => {
    for (const source of [
      'C:\\Users\\private\\file', 'D:\\\\dev\\workspace',
      '/Users/private/file', '/home/private/file', 'file:///C:/private/file',
      'C:\\（省略）\\powershell.exe\\private', 'C:\\（省略）\\powershell.exe.bad',
    ]) expect(findUnexpectedLocalPaths(source).length).toBeGreaterThan(0);
  });
});
