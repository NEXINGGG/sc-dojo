# SC A-2 過去問題 最終採用監査

最終確定日: 2026-10-07。監査版: sc-a2-selection-2026-10-07-v2。対象は2017～2025年度SC午前II、17回・425問（2020年度は春期中止、10月のみ）。

## 1. 確定結果と変更範囲

selected **240**、reserve **30**、rejected **155**、review_required **0**。通常演習190、固定模試25×2。採用問題の出典欠落・公式正解不一致は0。

[監査JSON](../data/sc-a2-past-question-inventory.json)が採否・出典・群・表示分類の正本。問題本文・四択の教材転記、解説生成、本番投入は未開始。A2-001～A2-240の本番codeはまだ割り当てない。

本番教材、カテゴリ、A-1、科目B、DB、バックアップ、同期、catalog、表示UI、PWAコードは変更していない。既存のカテゴリ案・配分案にある当初数値より、本書の最終配分を優先する。カテゴリは主たる判断による編集分類であり、公式の問題別分類ではない。

## 2. review_required 24問の解消

6問採用、9問予備、9問不採用。現行規範の正確な対応を確証できない問題は予備にし、採用に混ぜていない。freshnessのnot_verifiedは「現在成立しない」という断定ではない。

| source_id | 最終採否 | freshness | 判断理由 |
| --- | --- | --- | --- |
| SC-2017-FALL-Q12 | rejected | current | 用語の正解は成立。27000:2019を明記する2025春Q10を優先。 |
| SC-2017-FALL-Q13 | rejected | historical_only | 版なしのCVSSを3評価基準で説明。v4は4グループなのでv3明示の2018春Q1を優先。 |
| SC-2017-FALL-Q21 | reserve | current | ニューラルネットワークの原理は成立。SCのDB応用での優先度と対応が薄く、無理なカテゴリ移動はしない。 |
| SC-2017-FALL-Q23 | rejected | current | 第15条2項を照合し請負の対価だけで著作権が委託元へ移らない正解は成立。2025秋Q23を優先。 |
| SC-2017-FALL-Q25 | reserve | not_verified | 2004年監査基準の独立性・任命条件。現行規範全文を取得できず四択の対応を確証できないため採用しない。 |
| SC-2018-SPRING-Q01 | selected | usable_with_note | CVSS v3を明示する設問でBaseの攻撃元区分の正解は成立。教材ではv3の設問と明記し、現行v4の4グループと混同させない。 |
| SC-2018-FALL-Q06 | reserve | usable_with_note | Ver.2.0の経営者の役割は3.0の3原則・重要10項目とも整合。四択の違う類題だが2022春Q9を採用し予備へ。 |
| SC-2018-FALL-Q08 | reserve | historical_only | EDSAの三評価構成は旧制度。現行CSAへの名称・範囲変更があり旧構成を現行制度として教えない。 |
| SC-2018-FALL-Q10 | rejected | current | PaaS責任分界はNIST定義と整合。表の記述が明確な2022春Q12を優先。 |
| SC-2018-FALL-Q12 | rejected | usable_with_note | HSTSの期間内HTTPS強制は成立。EV緑色表示の旧誤選択肢より2024春Q13を優先。 |
| SC-2018-FALL-Q24 | reserve | not_verified | JIS Q 20000-1:2012の変更影響と方針の詳細対応。2020版への規範対応を公開一次資料で確証できず採用しない。 |
| SC-2019-FALL-Q07 | reserve | not_verified | モニタの原理は現行27014にもあるが、2015版四択と現行規範の対応は要約だけでは確証できない。 |
| SC-2019-FALL-Q09 | rejected | historical_only | 2017秋Q13と完全再出題。版なしの3評価基準を現行CVSS一般論として採用しない。 |
| SC-2020-OCTOBER-Q09 | rejected | obsolete_candidate | 登録済みパスワードで確認する旧3DSの前提。現行EMV 3DSにはFrictionless等もあり現在形で一般化できない。 |
| SC-2020-OCTOBER-Q11 | rejected | current | PaaS責任分界は成立。B系列の最新2022春Q12を優先。 |
| SC-2021-SPRING-Q25 | reserve | not_verified | 開発途中のセキュリティテストは妥当だが、27001:2014附属書Aと現行管理策の規範対応は本文未確証のため予備。 |
| SC-2021-FALL-Q09 | reserve | historical_only | 27002:2014と27017:2016の旧版間比較。改訂後の現行比較として使わず旧版を明示する予備に限定。 |
| SC-2022-SPRING-Q09 | selected | usable_with_note | Ver.2.0を明示するが経営者の原則認識・リーダーシップという正解は3.0でも成立。3.0への更新を教材に注記。 |
| SC-2022-SPRING-Q12 | selected | current | PaaSでは利用者がアプリケーションを管理し提供者が基盤OS等を管理する正解はNIST定義と整合。個別契約の責務まで一般化しない。 |
| SC-2022-SPRING-Q14 | rejected | usable_with_note | 2018秋Q12の完全再出題。HSTSは成立するがEV緑色表示を含む旧四択より2024春Q13を優先。 |
| SC-2023-SPRING-Q23 | selected | current | 公式正解ウを維持。第10条3項・21条・47条の3・113条を照合。使用許諾を複製・保護解除の包括許諾と扱う行為は適切でない。契約条件を省略しない。 |
| SC-2023-SPRING-Q25 | reserve | not_verified | 平成30年監査基準の四択と令和5年全文の対照は取得403で未確証。現行版を明示する2025秋Q25を優先。 |
| SC-2025-FALL-Q11 | selected | usable_with_note | 63-3は63-4へ置換されたが顔写真付き証明書と申請者の比較は63A-4 §2.5にもある。Identity ProofingとAuthenticationの違い、版更新を注記。 |
| SC-2025-FALL-Q23 | selected | current | 第15条2項・17条の本文照合。特約なしの請負開発で委託元へ自動移転しない公式正解ウは成立。 |


## 3. 実母集団に基づく最終カテゴリ配分

SC重要度→実際の出題頻度→現行シラバス→学習範囲の網羅性→カテゴリ間バランスの順で判断。425問の主カテゴリは動かしていない。

管理・リスクは母集団19問から10問を採用し、存在しない26問への増量はしない。暗号等には反復出題が多いため、母集団の出現数に比例するだけの配分でもない。セキュリティ5カテゴリは155/240問（64.6%）、両模試は各17/25問（68%）。

