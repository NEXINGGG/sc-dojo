# SC版の独立化・第1段階

この段階では、NW版のデータを移行せずに、SC版のアプリ名称と保存領域だけを分離する。教材と内部科目IDは既存のまま維持する。

## 保存識別子

| 用途 | SC版 | NW版への影響 |
| --- | --- | --- |
| IndexedDB | `sc-dojo`、schema version 12 | `a1-dojo`を開く・移行する・削除する処理は追加しない |
| バックアップformat | `sc-dojo-backup`、backupVersion 6 | `nw-a1-dojo-backup`は形式検証で拒否する |
| バックアップファイル | `sc-dojo-backup-YYYYMMDD-HHmmss.json` | 識別子が異なるため既存NW版の形式検証にも適合しない |
| オフライン準備通知 | `sc-dojo:pwa-offline-ready-notified` | NWキーを読み書きしない |
| インストール案内 | `sc-dojo:pwa-install-suggestion-dismissed` | NWキーを読み書きしない |
| 端末ID | `sc-dojo-device-id` | SC用に新規生成し、NWの端末IDを取り込まない |
| Supabase認証 | `sc-dojo:auth-session` | SDKの関連キー・セッション通知も分離。ログアウトは`scope: local`でSCセッションのみ対象にする |
| 同期開始イベント | `sc-dojo:cloud-sync-needed` | localStorageではなくブラウザ内イベント名を分離 |
| PWA manifest id | baseが`/`なら`/sc-dojo` | NWのインストール識別子と分離 |
| Workbox cacheId | `sc-dojo` | NWキャッシュを削除しない |

復元の形式検証、DBテーブル、保存形式、バックアップ内容の構造、途中セッション、同期キューは維持する。SC用DBは空の状態で作成し、SCの全消去もSC用DBだけを対象とする。

## Supabase同期

テーブル`learning_sync_items`と一意条件`user_id,scope,item_key`は変更しない。Supabase gatewayの送受信境界でだけscopeを変換する。

| 内部scope（維持） | Supabase上のSC scope |
| --- | --- |
| `a1.question` | `sc:a1.question` |
| `a2.question` | `sc:a2.question` |
| `b1.answer` | `sc:b1.answer` |
| `b1.progress` | `sc:b1.progress` |
| `b1.reset` | `sc:b1.reset` |

取得は上記5つのSC用scopeに限定する。取得結果もscopeとuser_idを確認し、SC用scopeから内部scopeへ戻す。削除情報・リセット情報も同じnamespaceを使う。item_key、payload、subjectIdは変更せず、NW用行と同じユーザー・item_keyでも別の一意キーになる。

この変更で実際のSupabaseへのアクセスやSQL・スキーマ変更は行っていない。公開前に、SC用scopeを許可するCHECK制約・RLSとOAuthリダイレクト先を実環境で確認する。拒否された場合にNW用scopeへ戻す処理は設けない。必要な制約変更は既存NW用scopeを残したうえで別途検討する。

## NW版と共存する公開条件

SC版はNW版と別の配信元（別ドメイン・別オリジン）で公開することを推奨する。同じURL・同じService Worker scopeに上書きすると、DBが分離されていてもNWアプリ本体とService Workerが置き換わる。

同じ配信元の別パスで公開する場合、SC用に`VITE_APP_BASE=/sc/`を指定してビルドし、生成物を`/sc/`へ置く。manifestのstart_url・scopeとService Workerの登録パスがそのbaseに対応する。ただし既存NWのルートscope `/`はSCパスにも及ぶため、初回アクセスがNWの画面に置き換わらないこと、NW側の更新・旧キャッシュ削除がSCキャッシュへ影響しないことも確認する必要がある。単にパスを分けただけではこの条件は保証できない。今回はNW側のService Workerを変更しないため、NWがルートscopeで配信されている場合は別配信元を選ぶ。別配信元でルートに公開する場合は既定のbase `/`を利用できる。

