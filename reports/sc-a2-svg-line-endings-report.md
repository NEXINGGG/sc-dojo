# SC A-2 SVG改行・ハッシュ調査報告

確認日: 2026-10-11

## 原因と再現

対象5ファイルはGit indexではLF、Windowsのworking treeではCRLFだった。`core.autocrlf`はシステム設定で`true`、SVGの`text`・`eol`属性は未指定だった。

修正前JSONの`asset_sha256`は5件ともWindows working treeのCRLF版SHA-256と一致し、Git blobのLF版SHA-256とは一致しなかった。CRLFをLFへ置換すると、5件とも既存Git blobと完全に同じバイト列になった。差分は改行だけである。

修正前の`data/a2-questions.json`を`git show :data/a2-questions.json`で取得し、Gitと同一のLF版SVGを既存`validateQuestionMaterialData`で検証すると、報告された次の5件だけが失敗した。

```text
A2-163: image.asset_sha256が画像内容と一致しません
A2-218 choice:A: image.asset_sha256が画像内容と一致しません
A2-218 choice:B: image.asset_sha256が画像内容と一致しません
A2-218 choice:C: image.asset_sha256が画像内容と一致しません
A2-218 choice:D: image.asset_sha256が画像内容と一致しません
```

修正後JSONと同じLF版SVGの検証エラーは0件。画像ハッシュは従来どおり実バイト全体から算出する。検証・ハッシュ算法・正規形の仕様は変更していない。

## Git上の改行状態

パスはいずれも`public/questions/sc/a2/`配下。

| SVG | 修正前index | 修正前working tree | 修正後index | 修正後working tree |
| --- | --- | --- | --- | --- |
| SC-2025-FALL-Q22.svg | LF | CRLF | LF | LF |
| SC-2018-FALL-Q18-A.svg | LF | CRLF | LF | LF |
| SC-2018-FALL-Q18-B.svg | LF | CRLF | LF | LF |
| SC-2018-FALL-Q18-C.svg | LF | CRLF | LF | LF |
| SC-2018-FALL-Q18-D.svg | LF | CRLF | LF | LF |

ルート`.gitattributes`へ次を追加した。影響をSC A-2に限定し、SC Bやアプリアイコンの改行属性は変えていない。

```gitattributes
/public/questions/sc/a2/**/*.svg text eol=lf
```

`git ls-files --eol -- public/questions/sc/a2/*.svg`は5件とも`i/lf w/lf attr/text eol=lf`。`git check-attr text eol`でも適用を確認した。

SVG5件のworking treeをLFへ正規化した。正規化後は既存indexと完全に同じバイト列なので、SVG自体にはGitの内容差分がない（`git diff --exit-code -- public/questions/sc/a2`は成功）。既存SVGの見た目・要素・文字・図の意味は維持されている。

## asset_sha256

| SVG | 修正前（CRLF） | 修正後（LF、既存Git blobと一致） |
| --- | --- | --- |
| SC-2025-FALL-Q22.svg | `25878ac18f152a700dcf21ca6af2d95529fea694e0a15e7afaf312bd39dc3028` | `ac304572035d04efdf9d3d8f883253b2b8bfa4aafccf6ac6dbda7ad1df9665eb` |
| SC-2018-FALL-Q18-A.svg | `3b7055695d0750627b32ab4883f2f90c8d0154801afce7acb3568524e5309d64` | `4f1a092ab1e8444f42c0bdf854ab591dc8804e109c6dcbfef8024811da0e5724` |
| SC-2018-FALL-Q18-B.svg | `1fc744409c5908808338ed9aa8be3ba89c82e65c04defd849ede039d422a785c` | `8abfc50b61e6de4e8574a3a1c37b598b311bfee5bd107e7df6283755c714cb0b` |
| SC-2018-FALL-Q18-C.svg | `e63dead4437a421143d26dc90a3989917718cca210a1abf4bd9cd89644a4d570` | `79adf03de235e13760647070da62f2aab13d9286e85208cbae01e2ef32cb277a` |
| SC-2018-FALL-Q18-D.svg | `3158297d8b95408208af48537ad1e1f0105a4214a5bfab8200abcbfc6c22a877` | `1b4c9cdadf3d790b9707797a7297babebf79b96679e917a80215bd5b0fe138d5` |

## 正式な再生成とcontent_hashへの影響

既存ツールで次を実行した。

```bash
node scripts/update-question-content-hashes.mjs data/a2-questions.json --update --strict-sc-a2
node scripts/update-question-content-hashes.mjs data/sc-a2-v1-authoring.json --update --strict-sc-a2
node scripts/update-question-content-hashes.mjs data/sc-a2-pilot-30.json --update --strict-sc-a2
```

