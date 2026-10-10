# SC A-1 v1 リリースレビュー

基準日：2026-10-08。最終判定 **A：SC A-1 v1として本番利用可能**。

実機iPhone Safariの確認は未実施。下記の教材・データ保護・ブラウザ自動検証による利用可否の判定と、実機確認の実施状況を分けて記録する。

## 1. 正式240問概要

SC科目A-1の初学者向け教材。独自問題225問、IPA高度試験・情報処理安全確保支援士共通午前Iの公式過去問15問。永続IDは1～240、codeはA1-001～A1-240。practice180問、mock1・mock2各30問。50分・30問の模試仕様を維持した。全240問にsource_id・content_hashを付与。

編集・転記は[候補JSON](../data/sc-a1-v1-candidate.json)で完了させ、全置換前ゲートの成功後だけ[本番JSON](../data/questions.json)へ反映。candidateは再現検証用に残す。

## 2. KEEP / FIX / REPLACE結果

| 判定 | 件数 | 内容hash | 旧履歴 |
| --- | --- | --- | --- |
| KEEP | 180 | 全180件不変 | 維持 |
| FIX：非内容 | 17 | 全17件不変 | 維持 |
| FIX：内容 | 26 | 全26件変更 | 旧問題として退避 |
| FIX：REPLACE相当 | 2 | 2件変更 | 旧問題として退避 |
| REPLACE | 15 | 15件変更・source_idも変更 | 旧問題として退避 |

監査判定・確定したcode/source_id・カテゴリ・assignment・sequenceは正本と全件一致。監査、draft、正式化計画、凍結legacy manifestを変更していない。今回の編集で正本の無断修正を要する矛盾は認めなかった。

## 3. FIX45問の変更結果

P1=30、P2=9、P3=6。次表の指定対象は全て旧JSONから変更済みで、[二次校閲記録](../data/sc-a1-v1-secondary-review.json)のfix_reviewsに完成フィールド値を保存。検証スクリプトが完成値と45件全てを照合する。解説の追加改善は同一性に影響しない。

