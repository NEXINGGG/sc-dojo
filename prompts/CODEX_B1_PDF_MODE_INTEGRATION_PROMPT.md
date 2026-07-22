# Codex向け：B-1公式PDF参照方式の統合プロンプト

既存のA1・A2アプリへ、`data/b1-cases-2023-2025-ready.json`を使用して
科目B-1を統合してください。

## 最初に確認するファイル

- AGENTS.md
- docs/requirements.md
- docs/acceptance-criteria.md
- docs/design-system.md
- data/b1-cases-2023-2025-ready.json
- data/b1-categories.json
- data/b1-source-manifest.json
- docs/b1-implementation-decisions.md
- reports/b1-pdf-analysis-report.md
- scripts/validate-b1-ready.mjs
- 既存A1・A2実装
- IndexedDB、バックアップ、PWA設定

Gitコミット、push、デプロイは行わないでください。pnpmを使用してください。

## 重要な表示方針

- 公式問題文・図表をアプリコードへ転記しない。
- Cloudflare Pages、GitHub、Service Workerのプリキャッシュへ公式PDFを同梱しない。
- オンライン時は各大問の`source.questionPdfUrl`を表示又は別タブで開く。
- PCではPDF表示領域と答案領域の左右分割を用意する。
- iPhoneでは「公式PDF」「答案」のタブを用意する。
- `sourcePromptLocator.printedPage`を使い、設問掲載ページを案内する。
- PDF埋込みがブラウザで困難な場合も「公式PDFを開く」導線を常に表示する。

## オフラインPDF登録

利用者がIPAからダウンロードした公式問題PDFを、ファイル選択で端末へ登録できるようにする。

- PDF BlobをIndexedDBへ保存する。
- 年度ごとに1ファイル。
- ファイルは外部送信しない。
- Blob URLを適切に解放する。
- 登録済みPDFはオフラインで表示する。
- 全消去ではB-1登録PDFを削除対象に含めるか、確認画面で別選択にする。
- バックアップJSONへPDF Blob本体は含めない。
- バックアップには登録有無とファイルメタデータだけを含める。
- PDF未登録のオフライン時は、問題本文を表示できない理由と登録方法を案内する。

## 答案フォーム

各`questionUnit.answerFields`から動的に生成する。

- `maxLength`がある場合は現在字数と上限を表示する。
- IME入力中は文字数制御で入力を壊さない。
- `multi_select`、`sequence`、`number`、`ip_address`等に適切なUIを使う。
- 入力ごとにIndexedDBへ自動保存する。
- 再読込み後に復元する。
- 模試中は正答値、解答概念、判定結果を表示しない。

## 採点

### automatic

`acceptedAnswers`を正規化して参考判定する。

- Unicode NFKC
- 前後・連続空白
- 英字大小
- 全角半角記号
- 桁区切り
- 一般的なIP・CIDR表記
- 順不同指定
- 順序回答

### concept_assisted_self_grade

公式解答概念の充足候補を表示し、最後は利用者が自己採点する。

### self_grade

自動で正解断定せず、解答概念を見て利用者が自己採点する。

全ての画面に「IPAの正式採点ではない」旨を表示する。

## B-1模試

- 3大問から2大問を選択。
- 90分。
- 締切時刻方式。
- 答案・現在位置・見直しを即時保存。
- 時間切れ自動提出。
- 提出後に参考判定と自己採点。
- 自己採点完了後に結果を確定。
- A1・A2の成績指標と混ぜない。

## 検査

package.jsonに`validate:b1`を追加し、次を実行する。

- node scripts/validate-b1-ready.mjs
- pnpm run lint
- pnpm run format:check
- pnpm run test
- pnpm run build
- pnpm run check
- pnpm run test:e2e
- pnpm run check:release

A1・A2問題データを変更しないこと。
