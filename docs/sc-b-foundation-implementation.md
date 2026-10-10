# SC科目B 基盤改修

実施日: 2026-10-08。監査正本: `docs/sc-b-current-system-audit.md`、分類正本: `data/sc-b-categories-draft.json`。

正式過去問は投入していない。通常productionの教材は保護した既存NW B-1のまま。SC確認は `sc-b-pilot-v1` の架空4大問・8設問・8欄で行う。内部科目ID・ルート・既存テーブル名の `b1` は維持し、利用者には「科目B」と表示する。

## 1. 変更したファイル

| 対象 | ファイル |
| --- | --- |
| 教材・分類・pilot | `data/sc-b-pilot.json`、`data/sc-b-failure-causes.json`、`src/data/b1.ts`、`src/data/b1LearningSupport.ts`、`src/data/pilotMode.ts`、`src/vite-env.d.ts` |
| 識別・設定・検証 | `src/domain/contentIdentity.ts`、`b1Identity.ts`、`b1DatasetValidation.ts`、`b1ExamConfig.ts`、`questionManifest.ts`、`subject.ts` |
| 学習ロジック | `src/domain/b1LearningSupport.ts`、`b1A2Recommendation.ts` |
| DB・履歴退避 | `src/database/database.ts`、`types.ts`、`b1DatasetMigration.ts` |
| 保存・PDF・答案・支援 | `src/features/b1/b1Repository.ts`、`b1LearningSupportRepository.ts`、`B1PdfReference.tsx`、`B1AnswerForm.tsx`、`B1CaseBody.tsx`、`B1LearningPanels.tsx`、`b1AnswerInput.ts` |
| 画面 | `src/pages/B1HomePage.tsx`、`B1PracticePage.tsx`、`B1MockSelectionPage.tsx`、`ScBMockSelection.tsx`、`B1SessionPage.tsx`、`B1ProgressPage.tsx`、`src/styles/global.css` |
| バックアップ・同期 | `src/domain/backup.ts`、`src/features/settings/dataManagementRepository.ts`、`src/pages/SettingsPage.tsx`、`src/features/sync/b1CloudSync.ts`、`types.ts`、`cloudSyncLocalRepository.ts` |
| 起動・互換検査 | `package.json`、`scripts/run-sc-b-pilot.mjs`、`validate-b1-phase3.mjs`、`validate-b1-phase4.mjs` |
| 自動検証 | `src/test/sc-b-foundation.test.ts`、`src/database/database.test.ts`、`src/domain/backup.test.ts`、`e2e/sc-b-foundation.spec.ts`、`e2e/fixtures/serve-sc-b-pilot.mjs` |

作業開始時に存在した未コミット変更は維持した。既存 `data/b1-*`、A-1/A-2正式問題・カテゴリJSONは書き換えていない。対象13ファイルのSHA-256前後照合がすべて一致した。

## 2. KEEPした既存機能

大問→設問→欄、IME対応の記述入力、字数制限、回答確定snapshot、自己評価 correct / partial / incorrect、見直し、設問移動、保存キュー、IndexedDB途中保存、根拠記録、振り返り、答案試行、再答案、提出後採点、PDF URL/Blob表示、A-2演習開始と元設問へ戻る構造を流用した。NWの既存教材・出典・カテゴリ・支援辞書・90分履歴の読込みも保護した。

## 3. MODIFYした機能

科目Bカタログを開発フラグで分離し、SCの識別・採点補助・本文位置・手動支援を追加した。件数と試験時間は有効カタログ/試験設定から導出する。保存レコードには教材identityを付け、更新時は旧記録を退避する。模試中は大問番号で切り替えられる。提出後答案を凍結し、保存失敗を無視して提出しない。最初の提出を同一ストアのトランザクションで確定する。

成績画面の模試時間は保存済み開始/締切から表示する。本文内の図表移動はHashRouterのURLを変更せずスクロールする。全体検査で検出した、設定画面を閉じた後の非同期保存集計による状態更新も停止する。

SC模試の振り返りで「演習で答案を書き直す」を選ぶと、同じ設問から別の通常演習を開始する。提出答案と模試成績は維持し、書き直しは通常演習の途中保存・再開・回答確定・自己評価を利用する。元の模試答案を編集する方式にはしない。途中の通常演習がある場合は、既存の再開案内に従う。

## 4. 削除／無効化したNW依存

SC datasetではNW教材・18カテゴリ・通信方向/経路/帯域テンプレート・NW失点原因・トピック別名によるA-2部分一致推薦・3問/90分設定を使わない。SCの支援は教材JSONのguidanceから読む。SC設問にNW公式校閲completedを継承しない。NWファイルを削除・上書きしていない。

