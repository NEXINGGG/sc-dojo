# Codex Prompt — B-1 Phase 3 UI・学習フロー実装

B-1 Phase 3を実装してください。Phase 1・2は完了済みです。

現状:
- 27大問 / 243 questionUnits / 379 answerFields
- 年度: 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025
- 全設問に現在性ラベル、設問要求分解、公式根拠、A2連動又はnot_applicable、失点原因候補がある
- IndexedDBに利用者根拠、振返り、A2復習進捗の保存基盤がある
- Phase 2のneeds_reviewは0件であることを確認する

Git commit、push、main merge、deployは禁止です。pnpmだけを使用してください。

## 1. 作業開始前

以下を確認してください。

- ブランチが `feature/b1-phase3-learning-ui`
- git status
- AGENTS.md、README、docs
- B-1通常演習、年度別演習、模試、答案、自己採点、履歴
- Phase 1 relevanceデータ
- Phase 2 guidance、officialEvidence、A2 remediation、failure causes
- Phase 2 Repository、IndexedDB、backup/restore
- A2演習画面、PWA設定、既存テスト

ブランチが違う場合は作業を開始せず報告してください。

## 2. 演習モード

次の3モードを実装してください。

### training
解答中に表示:
- 設問要求の分解
- 利用者根拠入力
- 字数カウンター
- 回答数、答案要素チェック

提出後に表示:
- 公式解答
- 公式根拠
- 自己採点
- 失点原因
- A2連動復習
- 答案書き直し

### practical
- 設問要求は初期非表示
- 「設問の読み方を見る」で展開可能
- 展開状態をセッション中保持
- 利用者根拠は入力可能
- 公式根拠は提出後だけ表示

### mock90
解答中は以下をDOM・アクセシビリティツリーへ置かないでください。
- 設問要求
- ヒント
- 公式根拠
- 正答
- A2推薦
- 失点原因
- 答案要素チェック

提出後だけ振返り可能にしてください。

## 3. 設問要求UI

Phase 2のrequirementBreakdownを表示します。

表示項目:
- 何を答えるか
- 対象
- 対象環境
- 状況
- 通信方向
- 回答形式
- 回答数
- 制約
- 答案に含める要素
- よくある読み違い
- トレーニングヒント

正答漏えい防止:
- acceptedAnswersやofficialAnswerConceptsを解答前UIへ渡さない
- CSSで隠すだけにしない
- 解答前DOM、HTML、aria属性へ正答を含めない

## 4. 利用者根拠入力

各questionUnitで複数件登録可能にしてください。

入力項目:
- 根拠種別: 本文、図、表、計算、設定、シーケンス、一般知識
- 印刷ページ
- 参照位置
- メモ

要件:
- 追加、編集、削除
- 自動保存
- sessionId別保存
- PDF表示中なら現在ページを初期値にできる
- PDF未登録でも入力可能
- 根拠未入力でも提出可能
- 保存失敗を表示
- オフライン動作
- 外部送信しない

利用者根拠と公式根拠の位置が完全一致しなくても不正解扱いにしないでください。

## 5. 公式根拠

答案提出後又は模試終了後だけ表示してください。

表示:
- 根拠種別
- 印刷ページ
- 下線、図、表などの参照位置
- 短い要約
- 根拠になる理由

登録済みPDFがあれば対象ページを開くボタンを追加します。
未登録時は公式PDFを開く導線と登録案内を表示します。
Blob URLを適切に解放してください。

## 6. 自己採点・失点原因

自己採点:
- correct
- partial
- incorrect

既存automatic判定を維持し、記述式を単純なキーワード一致だけで正式正解にしないでください。

partial又はincorrect時に、その設問のapplicableFailureCauseIdsだけを表示します。

失点原因:
- knowledge_gap
- missed_condition
- wrong_scope
- traffic_direction
- diagram_misread
- evidence_missed
- missing_element
- causality_weak
- wording_length
- calculation_error
- time_management

複数選択、自動保存、変更可能、session別保存にしてください。

復習方針:
- knowledge_gap / calculation_error: 対応A2を優先
- missed_condition / wrong_scope / traffic_direction / diagram_misread / evidence_missed / missing_element / causality_weak / wording_length: 同じB-1の読み直し・書き直しを優先
- time_management: 時間計測付き再演習を提案

## 7. A2連動復習

次の流れを実装してください。

B-1回答
→ 自己採点
→ 失点原因選択
→ knowledge_gap又はcalculation_error
→ Phase 2推薦ServiceでA2を提示
→ A2復習開始
→ 推薦問題を解く
→ 元のB-1設問へ戻る
→ 答案書き直し
→ 再自己採点

要件:
- originSessionId、originCaseId、originQuestionIdを保持
- A2 questionIds、完了済みID、状態を保持
- 既定5問、Phase 2 recommendedCountを尊重、原則3～8問
- 完了済みA2を除外可能
- 中断、再開、キャンセル
- 再読込み後も継続
- A2画面に「B-1復習中」と進捗を表示
- 既存A2履歴を壊さない
- 全問完了後に元B-1へ復帰
- not_applicable理由を表示
- 同じ入力では推薦順を安定させる

## 8. 答案書き直し

「答案を書き直す」を追加してください。

- 元答案を保持
- 新答案を別attemptとして保存
- attempt番号、答案、字数、自己採点、失点原因、日時、A2復習前後を保持
- attempt比較を可能にする
- 元結果を上書きして消さない
- 履歴で改善を確認可能
- DB変更が必要なら後方互換マイグレーションを実装

## 9. 現在性ラベル

表示名:
- current_core: 現在も重要
- modern_successor: 現在は発展形が主流
- historical_context: 歴史的理解用
- low_current_priority: 現在の試験では優先度低

