# SC道場 v1 公開前リリース監査

監査日：2026-10-09〜10（日本時間）。

**最終判定：B — 公開対象commitの固定・配信設定の確定・iPhone Safari実機確認後に公開可能。現在のHEADをそのまま公開する判定ではない。**

教材検証・hash・履歴移行・backup・lint・unit・build・全E2Eはすべて最終成功。重大な機能不具合は検査範囲では残っていない。ただし正式実装の未commit／未追跡分、NWと分離した公開先、Safari実機は未確定なので、無条件のA判定は出さない。公開前に次を満たす。

1. 監査した正式教材・実装・必須PDFをリリースcommitへ固定し、そのcommitでbuildを再現する。
2. NWと別originのSC配信先とproduction環境変数を確定し、manifest／SW／ヘッダー／更新を確認する。
3. iPhoneチェックリストの初回学習・保存再開・復元・完全終了後オフライン・更新・NW非衝突を実機で合格させる。
4. 同期を有効にする場合は実Supabaseの往復同期・RLSを確認する。未確認で公開する場合は既存の端末内学習で公開する。

**一般のSC受験者が初回起動からA-1／A-2／Bまで学習できる状態か：自動検査の範囲では「はい」。** ログイン不要の新しいブラウザで3科目を順に利用し、保存・再開・復元・オフラインを確認した。iPhone Safari実機と公開サーバー上でも同じ結論になるかは、上記の公開条件として残る。

## 1. リリース概要

対象はSC道場 v1、2026年度現行試験の科目A-1／A-2／B。2027年度新制度は含めない。教材の「v1」とアプリのpackage versionは別の識別子で、現在のappVersionは0.6.0。

監査開始時のHEADは `2a993dc518b0050db4d65ed352ce77e7063e5079`（main、origin/mainとの差分commitは0）。開始時は教材完成分を含む75ファイルの既存変更があり、監査終了時のGit管理ファイル変更は76件、未追跡ファイルは320件。staged変更・merge conflictはない。HEADだけでは監査した教材・実装を再現できない。監査対象は現在の作業ツリーから生成した通常productionの `dist/`。公開／push／commitは実施していない。