DB・開発・監査も、権限、セキュア開発、統制の理解を支える実出題として残す。

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


採用変更は次の6対。図表であることを理由に重要問題を外していない。

| 予備へ移動 | 新採用 | 理由 |
| --- | --- | --- |
| SC-2018-FALL-Q20 | SC-2022-SPRING-Q12 | 周波数帯は成立するがSCのクラウド責任分界を優先。図表であることは除外理由ではない。 |
| SC-2021-SPRING-Q22 | SC-2018-SPRING-Q01 | 旧製品品質モデルよりSCの脆弱性評価を補うCVSSを優先。 |
| SC-2022-SPRING-Q19 | SC-2022-SPRING-Q09 | 時刻同期を予備にし経営者のセキュリティ責任を補う。 |
| SC-2019-SPRING-Q19 | SC-2025-FALL-Q11 | PPPoEの役割より本人確認と認証の区別を優先。 |
| SC-2019-SPRING-Q23 | SC-2025-FALL-Q23 | マッシュアップは2019秋の具体例で学べるため請負の著作権帰属を補う。 |
| SC-2022-SPRING-Q20 | SC-2023-SPRING-Q23 | STPは2025春Q19の動作説明で学べるため利用許諾・権利管理を補う。 |


## 4. 重複・類題監査

A=問題条件・四択の順序と判断内容・正解が実質同一。B=数値、名前、選択肢順、同義の説明明確化だけで、判断内容は同じ。C=同一の正答知識を問うが、誤選択肢・判断工程・適用条件が異なる別問題。D=同じ技術領域だが知識・学習目標が別。

duplicate_groupはA/B、similar_groupはC、related_groupはD。カテゴリ一致だけでCを作らない。

425問のOCR索引で全90,100組を比較し、旧95系列の各メンバー、閾値0.30以上の215組、旧系列外12組と論点横断の候補を原本の意味で確認した。短い問題・図表・表記差は文字スコアだけでは判定しない。OCR本文は教材転記の正本にしない。

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


「完全再出題5問は下限」を廃止し、確認したA系列とB系列を明示した。Aの部分群はB群の内数であり、A余剰36とA/B余剰136を足さない。A/Bの91系列は構成員227問で、残る198問にはA/B系列を付けていない。これは当該425問を対象とした編集監査結果であり、OCR文字列一致の証明ではない。

A/B系列の全メンバーと判断根拠はJSONのduplicate_groups・exact_groupsに保存。selected内のA/B複数採用は**0**なので例外採用はない。Cの複数採用は、群のmultiple_selection_reasonと問題のnotesに理由を残した。

修正例:

- Smurf、Mirai、PQC、SAML定義、マルチベクトルDDoS等は新しい誤選択肢を伴う別問題をCに分離し、その内側のA/Bだけをduplicate_groupに残した。
- OSコマンド注入の攻撃定義とHTTPログ解析はC。TLS一般、TLS1.3、DTLS、前方秘匿性は別目標のD。
- FIPS 140-2/140-3、WPA2/WPA3、シグネチャ型/アノマリ型IPSは、版や方式による知識差があるD。文面の多さだけでBにしない。
- LEFT JOIN、条件抽出、NOT EXISTSは異なるSQL操作のD。SQLというカテゴリだけでCにしない。

### C系列の判定と複数採用

| 群 | 正答知識 | 構成員 | 複数採用理由 |
| --- | --- | --- | --- |
| SC-A2-SIM-sidechannel-definition | 物理情報観測による秘密情報の推測。 | SC-2017-SPRING-Q03, SC-2019-SPRING-Q07, SC-2020-OCTOBER-Q04, SC-2021-SPRING-Q05 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-exploit-definition | 脆弱性を利用する攻撃コードの識別。 | SC-2017-FALL-Q05, SC-2018-SPRING-Q04, SC-2020-OCTOBER-Q03 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-kaminsky-countermeasure | DNS応答偽装に対するランダム化。 | SC-2017-FALL-Q06, SC-2023-SPRING-Q05, SC-2025-SPRING-Q04 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-smurf-mechanism | ICMP要求・応答と偽装を使うSmurfの識別。 | SC-2017-FALL-Q07, SC-2019-SPRING-Q06, SC-2021-SPRING-Q04, SC-2022-FALL-Q04, SC-2024-FALL-Q06 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-multi-vector | 異なるDoS手法の同時使用。 | SC-2018-FALL-Q04, SC-2019-FALL-Q13 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-cyber-guide-purpose | 経営者の責任を示すガイドラインの目的。 | SC-2018-FALL-Q06, SC-2022-SPRING-Q09 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-mirai-behavior | IoT感染とC&C指令によるMiraiのDDoS。 | SC-2018-FALL-Q11, SC-2023-FALL-Q06, SC-2025-SPRING-Q07 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-class-d-use | クラスDのマルチキャスト用途。 | SC-2018-FALL-Q19, SC-2022-FALL-Q19, SC-2023-FALL-Q19 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-cryptojacking-definition | 他者計算資源を使う不正マイニング。 | SC-2019-SPRING-Q05, SC-2023-FALL-Q05, SC-2025-SPRING-Q05 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-dnssec-verification | DNSSEC署名による応答の真正性・完全性。 | SC-2018-SPRING-Q16, SC-2020-OCTOBER-Q15, SC-2022-SPRING-Q13, SC-2019-FALL-Q18, SC-2023-FALL-Q13 | Cの別問題。同じ正答知識だが、誤選択肢又は判断工程が異なる別問題。内側のA/B系列はduplicate_groupで別管理。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-saml-definition | SAMLによる異ドメイン間の認証・属性・認可情報連携。 | SC-2020-OCTOBER-Q02, SC-2022-SPRING-Q02, SC-2023-FALL-Q08 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-pqc-definition | 通常の計算機で使用する耐量子計算機暗号。 | SC-2021-FALL-Q03, SC-2024-FALL-Q05, SC-2025-FALL-Q03 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-quantum-key-principle | 量子通信で共有する使い捨て鍵の秘密通信。 | SC-2022-SPRING-Q06, SC-2024-FALL-Q09 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-hsts-operation | 期間内HTTPS接続を強制するHSTS。 | SC-2018-FALL-Q12, SC-2022-SPRING-Q14, SC-2024-SPRING-Q13, SC-2021-SPRING-Q15 | Cの別問題。EV誤選択肢変更とHSTS定義/他機能比較の別四択。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-aes-keylength | AESの128/192/256bit鍵長。 | SC-2017-SPRING-Q01, SC-2018-FALL-Q01, SC-2021-SPRING-Q07 | Cの別問題。ラウンド数との組合せと鍵長だけの識別は別判断。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-os-command-identification | 外部入力によるOSコマンド実行の識別。 | SC-2017-SPRING-Q12, SC-2018-FALL-Q13, SC-2023-FALL-Q01, SC-2018-SPRING-Q02, SC-2020-OCTOBER-Q01, SC-2022-SPRING-Q01 | Cの別問題。攻撃定義とHTTPログ解析は形式と判断工程が異なる。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-stateful-packet | 状態に基づく戻りパケット許可。 | SC-2017-FALL-Q09, SC-2019-SPRING-Q17, SC-2021-SPRING-Q06, SC-2018-SPRING-Q06, SC-2019-FALL-Q05, SC-2021-FALL-Q06 | Cの別問題。状態管理の特徴と他FW機能比較の別四択。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-cookie-secure | Secure属性によるHTTPSへのCookie送信制限。 | SC-2018-SPRING-Q11, SC-2019-FALL-Q11, SC-2021-FALL-Q10, SC-2020-OCTOBER-Q12 | Cの別問題。効果識別とサーバ/ブラウザ動作組合せの別問題。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-owe-open | パスワード不要のWi-Fi暗号化。 | SC-2021-SPRING-Q17, SC-2024-SPRING-Q12 | Cの別問題。OWE技術説明とEnhanced Openの二軸比較。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-mashup | 複数公開サービスの組合せ。 | SC-2019-SPRING-Q23, SC-2019-FALL-Q23 | 最多1問採用又は全問予備/不採用 |
| SC-A2-SIM-service-availability | 契約サービス時間を分母とする可用性。 | SC-2018-SPRING-Q24, SC-2022-SPRING-Q24, SC-2025-FALL-Q24, SC-2025-SPRING-Q24 | Cの別問題。計画停止除外と時間帯外修復の除外は適用条件が異なる。 定義の確認と適用・比較の違いを学ぶため複数採用。 |
| SC-A2-SIM-stp-loop | L2ループ防止と迂回経路決定のSTP。 | SC-2020-OCTOBER-Q20, SC-2022-SPRING-Q20, SC-2025-SPRING-Q19 | 最多1問採用又は全問予備/不採用 |


