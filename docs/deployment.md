# 配布手順

特定のホスティングサービスには依存しない。ここでは静的成果物を安全に配信するための条件だけを記載する。

## 本番成果物

```bash
pnpm run check:release
pnpm run build
```

配布するのは `dist/` の内容である。`index.html`、ハッシュ付きJS/CSS、`manifest.webmanifest`、`sw.js`、Workboxファイル、`icons/` を同じ公開パスに配置する。ソース、バックアップ、`.env`、開発用ファイルは配布しない。

## HTTPS と公開パス

Service Workerとインストール機能は、localhost以外ではHTTPSを必要とする。

ドメイン直下へ公開する場合:

```bash
pnpm run build
```

`/a1-dojo/` のようなサブディレクトリへ公開する場合:

```bash
VITE_APP_BASE=/a1-dojo/ pnpm run build
```

Windows PowerShellでは次を使う。

```powershell
$env:VITE_APP_BASE = '/a1-dojo/'
pnpm run build
```

`VITE_APP_BASE` はViteの`base`、Manifestの`start_url`・`scope`、Service Workerの公開パスに連動する。A1道場はHashRouterを使用するため、`/#/practice` のような画面URLで静的ホスティングのリライト設定に依存しにくい。

## 新バージョンの公開

1. `check:release` と手動テストを完了する。
2. 同じ公開パスに新しい`dist/`を配置する。
3. 初回表示後、Service Workerが新しい版を検出することを確認する。
4. アプリ内の「更新する」で適用し、途中演習・途中模試・学習履歴が残ることを確認する。

利用中の画面は自動更新しない。利用者が更新を選ぶまで旧版が表示されることがある。

## ロールバックと公開後確認

問題があれば、同じ公開パスに直前の正常な`dist/`を戻す。Service Workerのキャッシュを削除する手順を利用者へ一律に案内せず、まず再読み込みまたはアプリ内更新を案内する。IndexedDBの学習データはキャッシュと別であり、ロールバックやService Worker更新で削除してはならない。

公開後は、Manifest、Service Worker、アイコン、オフライン再読み込み、通常演習・模試の保存、更新通知、バックアップ作成を確認する。
