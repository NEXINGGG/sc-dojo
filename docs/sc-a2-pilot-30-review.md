# SC A-2 30問教材試作レビュー

レビュー日：2026-10-07。教材：[sc-a2-pilot-30.json](../data/sc-a2-pilot-30.json)。dataset_version：`sc-a2-pilot-v1`。

## 判定

**A：この形式・品質で残り210問へ展開してよい。** 全30問で原本との二次比較と公式解答照合を行い、四択全ての理由・見分け方・記憶ポイントを揃えた。図表7問を含む実画面で教材構造を確認した。この判定は教材作成方式への判定であり、本番240問への投入や残り210問の作成は実施していない。

## 1. 選んだ30問と出典

採用監査のselected 240問だけを候補とした。全10カテゴリ・全9年度・基礎/標準/応用を含め、各カテゴリの240問比率の期待値から1問以内に収めた。全問current。duplicate_group・similar_groupの重複はともに0。current以外の採用は0件。2024・2025年は新しい技術を確保するため計11問（36.7%）とし、最多年度でも6問（20%）に抑えた。

共通の編集状況メモを除き、監査の個別注記を持つ4問を採用した。理由と対応は以下のとおり。

| source_id | 監査の注記 | 試作への採用理由・対応 |
| --- | --- | --- |
| SC-2018-FALL-Q18 | 過去の方式・攻撃例を現行推奨と分けて説明 | TCP接続確立の原理は現行でも成立し、矢印付き画像の検証に適する。推奨設定を扱う問題として説明しない |
| SC-2021-SPRING-Q15 | 監査240問では定義/比較と類題を複数採用 | 今回は同じsimilar_groupから1問だけ。HSTSと他機能の役割差を学び、初回HTTPの注意を解説に補足 |
| SC-2022-SPRING-Q01 | 攻撃定義とログ解析の類題を複数採用 | 今回はログ解析側だけ採用し、URLデコードと実行先を判定する工程、code/log表示を検証 |
| SC-2024-FALL-Q24 | JIS Q 20000-1:2020と2025年追補 | 原問の2020年版の継続的改善の定義を保持。管理用語の比較とサービス管理カテゴリを検証し、追補の存在を現行注意として記録 |