表示場所:
- 大問一覧
- 大問詳細
- 設問
- 演習開始確認
- 履歴
- 模試条件

設問上書きラベルを優先してください。
理由、現在の関連トピック、確認日も詳細表示してください。

## 10. 現在性フィルター

通常演習の初期状態:
- current_core ON
- modern_successor ON
- historical_context OFF
- low_current_priority OFF

要件:
- 状態を端末保存
- リセット
- 年度、カテゴリと併用
- 0件表示
- 公式年度演習ではラベルで除外しない

## 11. 模試

次の3種類を実装してください。

1. 現行対策模試
   - current_core + modern_successor
2. 全年度模試
   - 全ラベル
3. 旧技術を含む読解強化模試
   - historical_context + low_current_priorityを中心に選択

公式年度模試:
- 指定年度の3大問を候補に含める
- ラベルで除外しない
- 2020年度なし
- 既存の「3問から2問選択」等の仕様を維持

## 12. 履歴・成績

B-1履歴へ追加:
- 演習モード
- 現在性ラベル
- 設問要求を開いたか
- 根拠件数
- 自己採点
- 失点原因
- A2復習有無・完了数
- 書き直し回数
- 初回答案と最新答案
- 改善状況

集計:
- 失点原因別件数
- 知識不足が多いカテゴリ
- 根拠未入力率
- 書き直し後改善率
- A2復習後改善率
- ラベル別演習数

まず一覧と数値を優先し、重いグラフは追加しないでください。

## 13. 保存・バックアップ

Phase 3で追加した情報をIndexedDBとbackup/restoreへ追加してください。

- 演習モード
- 設問要求展開履歴
- 根拠
- 自己採点
- 失点原因
- A2復習進捗
- attempt履歴
- 現在性フィルター
- 模試種別

要件:
- 既存履歴保持
- 旧バックアップ互換
- 新バックアップ往復
- 復元失敗で既存データを破壊しない
- PDF Blob本体を含めない
- appVersionはpackage.jsonから一元参照

## 14. レスポンシブ・PWA・アクセシビリティ

- PCはPDFと答案の並列表示
- スマホは切替表示
- キーボード表示時も答案欄を操作可能
- オフライン動作
- PDF Blobをプリキャッシュしない
- B-1 UIはroute-level lazy load
- A1/A2初期表示を重くしない
- aria-expanded、aria-live、フォーカス管理
- 色だけでラベルや字数超過を表現しない
- 模試中の非表示情報をアクセシビリティツリーへ残さない

## 15. エラー処理

次を利用者へ表示し、安全な再試行又は戻り先を用意してください。

- IndexedDB保存失敗
- PDF読込み失敗
- guidance読込み失敗
- A2推薦不整合
- 元B-1設問不明
- A2復習復帰失敗
- backup復元失敗
- オフラインで外部PDFを開けない

## 16. テスト

最低限追加:

- training / practical / mock90の表示差
- mock90中は補助情報と正答がDOMにない
- 根拠の追加、編集、削除、複数、再読込み復元
- 公式根拠は提出前非表示、提出後表示
- 自己採点と失点原因保存
- applicableFailureCauseIdsだけ表示
- A2開始、中断、再開、完了、B-1復帰
- not_applicable
- attempt追加、比較、再読込み保持
- relevance上書き
- 初期フィルター、保存、0件、年度併用
- 3模試種別
- 公式年度模試で除外なし
- 新旧backup往復
- IndexedDB migration
- A1、A2、既存B-1回帰
- 27 cases / 243 units / 379 fields維持
- 2020年度なし

E2E:
1. training → 根拠 → 提出 → partial → knowledge_gap → A2 → B-1復帰 → 書き直し
2. practical → 要求初期非表示 → 展開 → 提出
3. mock90 → 補助情報なし → 再読込み → 答案保持 → 提出後振返り
4. relevanceフィルター → historical ON → リロード後保持

## 17. 検証

`scripts/validate-b1-phase3.mjs`と`validate:b1-phase3`を追加し、
validate:data、check、check:releaseへ組み込んでください。

検証:
- 27 cases / 243 units / 379 fields
- 9年度、2020なし
- 3演習モード
- 4現在性ラベル
- 3模試種別
- 全設問でguidance、relevance、failure causes取得可能
- A2参照有効
- 旧ルート互換
- backup schema
- DB migration
- needs_review 0件
- 解答前UIへの正答混入がないこと

## 18. バージョン

package.jsonを`0.6.0`へ更新してください。
アプリ表示、PWA、backup appVersionはpackage.jsonから一元参照してください。

## 19. 実行コマンド

以下を実行してください。

```text
node scripts/validate-b1-phase3.mjs
pnpm run validate:b1-phase3
pnpm run validate:b1-phase2
pnpm run validate:b1-phase1
pnpm run validate:b1
pnpm run validate:data
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run build
pnpm run check
pnpm run test:e2e
pnpm run check:release
```

対象テスト、pnpm run test、pnpm run checkは2回実行してください。

## 20. 完了報告

最後に報告してください。

1. 3演習モード
2. 設問要求UI
3. 利用者根拠UI
4. 公式根拠UI
5. 自己採点・失点原因UI
6. A2復習フローとB-1復帰
7. attempt履歴
8. relevance表示・フィルター
9. 3模試種別
10. 履歴・成績
11. IndexedDBとmigration
12. backup変更
13. PWA・アクセシビリティ
14. 主要変更ファイル
15. テスト・E2E結果
16. 全コマンド結果
17. 既存データ未変更確認
18. version
19. 未解決事項

Git commit、push、deployは行わないでください。