Workboxの`cleanupOutdatedCaches`は同じ配信元のNW precacheまで削除し得るため無効にする。通常のSC precache更新によるSCキャッシュ内の古いエントリ削除は維持する。NWのService Worker登録解除やサイトデータの一括削除は行わない。

## 維持した教材と試験構造

- 内部科目IDは`a1`・`a2`・`b1`、科目Bのルートは`/b1/`。
- `data/`のJSONは変更しない。NW試験名・科目B-1を含む元資料の出典表示も維持する。
- A-1は30問・50分、A-2は25問・40分、B-1は2大問選択・90分の既存模試条件を維持する。
- 科目Bの教材構造、保存構造、専用画面、PDF参照、自己評価・復習機能は維持する。
- アプリアイコンの画像と既存ファイル名は維持し、SVGのtitleだけSC名称へ変更する。

後続フェーズでSC用A-1/A-2の問題・カテゴリ、科目Bの教材・試験条件・採点・画面構成を検討する。現在の教材はSC試験対応済みとして扱わない。

## 検証範囲

自動テストでは、NW DBの設定・履歴、NWの通知キー・端末ID・キャッシュを用意し、SCの起動・回答・全消去後も保持されることを確認する。バックアップはNW形式の拒否とSC形式の復元、同期は全5scopeの送受信・削除情報の分離を検証する。通常演習・模試・成績・PWAの既存テストも実行する。

実際のSupabase、公開先でのNW/SC共存、iPhoneでの両PWAインストールと更新は別途手動確認が必要。

### 実行結果（2026-10-05）

| 検査 | 結果 |
| --- | --- |
| `python scripts/validate_questions.py` | 240問、構造エラーなし。Pythonは同梱ランタイムを使用 |
| `npm run lint` | 成功 |
| `npm run test` | 40ファイル・210テスト成功 |
| `npm run build` | 型検査・教材保護検査・PWA生成・配信成果物検査が成功 |
| `npm run test:e2e` | 20テスト成功 |
| 変更ファイルのPrettier検査 | 対応拡張子で成功。SVGは既存の書式を維持 |
| `git diff --check` | 成功 |
| `data/`の差分 | 0ファイル |

追加E2Eは最初の実行で画面遷移前に演習条件の選択肢を選んでタイムアウトした。問題画面の表示を待ち、回答用の選択肢に限定するようテストを修正し、全20件を再実行して成功した。アプリの回答処理は変更していない。

ビルドでは既存の大きなJavaScriptチャンク（500 kB超）に関する警告が残る。ビルド・PWA生成は成功しており、今回は教材の分割や構造変更を行わない。

## 変更ファイル一覧

パスはリポジトリルートからの相対パス。教材JSONは含まない。