| code | 優先度 | 区分 | 計画の修正対象 | 反映した内容 | 履歴 |
| --- | --- | --- | --- | --- | --- |
| A1-012 | P1 | 内容FIX | question | 非負の辺重みを条件に追加する。負辺を持つ場合まで適用できるとは説明しない。 | 分離 |
| A1-028 | P1 | 内容FIX | question | ミス時はキャッシュ確認時間に主記憶時間が追加され、並行アクセスしない前提を明示する。数値とBは維持。 | 分離 |
| A1-029 | P1 | 内容FIX | question・memory_point | DRAM/SRAMなど通常の主記憶用RAMを対象にし、NVRAMを含むRAM全般への断定を避ける。 | 分離 |
| A1-030 | P1 | 非内容FIX | explanation・memory_point | CPUが設定・開始・完了処理を担い、転送中のコピーをDMAが担うと補足する。 | 維持 |
| A1-031 | P1 | 非内容FIX | explanation | ディスク退避済みページの読込みを例とし、初回のゼロページ割当て等もあると限定する。 | 維持 |
| A1-044 | P1 | 非内容FIX | explanation・memory_point | メタデータ等の更新記録で整合性回復を支援する説明に限定し、全利用者データの永続化を保証しない。 | 維持 |
| A1-050 | P1 | 内容FIX | question・explanation・memory_point | 装置の正常・故障状態が独立という条件と、相関があれば積にできない旨を明示する。 | 分離 |
| A1-051 | P1 | 内容FIX | question・explanation・memory_point | 独立故障、切替え成功、共通原因故障なしを条件に加える。計算値Cは維持。 | 分離 |
| A1-062 | P1 | 非内容FIX | explanation・memory_point | 外部キーは主キー又は一意キーを参照し、複合列・自己参照もあり得ると入門的に補足する。 | 維持 |
| A1-064 | P1 | 内容FIX | question・explanation | 第1正規形の前提と全候補キーに対する非素属性の完全関数従属を補う。例は単一複合候補キーに限定可能。 | 分離 |
| A1-065 | P1 | 内容FIX | question・explanation・memory_point | 第2正規形を前提とした候補キーから非素属性への推移従属の例にする。全ての非キー属性間従属を禁止する表現を避ける。 | 分離 |
| A1-084 | P2 | 非内容FIX | explanation | 監視用途は維持。SNMPv1/v2cのコミュニティ方式とv3の認証・暗号化の差を短く補足し、旧版を推奨しない。 | 維持 |
| A1-086 | P1 | 内容FIX | question | 公開鍵暗号方式で機密性を確保する場合と明示する。受信者公開鍵のBは維持。 | 分離 |
| A1-088 | P1 | 非内容FIX | explanation・memory_point | 暗号学的ハッシュと真正な照合元を条件にし、攻撃者がデータと値を両方変更できる場合は署名・MAC等が必要と補足する。 | 維持 |
| A1-089 | P1 | 内容FIX | question・explanation | 登録済み所持端末の認証器が生成するOTP等を指定し、単に同じ端末に入力するだけでは要素が増えないと補足する。 | 分離 |
| A1-092 | P2 | 非内容FIX | explanation | HTML・属性・JavaScript等の出力文脈に応じたエスケープ又は安全なAPIを説明し、CSPは補助策とする。 | 維持 |
| A1-100 | P3 | 内容FIX | question | 各クラスの属性・操作及びクラス間の関連を表す図に表現を直す。 | 分離 |
| A1-110 | P1 | 内容FIX | question | 開始・終了を共有する二つの全経路で、追加依存関係・資源制約なしと明示する。 | 分離 |
| A1-125 | P1 | 内容FIX | question | 毎日0〜24時の30日間を分母とし、計画停止も含める等、対象サービス時間と除外条件を明示する。 | 分離 |
| A1-128 | P1 | REPLACE相当FIX | question・choices・explanation・memory_point | ITILのデプロイメント（承認済みソフトウェアや設定の本番環境への移送）を問う。正解Dをデプロイメント管理へ変更し，利用可能化を担うリリース管理と区別する。本文・四択・解説・記憶文を再監査する。 | 分離 |
| A1-151 | P1 | REPLACE相当FIX | question・choices・explanation | 重要業績評価指標と重要目標達成指標を区別し、KPIは目標へ至る活動・進捗の評価と明示する。KGIを妥当な誤答に加える。 | 分離 |
| A1-163 | P1 | 内容FIX | question | 自己資本は期間平均、又は期間中変化なしの1000万円と明示して期間利益と対応させる。 | 分離 |
| A1-168 | P3 | 非内容FIX | category | 企業活動・会計からシステム企画・調達に相当する経営・システム戦略へ分類する。 | 維持 |
| A1-174 | P1 | 内容FIX | question・explanation・memory_point | 日本の個人情報保護法の定義と明示し、生存する個人、容易照合、個人識別符号の法定要件を記す。 | 分離 |
| A1-176 | P3 | 非内容FIX | category・source | セキュリティ管理へ分類する。参考根拠にISO/IEC27001:2022とAmd1:2024の確認日を記す。年を問題本文に必須化する必要はない。 | 維持 |
| A1-177 | P2 | 内容FIX | question・choices・explanation・category | クラウドのシステム構成分野へ分類し、PaaSを含む四択でアプリ利用・OS管理と責任分界を区別する。 | 分離 |
| A1-178 | P3 | 非内容FIX | category | クラウド基盤をシステム構成分野へ分類する。IaaSの基本定義・Bは維持。 | 維持 |
| A1-179 | P3 | 非内容FIX | category | 基礎理論・AI/統計へ分類する。教師あり学習の定義・Cは維持。 | 維持 |
| A1-180 | P3 | 非内容FIX | category | 基礎理論・AI/統計へ分類する。過学習の説明・Dは維持。 | 維持 |
| A1-187 | P1 | 内容FIX | question・explanation | 社員番号が候補キー、部署番号が部署表のキーで部署名が一意に定まる等、他の従属なしの前提を明示する。 | 分離 |
| A1-189 | P1 | 非内容FIX | explanation | ACIDの抽象的隔離と、実製品の分離レベルを区別する。直列化可能性を全設定の実挙動と断定しない。 | 維持 |
| A1-190 | P1 | 非内容FIX | memory_point | 通常のブロードキャスト型IPv4サブネットの式と限定する。/31のポイントツーポイントと/32の例外を短く補足する。 | 維持 |
| A1-194 | P1 | 内容FIX | question・explanation・memory_point | 暗号学的ハッシュを使い、改ざんされない既知の値と照合する場合と明示する。ハッシュ単独の真正性を保証しない。 | 分離 |
| A1-195 | P2 | 内容FIX | choices | シェルを使う必要性の除去、直接実行API、許可リスト等の効果を区別する現実的な誤答に変更する。Aの論点は維持。 | 分離 |
| A1-200 | P1 | 内容FIX | question | 示した二経路が全開始終了経路であり、資源制約や他の依存関係なしと明示する。 | 分離 |
| A1-203 | P2 | 内容FIX | choices・difficulty | 定義識別は基礎へ再評定する。質問・観察・再実施・取引追跡など同じ監査技法領域の四択にする。 | 分離 |
| A1-209 | P2 | 内容FIX | choices・category | システム構成・クラウド資源管理へ分類し、監視・容量計画・割当て・廃棄等を比較する四択にする。 | 分離 |
| A1-214 | P1 | 非内容FIX | explanation | 退避ページ読込みを代表例に限定する。ページフォールトにはデマンドゼロ等があり、必ずディスクアクセスするとはしない。 | 維持 |
| A1-218 | P1 | 内容FIX | question・explanation・memory_point | メモリ上の更新と永続ストレージへの書込みを区別し、データページ永続化より先にログを永続化すると記す。REDO/UNDOはDB方式に依存。 | 分離 |
| A1-224 | P1 | 内容FIX | question・explanation | 端末内の秘密を使う認証器により所持を証明することを指定する。知識二つ・生体二つとの区別は維持。 | 分離 |
| A1-225 | P2 | 内容FIX | choices・explanation | 出力エスケープ、パラメータ化SQL等の別攻撃向け対策と区別させる。SameSiteはリクエスト・構成依存でトークンを常に代替しないと補足する。 | 分離 |
| A1-226 | P2 | 内容FIX | question・choices | 入力は整数1〜100と明示する。具体的な境界値セットを四択にして内点のみとの違いを測る。 | 分離 |
| A1-228 | P1 | 非内容FIX | explanation・memory_point | Reviewはインクリメントと環境変化を確認し次の適応を協議する機会、Retrospectiveは品質・効果を高める進め方の改善と補足する。 | 維持 |
| A1-238 | P2 | 内容FIX | choices・category | エッジ処理を技術系のシステム構成へ分類する。クラウドとの遅延・通信量・端末性能・モデル更新のトレードオフを問う四択にする。 | 分離 |
| A1-240 | P1 | 非内容FIX | explanation・memory_point・category | 技術的署名の目的ならテクノロジ系セキュリティへ分類する。公開鍵の本人対応と鍵管理の条件、電子署名法上の真正成立推定との違いを補う。 | 維持 |