現行試験の条件は[IPAのSC試験案内](https://www.ipa.go.jp/shiken/kubun/sc.html)と[2026年度CBT実施案内](https://www.ipa.go.jp/shiken/2026/ap_koudo_sc-cbt.html)を2026-10-09に確認した。A-1は30問・50分、A-2は25問・40分、Bは4問から2問・150分。教材・内部ID・模試条件が一致する。

今回の実装変更は、科目B模試のPWA更新前にも既存の保存確認を出す修正だけ。その他は監査テスト、検査スクリプト、テスト間のmock応答の初期化、監査用コピーをunit探索から除く設定、Git除外設定、監査文書。新教材・新学習機能・新同期方式は追加していない。

主な監査変更は `src/features/pwa/PwaNotifications.tsx` と同test、`src/features/auth/AuthContext.test.tsx`、`e2e/sc-v1-release-audit.spec.ts`、`scripts/audit-sc-v1-release.mjs`、`vitest.config.ts`、`.gitignore`、本レビュー、iPhoneチェックリスト。監査前からの教材・実装変更も多数含まれるため、Git全差分を今回の修正と解釈しない。

## 2. A-1

`data/questions.json` の `sc-a1-v1`、240問をproductionで使用。通常演習180問、固定模試30問×2。225問の独自問題と15問のIPA公式問題という既存構成を維持。

専用検証、対応表、校閲情報、240件のcontent hash、公式15問の解答／PDF digestを確認。正式全240問の回答、図表、四択解説、問題履歴、復習、成績、両固定模試をproduction PWAのE2Eで確認した。

## 3. A-2

`data/a2-questions.json` の `sc-a2-v1`、240問をproductionで使用。通常演習190問、固定模試25問×2。正式の選定・対応表・四択解説・図表・二次校閲・240件hashを専用検証で確認。

公式17回の425問から抽出した解答と選定240問を照合。正式全240問の回答、図表、解説、履歴、復習、成績、両固定模試をproduction PWAのE2Eで確認した。

## 4. B

`data/sc-b-cases-2023-2025-ready.json` の `sc-b-v1`。`data/sc-b-v1-release-gate.json` は `approved: true`。2023秋、2024春・秋、2025春・秋の各4大問。

全20大問の転記・公式解答・図表・内容・採点講評が **20/20 verified**。正式ゲートは校閲ラベルだけでなく、教材のeditorial hash、content hash、公式3資料のhash、段落・図表・設問・欄の対応を検査する。未校閲16件やラベルだけの偽装を拒否する回帰テストも維持。

公式15資料のdigest、273欄の公式解答文字列、可逆画像2件の寸法・RGB画素、再構成SVGのhashを再検査。図示・統合欄などは文字列照合とは別の既存校閲証跡で検査する。同じ担当による二次照合であり、独立した人間の第三者校閲を実施した意味ではない。

## 5. 教材件数

|教材|正式件数|production識別|
|---|---:|---|
|A-1|240問|sc-a1-v1|
|A-2|240問|sc-a2-v1|
|B|20大問|sc-b-v1|
|B設問単位|181単位|同上|
|B定義解答欄|292欄|同上|
|B有効解答欄|290欄|採点除外2欄を除く|

除外2欄は2024春問4設問2(3)の「システム運用担当者・情報／場所」。既存の公式採点対象外の指定を維持し、件数を合わせるために教材を削っていない。従来のレビューにある292欄と今回の有効290欄は矛盾しない。

## 6. 模試

|科目|固定模試|時間・選択|
|---|---|---|
|A-1|30問×2|50分、全問回答|
|A-2|25問×2|40分、全問回答|
|B|5回、各4問提示|異なる2問選択、150分|

正式productionの固定模試、保存再開、未回答を含む提出／採点を確認。Bの5回すべての締切提出・提出後凍結もE2Eで成功した。時間切れは時計を早送りして検査し、実時間150分の放置検査ではない。

## 7. 保存／履歴

SC DB名は `sc-dojo`、schema version 15。科目別の回答履歴・途中演習・模試・設定を分離し、code／source ID／content hashで教材同一性を確認。NW DB `a1-dojo` を移行・削除しない。

旧教材の履歴はアーカイブへ退避し、現行SC成績へ混ぜない。A-1の197問維持・43問退避、A-2旧NWセッションの拒否、Bの旧NW退避をunit／E2Eで確認。別NW DB・通知設定・端末ID・キャッシュがSCの学習・全消去で変化しないことも確認した。

新しいブラウザ状態でA-1→A-2→Bを連続利用する追加監査E2Eで、各科目の回答／自動保存／途中再開／お気に入りを確認した。各科目の復習・成績は専用E2E／unitでも確認。Bの「苦手」は自己採点等による復習判定で、A-1/A-2の自動正誤と同じ指標ではない。

## 8. バックアップ

`sc-dojo-backup`、backupVersion 7、appVersion 0.6.0、exportedAt、DB schema 15を記録。復元前の形式検証、同一性検証、置換トランザクションを維持。

追加監査E2Eでは正式3科目の回答・お気に入り・途中演習・B途中模試を作成し、バックアップ→全消去によるデータ変更→復元→再エクスポートで内容が一致した。NW形式は復元ダイアログを出す前に拒否された。不正JSON／manifest／教材同一性、復元トランザクション失敗時の既存データ保持もunitで成功。

PDF本体はJSONに含まれず別途再登録が必要。旧A-1／A-2教材アーカイブ本体の独立エクスポートは既存仕様で未対応。現行SCの学習データ復元と、旧教材退避データの完全持ち出しは区別する。

## 9. 同期

認証storage keyは `sc-dojo:auth-session`。端末IDは `sc-dojo-device-id`。Supabase境界で以下のscopeを使う。

|科目|Supabase scope|
|---|---|
|A-1|sc:a1.question|
|A-2|sc:a2.question|
|B|sc:b1.answer、sc:b1.progress、sc:b1.reset|

一意条件は `user_id,scope,item_key`。取得時にもuser_id／SC scopeを検査し、NW scopeへフォールバックしない。教材同一性、削除情報、再試行、ユーザー切替、科目別集計をmock gateway／IndexedDBテストで確認した。Bの同期対象は通常演習の答案・進捗等で、B模試は端末保存とバックアップの対象。B模試を同期しない既存仕様もテストで確認した。

**実Supabaseのログイン・往復同期・RLS・テーブル制約は未確認。** 公開URL／公開鍵の設定はあるが、管理者権限やログイン済み実ユーザーは監査で使っていない。外部の本番学習データへ書込みは行っていない。同期を有効にして公開する場合は実環境確認が必要。未確認のまま初回公開するなら公開環境にSupabase公開変数を設定せず、既存の端末内学習を使用する。

## 10. PWA

manifestは名称「情報処理安全確保支援士 SC道場」、short_name「SC道場」、id `/sc-dojo`、start_url `/#/`、scope `/`。192／512／maskable PNGとapple-touch-iconを出力する。SVG titleとホーム画面の表示名称はSCだが、PNG／SVGの図案は旧版の「A1」とネットワークの図を継続使用している。内部ファイル名もa1-dojo。目視で確認し、表示上の既知の制約として記録した。今回、画像の作り直しはしていない。

Service Workerはprompt更新。Workbox cacheId `sc-dojo`、NWにも作用する一括古いキャッシュ削除は無効。正式教材と画像をrevision付きprecacheへ含め、公式PDFを除外。

監査で、B模試のURL `/b1/mock/:id` が更新前の模試保存確認の対象から漏れていることを発見。既存条件へB模試を追加し、更新キャンセルで模試を保持する回帰テストを追加した。

**保存キーの分離だけでは同じoriginの同じrootへ2アプリを配信できない。** SCはNWと別originの専用Pagesプロジェクト等へ配信すること。rootのSW／indexをNWと共有しない。公開先でのinstall／更新／共存は未確認。

## 11. オフライン

初回オンライン取得・SW制御の完了後に検査した。ネットワークを無効にし、元documentを閉じて新しいdocumentを開くcold start相当を含む。A-1問題、A-2全問と図表、B全20大問の長文・表・ログ・コード・全画像、答案入力・保存・確定・自己採点を既存／追加E2Eで確認した。

ブラウザプロセスの強制終了後のSafari再起動は実機チェックに残す。キャッシュ未作成の端末で最初からオフライン起動できるという判定ではない。公式PDFは任意登録で、本文・図表の学習条件ではない。

## 12. モバイル

320／390pxのE2Eで正式A-1／A-2全問の長文・選択肢・図表・解説、B全20大問の本文・表・ログ・画像・答案を検査。light／dark、専用領域内の横スクロール、B模試の大問切替と答案維持も確認した。

iPhone 13／Galaxy S5名のPlaywright projectもChromiumのエミュレーションであり、WebKit／Safari実機ではない。実機IME、キーボード、ホーム画面PWA、タッチ、画面ロックからの復帰は別チェック。

## 13. アクセシビリティ

正式教材の画像alt、可視buttonとform controlの名前、キーボードでのナビ操作、フォーカス表示、表の見出し・スクロール領域を確認。正誤は「正解です／不正解です」、自己採点・選択は文字とARIA等も使い、色だけに依存しない。

旧名称の残存はNW教材・旧データ互換・内部コメント・テスト名に限られ、正式SC画面は「科目B」を表示する。内部ID `b1` は維持する。

追加監査では320／390pxの実画面上で可視操作要素の名前・画像alt・ページ横溢れを検査して成功した。これは全WCAG適合やスクリーンリーダー実機検査の認証ではない。VoiceOverと図示答案の操作は実機チェックに残す。全面的な改修は実施していない。

## 14. セキュリティ

`.env` は不在、`.env.local` はGit除外。ローカルに設定されているのは `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY`。後者はブラウザ公開用の公開鍵で、buildへ含まれることは仕様。秘密鍵／service roleを公開変数に置かない。

Git管理候補と到達可能な32 revision、通常buildを既知の秘密情報パターンで走査し検出なし。現在のGit候補／buildではJWTも解析してservice_role・authenticatedを拒否する。履歴検査は既知文字列パターンの範囲で、履歴の全JWTを解析した検査ではない。環境値・鍵値は証跡へ出力しない。Git管理の環境ファイルは空の `.env.example` だけ。Cloudflare／Vercel／Wranglerの資格情報・設定はローカルには見当たらず、管理画面側は未確認。

一時成果物 `tmp/` と公式PDFの抽出テキストをGit除外へ追加。B公式15 PDFはproduction校閲ゲートが要求する必須build入力なのでGit候補に残す。`reference/`、`data/sc-b-pilot-assets/`、pilotスクリプト等をWebへ配信しない。正式配信は `dist/` だけ。source map、環境ファイル、デバッグログ、公式PDF原本はdistへ含まれない。

pilotはDEVガードとserve限定middlewareで隔離。A-2／BのpilotフラグとNW legacyフラグを誤って設定したproduction buildも別出力で確認し、正式3教材・正式件数・pilot教材非混入を再検査して成功した。manualChunks由来の1 byteの空pilot chunkはあるが教材内容やpilot画面は含まれない。

静的セキュリティヘッダーは既存 `_headers` にある。HTTPS、実レスポンスのヘッダー、CDNキャッシュ、Supabase RLSの公開先での適用は手動確認が必要。

## 15. パフォーマンス

通常productionは99ファイル、合計5,526,279 bytes（約5.27 MiB）。JS合計4,526,831 bytes、個別gzip合計885,694 bytes。PWA生成ログは146 precache entries／5,368.28 KiB。B画像26件は150,580 bytes。

|主なchunk|非圧縮bytes|gzip bytes|
|---|---:|---:|
|scBMaterial|2,000,651|291,062|
|learning|1,083,501|240,362|
|index|921,916|187,098|

500 kB警告は残る。図表のprecache、全教材演習、モバイルの操作、ローカルの起動が機能することを確認し、現時点でリリースを阻害する性能障害とは判定しない。初回には教材全体のcache作成と大きいJSの解析がある。ローカルChromiumの時間は実回線・低性能iPhoneの保証ではなく、実機の初回ロードを確認する。

ローカルChromiumの初回ホーム表示は320pxで876ms、390pxで830ms。SC cache名は `sc-dojo-precache-v2-http://localhost:4174/`。`tmp/sc-v1-release-audit/runtime-320.json` と `runtime-390.json` に記録した。大規模分割・新ライブラリ追加は実施していない。

## 16. テスト結果

最終自動検査はすべて成功。証跡ディレクトリは `tmp/sc-v1-release-audit/`（Git／公開対象外）。unitは2026-10-09、最後の全E2Eは2026-10-10に完了。今回実行した結果であり、過去レビューの成功数を流用していない。

|検査|今回の結果・証跡|
|---|---|
|Python A-1構造検証|240問成功。同梱Pythonで実行|
|A-1専用＋hash|成功：a1.log|
|A-2専用＋hash|成功：a2.log|
|B専用＋hash＋正式ゲート|成功：b.log、b-gate.log。20/20 verified|
|公式解答／画像再検査|A-1 15問、A-2 425抽出／240選定、B 273欄、画像2件＋SVG hash成功|
|全教材／旧NW保護検証|成功：data.log、legacy-b.log|
|履歴移行／backup／同期|unit／E2E成功。同期はmockのみ、実環境未確認|
|lint|成功：lint-final.log|
|unit|62ファイル・371件成功：unit-final-isolated.log|
|build・deployment|成功：build-final.log。99ファイル検査|
|pilotフラグproduction build|成功：build-pilot-flags.log、pilot-isolation-audit.json|
|Git候補のみのbuild|成功：build-clean-candidate.log。envなし・正式PDFあり、既存lock依存を親ディレクトリから共有|
|静的リリース監査|成功：static-audit.json。教材／秘密情報／precache／配布物検査でerrorsなし|
|全E2E|35件すべて成功、10.2分：e2e-final.log。retryでの救済なし|
|diff／変更ファイルformat|成功：diff-check.log、format-final.log。リポジトリ全体のformat検査ではない|

途中の失敗・中断：Python launcherとlocalhost previewは実行環境の問題で、同梱Python／通信許可した環境へ切替後成功。unitの同期通知は未消化mock応答をresetして修正し、buildとの同時負荷で発生した待機timeoutも含め、最終は単独実行で371件成功。監査用コピーをunitが重複探索した実行は中断し、tmpを除外した。追加E2Eは非同期待ち・画面幅・既存表示に合わせて修正。通し実行時に公式PDF iframeのダウンロードをbackupと取り違えることが分かり、SC backupのファイル名を検証して取得するよう監査テストを修正した。リセット前の通し実行は未完了として扱い、最後に全35件を再実行して成功した。補助flag buildの起動方式による失敗は通常Vite CLIで解消。Git候補コピーは親の既存依存を使用しており、独立した依存の再インストールまでは実施していない。

## 17. 手動確認事項

[iPhone Safari最終チェックリスト](sc-v1-iphone-release-checklist.md)を作成。実機Safari、配信先HTTPS／SW／ヘッダー／更新、NWとの別origin共存、実Supabaseの往復同期／RLSは未実施。公開環境の管理設定はローカルコード検査からは確定できない。

## 18. 既知の制約

- 大きいchunk警告、実機Safari・実回線性能未確認。
- PWAアイコンの図案に旧「A1」が残る。アプリ名・manifest ID・cache／DBはSCで分離されているが、NW版と図案の見分けがつきにくい。
- 記述答案は学習用参考判定と自己採点。IPAの得点・合格を再現するものではない。
- 教材は同じ担当の二次照合で、独立した人間の第三者校閲は未実施。
- 公式PDF本体はprecache／backup対象外。PDF領域のオフライン未登録警告に「問題本文」と出るが、SCのアプリ内本文・図表は別途表示される。
- B画像の通信失敗時はaltを持つ画像と本文・答案が残る。専用の画像再試行UIはない。A-1／A-2の画像は既存の日本語エラー案内がある。
- 端末のサイトデータ削除による履歴消失はバックアップなしには防げない。旧A-1／A-2教材退避アーカイブの持ち出しには既存制約がある。
- 実同期が未検証の状態ではクラウド同期を正式動作確認済みとして告知しない。
- B模試はクラウド同期対象外で、端末保存／backupにより維持する。公式PDFのオンラインiframeはブラウザにより別ダウンロードとして扱われる。
- package／backupのappVersionは0.6.0。SC教材v1という名称と分けて扱う。

IndexedDB不可は日本語の保存領域確認案内、途中セッション不在は一覧復帰、B模試の不正なcurrentIndexは保存内容確認画面、同期失敗は端末内学習維持と再試行、PDF未登録／画像失敗は答案画面維持を確認した。任意PDFや画像だけの失敗をアプリ全体の成功と読み替えない。

## 19. 公開手順

1. 最終自動検査をすべて成功させる。B verifiedが20/20でなければ停止する。
2. 正式教材JSON、publicの正式画像、ソース・検査・lockfile・B公式15 PDFを含むGit候補をレビューしてcommitを固定する。一時出力／抽出テキスト／env／個人backupを含めない。現HEADのままGit連携配信してはならない。
3. 固定commitを別checkoutで確認し、`pnpm install --frozen-lockfile` 後、専用教材検証・lint・unit・build・全E2Eを実行する。監査用公式解答再照合を行う場合は別途A-1／A-2公式PDFも取得し、記録hashと照合する。
4. NWとは別originのSC専用Cloudflare Pages等を用意する。Node 24.18.0、pnpm 11.9.0、build command `pnpm run build`、配布root `dist`、VITE_APP_BASEは専用originのrootなら未設定。リポジトリ全体を静的配信しない。
5. public browser用Supabase設定だけを使う。秘密鍵／service role／Cloudflare tokenをVITE_変数へ入れない。同期を有効にするなら先に実環境検査し、未確認なら公開環境では2つのSupabase公開変数を設定しない。candidate／pilot／legacy検証フラグは公開設定から除く。
6. 非公開の配信候補で、チェックリストのiPhone・保存・復元・完全終了後オフライン・更新・NW非衝突を記録する。公開先のmanifest／SW／cache headersを確認する。
7. 合格記録をこのレビューへ追記し、固定commitと成果物を配信する。公開後も新しいサイト状態でA-1→A-2→B、再開とオフラインをスモーク検査する。

通常 `dist` の監査時fingerprint（ソートした相対パスと各ファイルSHA-256の一覧をSHA-256化）は `5195c7289648f4edcea54a3302b5ef1f9d5db22d26076e822e010ba3f6b38b66`。環境変数が違えばbuild内容が変わるため、公開候補を再監査する。旧デプロイ手順のNW説明や初期教材件数ではなく、本レビューのSC対象を用いる。

配信設定は[Cloudflare Pagesのbuild設定](https://developers.cloudflare.com/pages/configuration/build-configuration/)と[静的ヘッダー設定](https://developers.cloudflare.com/pages/configuration/headers/)を参照。以下を公開commitで実行し、すべて成功してから配信する。

```bash
python scripts/validate_questions.py
pnpm run validate:sc-a1
pnpm run validate:sc-a2
pnpm run validate:sc-b-v1
pnpm run validate:sc-b-v1-release
pnpm run validate:data
pnpm run validate:b1
pnpm run lint
pnpm run test
pnpm run build
node scripts/audit-sc-v1-release.mjs
pnpm run test:e2e
```

## 20. ロールバック手順

1. 初回公開前に、固定commit・lockfile・環境変数の名前／設定状況・検査結果・配信成果物をprivateに保存する。後続更新では直前に動作確認済みのSC配信も保持する。
2. 配信不具合なら、ホスティング側で直前の確認済みSC deploymentへ戻す。初回で戻し先がない場合は公開を止め、修正候補を非公開で検査する。NWのrootやSWをSCの代替として配信しない。
3. SW更新は即時に全端末へ反映される保証がない。index／manifest／sw.jsの短いcache設定を確認し、オンラインで「更新を確認する」→保存確認→適用→再開を検査する。
4. DB schema 15やbackup version 7に非対応の古いアプリを無条件で戻さない。互換性がない場合は直前コードを基にした前進修正を優先し、同じ保存形式を維持する。
5. 障害対応でIndexedDB／Cache Storage／NW DBを一括削除しない。先にSC backupを作成し、必要なら確認済みの形式で復元する。全消去を標準復旧手順にしない。
6. rollback後に3科目の再開／復元／オフライン、NW非変更、同期有効時のscopeと再試行を再確認する。教材hash不一致が原因ならゲートを緩めず、確認済み教材へ戻す。

Pages側の操作は[公式のrollback手順](https://developers.cloudflare.com/pages/configuration/rollbacks/)を参照する。今回、実際の配信・rollbackは実行していない。