| ファイル | 変更内容 |
| --- | --- |
| `src/app/appIdentity.ts`（新規） | SC用アプリID・名称・説明を定義 |
| `package.json` | パッケージ名称をSCへ変更。依存・バージョン・スクリプトは維持 |
| `index.html` | ページ名称・説明をSCへ変更 |
| `src/layouts/AppLayout.tsx` | ヘッダーのアプリ名称 |
| `src/components/PageHeader.tsx` | ページヘッダーのアプリ名称 |
| `src/pages/SettingsPage.tsx` | アプリ情報・科目Bのデータ概要／復元確認表示 |
| `src/domain/subject.ts` | 科目A-1／A-2／Bの表示名。ID・試験条件は維持 |
| `src/features/subjects/SubjectContext.tsx` | 科目A-1のエラー表示 |
| `src/pages/B1HomePage.tsx` | 科目Bホームの表示 |
| `src/pages/B1PracticePage.tsx` | 科目B演習の表示 |
| `src/pages/B1MockSelectionPage.tsx` | 科目B模試・確認画面の表示 |
| `src/pages/B1SessionPage.tsx` | 科目B答案画面の表示 |
| `src/pages/B1ProgressPage.tsx` | 科目B成績画面の表示 |
| `src/pages/PracticeQuestionPage.tsx` | 科目BからのA-2復習表示 |
| `src/features/b1/B1LearningPanels.tsx` | 科目B学習支援パネルの表示 |
| `src/domain/b1A2Recommendation.ts` | 科目Bからの復習案内表示 |
| `src/features/b1/b1Repository.ts` | 科目Bのエラー表示・コメント |
| `src/features/b1/b1LearningSupportRepository.ts` | 科目Bのエラー表示 |
| `src/data/catalog.ts` | 科目Bのエラー表示 |
| `src/data/b1LearningSupport.ts` | 科目Bの案内・エラー表示・コメント |
| `src/data/b1OfficialReview.ts` | 科目Bのエラー表示 |
| `src/database/database.ts` | SC用DB名。schema・NWデータは変更しない |
| `src/domain/backup.ts` | SC専用format・ファイル名、科目Bの検証メッセージ |
| `src/features/auth/supabaseClient.ts` | SC専用認証storageKey |
| `src/features/auth/AuthContext.tsx` | ログアウト対象をSCの現在のセッションへ限定 |
| `src/features/auth/CloudAuthSection.tsx` | 同期対象・科目別件数の表示 |
| `src/features/sync/supabaseCloudSyncGateway.ts` | SC scopeの送受信変換・取得行の確認 |
| `src/features/sync/deviceId.ts` | SC専用端末IDキー |
| `src/features/sync/syncEvents.ts` | SC専用イベント名 |
| `src/features/sync/b1CloudSync.ts` | 科目Bの検証エラー表示 |
| `src/features/sync/cloudSyncLocalRepository.ts` | 科目Bのエラー表示 |
| `src/features/pwa/manifest.ts` | SC名称・説明・インストールID |
| `src/features/pwa/PwaContext.tsx` | SC専用通知・案内キー |
| `src/features/pwa/PwaSettingsSection.tsx` | SCのインストール案内 |
| `vite.config.ts` | SC専用cacheId・他アプリに及ぶ旧キャッシュ削除の無効化 |
| `public/favicon.svg` | SVGのtitleをSCへ変更 |
| `public/icons/a1-dojo-icon.svg` | SVGのtitleをSCへ変更 |
| `scripts/validate-b1-phase5.mjs` | 科目Bへの表示変更に検査の期待文字列を合わせる |
| `src/database/database.test.ts` | SC/NWのDB・設定・進捗の分離テスト |
| `src/domain/backup.test.ts` | SC形式名・ファイル名、NW形式の拒否テスト |
| `src/features/auth/supabaseClient.test.ts` | SC認証キーの検査 |
| `src/features/auth/AuthContext.test.tsx` | SC同期scopeとlocalログアウトの期待値 |
| `src/features/sync/supabaseCloudSyncGateway.test.ts` | 全scope・削除情報の分離、NW行等の除外テスト |
| `src/features/sync/deviceId.test.ts` | SC端末ID生成とNWキー保持テスト |
| `src/features/sync/cloudSyncService.test.ts` | SC端末IDキーにテスト後の後片付けを合わせる |
| `src/features/pwa/manifest.test.ts` | SC名称・manifest id・base別生成の検査 |
| `src/pages/B1Flow.test.tsx` | 科目Bの表示名の期待値 |
| `e2e/b1-integration.spec.ts` | 科目Bの表示名の期待値 |
| `e2e/pwa.spec.ts` | SC名称の期待値 |
| `e2e/settings.spec.ts` | SCバックアップの復元とNW形式拒否の検査 |
| `e2e/sc-isolation.spec.ts`（新規） | SCの起動・回答・全消去でNWのDB・キー・キャッシュを保持する検査 |
| `README.md` | SC版の現状・同期仕様・共存時の注意を案内 |
| `docs/sc-phase1-independence.md`（新規） | この独立化仕様・変更ファイル一覧 |