画像ハッシュを含むため、次の2問だけ`content_hash`が変わった。本番・原稿・pilotで同じ値に再生成されている。

| 問題 | 修正前 | 修正後 |
| --- | --- | --- |
| A2-163 / SC-2025-FALL-Q22 | `sha256:59ceb36d41f11664c347710d9326fb87b8fd6abea1c1c9499e8adb10f939310e` | `sha256:12bf9e136df9d31b32691705f0ead996fbd88a94377ef22fd413671f655ef0ba` |
| A2-218 / SC-2018-FALL-Q18 | `sha256:e44d358e0fe9ac028b596a9d490285d106f7ee46b13759f5f252a5b989b7cf2f` | `sha256:74b7f4bf4515ba3fdd612e113f6796e8e72a4a8c6aadd3d6d545ba925dc6e154` |

二次校閲記録の該当2件へ生成済み`content_hash`を反映した。校閲の状態・確認日・方法・原本PDFハッシュは変更していない。4つのJSONを修正前indexと構造比較し、各ファイルの変更対象が2問だけであること、`asset_sha256`・`content_hash`を除いた全データが同一であることを確認した。問題文・四択・正解・解説・alt・caption・ID・教材版・他238問は不変。

既存の教材同一性判定では、この2問が内容変更として扱われる。修正前ハッシュを保存した利用者では、該当問題の履歴と、それを含む途中セッション・結果が既存の移行処理による内部退避の対象になる。教材全体のfingerprintも変わる。履歴移行・バックアップ・同期の仕様や実装は今回変更していない。

## 主な変更ファイル

- `.gitattributes`: SC A-2 SVGのLF固定。
- `data/a2-questions.json`: 本番の画像5件・問題2件のハッシュ。
- `data/sc-a2-v1-authoring.json`: 同じ画像を使う原稿のハッシュ。
- `data/sc-a2-pilot-30.json`: 同じ画像を使うpilotのハッシュ。
- `data/sc-a2-v1-secondary-review.json`: 対応する校閲記録2件のハッシュ。
- `src/test/question-material-data.test.ts`: LFからCRLFへの変更も拒否し、checkがハッシュを自動修正しない回帰テスト。
- `docs/cloudflare-pages-deployment.md`: 改行確認・再生成・公開時の手順。
- `reports/sc-a2-svg-line-endings-report.md`: 本報告。

A-1・SC Bの教材データとアプリの実装コードには変更を加えていない。

## 検証結果

- `python scripts/validate_questions.py`: 240問成功。Windowsのpython実行エイリアスが起動できなかったため、同じスクリプトを同梱Pythonで実行。
- `pnpm run validate:a2`: 成功。
- `pnpm run validate:sc-a2`: 監査・正式240問・二次校閲・pilot維持・厳格ハッシュ検証がすべて成功。
- 原稿・pilotの`--check --strict-sc-a2`: 240問・30問とも成功。
- `npm run lint`: 成功。
- `npm run test`: 62ファイル・372件すべて成功。
- `pnpm run build`: prebuild・TypeScript・Vite・PWA生成・postbuildが成功。公開成果物99ファイル検証済み。Viteの大きいチャンク・空チャンク警告あり。
- `npm run test:e2e`: 権限付き再実行で35件すべて成功（10.1分）。正式SC A-2全240問・画像・オフライン・履歴・模試・320/390pxを含む。
- 変更したテストのPrettier検査・`git diff --check`: 成功。
- 対象5件のSHA-256とバイト列はGit index・working tree・`dist`で一致し、宣言済み`asset_sha256`とも一致。
- `git -c core.autocrlf=<true|false|input> -c core.eol=crlf cat-file --filters :<SVGパス>`の全15組合せが、LFのworking treeと完全に同一。Windows固有の改行設定に依存しないことを確認。

通常のpnpm起動はレジストリ接続で失敗したため、検査には同梱pnpm 11.25.0を使用した。プロジェクトの`packageManager`（11.9.0）・依存関係・lockfileは変更していない。E2Eの初回実行はsandbox内のlocalhost接続が`EACCES`となりpreview待機でタイムアウトしたため、権限付き実行で再確認して成功した。

## 残る手動確認

Cloudflare/Linux実機でのproduction buildは未実行。`.gitattributes`と更新JSONを同じコミットに含め、GitHubからCloudflare Pagesへ公開した際のbuild成功を確認する。正規化後SVGは既存Git blobと同一なので、SVGの内容変更をコミットする必要はない。公開後は画像表示とService Worker更新も確認する。