追補1が2025年に発行され、本体と併せて2025年版となる点は [日本規格協会](https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+Q+20000-1%3A2020%2FAMENDMENT+1%3A2025) と [ISMS-ACの発行案内](https://isms.jp/topics/news/20250820_2.html) で確認した。

以下の「題材」は編集用の要約。問題本文・四択はIPA公式問題PDFから転記した。第三者サイトは転記元に使用していない。試作用codeは全問 `A2-PILOT-<source_id>`、数値idは3001～3030。正式A2コードは未割当。

| # | source_id | 年度・期・問番号 | 題材 | カテゴリ | 難易度 | 公式正解 | 表示形式 | IPA原本 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SC-2017-SPRING-Q05 | 2017 春期 問5 | セッション固定化 | 情報セキュリティ・脅威・攻撃 | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| 2 | SC-2017-SPRING-Q08 | 2017 春期 問8 | クラウドのOS管理 | セキュリティ実装技術 | 基礎 | イ/B | table | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| 3 | SC-2017-SPRING-Q13 | 2017 春期 問13 | 偽陰性 | セキュリティ技術評価・対策 | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fzx1-att/2017h29h_sc_am2_ans.pdf) |
| 4 | SC-2018-SPRING-Q07 | 2018 春期 問7 | 署名を生成する鍵 | 暗号・認証・PKI | 標準 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000fabr-att/2018h30h_sc_am2_ans.pdf) |
| 5 | SC-2018-FALL-Q18 | 2018 秋期 問18 | TCP接続確立 | ネットワーク | 応用 | ア/A | image | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| 6 | SC-2018-FALL-Q25 | 2018 秋期 問25 | 保証業務の三当事者 | システム監査・内部統制 | 基礎 | ウ/C | table | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000f01f-att/2018h30a_sc_am2_ans.pdf) |
| 7 | SC-2019-SPRING-Q22 | 2019 春期 問22 | ファジング | システム開発・セキュア開発 | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_sc_am2_ans.pdf) |
| 8 | SC-2019-FALL-Q02 | 2019 秋期 問2 | 電磁波のサイドチャネル | 情報セキュリティ・脅威・攻撃 | 基礎 | イ/B | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| 9 | SC-2019-FALL-Q21 | 2019 秋期 問21 | JSONの格納方式 | データベース | 基礎 | ウ/C | code | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000dict-att/2019r01a_sc_am2_ans.pdf) |
| 10 | SC-2020-OCTOBER-Q13 | 2020 10月試験 問13 | フォレンジックス | セキュリティ技術評価・対策 | 基礎 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| 11 | SC-2020-OCTOBER-Q19 | 2020 10月試験 問19 | RADIUS | ネットワーク | 基礎 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d05l-att/2020r02o_sc_am2_ans.pdf) |
| 12 | SC-2021-SPRING-Q02 | 2021 春期 問2 | OCSP | 暗号・認証・PKI | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| 13 | SC-2021-SPRING-Q15 | 2021 春期 問15 | HSTS | セキュリティ実装技術 | 基礎 | ア/A | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_am2_ans.pdf) |
| 14 | SC-2022-SPRING-Q01 | 2022 春期 問1 | HTTPログの攻撃判別 | 情報セキュリティ・脅威・攻撃 | 応用 | イ/B | code | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_am2_ans.pdf) |
| 15 | SC-2022-FALL-Q15 | 2022 秋期 問15 | SPF | セキュリティ実装技術 | 標準 | ア/A | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| 16 | SC-2022-FALL-Q20 | 2022 秋期 問20 | VRRP | ネットワーク | 基礎 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_am2_ans.pdf) |
| 17 | SC-2023-SPRING-Q12 | 2023 春期 問12 | インライン・シグネチャIPS | セキュリティ技術評価・対策 | 標準 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_am2_ans.pdf) |
| 18 | SC-2023-FALL-Q02 | 2023 秋期 問2 | TLS 1.3 | セキュリティ実装技術 | 標準 | ア/A | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| 19 | SC-2023-FALL-Q23 | 2023 秋期 問23 | スクラム | 開発管理・サービスマネジメント | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_am2_ans.pdf) |
| 20 | SC-2024-SPRING-Q02 | 2024 春期 問2 | MACと第三者検証 | 暗号・認証・PKI | 標準 | ア/A | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| 21 | SC-2024-SPRING-Q17 | 2024 春期 問17 | SBOM | セキュリティ技術評価・対策 | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| 22 | SC-2024-SPRING-Q20 | 2024 春期 問20 | no-store | ネットワーク | 基礎 | イ/B | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| 23 | SC-2024-SPRING-Q21 | 2024 春期 問21 | SQLのAND/OR | データベース | 応用 | エ/D | code/table | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_am2_ans.pdf) |
| 24 | SC-2024-FALL-Q14 | 2024 秋期 問14 | クリックジャッキング | セキュリティ実装技術 | 基礎 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| 25 | SC-2024-FALL-Q24 | 2024 秋期 問24 | SMSの継続的改善 | 開発管理・サービスマネジメント | 基礎 | エ/D | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_am2_ans.pdf) |
| 26 | SC-2025-SPRING-Q03 | 2025 春期 問3 | SHA-512/256 | 暗号・認証・PKI | 標準 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| 27 | SC-2025-SPRING-Q12 | 2025 春期 問12 | CSF 2.0 GOVERN | 情報セキュリティ管理・リスク | 基礎 | ウ/C | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| 28 | SC-2025-SPRING-Q14 | 2025 春期 問14 | タイミング攻撃対策 | セキュリティ実装技術 | 基礎 | ア/A | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_am2_ans.pdf) |
| 29 | SC-2025-FALL-Q02 | 2025 秋期 問2 | Pass the Hash | 情報セキュリティ・脅威・攻撃 | 基礎 | イ/B | text | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |
| 30 | SC-2025-FALL-Q22 | 2025 秋期 問22 | トップダウン結合テスト | システム開発・セキュア開発 | 応用 | イ/B | image | [問題](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_qs.pdf) / [解答](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_am2_ans.pdf) |

## 2. カテゴリ分布

