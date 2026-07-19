# NW A1 Dojo 開発準備一式

ネットワークスペシャリスト科目A-1の、過去問道場型PWAをCodexで開発するための準備パッケージです。

## 主要ファイル

- `AGENTS.md`：Codexが常に守る開発ルール
- `prompts/CODEX_MASTER_PROMPT.md`：最初に渡すプロンプト
- `prompts/PHASE_PROMPTS.md`：段階的な実装プロンプト
- `prototype/index.html`：色付きUIプロトタイプ
- `docs/design-system.md`：配色、文字、余白、コンポーネント
- `docs/screens.md`：主要10画面の仕様
- `docs/app-scope.md`：初期版の範囲
- `docs/acceptance-criteria.md`：完成条件
- `docs/implementation-plan.md`：推奨実装順
- `data/questions.json`：検証対象の240問
- `data/categories.json`：3系統・15カテゴリ・小分類
- `data/questions.schema.json`：問題データSchema
- `scripts/validate_questions.py`：構造検査
- `reports/validation_report.md`：検査結果
- `reports/editorial_review.md`：内容確認・修正履歴

## 問題データ検査

リポジトリのルートで実行します。

```bash
pnpm run validate:data
```

## リリース前の検査

個人利用版として公開する前は、次を実行します。

```bash
pnpm run check:release
```

公開パス、HTTPS、更新、ロールバックは[配布手順](docs/deployment.md)、端末別の確認は[手動テストチェックリスト](docs/manual-test-checklist.md)、最終確認項目は[公開前チェックリスト](docs/release-checklist.md)を参照してください。

## PWAの起動と確認

開発中は、古いキャッシュによる混乱を避けるためService Workerを登録しません。PWAとオフライン動作は、本番ビルドをpreviewで開いて確認します。

```bash
pnpm run build
pnpm run preview
```

ブラウザで表示後、DevToolsのApplication（またはアプリケーション）からManifestとService Workerを確認できます。初回のオンライン読込みとオフライン準備完了後に、DevToolsのNetworkでオフラインを有効にして再読み込みすると、通常演習・復習・模試・成績・バックアップ作成を確認できます。

### インストール

- PC・Android: ブラウザのメニューにある「インストール」または「アプリをインストール」を選びます。対応ブラウザでは設定画面の「この端末にインストール」も利用できます。
- iPhone・iPad: Safariの共有ボタンから「ホーム画面に追加」を選びます。ChromeなどではSafariで開いてください。

### 更新とキャッシュ

新しい版を検出してもアプリは自動で再読み込みしません。画面のお知らせまたは設定画面から「更新する」を選ぶと、保存済みの途中演習・模試を保ったまま更新します。

開発中に以前の本番版が残った場合は、ブラウザのアプリケーション設定からA1道場のService Workerを登録解除し、サイトデータを削除してから再読み込みしてください。通常の`pnpm run dev`ではService Workerを無効にしています。

公開時はHTTPSが必要です（`localhost`は例外）。公開先がサブディレクトリの場合は、ビルド時に`VITE_APP_BASE=/公開パス/`を指定してください。HashRouterを維持しているため、静的ホスティングでも画面URLの直接アクセス問題を避けやすい構成です。

PWAは端末内のブラウザ保存領域を利用します。容量不足、初回オフラインアクセス、Service Worker非対応ブラウザではオフライン利用やインストールができない場合がありますが、オンラインWebアプリとしては利用できます。

アプリアイコンのPNGは `public/icons/a1-dojo-icon.svg` を元に生成しています。更新時は `node scripts/generate-pwa-icons.mjs` を実行してください。

## UIプロトタイプ

`prototype/index.html`をブラウザで開いてください。
画面切替とライト・ダークモードを確認できます。

## Codexへ渡す順序

1. フォルダ全体をGitリポジトリにする
2. `prompts/CODEX_MASTER_PROMPT.md`をCodexへ渡す
3. Codexが提示した計画を確認する
4. `prompts/PHASE_PROMPTS.md`を上から順に使用する