## 5. SC模試構造

同一 `examSetId` の4問を提示→2問を選択→開始→解答→提出→自己採点→結果確定。保存する `presentedCaseIds` は4問、`caseIds` は選択2問、`unitIds` は2問の設問集合。異なる試験回の混在、重複選択、4問未満の回を開始しない。pilotでは2099年度の架空回を使う。

内部 `mock150` / `examRuleId=sc-b-2026` を追加し、旧 `mock90` を読込み互換として保持した。自己評価をIPA配点・合否へ換算しない。

## 6. 150分タイマー

`src/domain/b1ExamConfig.ts` の `scBExamConfig.durationSeconds=9000` が正本。NWは別設定5400秒。画面とRepositoryが同じ設定を参照する。

開始時に `startedAt` / `deadlineAt` を保存し、表示は締切との差で算出する。表示中の1秒更新・focus再確認を維持し、SC模試はRepository読込み時にも期限切れを提出する。開始前の選択時間は今回の依頼順序に合わせて制限時間へ含めない。期限切れの部分答案・見直しは保持し、`submissionReason=timeout`、提出時刻は締切へ合わせる。閉じている間に端末上で処理を走らせず、再開時に期限を判定する。

## 7. 4問→2問選択

0/1/2問を選べる。3問目は追加せず「先に選択した問題を解除してください」と表示する。2問揃うまで開始不可。候補4問と選択2問を永続化する。

通常演習カードは年度・番号・カテゴリ・概要・難易度・学習状態を表示する。模試カードは試験回と番号を中心にし、テーマ・概要・難易度・学習状態・採点資料を開始前に開示しない。選択画面を離れる前の未開始選択の復元は今回対象外。開始済みの選択・現在位置・答案・見直し・時刻は閉じても再開できる。

## 8. SC教材データ構造

既存case/questionUnits/answerFieldsを維持し、caseへ `examCode`、`term`、`originalSection`、`examSetId`、`difficulty`、`dataset_version`、`source_id`、`content_hash` を追加した。JSON正規化後の有効カタログはcontent_hashを再計算する。

任意の `body.sections[]` はsection ID・見出し・段落ID/text、`body.materials[]` は図表/ログ/コードのID・caption・text・assetUrl/assetHashを持つ。巨大なリッチテキストは導入しない。スマートフォンは本文/答案タブ、PCは既存の並列workspaceを流用し、本文内リンクで段落・図表へ移動できる。

SC dataset検証は出典ID、重複、カテゴリ、欄、A-2 code、本文位置、画像hashを確認する。PDFだけの教材は問題PDFの `questionDocumentHash` が必要。実教材の本文・図表・出典の校閲は次フェーズで行う。

## 9. answerField仕様

既存 `acceptedAnswers` 等は変更しない。次を後方互換の任意フィールドとして追加した。

| フィールド | 用途 |
| --- | --- |
| officialAnswer | 公式解答例。pilotは架空例と明示 |
| acceptableAnswers | 学習用の許容表現例 |
| requiredKeywords | 自分で確認する語・観点 |
| scoringPoints | 自己採点の着眼点 |
| gradingNote | 注記・自己評価補助文 |

これらをすべて必須にはせず、入力前の欄モデルへコピーしない。記述式はself_gradeを使い、キーワードによる意味の自動採点は行わない。採点資料は回答確定/模試提出後に表示する。

## 10. source_id

監査形式を採用: `SC-<年度>-<期>-<原区分>-Q<2桁番号>`。例: `SC-2025-FALL-PM-Q01`、`SC-2022-SPRING-PM1-Q02`、`SC-2022-SPRING-PM2-Q01`。旧午後I/II、春秋を含むため衝突しない。画面の科目B表示と出典の原区分は別管理する。pilotは `SC-2099-PILOT-B-Q01` 等とし、実在過去問のsource namespaceを使わない。

## 11. content_hash

`sha256:v1:<64桁>`。正本は `calculateB1ContentHash`。本文の段落・セクション、図表/ログ/コードの内容・assetHash、問題PDF内容hash（旧NWは既存URL識別）、設問本文/要約・ラベル・出典位置、欄ID/ラベル/型/字数/順序/回答数を固定順序でcanonical化する。UTF-8 SHA-256と改行/NFC正規化はA-1/A-2と共用する。

解説、guidance、公式/許容解答の追加、採点ポイント、学習支援、失点原因、A-2リンク、振り返りだけではhashを変えない。assetHashがあれば画像パスの変更だけでもhashは変わらない。年度・出典の識別はsource_id、教材版の識別はdataset_versionで別管理する。

## 12. dataset_version

