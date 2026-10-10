// IPA 2024秋 SC問1 表4に載る省略済みログパスだけを許容する。
// 教材チャンク全体や任意のWindowsパスを検査から除外しない。
export function findUnexpectedLocalPaths(source) {
  const checked = source.replace(
    /C:\\+（省略）\\+powershell\.exe(?=$|[^\\/\w.-])/g,
    '[IPA公式ログの省略パス]',
  );
  // error:\" / SQL:\" 等のJava文字列末尾はドライブ名ではない。
  return [...checked.matchAll(/(?<![A-Za-z0-9_])[A-Za-z]:\\|file:\/\/|\/Users\/|\/home\//g)]
    .map((match) => match[0]);
}
