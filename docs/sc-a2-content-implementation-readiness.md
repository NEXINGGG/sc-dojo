# SC A-2 教材実装準備判定

基準日: 2026-10-07 / 選定版: sc-a2-selection-2026-10-07-v2 / 本番接続: **未実施**。

## 1. 最終selected 240問

採用240、予備30、不採用155、採否review_required 0。教材本文・解説は未作成。

240件のsource_id・年度期・問番号・公式正解・PDFページ・問題/解答URLは[最終採用一覧](sc-a2-past-question-audit.md#9-最終selected-240問)へ列挙し、[監査JSON](../data/sc-a2-past-question-inventory.json)のselected240件を正本にする。

selection_revisionは選定監査の版。将来の本番dataset_versionや転記内容のcontent_hashと混同しない。未転記のタイトルやOCRから問題内容hashを作らない。

## 2. カテゴリ別最終配分

| カテゴリ | 母集団 | selected | practice | mock1 | mock2 |
| --- | --- | --- | --- | --- | --- |
| 情報セキュリティ・脅威・攻撃 | 59 | 33 | 25 | 4 | 4 |
| 暗号・認証・PKI | 74 | 35 | 27 | 4 | 4 |
| 情報セキュリティ管理・リスク | 19 | 10 | 8 | 1 | 1 |
| セキュリティ技術評価・対策 | 49 | 31 | 25 | 3 | 3 |
| セキュリティ実装技術 | 93 | 46 | 36 | 5 | 5 |
| ネットワーク | 51 | 36 | 28 | 4 | 4 |
| データベース | 20 | 14 | 12 | 1 | 1 |
| システム開発・セキュア開発 | 22 | 14 | 12 | 1 | 1 |
| 開発管理・サービスマネジメント | 21 | 12 | 10 | 1 | 1 |
| システム監査・内部統制 | 17 | 9 | 7 | 1 | 1 |
| **合計** | **425** | **240** | **190** | **25** | **25** |


SC重要度→実頻度→現行シラバス→網羅性→バランスの順で再設計。管理・リスクは母集団19問から10問を採用。425問のカテゴリを動かして補填していない。旧48/38/26等は拘束条件ではない。

セキュリティ5カテゴリ155問（64.6%）。ネットワークの周辺知識・類題と旧品質モデルを6問予備へ移し、本人確認・PaaS責任分界・CVSS・経営・著作権を補った。

## 3. practice / mock1 / mock2

practice190 / mock1 25 / mock2 25。各模試はセキュリティ17問、その他8問。各9年度を含み最多4問/年度。

| 模試 | 基礎 | 標準 | 応用 | 2017→2025年度別問数 |
| --- | --- | --- | --- | --- |
| mock1 | 12 | 9 | 4 | 2 / 3 / 2 / 3 / 3 / 3 / 3 / 3 / 3 |
| mock2 | 11 | 10 | 4 | 2 / 2 / 2 / 3 / 3 / 3 / 3 / 4 / 3 |


問題別の配分・模試順は[模試一覧](sc-a2-past-question-audit.md#8-模試配分)とJSONのassignment/mock_sequenceに記録。A/B・Cは各模試内でも両模試間でも重ならない。Dの別知識の関連は許容する。

現在の本番A-2は25問・40分・15問以上で合格の設定で、今回の固定25問配分と問数は一致する。30問・50分はA-1の設定。今回のSC採用一覧を固定模試へ接続する作業は次フェーズ以降とする。

## 4. 重複監査結果

| 指標 | 確定値 |
| --- | --- |
| 全組合せ比較 | 90100 |
| 4-gram候補（0.30以上） | 215 |
| 旧系列外の候補組 | 12 |
| A確認系列（B内のA部分群を含む） | 30 |
| A構成員 | 66 |
| A余剰出現 | 36 |
| A/B系列 | 91 |
| A/B構成員 | 227 |
| A/B余剰出現 | 136 |
| A系列/B系列 | A 26 / B 65 |
| C類題系列 | 22 |
| D関連系列 | 69 |
| selectedのA/B重複 | 0 |
| 両模試のA/B共有 | 0 |
| 両模試のC共有 | 0 |


duplicate_group=A/B、similar_group=C、related_group=D。群に原本比較の根拠を残した。Aの部分群はB群の内数なので余剰を加算しない。selectedのA/B重複は0。

Cの複数採用は定義識別、ログ解析、比較条件等の違いを理由として記録した。425問の全組合せはOCRで候補を索引比較し、候補・論点群は原本の四択で判定した。文字類似スコアを意味的な重複率とは呼ばない。

## 5. freshness監査結果

| freshness | 425問 | selected |
| --- | --- | --- |
| current | 401 | 233 |
| usable_with_note | 10 | 7 |
| historical_only | 5 | 0 |
| not_verified | 5 | 0 |
| obsolete_candidate | 4 | 0 |
| review_required | 0 | 0 |


selectedはcurrent233、明確な注記付きusable_with_note7。not_verifiedはすべてreserve、historical_onlyとobsolete_candidateは採用0。

| source_id | 教材で必要な注記 |
| --- | --- |
| SC-2017-SPRING-Q02 | 古いTLS版へ誘導する攻撃モデルは成立。TLS1.0/1.1を現在の設定として推奨せず非推奨化を注記。 |
| SC-2017-FALL-Q11 | 原因除去・再発防止という是正処置の正解はSC27用語集の27000:2018でも成立。2014版を最新規格と表示しない。 |
| SC-2018-SPRING-Q01 | CVSS v3を明示する設問でBaseの攻撃元区分の正解は成立。教材ではv3の設問と明記し、現行v4の4グループと混同させない。 |
| SC-2022-SPRING-Q09 | Ver.2.0を明示するが経営者の原則認識・リーダーシップという正解は3.0でも成立。3.0への更新を教材に注記。 |
| SC-2022-SPRING-Q11 | 取引情報に結び付く署名というMITB対策の正解は成立。EV誤選択肢をMITB対策や緑色UIの現行推奨として説明しない。 |
| SC-2023-FALL-Q10 | IoT調査とISP経由の注意喚起は現在も実施。2024年度からファームウェア脆弱性・感染機器も対象。パスワード調査だけが全事業と説明しない。 |
| SC-2025-FALL-Q11 | 63-3は63-4へ置換されたが顔写真付き証明書と申請者の比較は63A-4 §2.5にもある。Identity ProofingとAuthenticationの違い、版更新を注記。 |


24件の個別決定は[監査文書](sc-a2-past-question-audit.md#2-review_required-24問の解消)へ記載。一次規範本文が確認できなかった問題は予備へ分離し、推測でselectedへ上げていない。注記は教材作成時に省略しない。

## 6. 図表29問の分類

元29候補全件を原本で確認。周波数帯表を予備へ移しPaaS表を追加。最終図表29の主分類はA3/B13/C7/D3/E3。通常テキスト211件を含むselected全体:

| A（テキスト） | B（表） | C（コード/ログ） | D（構成図） | E（他画像） |
| --- | --- | --- | --- | --- |
| 214 | 13 | 7 | 3 | 3 |


下表は元29件と新採用1件を含む。採否で最終29件を確認できる。

| source_id | 採否 | 主分類 | 追加 | 表示方法 |
| --- | --- | --- | --- | --- |
| SC-2017-SPRING-Q08 | selected | B | — | IaaS/PaaS/SaaSごとのOSパッチ可否の選択肢表。 |
| SC-2018-FALL-Q18 | selected | D | — | 四選択肢のSYN/SYN-ACK/ACK通信順序図。Choiceごとに画像が必要。 |
| SC-2018-FALL-Q20 | reserve | B | — | 802.11n/acと周波数帯の四択表。予備へ移動。 |
| SC-2018-FALL-Q21 | selected | C | — | CREATE VIEW/GRANTのSQL。改行・引用符・権限を保持。 |
| SC-2018-FALL-Q25 | selected | B | — | 実施者・利用者・責任者の三当事者表。 |
| SC-2019-FALL-Q21 | selected | C | — | 可変JSON文書の括弧・配列・キーをpreで保持。 |
| SC-2019-FALL-Q22 | selected | E | B | 状態遷移図を画像にし空欄の選択肢を表で再現。 |
| SC-2020-OCTOBER-Q18 | selected | D | — | DHCPクライアント・ルータ・サーバ配置とIP表記。 |
| SC-2020-OCTOBER-Q24 | selected | B | — | 初期/年額費用と年数のTCO比較表。 |
| SC-2021-SPRING-Q12 | selected | B | — | Web攻撃と安全実装の対応表。 |
| SC-2021-FALL-Q12 | selected | B | — | 証拠の種類と保全順の選択肢表。 |
| SC-2021-FALL-Q21 | selected | A | — | 主キー/外部キーの下線を主キー:…、外部キー:…と明示できる。 |
| SC-2022-SPRING-Q01 | selected | C | — | HTTPログの記号・URL符号化・空白を保持。 |
| SC-2022-SPRING-Q04 | selected | A | — | 指数・階乗を括弧付きテキスト式で保持できる。 |
| SC-2022-FALL-Q21 | selected | C | B | LEFT JOINのSQL、入力表、四つの結果表。 |
| SC-2022-FALL-Q22 | selected | E | — | 分岐網羅のフローチャートの経路と条件を保持。 |
| SC-2022-FALL-Q24 | selected | B | — | ROIの期間・利益・投資額の表、式はテキスト。 |
| SC-2023-SPRING-Q17 | selected | B | — | アプリ内外のSQL注入対策の四択表。 |
| SC-2023-SPRING-Q21 | selected | C | — | GRANT WITH GRANT OPTIONを含むSQL。 |
| SC-2023-FALL-Q17 | selected | D | B | DB移動前後のFW/L2SW/L3SW構成図と変更ルール表。 |
| SC-2024-SPRING-Q16 | selected | B | — | PGP/S-MIME/SMTP over TLSの鍵単位の四択表。 |
| SC-2024-SPRING-Q21 | selected | C | B | SQL条件式と対象データ表。NULL・引用符を保持。 |
| SC-2024-SPRING-Q24 | selected | E | — | 逓減課金の四選択肢グラフ。軸と曲線形状を保持。 |
| SC-2024-FALL-Q07 | selected | B | — | FIDOの生体情報・秘密鍵の保持主体の表。 |
| SC-2025-SPRING-Q18 | selected | B | — | 衝突/ブロードキャスト分離装置の四択表。 |
| SC-2025-SPRING-Q20 | selected | B | — | GET/POSTとデータ位置の組合せ表。 |
| SC-2025-SPRING-Q21 | selected | C | B | NOT EXISTSのSQLと入力/結果表。主キーとNULLを保持。 |
| SC-2025-FALL-Q22 | selected | A | — | 上→下をアプリ/ミドルウェア/ドライバ/ハードウェアと列挙して階層順を保持できる。 |
| SC-2025-FALL-Q24 | selected | B | — | 計画停止/故障停止の日時と時間表。 |
| SC-2022-SPRING-Q12 | selected | B | — | PaaS責任分界の5行表。最終採用で追加。 |


主分類は排他的。SQLと表はC+B、構成図と選択肢表はD+B。主分類だけから必要機能を切り捨てない。Aの3件もキー、指数・階乗、階層順を保つテキスト化と転記校閲が必要。

## 7. 出典二次校閲結果

selected240の年度・期・問番号・公式正解・問題PDF・解答PDF・問題ページ・解答ページに欠落0、対応違い0。

17組34PDF再取得で全SHA-256一致。公式年度リンク・表題・問番号・解答表25件ずつを独立照合し425件一致。2020はoctober/10月で保持。問番号OCRが曖昧な旧候補18件は原本画像で解消した。

2022春Q24と2023秋Q11に余分な次ページを含んでいた範囲を修正。PDF先頭が1で、原本の印刷ページ番号と異なる。source_secondary_reviewに確認日・項目・公式年度URL・抽出方法を残した。

転記元はIPA公式のみ。今回の出典二次校閲と、教材転記後に必要な問題文・記号・図表・選択肢校閲を区別する。

## 8. 推奨fingerprint方式

推奨は**D: source_id + 問題内容SHA-256 + dataset_version + 問題別manifestの組合せ**。

現行のsrc/domain/backup.ts:175 createQuestionDataIdentity()はcode集合だけのFNV-1a-32。連番と問数を維持した本文・正解の変更を検出できない。

| 方式 | 検出できる変更 | 不足点 |
| --- | --- | --- |
| A: source_id | 同じA2-001を別年度・期・問番号へ差し替え | 同出典の本文・四択・正解・図表修正を検出できない |
| B: 内容hash | 問題そのものの内容変更 | 出典変更と運用上の教材版を別に管理する必要がある |
| C: dataset_version | 教材リリースの識別 | 版更新漏れと問題別差分を自動検出できない。一括履歴破棄に使うと過剰 |
| D: 組合せ（推奨） | 出典・問題内容・教材版を別々に識別 | 正規化規則、前版manifest、問題別履歴の照合方針が必要 |

問題identityは(subject_id, source_id, content_hash)。codeはA2-001～A2-240を維持する表示・参照キーだが、同じcodeなら同じ問題とは判定しない。

content_hashはSHA-256で以下を含める:

- 問題文、A/B/C/DのIDと対応する選択肢文面、correct_choice。
- 本文・選択肢の採点に関係する構造ブロック、表セル、コード、意味のあるcaption/alt。
- 問題図の実内容のasset SHA-256。パスだけでは同じパスへの画像上書きを検出できない。

選択肢はID順に正規化して表示シャッフルを除外。explanation、解説の補足図、memory_point、編集タイトル、難度・カテゴリ・優先度、出典URL修正、監査日は含めない。解説誤字修正だけで履歴が別問題になることを避ける。

正規化はCRLF→LF、Unicode NFC等の最小限にする。コード空白・数値・大小文字・単位・数式・選択肢対応を壊す空白全削除や一律NFKCはしない。問題本文の誤字修正でも保守的にhashは変わるが、解説修正は変わらない。将来の無害修正の互換扱いは監査済みhash aliasで明示する。

dataset fingerprintはsubject_idとcode順の(code, source_id, content_hash)をcanonical JSONにしてSHA-256。dataset_versionはリリース管理用の独立フィールドで、版番号だけを上げても問題identityは変えない。

schema_versionは構造の互換版、dataset_versionは教材版。例: schema_version 2 / dataset_version sc-a2-v1。選定JSONのinventory_versionも別の監査構造版である。

SC v1→v2では前版/現版manifestを問題別に比較する:

- 同じcode/source_id/hashは履歴維持。解説だけの修正はここに該当。
- 同じcodeでも出典又はhashが変わる場合、旧問題の履歴を新問題へ流用しない。旧履歴を版付きで保存し、新版の集計・復習から分離。
- 削除問題の履歴は消さず、旧出典とmanifestで結果を表示。
- 1問変更で他239問の履歴を消さない。途中セッション・模試結果には出題時のidentityを固定し、別問題へ静かに読み替えない。

NW→SCは新DBなので旧SC互換は不要。ただし将来のSC v1→v2は初回から検出可能にする。履歴行へidentityを固定する方法（版フィールド又は版付き問題キーとmanifestテーブル）は次フェーズのDB設計で決める。現在のcodeだけの行では同名codeの新旧問題を並存できない。

今回はDB、バックアップ、同期の方式を提案するだけで変更しない。

## 9. 教材投入前に必要なコード変更

### 現在の四択UI

| 箇所 | 現状 | 最小変更 |
| --- | --- | --- |
| src/types/question.ts | Question.questionとChoice.textは文字列。QuestionSourceはbasis/type/verbatimのみ | sourceId/contentHash、公式出典型、本文とChoiceのcontentBlocks |
| src/data/catalog.ts | RawQuestion、toQuestion、toChoiceで既存文字列へ変換し追加フィールドを落とす。questionDataVersionはschema_version | 生JSONと実行時型の両方を拡張し新情報を保持。datasetVersion/manifestを別公開 |
| src/domain/backup.ts | code集合のfingerprintと問数を中心に互換比較 | identity純粋関数へ分離し内容と出典を含むfingerprint・問題別互換判定へ |
| PracticeQuestionPage / ExamPage / ExamResultPage | h2/spanで本文と四択を直接表示 | 本文・四択のQuestionContent共通描画。結果でも元図表を確認できる表示 |
| PracticeResultPage / QuestionHistoryPage | 文字列の抜粋 | 図表ありと分かる要約と全体を読む経路 |
| vite.config.ts | globにPNG/SVGを含むがJPG/WebPは含まない | 最小案はローカルPNG/SVGで現行globを利用。参照assetが出力/precacheへ入ることを検査 |
| src/styles/global.css | preの空白、表見出し、図拡大を扱わない | 320/390px、表スクロール、pre、画像拡大、暗色、44pxタップ領域 |

### 最小データ構造案（未実装）

既存のquestion/Choice.textを残し、必要な問題だけcontent_blocksを追加。text/図表を正しい順に表示するため、content_blocksがある場合はそれを表示正本にし、文字列は検索・一覧用とする。二重表示しない。内容hashも同じ表示正本から生成する。

~~~ts
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'table'; caption?: string; columnHeaders: string[];
      rows: { rowHeader?: string; cells: string[] }[] }
  | { type: 'code'; text: string; language?: 'sql' | 'json' | 'log' }
  | { type: 'image'; imagePath: string; assetSha256: string;
      alt: string; figureCaption?: string };

// 生JSON: source_id / content_hash / content_blocks
// Question: sourceId / contentHash / contentBlocks
// ChoiceにもcontentBlocksを追加。
// metadataにdataset_version。schema_versionは構造版。
// sourceにexam_code/year/term/question_number、
// question_pdf_url/question_pdf_pages/answer_pdf_url、
// answer_pdf_page/official_answerを追加。
~~~

tableは意味を保つ単一見出し表へ整形する最小案。選択肢表は共通列見出しを問題側に置き、各Choiceへ対応する行の内容を持たせ、表示シャッフル後もIDへ結び付ける。結合セル・多段見出しが忠実再現に必要と試作で分かった場合だけセル型にrowSpan/colSpanを追加する。

画像は本文だけでなくTCP手順・課金グラフの四択にも必要。DのIP/ポート/矢印/境界を図と代替説明で保持し、alt/captionへ正解の説明を混ぜない。

tableはcaption/th/scope、codeはpre/codeでReact文字列エスケープ、imageはimg/figureと拡大表示。任意HTMLやdangerouslySetInnerHTMLは不要。ローカルassetはBASE_URLを尊重し外部CDNへ依存しない。

PNG/SVGは既にキャッシュ対象なので無条件のPWA設定変更は不要。ただしビルド出力・precache収録、演習/模試/結果のオフライン表示、更新時の教材とassetの整合性の検証は必須。旧履歴が参照する図を残す方針も設計する。他形式を使う時だけglobを追加する。

### 実装順・必須と後付け可能の区分

| 順 | 対応 | 教材投入前に必須 | 後から追加可能 |
| --- | --- | --- | --- |
| 1 | source_id・公式出典・dataset_version・型/catalogの保持 | 出典追跡と教材版を初回から記録。新SCのDB境界を確認 | 出典表示の細部、監査管理画面 |
| 2 | 内容SHA-256・manifest・fingerprint・履歴問題別照合 | 解説修正/本文修正/出典変更/画像上書きを区別し、初回履歴へidentityを固定 | 監査済みhash alias、詳細な教材変更履歴UI |
| 3 | 表・pre・画像の本文/Choice共通表示とPWA asset | B～Eを含む30問投入前に演習/模試/結果・オフライン確認 | 複雑な結合セル、装飾、対話的な図、別画像形式 |
| 4 | 教材データ検証・転記校閲 | source_id/hash/四択ID/正解/asset存在とhash/出典/版注記を検査 | 240問全量投入、固定模試接続 |

バックアップ・同期を使うSC試作なら、manifest/identityが往復で保たれる対応も教材投入前に必要。外部へ交換しない隔離試作なら連携コードは後から追加できるが、SC v2や同期・復元の公開前には必須である。

新しい主要ライブラリは不要。SHA-256はWeb Crypto又はビルド時のNode標準crypto、図表はReact標準要素、manifestはJSONで実装できる。

### 次フェーズの検査

- 同じcodeの本文・正解・source_id・問題図の変更でidentityが変わり、解説誤字と表示シャッフルでは変わらない。
- 1問変更で他239問の履歴を維持し、途中セッションと旧模試結果を別問題へ読み替えない。
- 複数形式を本文とChoice、演習・模試・結果で確認。320/390px、暗色、読み上げ、ID採点、オフラインを確認。
- 30問の転記後に公式原本と本文・記号・四択・図表・正解・出典・版注記を校閲する。

## 10. 30問の教材試作へ進んでよいか

**その前に、source_id・内容hash・dataset_version・公式出典・図表/PWA表示の基盤対応が必要。**

240問の選定監査は完了し、この一覧で教材化する選定上の準備は整った。現行UIとfingerprintではB～E表示と差し替え検出が不足するため、そのまま教材を投入する判定にはしない。

上記1～3を先に対応し、検証付きの隔離された30問試作へ進む。大量解説生成・本番読み込み・DB/バックアップ/同期の変更は今回行っていない。一次資料と取得限界は[参照資料](sc-a2-past-question-audit.md#11-参照資料と取得限界)に示す。