| カテゴリ | selected 240問 | 240問の比率 | 30問の期待値 | pilot | pilot比率 |
| --- | --- | --- | --- | --- | --- |
| 情報セキュリティ・脅威・攻撃 | 33 | 13.8% | 4.12 | 4 | 13.3% |
| 暗号・認証・PKI | 35 | 14.6% | 4.38 | 4 | 13.3% |
| 情報セキュリティ管理・リスク | 10 | 4.2% | 1.25 | 1 | 3.3% |
| セキュリティ技術評価・対策 | 31 | 12.9% | 3.88 | 4 | 13.3% |
| セキュリティ実装技術 | 46 | 19.2% | 5.75 | 6 | 20.0% |
| ネットワーク | 36 | 15.0% | 4.50 | 4 | 13.3% |
| データベース | 14 | 5.8% | 1.75 | 2 | 6.7% |
| システム開発・セキュア開発 | 14 | 5.8% | 1.75 | 2 | 6.7% |
| 開発管理・サービスマネジメント | 12 | 5.0% | 1.50 | 2 | 6.7% |
| システム監査・内部統制 | 9 | 3.8% | 1.12 | 1 | 3.3% |

## 3. 年度・期分布

| 年度 | 春期 | 秋期 | 10月試験 | 計 |
| --- | --- | --- | --- | --- |
| 2017 | 3 | 0 | 0 | 3 |
| 2018 | 1 | 2 | 0 | 3 |
| 2019 | 1 | 2 | 0 | 3 |
| 2020 | 0 | 0 | 2 | 2 |
| 2021 | 2 | 0 | 0 | 2 |
| 2022 | 1 | 2 | 0 | 3 |
| 2023 | 1 | 2 | 0 | 3 |
| 2024 | 4 | 2 | 0 | 6 |
| 2025 | 3 | 2 | 0 | 5 |

## 4. 難易度分布

難易度は監査時の推定を維持した（IPAによる難易度表示ではない）。

| 難易度 | selected 240問 | pilot | pilot比率 |
| --- | --- | --- | --- |
| 基礎 | 157 | 20 | 66.7% |
| 標準 | 57 | 6 | 20.0% |
| 応用 | 26 | 4 | 13.3% |

## 5. 図表問題と再構成

stimulus付きは7問。table 3問、code/log 3問、image 2問（SQLはtableとcodeの両方）。画像は原本スクリーンショットを貼らず、出題に必要な情報をSVGで描き直した。コード・ログは実行せず文字列として表示する。

| source_id | 形式 | 保持・確認した情報 |
| --- | --- | --- |
| SC-2017-SPRING-Q08 | 選択肢table×4 | IaaS/PaaS/SaaSの列順と各選択肢の実施可/不可 |
| SC-2018-FALL-Q18 | 選択肢image×4 | 要求元/先、矢印の方向・本数・順序、SYN/ACK/SYN＋ACK |
| SC-2018-FALL-Q25 | table | 三当事者の列見出し、A～Dの全12セル |
| SC-2019-FALL-Q21 | code（JSON）×2 | _id・関連商品 id・画像 URLなどのキー、値、配列、数値と文字列の差 |
| SC-2022-SPRING-Q01 | code（HTTPログ） | URL、%20、;cat、/etc/passwd、HTTPヘッダ全8行 |
| SC-2024-SPRING-Q21 | table＋code（SQL） | 人事表の5行×4列、条件の括弧、>、OR、AND、所属名 |
| SC-2025-FALL-Q22 | image | 4層の名称と上下順序 |

画像は [public/questions/sc/a2/](../public/questions/sc/a2/) の `SC-2018-FALL-Q18-A.svg`～`-D.svg` と `SC-2025-FALL-Q22.svg`（計5ファイル）。全画像に等価なaltを用意し、正解だけを目立たせる色や装飾は使わない。白い図面上の濃い文字・線で明暗両モードでも読める。

原本の改行・組版上の英数字周囲の空白・ルビは画面用に整理した。表のア/イ/ウ/エはA/B/C/Dへ対応させた。選択肢が図だけの場合は中立な見出し「組合せ」「通信手順の図」を追加した。JSON文字列内の空白、ログの命令、SQLの条件、表の値、矢印は保持した。図表再構成の7問は `verbatim_past_question: false` とし、文章を直訳転記した23問はtrue。falseは新作問題を意味しない。

## 6. 解説品質チェック

全30問について、設問の焦点→正しい理由→技術の背景/似た概念との差を確認した。主解説は103～163文字、memory_pointは27～62文字で1～2文、exam_tipは29～52文字。関連用語は2～5件。四択解説120件を揃え、誤答の理由を各選択肢に即して説明した。正解の文字だけを暗記する指示は使わない。「重要です」の連呼や共通の長い前置きは0件。