## 5. 現行性

| freshness | 425問 | selected |
| --- | --- | --- |
| current | 401 | 233 |
| usable_with_note | 10 | 7 |
| historical_only | 5 | 0 |
| not_verified | 5 | 0 |
| obsolete_candidate | 4 | 0 |
| review_required | 0 | 0 |


selectedはcurrent233又は明示的な注記付きusable_with_note7のみ。historical_only、not_verified、obsolete_candidateは採用0。

FIPS 140-2は140-3への移行で2026-09-22以降Historical扱いとなったため、新教材は140-3の問題を優先する。既存140-2製品の利用がすべて禁止という意味ではない。CSF1.1の5機能を現行一般論にせず、CSF2.0の6機能を採用する。旧3DSの登録パスワード前提は現行EMV 3DSの各フローを包括しないため不採用。

法令問題はe-Gov公式APIから本文を取得して条文照合した。公式解答は変更していない。監査基準2023全文や旧JISの規範対応が取得できなかった箇所は、読了したと記録せず予備にした。経営ガイドラインは一次資料の検索索引とIPA実践資料で3原則・10項目の維持を確認し、全文通読とは扱わない。

| source_id | 教材で必要な注記 |
| --- | --- |
| SC-2017-SPRING-Q02 | 古いTLS版へ誘導する攻撃モデルは成立。TLS1.0/1.1を現在の設定として推奨せず非推奨化を注記。 |
| SC-2017-FALL-Q11 | 原因除去・再発防止という是正処置の正解はSC27用語集の27000:2018でも成立。2014版を最新規格と表示しない。 |
| SC-2018-SPRING-Q01 | CVSS v3を明示する設問でBaseの攻撃元区分の正解は成立。教材ではv3の設問と明記し、現行v4の4グループと混同させない。 |
| SC-2022-SPRING-Q09 | Ver.2.0を明示するが経営者の原則認識・リーダーシップという正解は3.0でも成立。3.0への更新を教材に注記。 |
| SC-2022-SPRING-Q11 | 取引情報に結び付く署名というMITB対策の正解は成立。EV誤選択肢をMITB対策や緑色UIの現行推奨として説明しない。 |
| SC-2023-FALL-Q10 | IoT調査とISP経由の注意喚起は現在も実施。2024年度からファームウェア脆弱性・感染機器も対象。パスワード調査だけが全事業と説明しない。 |
| SC-2025-FALL-Q11 | 63-3は63-4へ置換されたが顔写真付き証明書と申請者の比較は63A-4 §2.5にもある。Identity ProofingとAuthenticationの違い、版更新を注記。 |


## 6. 図表候補29問の全件確認

主分類は形状が必要なD/E→コード/ログC→表B→意味を保ったテキストAの順で1件1分類。表とSQLが同居する場合はCを主分類にし、Bも追加要素として保存する。

元29候補全件を確認。802.11n/ac表1問を予備へ移し、PaaS表1問を新採用したので、最終selectedにも図表対象は29問。元29、最終図表29ともA3/B13/C7/D3/E3。通常テキスト211問を加えたselected全体は以下。

| A（テキスト） | B（表） | C（コード/ログ） | D（構成図） | E（他画像） |
| --- | --- | --- | --- | --- |
| 214 | 13 | 7 | 3 | 3 |


下表は元29候補すべてに、新採用PaaS1問を加えた30行。採否で最終29問を識別できる。

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


A3問は図を削るだけでは不十分。キー役割、指数・階乗、階層順を本文で明示し、原本と同じ正解になるか転記後に校閲する。D/E計6問は画像が必要。B/C計20問は表・preによる表示が必要。図表は本文と選択肢の双方にある。

## 7. 公式原本との二次校閲

17組34PDFを再取得し全SHA-256が既存記録と一致。公式年度ページのSC午前IIの問題・解答リンク、年度・期の表題、問番号と問題ページを照合した。

17解答PDFから問1～25を独立抽出し425件一致（うちselected240）。アイウエ→ABCDも一致。2021年の旧文字マップはcp932へ復元して抽出。2023秋は今回25解答をテキスト抽出できたため「画像のみで照合」という以前の記録を更新した。