A1-128はITIL 4の環境への移送とリリースを区別し、デプロイメント管理を問う四択に変更。A1-151は目標へ至る進捗・活動を測るKPIと最終目標のKGI等を区別する四択に変更。両問とも単なる文言更新として扱わず、内容hashの変更で旧履歴を分離。独自source_idは確定draftの起源IDを維持する。

## 4. REPLACE15問の結果

以下の問題以外へ差し替えていない。問題本文・選択肢・図表はIPA公式PDFを正本とし、A/B/C/Dは公式のア/イ/ウ/エに対応。全15問にexplanation、4件のchoice_explanations、exam_tip、memory_point、related_termsを作成。

| code | source_id | 公式原本 | 正解 | 割当 |
| --- | --- | --- | --- | --- |
| A1-007 | IPA-KOUDO-AM1-2024-SPRING-Q01 | [2024 春期 問1](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_koudo_am1_qs.pdf#page=4) | エ (D) | mock1 |
| A1-144 | IPA-KOUDO-AM1-2024-FALL-Q17 | [2024 秋期 問17](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=9) | イ (B) | mock2 |
| A1-181 | IPA-KOUDO-AM1-2024-SPRING-Q03 | [2024 春期 問3](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_koudo_am1_qs.pdf#page=5) | エ (D) | mock1 |
| A1-191 | IPA-KOUDO-AM1-2025-FALL-Q10 | [2025 秋期 問10](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_koudo_am1_qs.pdf#page=8) | ウ (C) | mock1 |
| A1-197 | IPA-KOUDO-AM1-2024-FALL-Q09 | [2024 秋期 問9](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=6) | エ (D) | mock1 |
| A1-198 | IPA-KOUDO-AM1-2024-FALL-Q25 | [2024 秋期 問25](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=14) | ア (A) | mock1 |
| A1-202 | IPA-KOUDO-AM1-2025-SPRING-Q20 | [2025 春期 問20](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_koudo_am1_qs.pdf#page=13) | イ (B) | mock1 |
| A1-205 | IPA-KOUDO-AM1-2025-FALL-Q25 | [2025 秋期 問25](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_koudo_am1_qs.pdf#page=14) | ウ (C) | mock1 |
| A1-207 | IPA-KOUDO-AM1-2024-FALL-Q27 | [2024 秋期 問27](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=14) | ウ (C) | mock1 |
| A1-210 | IPA-KOUDO-AM1-2024-FALL-Q13 | [2024 秋期 問13](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=8) | ア (A) | mock1 |
| A1-229 | IPA-KOUDO-AM1-2025-FALL-Q29 | [2025 秋期 問29](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_koudo_am1_qs.pdf#page=16) | イ (B) | mock2 |
| A1-232 | IPA-KOUDO-AM1-2025-FALL-Q08 | [2025 秋期 問8](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_koudo_am1_qs.pdf#page=7) | イ (B) | mock2 |
| A1-236 | IPA-KOUDO-AM1-2024-FALL-Q26 | [2024 秋期 問26](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_koudo_am1_qs.pdf#page=14) | ウ (C) | mock2 |
| A1-237 | IPA-KOUDO-AM1-2025-FALL-Q30 | [2025 秋期 問30](https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_koudo_am1_qs.pdf#page=16) | ア (A) | mock2 |
| A1-239 | IPA-KOUDO-AM1-2024-SPRING-Q07 | [2024 春期 問7](https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_koudo_am1_qs.pdf#page=7) | ウ (C) | mock2 |

必要図表はA1-181（二分木画像と再帰手順code）、A1-229（製造制約table）、A1-239（タイムチャート画像と四つの選択肢回路画像）。既存QuestionStimuliを共用し、画像6点をpublic/questions/sc/a1/v1へ配置。元PDFから切り出し、asset_sha256を既存hashツールで生成。初回閲覧前からオフラインで全6画像を取得できることをE2Eで確認。

## 5. source_id / code対応

[正式対応表](../data/sc-a1-source-code-map.json)は240件・FINALIZED。KEEP/FIX225問はSC-A1-ORIGINAL-xxx、指定公式15問はIPA-KOUDO-AM1-YYYY-SPRING/FALL-QNN。codeもsource_idも各240件一意で、他科目・未採用問題は混入していない。draftの監査判定・由来・source_id・割当は保持し、未確定だった43件の内容hashを計算結果で確定。

## 6. カテゴリ分布

17カテゴリ。計画で確定したuser_interface・information_mediaのみ大分類へ追加し、対応する下位分類を整備。既存分類のIDは維持。A-2/BのカテゴリJSONは不変。

| カテゴリ | 合計 | practice | mock1 | mock2 |
| --- | --- | --- | --- | --- |
| 基礎理論・数値表現 | 16 | 12 | 3 | 1 |
| アルゴリズム・データ構造 | 16 | 13 | 2 | 1 |
| コンピュータアーキテクチャ | 17 | 13 | 1 | 3 |
| OS・ミドルウェア | 13 | 12 | 0 | 1 |
| システム構成・信頼性 | 17 | 14 | 2 | 1 |
| データベース | 18 | 12 | 3 | 3 |
| ネットワーク | 18 | 13 | 3 | 2 |
| セキュリティ | 21 | 14 | 3 | 4 |
| システム開発・ソフトウェア工学 | 17 | 14 | 1 | 2 |
| プロジェクト管理 | 15 | 11 | 2 | 2 |
| ITサービス管理 | 15 | 11 | 2 | 2 |
| システム監査 | 15 | 12 | 2 | 1 |
| 経営・システム戦略 | 18 | 11 | 3 | 4 |
| 企業活動・会計 | 13 | 11 | 1 | 1 |
| 法務・標準・新技術 | 9 | 7 | 1 | 1 |
| ユーザーインタフェース | 1 | 0 | 0 | 1 |
| 情報メディア | 1 | 0 | 1 | 0 |

分野合計：テクノロジ155、マネジメント45、ストラテジ40。全件、計画の分布と一致。

## 7. practice / mock1 / mock2構成

| 割当 | 件数 | テクノロジ | マネジメント | ストラテジ |
| --- | --- | --- | --- | --- |
| practice | 180 | 117 | 34 | 29 |
| mock1 | 30 | 19 | 6 | 5 |
| mock2 | 30 | 19 | 5 | 6 |

出題順は正式mapのsequenceと一致。通常演習・未回答演習はpractice180問を対象にし、模試で回答した問題も誤答・お気に入りから復習できる。固定模試間の同一code/source_idは0件。旧監査A/B群の同値重複は置換後0組。C群の共通テーマ5組は、2NF/3NF、OSコマンド/CSRF、分岐/境界、CPI/SPI、復旧/サービス要求という異なる知識を測るため計画どおり維持。各模試だけで全中分類を網羅する設計ではなく、二つで全体を確認する構成。

## 8. mock難易度

| 割当 | 基礎 | 標準 | 応用（計画の難） |
| --- | --- | --- | --- |
| practice | 167 | 13 | 0 |
| mock1 | 12 | 17 | 1 |
| mock2 | 17 | 11 | 2 |

公式難度や実測正答率ではなく、初学者向けの編集推定。mock1は標準中心、mock2は基礎と制約・図表判断を組み合わせ、両模試とも3分野を含む。正解IDの分布はmock1 A/B/C/D=8/9/9/4、mock2=13/6/7/4。KEEPの選択肢IDを見栄えのために変更していない。選択肢の表示順は既存UIの挙動を維持し、今回シャッフル機能を追加していない。

## 9. 原本二次校閲結果

15問全て、初回転記後の別工程で公式PDFの該当ページを画像で読み直し、問題本文、四選択肢、正解、図表、年度、期、問番号、source_idを確認。公式解答4PDFの抽出結果とも独立したスクリプトで一致を確認。両原本8PDFのSHA-256が確定draftと一致。二次校閲記録の各問題hashは完成candidateと一致。

最終画面校閲でA1-239の画像選択肢へ補った回路名を削り、本文側の選択肢表示を原本のア・イ・ウ・エと回路図に揃えた。図を説明する代替テキストは保持。原本の該当ページを再確認し、既存ツールでhashを再生成した後、全ゲートを再実行した。

同じAIが工程を分けて実施した校閲であり、別の人間による独立校閲は未実施。内容FIX26問とREPLACE相当2問は全て独自問題で、照合対象の公式過去問原本はないためofficial_reviewをnot_applicable_original_questionとして記録した。技術・法律・標準の確認には一次資料を参照：

- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)：認証要素。
- [個人情報保護委員会・通則編](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)：個人情報の定義。
- [ISO/IEC 27001](https://www.iso.org/standard/27001)：2022版・2024追補の出典整備。
- [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html)：ログとデータページの永続化順。
- [Scrum Guide 2020](https://scrumguides.org/scrum-guide.html)：ReviewとRetrospective。
- [特許庁・新たな保護対象の意匠登録事例](https://www.jpo.go.jp/system/laws/rule/guideline/design/kaisei_hogo.html)：GUI/画像の意匠保護。

## 10. content_hash結果

既存question-content-v1をA-2と共用。本文、ID順の選択肢ID/文面、正解ID、回答用table/code/imageを対象とする。解説・記憶文・分類・出典URL等は対象外。update-question-content-hashes.mjsのupdateで240件生成し、checkで全240件一致。手入力なし。凍結legacy manifest比で197件不変、43件変更。画像byte hashも検証済み。

candidateのファイルSHA-256：`9656563c4a7c1496f262e17ae0dbdb167cce66ae9139b01cec3d1463fcdd8385`。

## 11. dataset_version / fingerprint

metadata.dataset_version=sc-a1-v1。実行時の新fingerprintはsha256:v1方式で、科目、dataset_version、code、source_id、content_hashを使用。旧教材からdataset_versionが変わるため教材全体fingerprintは変わるが、問題ごとの履歴移行はsource_id/content_hashで判定。KEEPと非内容FIXの履歴を捨てない。解説・memory_pointのみの変更でfingerprintは不変で、source_id変更で変わることを単体テストで確認。

## 12. 履歴保護結果

完成candidate全240問に旧進捗・お気に入り・回答を用意し、準備版manifestを持つ端末と準備版を経由しない端末の両方を検証。KEEP180+非内容FIX17=197問の問題別履歴・お気に入りを維持。内容FIX26+REPLACE相当2+REPLACE15=43問は旧manifestと旧レコードをa1DatasetArchivesへ退避し、新問題へ引き継がない。旧履歴を削除していない。

KEEP/非内容FIXだけの途中セッションは維持。変更問題との混在セッションは全体を退避するが、KEEP問題の問題別進捗・回答は維持。日別回答件数は197件へ整合。A-2の進捗・回答、A-2移行表、Bの設定・セッション・回答表、共通表示設定は不変。二度目の移行で全DB表が不変。ブラウザの実IndexedDBでも43件退避・197件維持・再読込み不変を確認。

## 13. A-2 / B回帰確認

作業開始時に保存した保護対象SHA-256との比較で、A-2教材・カテゴリ・正式map、全data/b1-*.json、A-1監査・draft・正式化計画・legacy manifestがbyte単位で一致。A-2の正式240問全回答、固定25問模試2組、旧教材分離、Bの90分模試・実践・トレーニング・PDFオフライン動線を既存E2Eで再検証。同期・バックアップ・ルーティングの仕様や教材本文を変更していない。既存単体テストも全実行。

既存B保護ゲートのA-1/category固定値は、専用A-1検証に成功した正式版と確定したカテゴリhashだけを許可する形へ更新。B教材の保護を緩めていない。

置換後の初回buildでB Phase 1に残っていた旧A-1固定hash判定が失敗した。A-2と同様に、正式A-1専用検証の成功を条件に受け入れる処理を追加して再検証した。旧A-1用固定hashとBの既存保護判定は保持。

## 14. テスト結果

| 検査 | candidate置換前 | 本番置換後 |
| --- | --- | --- |
| 同梱Python scripts/validate_questions.py（candidate / 本番） | 成功 | 成功 |
| validate-sc-a1-finalization.mjs + validate-sc-a1-release.mjs | 成功 | 成功 |
| update-question-content-hashes.mjs --check（全240問） | 成功 | 成功 |
| check-sc-a1-official-answers.py（公式解答4 PDF・両原本8 SHA-256） | 成功 | 成功 |
| a1ReleaseMigration.test.ts（完成240問・旧履歴・fingerprint） | 成功 | 成功 |
| npm run lint | 成功 | 成功 |
| npm run test（55ファイル・307テスト） | 成功 | 成功 |
| npm run build（教材・TypeScript・Vite・PWA・配信検査） | 成功 | 成功 |
| npm run test:e2e（26テスト） | 成功 | 成功 |

全置換前ゲート成功後にのみ本番JSONをcandidateと同一byte列で置換した。

candidateの実行用Vite pluginは環境変数SC_A1_CANDIDATE=1でのみ有効。通常実行は本番JSONを参照。初回はplugin優先順により旧JSONを読んだためA-1のE2E2件が失敗し、enforce=preと読込み対象の明示検査を追加して修正した。既存practiceテストの期待値も正式180問構成に整合させた。sandboxのlocalhost接続拒否によるpreviewタイムアウトは接続可能な実行環境で再実行した。解決前の結果を成功扱いにしていない。

candidate読込み後に見つかった旧模試順・旧カテゴリ構成・旧版manifestを前提とする単体テストのfixtureを修正。正式240問のIndexedDB照合後に始まる認証同期の起動待ちが1秒では不安定だったため、既存テストの期待呼出回数は維持して待ち時間を5秒へ変更し、全307件の再実行で成功した。同期処理・仕様は変更していない。公式A-1の出典が共通午前Iとして表示されない問題は既存QuestionExplanationを拡張して修正。E2Eで演習結果への非同期遷移と次画面移動が競合する箇所には結果画面の表示待ちを追加し、A-1/A-2テストで同じ修正を行った。無期限の操作待ちを避けるため両全問テストに10秒の操作タイムアウトを設定した。

Pythonコマンドは端末のpython shimが利用できず、同梱Pythonで同じスクリプトを実行。buildは500kB超chunkの警告を出すが、配信・precache上限の検査は成功。PWAは92件・約3217KiBをprecacheし、新A-1画像6点を含む。

公式原本照合スクリプトはtmp/pdfs/sc-a1の取得済み8PDFを必要とする。問題・解答の取得先と期待SHA-256は正式対応表に保存済み。通常の教材・map・hash検証、unit、build、E2Eは公式PDFや外部通信に依存しない。

置換後の追加ブラウザ確認：ネットワークカテゴリに絞った5問を全て回答し、結果・ホームの学習済み件数・再読込み後の保存を確認（1件成功）。最初の確認用セレクタは存在しないvalue属性を指定して失敗したため、UIの実際の「5問」ラベルを使って再実行した。教材やアプリの挙動は変更していない。

この一時PlaywrightファイルをVitestがunit testとして収集してしまい、初回の置換後unitコマンドは55ファイル・307件成功に加えて補助ファイルの読込みが1件失敗した。補助ファイルを通常のunit test対象外の名前へ変更して、unitコマンド全体を再実行した。

## 15. 手動確認事項

ブラウザ自動検査はChromiumの390/320px、ライト/ダーク、横スクロール、通常演習・カテゴリ・復習・お気に入り・履歴・成績・固定模試・結果を対象。全240問をオフラインで回答し、図表・本文・解説が完成JSONと一致することを検証。生成した画面PNGはtmp/sc-a1-v1/uiに保存し、原本由来の6画像も目視確認した。

実機iPhone Safariで次を確認する（全て未実施）：

- 通常問題の表示と選択・回答・次問。
- 長い問題文の改行、スクロール、固定操作バーとの重なり。
- 長い選択肢のタップ領域と読みやすさ。
- tableの列と数値、横スクロール。
- codeの改行と手順番号。
- imageの二分木、回路、波形と選択肢画像の可読性。
- 解説、四択解説、記憶文、出典リンク。
- 固定模試1/2の50分タイマー・保存・提出・結果・再開。
- ホーム画面追加、再起動、オフライン初回図表閲覧。

## 16. 既知の制約と教材品質判定

初学者の基礎から計算・比較・図表適用へ進む科目A-1対策教材として利用できる品質。修正対象45問の条件不足・過剰な一般化を改善し、公式15問には誤答との差と類題へ使える知識を整えた。practiceに加えて両方の固定模試を使用することを前提に評価する。

practiceは基礎167/180問で、試験全体の難度や出題比率を再現するものではない。全シラバス小項目の完全網羅や合格を保証しない。条件付き確率、IPv6/AAAA、リスク期待損失、アクセシビリティの状況判断は計画どおり次版の補強候補。2027制度のシラバス確定後に差分確認が必要。同じAIの二次校閲であり人間の独立校閲は未実施。実機Safari確認も未実施。

旧教材アーカイブは端末のIndexedDBに保持するが、閲覧UIと独立エクスポートは既存仕様で未対応。通常バックアップにアーカイブ本体は含まれず、端末のサイトデータ削除による消失までは保護できない。今回、同期・バックアップ形式を変更していない。公式PDFはPWAキャッシュ対象外で、教材本文・図表・解説はローカルで利用可能。