| 全問チェック項目 | 結果 |
| --- | --- |
| 何を問うか・正解理由・背景/概念差 | 30/30確認 |
| A/B/C/Dの理由 | 120/120確認 |
| memory_point（再利用できる知識） | 30/30確認 |
| exam_tip（類題の判断方法） | 30/30確認 |
| related_terms 0～5、重複なし | 30/30確認 |
| 試験当時の正解と現在の注意を混同しない | 下記の補足を確認 |

特に解説の誤解を防ぐため、次の点を一次資料で再確認した。正解の選択肢は改変せず、短い補足を教材解説に置いた。

| 問題 | 補足・確認内容 | 一次資料 |
| --- | --- | --- |
| 2017春Q08 | ゲストOSの管理範囲と、自作アプリの管理範囲を分ける | [NIST SP 800-145](https://csrc.nist.gov/pubs/sp/800/145/final) |
| 2021春Q02 | OCSPは証明書の状態照会。CRL配布や期限・署名検証とは別 | [RFC 6960](https://www.rfc-editor.org/rfc/rfc6960.html) |
| 2021春Q15 | 公式正解Aを保持。HSTSは安全な応答による学習/preloadが前提で、未登録の初回HTTPまで必ず保護するわけではない | [RFC 6797 §8.1](https://www.rfc-editor.org/rfc/rfc6797.html#section-8.1) |
| 2022秋Q15 | 「SPFレコード」は現行ではDNS TXTで公開。DKIMとの役割差 | [RFC 7208 §3.1](https://www.rfc-editor.org/rfc/rfc7208.html#section-3.1) |
| 2023秋Q02 | TLS 1.3はAEAD＋HKDF用hash。鍵交換/署名方式は別 | [RFC 8446 Appendix B.4](https://www.rfc-editor.org/rfc/rfc8446.html#appendix-B.4) |
| 2023秋Q23 | 現在のScrum Guideでは3つのaccountabilitiesを定義 | [Scrum Guide](https://scrumguides.org/scrum-guide.html#scrum-team) |
| 2024春Q20 | no-storeは保存禁止、no-cacheは再利用前の検証 | [RFC 9111 §5.2.2](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2) |
| 2024秋Q14 | 埋込みを制限するCSP frame-ancestorsも補足 | [W3C CSP](https://www.w3.org/TR/CSP3/#directive-frame-ancestors) |
| 2025春Q03 | SHA-512/256は専用の初期値を使う。通常のSHA-512の単純な半分とは異なる | [FIPS 180-4 §5.3.6/§6.7](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf) |
| 2025春Q12 | GOVERNが他の五機能へ方向を与える | [NIST CSF 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) |
| 2025秋Q02 | 代表例はNTLM応答生成へのハッシュ利用。任意のWebログイン欄へ入れれば通るという意味ではない | [Microsoftの資格情報保護資料](https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/credentials-protection-and-management) |

2019秋Q21では関係DBにもJSON対応があることを補足し、DBの名前だけでなく「各項目を個別の固定列にする」という選択肢の条件で判定する説明とした。2019秋Q02と2025春Q14は監査上のsimilar_groupが異なり、観測する情報の定義と対策の対応をそれぞれ検証するため採用した。

## 7. 原本二次校閲

初回転記後、完成したJSONを別の読み取りで見直し、IPA公式PDFの該当ページ画像へ戻って全30問を再比較した。本文・四択・図表はPDFがアウトライン化されていて文字抽出できないため、画像を目視して確認した。解答は公式解答PDFの表を目視し、さらにPDFから独立に抽出した25問の解答表から対象番号を照合した。問題・解答の表紙でSC/午前II・年度・期を確認した。

15実施回の問題/解答PDF計30ファイルは、取得時のSHA-256が採用監査のsittings記録と全件一致。下表のPDFページは1始まり。source_id・年度・期・番号は同時に確認。これは自動validatorの結果だけで置き換えた校閲ではない。同じ作業者による再校閲であり、別の人間の校閲者による承認は未実施。

| source_id | 問題PDF p. | 本文 | A | B | C | D | 公式正解 | 図表 | 年度/期/番号 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-2017-SPRING-Q05 | 4 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2017-SPRING-Q08 | 6 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | ✓ | ✓ |
| SC-2017-SPRING-Q13 | 7 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2018-SPRING-Q07 | 5 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2018-FALL-Q18 | 11 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | ✓ | ✓ |
| SC-2018-FALL-Q25 | 14 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | ✓ | ✓ |
| SC-2019-SPRING-Q22 | 12 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2019-FALL-Q02 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | 対象なし | ✓ |
| SC-2019-FALL-Q21 | 12 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | ✓ | ✓ |
| SC-2020-OCTOBER-Q13 | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2020-OCTOBER-Q19 | 13 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2021-SPRING-Q02 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2021-SPRING-Q15 | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | 対象なし | ✓ |
| SC-2022-SPRING-Q01 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | ✓ | ✓ |
| SC-2022-FALL-Q15 | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | 対象なし | ✓ |
| SC-2022-FALL-Q20 | 10 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2023-SPRING-Q12 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2023-FALL-Q02 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | 対象なし | ✓ |
| SC-2023-FALL-Q23 | 13 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2024-SPRING-Q02 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | 対象なし | ✓ |
| SC-2024-SPRING-Q17 | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2024-SPRING-Q20 | 10 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | 対象なし | ✓ |
| SC-2024-SPRING-Q21 | 10 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | ✓ | ✓ |
| SC-2024-FALL-Q14 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2024-FALL-Q24 | 11 | ✓ | ✓ | ✓ | ✓ | ✓ | エ/D ✓ | 対象なし | ✓ |
| SC-2025-SPRING-Q03 | 4 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2025-SPRING-Q12 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | ウ/C ✓ | 対象なし | ✓ |
| SC-2025-SPRING-Q14 | 9 | ✓ | ✓ | ✓ | ✓ | ✓ | ア/A ✓ | 対象なし | ✓ |
| SC-2025-FALL-Q02 | 3 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | 対象なし | ✓ |
| SC-2025-FALL-Q22 | 10 | ✓ | ✓ | ✓ | ✓ | ✓ | イ/B ✓ | ✓ | ✓ |

二次校閲で2019秋Q21のJSONキー `id`→`_id`、`関連商品id`→`関連商品 id`、`画像URL`→`画像 URL` と「47 型テレビ」の空白を修正した。修正後のコード表示も原本と再比較し、hashは生成ツールで再生成してcheck一致を確認した。本文の意味を変える修正や、公式正解の変更は0件。

## 8. UI・操作確認

`npm run dev:pilot` → `http://127.0.0.1:5175/` → ホームでA-2を選択。開発専用の帯を表示し、教材と履歴の取り違えを避ける。問題は「すべて・登録順」で30問を連続確認できる。通常起動/production buildは従来のA-2教材を使用する。

| 確認 | 結果 |
| --- | --- |
| 全30問の通常演習・回答・正誤 | 30問連続で回答、29正解/1誤答、結果表示 |
| 追加教材項目 | 全問で四択解説・exam_tip・memory_point・公式問題/解答リンクを確認 |
| 回答前の正解漏れ | 回答前に解説が存在せず、図表の全選択肢を中立表示 |
| table/code/log/image | 7問の全stimulus、画像の読込みとaltを確認 |
| 320px/390px、ライト/ダーク | 全30問、回答前/後でdocumentの横はみ出し0 |
| 長い表・コード | 内部の横スクロールを維持し、必要時に案内表示。選択肢の図表は幅を確保 |
| お気に入り・再読込み | 誤答1問を登録し、再読込み後も回答/登録状態が保持 |
| 学習履歴 | 回答1件を表示し、履歴から追加解説を開く |
| 間違い問題 | 1問抽出→正解して復習対象から除外 |
| 成績 | 学習済み30/30、カテゴリ別成績を表示 |
| 模試 | ランダム25問、先頭5問の四択表示、未回答25問で提出・採点・追加解説 |
| 保存先 | `sc-dojo-sc-a2-pilot-v1`が作成され、本番`sc-dojo`は作成されない |
| 画面エラー | pilot動線のpageerror 0件 |

画面キャプチャは `tmp/pilot/ui/` に保存し、図表7問・解説・成績・模試を目視確認した（作業用/公開対象外）。長い要素の撮影時だけ固定ナビを隠して全文を記録している。実際の操作確認では固定ナビ・回答ボタンを通常表示のまま使用した。

## 9. 自動検査と本番保護

| 検査 | 最終結果 |
| --- | --- |
| `python scripts/validate_questions.py` | 既存240問成功（同梱Pythonで実行） |
| `npm run validate:data` | A-1/A-2/B-1の既存教材検証成功 |
| `npm run validate:a2-pilot` | selected・出典・公式正解・教材項目・分類・図表・hash、全30問成功 |
| `npm run questions:hashes -- data/sc-a2-pilot-30.json --update` | 全30問を生成（JSON修正後も再生成） |
| `npm run questions:hashes -- data/sc-a2-pilot-30.json --check` | 全30問一致 |
| `npm run lint` / `npm run typecheck` | 成功 |
| `npm run test` | 46ファイル・257テスト全件成功（最終実行108秒） |
| `npm run build` | 成功、PWA/配布アセット検査も成功 |
| `npm run test:e2e` | 22テスト全件成功（最終実行1.4分）。pilot・既存教材・PWA・モバイル幅を含む |
| `git diff --check` | 成功 |

途中の検査では、E2Eの期待見出しが実際の「通常演習の結果」と違っていたためテストを修正した。検査中のソース編集ではPlaywright traceのファイル長不一致も発生したため、以後は実装を固定して再実行した。またunit/E2Eの同時実行では同期テストと図表fixtureのビルドが制限時間を超過した。検査対象の判定条件・制限時間を緩めず、重い検査を順番に実行して切り分けた。

buildは成功したが、既存の大きなJavaScript chunk（500kB超）の警告が残る。本番公開やデプロイは実施していない。

教材validatorはsource_id重複、selected所属、公式解答、四択とID、四択解説、memory_point、exam_tip、hash、画像alt/ローカルファイル/asset hash、出典、分類、教材版、年度分散、カテゴリ比率、duplicate/similar group、stimulus件数を検証する。hashは既存ツールで生成し、説明系の5項目がhash対象外であることもユニットテストで確認した。

本番保護はDEVと環境フラグの二重条件。`VITE_SC_A2_PILOT=1`でproduction buildを実行してもdist/assetsのJavaScriptに `A2-PILOT-SC-`/`sc-a2-pilot-v1` が含まれず、通常A-2カタログが240問のままであることを確認した。public下の中立なSVG図は通常の静的アセットとしてコピーされるが、試作問題JSON・試作コード・試作用DBの利用処理は本番教材へ接続されない。

`data/a2-questions.json`/`data/questions.json`/科目B教材、正式dataset_version、DBスキーマ、同期仕様、バックアップ形式は変更していない。主要ライブラリの追加も0件。

## 10. 残り210問へ展開する際の改善点・制約

1. 10～30問単位で作成し、公式PDF二次校閲と四択120理由の品質確認を作業単位に含める。JSON中のキー名や数値型、表の行/列、矢印を独立項目としてチェックする。
2. 公式問題の用語を保持し、現在の実装/規格との補足は解説へ置く。HSTSやSHA-512/256のように公式選択肢を過度に一般化しない。
3. 主解説は今回の100～170文字を目安とし、必要なら長くする。文字数を満たすための水増しは行わない。見分け方は答えの記号や固有値を覚える内容にしない。
4. 大きいネットワーク図・複数ページ表では今回より複雑な表示が必要になり得る。その問題を取り込む時点で拡大表示/図表位置などを検証する。今回の7問では並び順と内部スクロールで利用できた。
5. 本番投入は別工程。正式code割当、固定模試セット、旧履歴の扱いを決めてから行う。pilotはcategory_drillだけなので固定模試1/2は試作に含めない。
6. 実機iPhone Safari/PWAインストール、VoiceOver、初学者が説明を読んで理解できるかの人による試用は未実施。ブラウザーの320/390px確認を実機検証と混同しない。
7. pilot開発サーバーではService Workerを有効化していない。オフラインは既存production PWAと教材基盤の図表fixtureで検証した。pilot30問を端末へインストールしてオフライン利用する配布物は作成しない。

この30問で解説の任意フィールド、図表の保持、画面順序、保存先隔離を検証できたため、データ/UI設計の再検討を必要とする問題は残っていない。実機/人の試用は本番公開前の確認として残す。