正式予定 `sc-b-v1` は予約し、本番へ設定していない。pilotは `sc-b-pilot-v1`、既存NWの識別は `nw-b1-v4`。保存identityは `{datasetVersion,sourceId,contentHash}`。Bでは3要素すべて一致を要求するため、将来 `sc-b-v2` は同じ大問IDでも自動継承しない。

## 13. 履歴分離

DB名 `sc-dojo`、Dexie schema v15。追加は `b1DatasetManifests`、`b1DatasetArchives`、`b1Documents` の3表。既存A-1/A-2 migrationにはデータ変更を加えていない。

A-1/A-2と `sameSourceContent`、hash関数、manifest比較・copy-before-removal方針を共用する。B特有の複数大問・根拠・試行・同期outboxを含む退避トランザクションは専用に実装した。セッションとその根拠・振り返り・復習・答案試行・設定・同期情報をアーカイブへ保存した後、有効テーブルから外す。PDF実体は元の表から消さない。

通常productionの旧NW行は既存カタログのidentityを付けて継続利用する。SC pilot/将来改版へ切り替えた時だけ不一致行を退避する。全処理はトランザクションで行い、再実行で同じ退避を増やさない。退避は自動再有効化せず、端末内保存とバックアップで保全する。旧履歴専用の閲覧・再有効化UIは未実装。

バックアップはv7へ最小更新した。新identity・提示集合・試験設定・PDF documentId・退避履歴を保持し、v1～v6も読み込む。退避構造やidentity不正なら復元全体を拒否する。復元した異教材行はトランザクション内で退避する。既存PDF BlobはJSONバックアップへ含めず、メタ情報だけを保全する既存方針を維持した。

同期のサーバーschema/scopeは変更しない。通常演習の `sc:b1.answer` / `sc:b1.progress` payloadにidentityを含める。SCセッションIDはdataset接頭辞を持ち、reset itemKeyもdatasetごとに分離する。不一致dataset/source/hashや旧resetは有効SCデータへ適用しない。模試・PDF・根拠・退避履歴の全面クラウド同期は追加していない。

## 14. PDF識別

新登録は `exam:dataset:year:term:originalSection:question:documentHash-or-unverified` のdocumentId。1冊の問題PDFは同じ試験回の大問で共有し、SC/NW・教材版・春秋・B/PM/PM1/PM2・問題PDF内容版を区別する。

旧 `b1PdfFiles` の年度キーは残し、旧NW v4/春/PM1だけ互換fallbackする。SC/他区分へ年度だけで流用しない。物理PDFページはpdfPageZeroBased+1、印刷ページは表示案内に使う。Blobにも#pageを付ける。登録ファイルのIPA公式一致・実体hash検証は未実装で、登録時に試験回・区分の確認と未検証を明示する。

## 15. SC失点原因

監査案の12分類を独立JSON化した。要求の読み違い、根拠見落とし、本文/図表/ログ読解、知識不足、攻撃/脅威/脆弱性の混同、主体/対象、認証/認可、方向/処理順、対策/効果、必要要素/用語、表現/字数、時間。IDは `sc_b_*`。NW IDは互換読込みに残し、SC画面はSC定義だけを使う。設問guidanceで候補を任意指定できる。

## 16. 学習支援

教材JSONの `guidance.requirementBreakdown`、`officialEvidence`、`applicableFailureCauseIds` を表示する。未記述時は汎用の本文確認案内を使い、NW機器/通信テンプレートを適用しない。攻撃・脅威・脆弱性・対策・認証/認可・暗号・ログ・インシデント・設計・本文根拠を教材側で著作できる。高度な自動推論は実装していない。

根拠種別にlogを追加し、本文/図表/ログ/技術知識と自由な参照位置・メモを保存する。段落・セクション・図表IDは設問locatorへ任意指定でき、将来教材の根拠対応表へ拡張できる。

## 17. A-2復習連動

設問側 `relatedA2QuestionIds` は正式A-2のcode、`relatedA2Categories` はカテゴリ、`relatedTerms` は関連用語。SCでは明示codeだけを候補に使い、カテゴリからの自動推薦やNW aliasesは使わない。存在しないcodeはdataset検証で拒否する。1～2問でも推薦でき、未対応は理由付きnot_applicable。トリガーはSC remediation設定から採用する。pilotの参照は機能確認用で、実教材との妥当性校閲済み対応表ではない。

## 18. pilot確認方法

```bash
npm run dev:sc-b-pilot
```

`http://127.0.0.1:5176/` で科目Bを選ぶ。演習には架空4問、模試には4候補と150分開始が出る。通常 `npm run dev` / production buildではpilotフラグを有効にしない。`DEV && VITE_SC_B_PILOT==='1'` の両条件を使い、production buildではフラグがあってもpilot教材を使わない。正式A-1/A-2はこのモードでも変更しない。