旧採用候補の問番号OCRが曖昧な18件は原本画像で解消した。二次校閲で次の範囲を修正: 2022春Q24は[13,14]→[13]、2023秋Q11は[7,8]→[7]。PDF先頭を1と数え、本文に印刷されたページ番号とは区別する。

selected240のsource_idの年度・期・問番号、公式正解、問題PDF、解答PDF、問題ページ、解答ページ1に欠落0・対応違い0。各問題のsource_secondary_reviewに確認項目・日付・公式年度URL・抽出方法を記録した。

教材本文は未転記なので、転記後の文字・記号・図形・正解の校閲は30問試作で行う。今回の出典監査が転記後校閲を代替するわけではない。

| 実施回 | selected | 公式PDF | 再照合 |
| --- | --- | --- | --- |
| SC-2017-SPRING | 9 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2017-FALL | 4 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2018-SPRING | 6 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2018-FALL | 5 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2019-SPRING | 8 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2019-FALL | 11 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2020-OCTOBER | 10 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2021-SPRING | 17 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2021-FALL | 14 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2022-SPRING | 13 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2022-FALL | 15 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2023-SPRING | 13 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2023-FALL | 19 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2024-SPRING | 22 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2024-FALL | 24 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2025-SPRING | 25 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |
| SC-2025-FALL | 25 | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) | リンク・表題・番号・解答・SHA-256一致 |


## 8. 模試配分

各10カテゴリの配分はカテゴリ表のとおり。両模試とも9年度を含み、最多4問/年度。同じA/B・Cを両模試に置かず、各模試内にも重ねない。Dは別の学習目標なので許容する（例: 二つのIPS方式）。

mock2のOSコマンド定義、CASB、Secure属性を通常演習へ移し、ATT&CK、SCAP、OWEと交換して論点の偏りを緩和した。カテゴリ・難易度・年度の総数は維持。

固定25問は教材用の最終仮割当。本番の30問・50分模試コードは変更していない。固定25問の接続と制限時間は後工程で仕様を明示する。

| 模試 | 基礎 | 標準 | 応用 | 2017→2025年度別問数 |
| --- | --- | --- | --- | --- |
| mock1 | 12 | 9 | 4 | 2 / 3 / 2 / 3 / 3 / 3 / 3 / 3 / 3 |
| mock2 | 11 | 10 | 4 | 2 / 2 / 2 / 3 / 3 / 3 / 3 / 4 / 3 |


### mock1

| 順 | source_id | 論点 | 難度 |
| --- | --- | --- | --- |
| 1 | SC-2017-SPRING-Q02 | TLSダウングレード攻撃 | standard |
| 2 | SC-2022-SPRING-Q01 | HTTPログからコマンド注入を特定 | applied |
| 3 | SC-2024-FALL-Q06 | Smurf攻撃 | basic |
| 4 | SC-2025-FALL-Q02 | Pass the Hash攻撃 | basic |
| 5 | SC-2018-FALL-Q01 | AESの鍵長と段数 | standard |
| 6 | SC-2019-SPRING-Q01 | CRLに掲載する証明書 | basic |
| 7 | SC-2021-SPRING-Q02 | OCSPによる失効確認 | basic |
| 8 | SC-2023-SPRING-Q04 | ハッシュの衝突発見困難性 | standard |
| 9 | SC-2020-OCTOBER-Q07 | サイバー・フィジカル対策フレームワーク | basic |
| 10 | SC-2022-SPRING-Q11 | MITBとトランザクション署名 | basic |
| 11 | SC-2024-FALL-Q13 | アノマリ型IPS | standard |
| 12 | SC-2025-SPRING-Q15 | 電源断前の証拠保全 | standard |
| 13 | SC-2017-FALL-Q14 | 重要操作前の再認証 | basic |
| 14 | SC-2019-FALL-Q14 | 常時HTTPSの効果 | basic |
| 15 | SC-2020-OCTOBER-Q17 | IP25Bの通信遮断 | basic |
| 16 | SC-2021-FALL-Q06 | ステートフルFWの特徴 | basic |
| 17 | SC-2023-SPRING-Q15 | DKIMの署名検証 | standard |
| 18 | SC-2018-SPRING-Q19 | 802.1Qのトランクポート | standard |
| 19 | SC-2021-FALL-Q20 | サブネット内の最大ホスト数 | applied |
| 20 | SC-2023-SPRING-Q18 | LANの伝送量と同時利用台数 | applied |
| 21 | SC-2024-FALL-Q19 | ICMPのメッセージ用途 | standard |
| 22 | SC-2025-FALL-Q21 | コミットとログ永続化 | standard |
| 23 | SC-2022-SPRING-Q22 | 入力誤りとフールプルーフ | basic |
| 24 | SC-2020-OCTOBER-Q24 | TCOの比較 | applied |
| 25 | SC-2018-FALL-Q25 | IT保証業務の三当事者 | basic |

### mock2

| 順 | source_id | 論点 | 難度 |
| --- | --- | --- | --- |
| 1 | SC-2021-SPRING-Q05 | サイドチャネル攻撃の仕組み | basic |
| 2 | SC-2024-FALL-Q02 | 画像認識への敵対的入力 | basic |
| 3 | SC-2024-FALL-Q03 | MITRE ATT&CKの用途 | basic |
| 4 | SC-2025-FALL-Q07 | SYN/ACK観測によるDoS推定 | basic |
| 5 | SC-2018-SPRING-Q07 | 署名生成に使う秘密鍵 | standard |
| 6 | SC-2019-SPRING-Q08 | トランザクション署名のMAC | applied |
| 7 | SC-2022-FALL-Q08 | 前方秘匿性 | standard |
| 8 | SC-2025-FALL-Q06 | XML署名と対象範囲 | standard |
| 9 | SC-2017-FALL-Q11 | ISMSの是正処置 | standard |
| 10 | SC-2020-OCTOBER-Q13 | デジタルフォレンジックス | basic |
| 11 | SC-2023-FALL-Q12 | SCAPによる脆弱性管理自動化 | basic |
| 12 | SC-2023-SPRING-Q12 | シグネチャ型IPS | standard |
| 13 | SC-2017-FALL-Q15 | OP25Bの適用通信 | basic |
| 14 | SC-2019-SPRING-Q12 | VLANによる通信分離 | basic |
| 15 | SC-2020-OCTOBER-Q12 | Secure属性のサーバとブラウザ処理 | standard |
| 16 | SC-2021-SPRING-Q17 | OWEの公衆無線暗号化 | basic |
| 17 | SC-2022-FALL-Q14 | SMTP-AUTHの認証 | standard |
| 18 | SC-2018-FALL-Q18 | TCPの3ウェイハンドシェイク | applied |
| 19 | SC-2023-SPRING-Q19 | STPの指定ポート | applied |
| 20 | SC-2024-FALL-Q20 | 光学TAPによる通信監視 | standard |
| 21 | SC-2025-FALL-Q18 | Ajaxの非同期通信 | basic |
| 22 | SC-2021-SPRING-Q21 | ロック順序とデッドロック回避 | standard |
| 23 | SC-2020-OCTOBER-Q22 | 利用者分析のペルソナ | basic |
| 24 | SC-2022-FALL-Q24 | システム化の投資利益率 | applied |
| 25 | SC-2024-FALL-Q25 | アクセス管理の業務処理統制 | standard |


