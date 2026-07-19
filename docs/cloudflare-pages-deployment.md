# Cloudflare Pages 公開手順

この手順は、A1道場をCloudflare PagesのGitHub連携で公開するときに使う。ここに記載したGitHub、Cloudflareの操作は、公開担当者が手動で行う。本リポジトリにはCloudflare APIトークン、Wrangler設定、アクセス解析は含めない。

## 公開前のローカル確認

```bash
pnpm install --frozen-lockfile
pnpm run check:release
```

`pnpm run build`は、データ検証の後にPWA成果物と公開用の検査を実行する。`dist/`へ`index.html`、`manifest.webmanifest`、`sw.js`、Workboxファイル、アイコン、`_headers`、`robots.txt`が出力されることを確認する。

## GitHubリポジトリの準備

1. GitHubで**非公開**リポジトリを作成する。推奨する説明文は「ネットワークスペシャリスト科目A-1向け、個人利用のオフライン対応学習PWA」。
2. ライセンス方針を決定する。現時点では利用条件が未決定のため、`LICENSE`ファイルは追加していない。
3. ローカルでリモートを登録する。`<OWNER>`と`<REPOSITORY>`は実際の値へ置き換える。

   ```bash
   git remote add origin git@github.com:<OWNER>/<REPOSITORY>.git
   git remote -v
   ```

4. `main`ブランチに公開する内容をレビュー、コミットする。

   ```bash
   git switch main
   git push -u origin main
   ```

`dist/`、`node_modules/`、Playwrightの`playwright-report/`・`test-results/`、`.env*`、バックアップJSONは公開対象やGit管理対象に含めない。学習データはブラウザのIndexedDBにだけ保存され、アプリから外部送信しない。

## Cloudflare Pagesの設定

Cloudflare Dashboardで **Workers & Pages** を開き、**Create application > Pages > Import an existing Git repository** を選ぶ。GitHubを接続し、対象の非公開リポジトリを選択する。

| 項目 | 設定値 |
| --- | --- |
| Production branch | `main` |
| Framework preset | React (Vite) または None |
| Build command | `pnpm run build` |
| Build output directory | `dist` |
| Root directory | リポジトリルート（空欄または `.`） |
| Node.js | `24.18.0` |
| pnpm | `11.9.0` |
| Vite base | `/`（既定値のまま） |
| Router | HashRouterを維持 |

**Settings > Environment variables** でProductionとPreviewの両方へ、次を設定する。

```text
NODE_VERSION=24.18.0
PNPM_VERSION=11.9.0
```

`.node-version`にも`24.18.0`を置いているが、Cloudflare上でも`NODE_VERSION`を明示する。Cloudflare Pagesのv3ビルド環境は`NODE_VERSION`・`.node-version`と`PNPM_VERSION`で各ツールの版を上書きできる。`package.json`の`packageManager`も`pnpm@11.9.0`で固定済みである。

Cloudflare Pagesは`pnpm-lock.yaml`を検出して依存関係を導入する。初回設定では追加のInstall commandや`SKIP_DEPENDENCY_INSTALL`は設定しない。ビルドログで`pnpm install --frozen-lockfile`相当の依存関係導入と、`pnpm run build`の成功を確認する。

## 初回デプロイの確認

1. **Save and Deploy**を選ぶ。
2. Deploy logで依存関係の導入、240問のデータ検証、TypeScript、Vite build、`deployment artifacts`の検査がすべて成功していることを確認する。
3. 完了後、Pagesプロジェクトの**Deployments**に表示される`https://<PROJECT>.pages.dev`を開く。
4. `https://<PROJECT>.pages.dev/#/practice`、`/#/exam`、`/#/progress`を開く。HashRouterのためサーバー側SPAリライトは不要である。
5. DevToolsで`manifest.webmanifest`、`sw.js`、Workboxファイル、PWAアイコン、`_headers`由来のレスポンスヘッダーを確認する。

公開先はPagesプロジェクト直下であるため、`VITE_APP_BASE`は設定しない。Manifestは`start_url: /#/`、`scope: /`となる。将来サブディレクトリへ移すときだけ、`VITE_APP_BASE=/公開パス/`を設定して再ビルドする。

## 継続的な公開とプレビュー

- `main`へpushされたコミットはProductionへ自動デプロイされる。
- `main`以外のブランチまたはプルリクエストはPreview deploymentを使い、本番に出す前に実URLでPWA、オフライン、更新通知を確認する。
- 新版の公開前に`pnpm run check:release`を実行する。
- 新版のデプロイ後は、旧版を開いた状態で更新通知が出ること、「後で」では学習を継続できること、「更新する」では学習データと途中セッションが残ることを確認する。

`pages.dev`のPreview URLも含め、検索除外の対象である。`robots.txt`、HTMLの`noindex`、`X-Robots-Tag`は検索エンジンへの依頼であり、URLを知る人のアクセスを止めるものではない。

## デプロイ失敗時

次の順に確認する。

1. CloudflareのDeploy logで、Node.jsとpnpmが指定版になっているか確認する。
2. Root directoryがリポジトリルート、Build commandが`pnpm run build`、Output directoryが`dist`か確認する。
3. `pnpm-lock.yaml`、`.node-version`、`package.json`の`packageManager`がコミットされているか確認する。
4. ローカルで`pnpm install --frozen-lockfile`と`pnpm run check:release`を実行し、同じエラーを再現する。
5. `dist/`の`manifest.webmanifest`、`sw.js`、`_headers`、`robots.txt`がビルド後にあるか確認する。

## ロールバックとキャッシュ不整合

Cloudflare Dashboardの**Deployments**から直前の正常なデプロイを選び、ロールバックする。ロールバック前後ともIndexedDBは削除しない。学習履歴、途中演習、途中模試はService Workerキャッシュとは別の端末内データである。

新旧キャッシュの不整合では、まずアプリ内の更新通知から「更新する」を選ぶ。解消しない場合は通常の再読み込みを試す。開発者が調査しても解消しない場合に限り、利用者がバックアップを作成したあとで、そのサイトのService Worker登録解除やサイトデータ削除を案内する。

Service Workerは`sw.js`を長期キャッシュしない設定で配信する。ハッシュ付きの`/assets/*`だけを長期キャッシュするため、新しい`index.html`と`sw.js`を取得できる。

## 公開範囲と将来のアクセス制限

GitHubリポジトリを非公開にしても、Cloudflare Pagesで公開した`pages.dev` URLは自動的に認証付きにはならない。個人だけへ確実に限定したい場合は、Cloudflare Access、Zero Trustの認証ポリシー、または別の認証付き配信方式を設計・導入する。初期版へログイン機能を追加しない。

## CSPについて

`public/_headers`にはCSPを設定していない。PWA、Service Worker、Blobを使うバックアップダウンロードをCloudflare実配信ヘッダー下でまだ確認していないためである。CSPを追加する場合はPreview deploymentで`script-src`、`worker-src`、`manifest-src`、Blobダウンロード、PWA登録、通常演習・模試・バックアップのすべてを確認してから採用する。