端末のNW履歴があるoriginで初めてpilotへ切り替えると退避される。旧履歴の自動再有効化は行わないため、開発用ポートを分離して確認する。

## 19. テスト結果

| 検査 | 結果 |
| --- | --- |
| `python scripts/validate_questions.py` | 240問、構造エラーなし。環境のpython aliasが利用できないためbundled Pythonで同じscriptを実行 |
| `npm run lint` | 最終版で成功 |
| `npm run test` | 最終版で56ファイル・318件成功、未処理エラーなし。SC/NW UIの関連3ファイル16件も成功 |
| `npm run build` | prebuildデータ検証・TypeScript・Vite・postbuild配備検証を含め成功。配備71ファイル検査 |
| `npm run test:e2e` | 全27件成功（4.5分）。最終buildでNW B-1・SC B・設定の5件成功（26.3秒）。表示中の時間切れ検査追加後にSC B専用1件成功（16.2秒） |
| 教材保護 | A-1/A-2正式問題・カテゴリ4ファイルと既存NW B-1の9ファイル、SHA-256前後一致 |
| production除外 | 通常buildと `VITE_SC_B_PILOT=1` のproduction buildで架空source ID・本文がassetsへ混入しないことを確認 |
| 表示QA | 320/390/1280px × light/dark、横はみ出しなし。6スクリーンショットを生成し320px darkとPC lightを視認 |

SC専用単体テスト11件は、4候補・0/1/2/3選択・9000秒・保存/再開/切替・答案/見直し・提出/時間切れ/採点・根拠/SC原因・A-2 code・NW退避/改版/再実行・PDF・バックアップ正常/不正・同期identity/reset・改行/NFCによるhash同一性を検証した。A-1/A-2正式240問の維持と履歴不変も含む。

SC E2Eは演習・根拠種別log・許容表現表示・SC原因保存、模試4問→2問・3問目拒否・150分・問1/問3切替・再読み込み・答案と見直し保持・成績の150分表示・本文移動時のURL保持・提出・自己評価・結果確定・別演習での書き直し保存と元模試答案保持、表示中/再起動時の時間切れを確認した。既存NW B-1、A-1/A-2、PWAオフライン、iPhone/AndroidレスポンシブのE2Eも成功した。待機時間を150分にせず、保存済み締切を超える時刻へブラウザー時計を進めた。

途中の再検証で、設定画面の非同期集計が画面破棄後に戻る未処理エラーを検出し、mounted確認を追加して修正した。模試中の支援抑止を `mock90` 固定判定から全模試の判定へ移した際の旧静的検証式も追随させ、実際のNW/SC模試DOMをE2Eで確認した。最終検査の失敗・未処理エラーはない。

検査ログは `tmp/sc-b-unit-final.log`、`tmp/sc-b-e2e-final.log`、`tmp/sc-b-ui-final.log`、`tmp/sc-b-lint-final.log`、`tmp/sc-b-build-final.log`。表示画像は `tmp/sc-b-ui/`。Windowsのbrowser接続検査はlocalhost接続可能な実行環境を使用した。buildには500kB超chunkの警告が残る。

## 20. 正式教材投入前に残る作業

- 数問のSC実教材を著作し、本文・図表・欄・字数・公式解答/許容例・根拠を公式資料と個別校閲する。
- 正式source/examSet/問題PDF内容hash/ページ位置を確定する。旧区分を現行150分本番模試の4問回として偽装しない。
- 正式 `sc-b-v1` loader切替と公開ゲートを別フェーズで行う。
- A-2個別対応を内容とsource/hashで校閲する。今回全対応表は作っていない。
- 除外設問、欄別採点、複数許容セット、厳密なUnicode字数規則、端末時計変更、多重タブ編集の調停は、該当教材の要件に合わせて追加検討する。
- iOS Safari/PWAのPDF viewerが#pageを尊重するか、公式PDFの実ページ・長い表/ログで実機確認する。
- 退避履歴専用の閲覧/明示的再有効化UI、PDF実体を含むバックアップ、全面クラウド同期は今回の範囲に含めていない。

## 最終判定

**A：SC科目Bのpilot教材投入へ進める。**

架空4大問で通常演習・150分模試・自己採点を実行でき、教材版/出典/内容による履歴分離、再実行可能な旧NW退避、PDF識別、A-2明示リンクの基盤を確認した。次は数問のSC実問題を開発用datasetへ投入し、本文・図表・採点補助・PDF位置を校閲しながら学習動線を試す。正式 `sc-b-v1` の公開と大量投入は実施していない。