## 9. 最終selected 240問

全採用問題をsource_idで確定する。本番連番は教材作成時に割り当てる。source_idを維持し、連番codeを将来の差し替え検出の唯一の鍵にしない。

| source_id | 論点 | 配分 | 難度 | 公式正解 | 問題ページ | freshness | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SC-2017-SPRING-Q02 | TLSダウングレード攻撃 | mock1 #1 | standard | ウ/C | 3 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q04 | TPMによる鍵保護 | practice | basic | イ/B | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q05 | セッション固定化攻撃 | practice | basic | ウ/C | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q06 | DNS水責め攻撃 | practice | basic | イ/B | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q08 | クラウドのOSパッチ責任 | practice | basic | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q09 | リスク回避の選択 | practice | basic | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q13 | マルウェア検出の偽陰性 | practice | basic | ウ/C | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q16 | サンドボックス解析 | practice | basic | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-SPRING-Q18 | ICMP Flood攻撃 | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| SC-2017-FALL-Q11 | ISMSの是正処置 | mock2 #9 | standard | イ/B | 7 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_ans.pdf) |
| SC-2017-FALL-Q14 | 重要操作前の再認証 | mock1 #13 | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_ans.pdf) |
| SC-2017-FALL-Q15 | OP25Bの適用通信 | mock2 #13 | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_ans.pdf) |
| SC-2017-FALL-Q20 | IPv4のホスト部の算出 | practice | applied | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fqpm-att/2017h29a_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q01 | CVSS v3の基本評価基準 | practice | basic | ア/A | 3 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q05 | シングルサインオン方式 | practice | basic | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q07 | 署名生成に使う秘密鍵 | mock2 #5 | standard | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q14 | ダウンローダ型マルウェアの遮断 | practice | basic | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q18 | IPv4の上位プロトコル識別 | practice | basic | ア/A | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-SPRING-Q19 | 802.1Qのトランクポート | mock1 #18 | standard | ウ/C | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| SC-2018-FALL-Q01 | AESの鍵長と段数 | mock1 #5 | standard | ア/A | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| SC-2018-FALL-Q07 | UDP反射型DDoS | practice | basic | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| SC-2018-FALL-Q18 | TCPの3ウェイハンドシェイク | mock2 #18 | applied | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| SC-2018-FALL-Q21 | ビューへの参照権限 | practice | applied | エ/D | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| SC-2018-FALL-Q25 | IT保証業務の三当事者 | mock1 #25 | basic | ウ/C | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q01 | CRLに掲載する証明書 | mock1 #6 | basic | エ/D | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q08 | トランザクション署名のMAC | mock2 #6 | applied | ウ/C | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q11 | DNSキャッシュポイズニング対策 | practice | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q12 | VLANによる通信分離 | mock2 #14 | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q18 | 無線LANの隠れ端末問題 | practice | standard | イ/B | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q20 | SNMPv3の通知PDU | practice | basic | エ/D | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q22 | ファジングによる脆弱性検出 | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-SPRING-Q24 | DBバックアップ周期と回復量 | practice | applied | ア/A | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| SC-2019-FALL-Q01 | FIDO UAFの認証処理 | practice | standard | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q02 | IoT暗号実装のサイドチャネル | practice | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q10 | BluetoothのBlueBorne | practice | basic | ア/A | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q13 | マルチベクトルDDoS | practice | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q14 | 常時HTTPSの効果 | mock1 #14 | basic | エ/D | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q15 | エクスプロイトキット | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q19 | IPv4の分割と再構築 | practice | standard | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q20 | TCPの信頼性制御 | practice | standard | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q21 | 可変JSONデータの格納 | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q22 | 状態遷移図の補完 | practice | applied | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2019-FALL-Q23 | 複数サービスのマッシュアップ | practice | basic | エ/D | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q03 | エクスプロイトコード | practice | basic | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q07 | サイバー・フィジカル対策フレームワーク | mock1 #9 | basic | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q12 | Secure属性のサーバとブラウザ処理 | mock2 #15 | standard | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q13 | デジタルフォレンジックス | mock2 #10 | basic | エ/D | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q17 | IP25Bの通信遮断 | mock1 #15 | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q18 | DHCPリレーと初期問い合わせ | practice | basic | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q19 | RADIUSの認証と課金 | practice | basic | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q22 | 利用者分析のペルソナ | mock2 #23 | basic | エ/D | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q24 | TCOの比較 | mock1 #24 | applied | ウ/C | 15 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2020-OCTOBER-Q25 | 個人情報管理台帳の監査 | practice | standard | エ/D | 16 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q01 | リフレクタ攻撃に悪用されるサービス | practice | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q02 | OCSPによる失効確認 | mock1 #7 | basic | ウ/C | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q05 | サイドチャネル攻撃の仕組み | mock2 #1 | basic | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q06 | ステートフルFWの特徴 | practice | basic | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q07 | AESの鍵長 | practice | standard | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q08 | CVE識別子の役割 | practice | basic | ウ/C | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q09 | J-CSIPの情報共有 | practice | basic | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q12 | Web攻撃と安全な実装の対応 | practice | applied | ア/A | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q13 | ビヘイビア法による検出 | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q15 | HSTSによるHTTPS接続強制 | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q16 | VDIによるブラウザ隔離 | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q17 | OWEの公衆無線暗号化 | mock2 #16 | basic | ア/A | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q18 | NFVの機能仮想化 | practice | basic | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q19 | リンクアグリゲーション | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q20 | 127.0.0.1の用途 | practice | basic | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q21 | ロック順序とデッドロック回避 | mock2 #22 | standard | エ/D | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-SPRING-Q24 | 更新後ログによるロールフォワード | practice | standard | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| SC-2021-FALL-Q05 | サイバーキルチェーン | practice | basic | ウ/C | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q06 | ステートフルFWの特徴 | mock1 #16 | basic | ウ/C | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q10 | CookieのSecure属性 | practice | basic | ウ/C | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q11 | IoTのTelnet初期パスワード | practice | basic | ア/A | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q12 | 揮発性と証拠保全順序 | practice | standard | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q13 | 電磁波の漏えいとTEMPEST | practice | basic | ウ/C | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q14 | ルートキットの特徴 | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q16 | EAP-TLSの相互認証 | practice | basic | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q18 | VXLANによるL2オーバーレイ | practice | basic | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q20 | サブネット内の最大ホスト数 | mock1 #19 | applied | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q21 | 外部キー制約と更新操作 | practice | applied | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q22 | 探索的テスト | practice | basic | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q24 | フェールソフト設計 | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2021-FALL-Q25 | クラウドの情報保全の監査 | practice | standard | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q01 | HTTPログからコマンド注入を特定 | mock1 #2 | applied | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q03 | 消費電力による秘密情報推定 | practice | basic | イ/B | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q04 | パスワードの理論的総数 | practice | applied | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q05 | キルチェーンの偵察段階 | practice | basic | イ/B | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q07 | SECURITY ACTIONの自己宣言 | practice | basic | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q09 | 経営ガイドラインVer.2.0 | practice | basic | イ/B | 7 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q10 | CRYPTRECの活動 | practice | basic | ア/A | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q11 | MITBとトランザクション署名 | mock1 #10 | basic | イ/B | 8 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q12 | クラウドサービスの責任分界 | practice | basic | ウ/C | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q13 | DNSSECの保証対象 | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q15 | TLSによる通信保護 | practice | basic | ウ/C | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q21 | データリネージ | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-SPRING-Q22 | 入力誤りとフールプルーフ | mock1 #23 | basic | ア/A | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| SC-2022-FALL-Q06 | パスワードスプレー攻撃 | practice | basic | ウ/C | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q08 | 前方秘匿性 | mock2 #7 | standard | ア/A | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q09 | ISO/IEC 15408の評価 | practice | standard | ア/A | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q12 | ブロックチェーンの改ざん検知 | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q13 | IPsecによるネットワーク層暗号化 | practice | basic | ア/A | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q14 | SMTP-AUTHの認証 | mock2 #17 | standard | ウ/C | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q15 | SPFのDNS設定 | practice | standard | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q17 | アクセスポイント隔離 | practice | standard | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q18 | IPv6の特徴 | practice | standard | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q20 | VRRPのゲートウェイ冗長化 | practice | basic | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q21 | LEFT OUTER JOINの結果 | practice | applied | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q22 | 分岐網羅のテストケース | practice | applied | ア/A | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q23 | SDカードのCPRM | practice | basic | イ/B | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q24 | システム化の投資利益率 | mock2 #24 | applied | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2022-FALL-Q25 | SaaSのID管理の監査 | practice | standard | イ/B | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q04 | ハッシュの衝突発見困難性 | mock1 #8 | standard | エ/D | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q07 | CTRモード | practice | standard | ア/A | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q08 | ISMAP管理基準の基礎 | practice | basic | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q12 | シグネチャ型IPS | mock2 #12 | standard | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q14 | 無線LAN暗号化規格 | practice | basic | エ/D | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q15 | DKIMの署名検証 | mock1 #17 | standard | ア/A | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q17 | SQLインジェクションの実装内外の対策 | practice | applied | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q18 | LANの伝送量と同時利用台数 | mock1 #20 | applied | イ/B | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q19 | STPの指定ポート | mock2 #19 | applied | イ/B | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q20 | IPv4のブロードキャスト区別 | practice | basic | ア/A | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q21 | GRANTと権限の再付与 | practice | applied | ア/A | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q22 | IoTのペネトレーションテスト | practice | basic | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-SPRING-Q23 | ソフトウェアの著作権管理 | practice | basic | ウ/C | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| SC-2023-FALL-Q01 | OSコマンドインジェクション | practice | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q02 | TLS 1.3の暗号スイート | practice | standard | ア/A | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q03 | VAによる証明書の有効性確認 | practice | basic | ウ/C | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q07 | MITB対策のトランザクション署名 | practice | basic | ウ/C | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q08 | SAMLの認証情報連携 | practice | basic | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q10 | NOTICEのIoT調査と注意喚起 | practice | basic | イ/B | 7 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q12 | SCAPによる脆弱性管理自動化 | mock2 #11 | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q13 | DNSSECの署名と検証 | practice | standard | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q15 | SSHによる安全な遠隔ログイン | practice | basic | エ/D | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q16 | メール受信通信の暗号化 | practice | basic | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q17 | DB配置変更に伴うFWルール | practice | applied | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q18 | IPv4サブネットマスクの算出 | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q19 | マルチキャスト用IPアドレス | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q20 | DHCP取得IPの重複検査 | practice | basic | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q21 | DBのデータディクショナリ | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q22 | カオスエンジニアリング | practice | basic | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q23 | スクラムの特徴 | practice | basic | ウ/C | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q24 | SMSの内部監査 | practice | basic | ウ/C | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2023-FALL-Q25 | 特権IDによるDB直接修正の監査 | practice | standard | ア/A | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q02 | MACと第三者への証明の限界 | practice | standard | ア/A | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q04 | SAMLの標準化と用途 | practice | basic | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q06 | X.509 CRLの扱い | practice | standard | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q07 | ISMAP-LIUの低リスク対象 | practice | basic | ウ/C | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q08 | SIM3の成熟度評価 | practice | basic | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q09 | CWEの脆弱性タイプ | practice | basic | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q10 | FIPS 140-3の規定対象 | practice | basic | ア/A | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q11 | CASBによるクラウド制御 | practice | basic | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q12 | Enhanced OpenとOWE | practice | basic | エ/D | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q13 | HSTSの動作 | practice | standard | エ/D | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q14 | 802.1Xのサプリカント | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q15 | DNS CAAによる証明書発行制限 | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q16 | PGP・S/MIME・TLSの鍵の単位 | practice | standard | ア/A | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q17 | SBOMによる構成部品把握 | practice | basic | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q18 | TCPヘッダの情報 | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q19 | メールのサブミッションポート | practice | basic | エ/D | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q20 | HTTP no-storeとキャッシュ | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q21 | SQLの条件式と抽出 | practice | applied | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q22 | ウォークスルーレビュー | practice | standard | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q23 | 形式手法の検証 | practice | standard | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q24 | 逓減課金のグラフ | practice | applied | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-SPRING-Q25 | 令和5年基準のIT全般統制 | practice | standard | ウ/C | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| SC-2024-FALL-Q01 | AAAの三つの機能 | practice | basic | ア/A | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q02 | 画像認識への敵対的入力 | mock2 #2 | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q03 | MITRE ATT&CKの用途 | mock2 #3 | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q04 | NTPリフレクション攻撃 | practice | basic | エ/D | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q06 | Smurf攻撃 | mock1 #3 | basic | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q07 | FIDO認証器内の生体情報 | practice | standard | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q08 | SSOの利点と影響 | practice | standard | エ/D | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q09 | 量子暗号の性質 | practice | standard | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q10 | DMARCの送信者ポリシー | practice | basic | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q11 | SOARによる対応自動化 | practice | basic | ア/A | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q12 | WAFの偽陽性 | practice | basic | ア/A | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q13 | アノマリ型IPS | mock1 #11 | standard | エ/D | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q14 | クリックジャッキング対策 | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q15 | DTLSによるUDP通信保護 | practice | standard | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q16 | OAuthのリソース認可の流れ | practice | standard | ア/A | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q17 | 802.1XとRADIUSの役割 | practice | basic | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q18 | IPのカプセル化とGRE | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q19 | ICMPのメッセージ用途 | mock1 #21 | standard | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q20 | 光学TAPによる通信監視 | mock2 #20 | standard | ア/A | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q21 | 関係モデルの外部キー | practice | basic | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q22 | GoFデザインパターン | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q23 | XPのテスト駆動開発 | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q24 | SMSの継続的改善 | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2024-FALL-Q25 | アクセス管理の業務処理統制 | mock2 #25 | standard | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q01 | DRDoS攻撃 | practice | basic | ウ/C | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q02 | SAMLによるSSOの特徴 | practice | standard | ア/A | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q03 | SHA-512/256の構成 | practice | standard | ウ/C | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q04 | DNSキャッシュ汚染の防止 | practice | basic | エ/D | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q05 | 暗号資産の不正マイニング | practice | basic | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q06 | デジタル証明書の役割 | practice | basic | イ/B | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q07 | MiraiとIoT機器への感染 | practice | basic | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q08 | コネクトバック通信 | practice | basic | ウ/C | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q09 | CPSの証明書運用規程 | practice | basic | ウ/C | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q10 | JIS Q 27000:2019のリスク用語 | practice | standard | エ/D | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q11 | ISMAPの評価制度 | practice | basic | ウ/C | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q12 | CSF 2.0のGovern機能 | practice | basic | ウ/C | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q13 | 侵害の痕跡IoC | practice | basic | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q14 | タイミング攻撃を抑える実装 | practice | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q15 | 電源断前の証拠保全 | mock1 #12 | standard | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q16 | OAuth 2.0の認可 | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q17 | OP25Bの目的 | practice | basic | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q18 | ルータの衝突・ブロードキャスト分離 | practice | standard | ア/A | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q19 | STPの機能 | practice | basic | エ/D | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q20 | HTTP GETとPOSTのデータ位置 | practice | basic | イ/B | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q21 | 相関副問合せとNOT EXISTS | practice | applied | ウ/C | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q22 | SonarQubeの静的解析 | practice | basic | エ/D | 13 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q23 | KPTのふりかえり | practice | basic | イ/B | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q24 | サービス時間内停止の可用性 | practice | applied | ウ/C | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-SPRING-Q25 | IT統制目標の網羅性 | practice | standard | エ/D | 14 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| SC-2025-FALL-Q01 | CRYPTREC暗号リストの構成 | practice | basic | ウ/C | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q02 | Pass the Hash攻撃 | mock1 #4 | basic | イ/B | 3 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q03 | 耐量子計算機暗号 | practice | basic | エ/D | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q04 | RAによる証明書申請の確認 | practice | basic | エ/D | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q05 | AIモデルインバージョン攻撃 | practice | basic | ア/A | 4 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q06 | XML署名と対象範囲 | mock2 #8 | standard | イ/B | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q07 | SYN/ACK観測によるDoS推定 | mock2 #4 | basic | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q08 | ドメインフロンティングの悪用 | practice | basic | ア/A | 5 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q09 | 情報理論的安全性とワンタイムパッド | practice | standard | エ/D | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q10 | 認証デバイスと生体情報 | practice | standard | イ/B | 6 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q11 | Identity Proofingの本人確認 | practice | basic | ア/A | 6 | usable_with_note | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q12 | MITREとCVE・ATT&CK | practice | basic | ア/A | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q13 | PSIRTの製品脆弱性対応 | practice | basic | イ/B | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q14 | UEBAによる異常検知 | practice | basic | エ/D | 7 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q15 | CSPMによるクラウド設定監視 | practice | basic | イ/B | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q16 | CSRF対策の有効性 | practice | basic | エ/D | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q17 | 802.1Xのポート認証 | practice | basic | ア/A | 8 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q18 | Ajaxの非同期通信 | mock2 #21 | basic | ア/A | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q19 | OSPFとRIPの違い | practice | basic | イ/B | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q20 | HTTPのステータスコード | practice | basic | ウ/C | 9 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q21 | コミットとログ永続化 | mock1 #22 | standard | エ/D | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q22 | 階層構造と結合テストの順序 | practice | applied | イ/B | 10 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q23 | 開発請負と著作権の帰属 | practice | basic | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q24 | 計画停止を除外したサービス可用性 | practice | applied | ウ/C | 11 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| SC-2025-FALL-Q25 | 令和5年監査基準のリスク評価 | practice | standard | エ/D | 12 | current | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答p1](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |


