import packageMetadata from '../../package.json';

/**
 * アプリ表示とバックアップで共通に使用するリリース番号です。
 * package.json を唯一の正本として、複数箇所へ手入力しません。
 */
export const APP_VERSION = packageMetadata.version;