## 10. 教材投入可否

**その前に、source_id・内容hash・dataset_version・公式出典・図表表示/PWAキャッシュの基盤対応が必要。**

240問の採用監査は完了。この一覧で教材化する選定上の準備は整っており、基盤対応後は30問の教材試作へ進める。最小構造変更・fingerprint比較・実装順は[教材実装準備](sc-a2-content-implementation-readiness.md)へ記載した。

## 11. 参照資料と取得限界

公式過去問PDFは実施回の表に示す。制度・規格の現行性確認には以下の一次資料を用いた。取得失敗や要約だけの照合はその限界を明記する。

- [IPA 公式過去問題一覧](https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html)（一次資料参照）
- [IPA 2020年度（春期中止・10月試験）](https://www.ipa.go.jp/shiken/mondai-kaiotu/2020r02.html)（一次資料参照）
- [IPA SC 科目A-2シラバス追補版 Ver.4.0](https://www.ipa.go.jp/shiken/syllabus/nq6ept00000014hj-att/syllabus_sc_am2_tsuiho4_0.pdf)（一次資料参照）
- [NIST FIPS 140-3への移行](https://csrc.nist.gov/Projects/FIPS-140-3-Transition-Effort)（一次資料参照）
- [NIST CSF 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20)（一次資料参照）
- [FIRST CVSS v4.0仕様](https://www.first.org/cvss/v4.0/specification-document)（一次資料参照）
- [IETF RFC 8996 TLS 1.0/1.1の非推奨化](https://www.rfc-editor.org/info/rfc8996/)（一次資料参照）
- [CRYPTREC 暗号リスト](https://www.cryptrec.go.jp/list.html)（一次資料参照）
- [METI サイバーセキュリティ経営ガイドライン Ver.3.0](https://www.meti.go.jp/policy/netsecurity/mng_guide.html)（一次資料参照）
- [METI システム監査基準（令和5年）](https://www.meti.go.jp/policy/netsecurity/sys-kansa/sys-kansa-2023r.pdf)（PDF全文はHTTP 403で未取得。読了扱いにしない）
- [IPA 監査基準の改訂への対応（2024春から）](https://www.ipa.go.jp/shiken/syllabus/henkou/2023/20230710.html)（一次資料参照）
- [METI 調査報告 JIS Q 27001/27002改訂](https://www.meti.go.jp/meti_lib/report/2024FY/1000028.pdf)（一次資料参照）
- [JSA JIS Q 27000:2019（有効）](https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+Q+27000%3A2019)（一次資料参照）
- [ISASecure CSA・旧EDSAの評価制度](https://isasecure.org/certification/iec-62443-csa-certification)（一次資料参照）
- [NIST SP 800-63-3（SP 800-63-4に置換）](https://pages.nist.gov/800-63-3/)（一次資料参照）
- [NICT 2024年度からのNOTICE](https://www.nict.go.jp/press/2024/03/29-2.html)（一次資料参照）
- [デジタル庁 ISMAP-LIU](https://www.digital.go.jp/policies/security/ismap-liu)（一次資料参照）
- [e-Gov 著作権法（10・15・17・21・47の3・113条本文照合）](https://laws.e-gov.go.jp/law/345AC0000000048)（一次資料の本文確認）
- [JSA JIS Q 20000-1:2020追補1:2025](https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+Q+20000-1%3A2020%2FAMENDMENT+1%3A2025)（一次資料参照）
- [FIRST CVSS v3.0仕様](https://www.first.org/cvss/v3.0/specification-document)（一次資料の本文確認）
- [NIST SP 800-63A-4 本人確認 §2.5](https://pages.nist.gov/800-63-4/sp800-63a.html)（一次資料の本文確認）
- [e-Gov 著作権法公式API XML](https://laws.e-gov.go.jp/api/1/lawdata/345AC0000000048)（一次資料の本文確認）
- [NIST SP 800-145 PaaS定義](https://csrc.nist.gov/glossary/term/platform_as_a_service)（一次資料の本文確認）
- [IETF RFC 6797 HSTS](https://www.rfc-editor.org/rfc/rfc6797.html)（一次資料の本文確認）
- [EMVCo EMV 3DS Challenge Flow](https://www.emvco.com/dynamic/emv-3-d-secure-whitepaper-v2/challenge-flow/)（一次資料の本文確認）
- [ISO/IEC 27014:2020 ガバナンス](https://www.iso.org/standard/74046.html)（公式要約のみ確認。規範全文は未確認）
- [ISO SC27用語集（是正処置・リスク等）](https://committee.iso.org/files/live/sites/jtc1sc27/files/resources/CD%206%20-%20Glossary%2020250902.pdf)（一次資料の本文確認）
- [METI 経営ガイドライン3原則・重要10項目](https://www.meti.go.jp/policy/netsecurity/mng_guide.html?trflg=1)（公式検索索引で確認。PDF全文はHTTP 403で未取得）
- [IPA 経営ガイドラインVer.3.0実践資料](https://www.ipa.go.jp/security/economics/csm-practice.html)（一次資料の本文確認）
- [NICT 新NOTICE調査範囲](https://nco.nict.go.jp/)（一次資料の本文確認）
- [MITRE CVE事務局の現行案内](https://mitre.github.io/mitre-cve-roles/)（一次資料の本文確認）
- [ISO/IEC 25010:2023品質モデル](https://committee.iso.org/standard/78176.html)（一次資料の本文確認）
- [ISMAP管理基準の基礎](https://www.ismap.go.jp/csm/sys_attachment.do?sys_id=bd7e3e2ac3755250076ededb050131ee)（公式資料の検索索引で確認）
- [ISO サービス管理と継続的改善](https://www.iso.org/news/ref2696.html)（一次資料の本文確認）

## 12. 検証

node scripts/validate-sc-a2-audit.mjsで425問・17回・24件解消・240/190/25/25・群整合・freshness採用条件・出典・元29件の表示分類・模試分布・本番参照なしを検査する。必須コマンドの実行結果は完了報告に記載する。

2026-10-07の実行結果:

| 検査 | 結果 |
| --- | --- |
| node scripts/validate-sc-a2-audit.mjs | PASS。最終採用・監査メタデータの整合性 |
| python scripts/validate_questions.py | PASS。既存A-1の240問。バンドルPythonで実行 |
| npm run lint | PASS |
| npm run test | 再実行で40ファイル・210件すべてPASS |
| npm run build | PASS。既存の大きいbundleに関する警告あり |
| npm run test:e2e | 20件すべてPASS。既存A-2模試とオフライン動線を含む |

初回ユニットテストはB-1同期のリセット関連2件が5秒のタイムアウトで失敗。単独10件と全体210件の再実行で通過し、同期コードやテスト条件は変更していない。

アプリ検査は既存教材での検査であり、未転記のSC採用240問の表示検査ではない。図表対応後の実機表示と30問転記校閲は次フェーズで必要。
