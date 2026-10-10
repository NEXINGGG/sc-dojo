# SC A-2 問題データ仕様（教材基盤 v1）

このフェーズでは本番のA-1/A-2教材、A-2カテゴリ、科目B、DB、同期・バックアップ形式を変更していない。SC教材の30問試作を別ファイルで安全に記述・検証できる基盤を追加した。以下の例は架空の表示確認用であり、監査済みの公式問題や正式code割当を表していない。

## 1. Questionデータ仕様

正本JSONの既存フィールドは継続する。追加フィールドは旧教材には任意。

| 保存JSON | アプリ内型 | 用途 |
| --- | --- | --- |
| `source.source_id` | `Question.sourceId` / `source.source_id` | 公式問題の恒久ID（同一値を保持） |
| `content_hash` | `Question.contentHash` | 問題内容SHA-256 |
| `metadata.dataset_version` | `SubjectCatalog.datasetVersion` / 各Questionの`datasetVersion` | 教材セット全体の版。Questionへのコピーは実行時のみ |
| `stimulus` | `Question.stimulus` | 本文に必要な表・コード・画像の配列 |
| `choices[].stimulus` | `Choice.stimulus` | 選択肢IDに結び付いた表・コード・画像 |
| `source`の公式出典項目 | `Question.source` | 出典情報を変換で落とさず保持 |

内部科目IDは`a1` / `a2` / `b1`。新SC A-2の`subject_id`は`a2`。既存`id` / `code` / `question` / `choices[].text`を保持し、選択肢はA/B/C/Dを一度ずつ、採点はIDで行う。図表のない既存問題では追加DOMを出さない。

`QuestionStimulus`は次の3種類だけを持つ（実行時型も同じキー）。

```ts
type QuestionStimulus =
  | { type: 'table'; headers: readonly string[];
      rows: readonly (readonly string[])[]; caption?: string }
  | { type: 'code'; content: string; language?: string; caption?: string }
  | { type: 'image'; src: string; alt: string; caption?: string;
      asset_sha256: string };
```

## 2. source_id仕様

`SC-2024-FALL-Q12`のように`試験略号-西暦-期-Q問番号2桁`。教材IDの`A2-001`とは独立している。期は`SPRING` / `FALL` / `OCTOBER`。監査一覧の2020年10月も`SC-2020-OCTOBER-Qxx`で表現できる。

新SC教材は`source`内の`source_id`、`exam: "SC"`、`year`、`term`、`question_number`、`official_question_url`、`official_answer_url`、`basis`、`type: "official_past_question"`、`verbatim_past_question`を要求する。`verbatim_past_question`は実際の転載・再構成の状態を記録する。

yearは2000～2100の整数、termは小文字`spring` / `fall` / `october`、question_numberは1～99の整数。source_idとの全項目一致を検証する。同一ファイルで同じsource_idを複数codeへ割り当てると失敗する。分割試作の統合時には統合した全問題でも検証すること。

公式URLはIPAドメインのHTTPSのみ。URL書式の検証は出典内容の一致まで保証しない。監査一覧から正しい問題PDF・解答PDFを転記し、問番号と正解を原本で校閲する。既存の`basis` / `type` / `verbatim_past_question`は継続。

## 3. dataset_version仕様

教材セットの`metadata.dataset_version`に一度だけ指定する。問題ごとのJSONに`dataset_version`を記述すると検証エラー。`schema_version`は構造版、`dataset_version`は教材版で、別の意味を持つ。

正式教材の予定は`sc-a2-v1`。隔離した試作では`sc-a2-prototype-v1`など、正式版と区別する。既存のNW由来教材には追加しない。小文字英数字とハイフン区切りを使用する。

`sc-a2-`で始まる教材版は自動で厳格SC A-2検証になる。版を付ける前でもCLIの`--strict-sc-a2`で必須項目を検査できる。旧教材の件数・固定模試検査は既存スクリプトで継続し、別ファイルの1～30問の試作はhashツールで検証できる。本番への接続は次フェーズの作業。

## 4. content_hash算出対象

`sha256:`＋小文字hex64桁。Nodeとブラウザが同じ共有モジュールを使う。

含める内容:

- 問題文、ID順の選択肢IDと本文、正解ID。
- 本文・選択肢のstimulus配列。表の見出しとセル、コード全文、図の実ファイルSHA-256。
- 図表のcaption、画像のalt（解答に必要な情報を含み得るため、保守的にすべて含める）。

含めない内容:

- 解説、memory_point、関連用語、教材補足、カテゴリ、難易度、priority、status。
- code、source_id、公式URL、basis、schema_version、dataset_version。
- 画像のsrc（ファイル移動は内容変更ではない）、コードのlanguage（表示用注記）。

stimulusは**回答に必要な資料専用**。解説用の補足図・装飾をここへ置かない。補足情報は解説側へ記述する。画像を同じパスへ上書きした場合もツールがasset_sha256を更新し、content_hashが変わる。

## 5. hash正規化ルール

canonical JSONはキー順依存を避ける固定位置配列。UTF-8をSHA-256へ入力する。

```text
["question-content-v1", 問題文,
 [[選択肢ID, 本文, 選択肢stimulus], ...ID昇順], 正解ID, 本文stimulus]
```

stimulusの正規形:

```text
["table", headers, rows, caption]
["code", content, caption]
["image", asset_sha256, alt, caption]
```

文字列はCRLF/CR→LF、Unicode NFC。trim、空白圧縮、NFKC、大小文字変換はしない。コードの改行・空白・タブ、数値、記号、全半角の違いを保持する。caption未指定は空文字、stimulus未指定は空配列と同じ。選択肢順はID順へ揃えるが、図表・表の行と列の順は維持する。正規化方式の変更は`question-content-v1`を更新する別フェーズとして扱う。

SHA-256は同期実装で既存fingerprint APIを維持し、Node標準cryptoの既知長・Unicode・ブロック境界と一致するテストを持つ。ブラウザ側で外部API・CDN・Node機能は必要ない。

## 6. fingerprint仕様

新方式の入力は`["question-dataset-v1", manifest]`。manifestはcodeの文字列順で各問を次の固定位置配列へ変換する。

```text
[subjectId, datasetVersion, code, sourceId, contentHash]
```

新fingerprintは`sha256:v1:`＋hex64桁。sourceId/contentHash/datasetVersionのどれかを持つ問題があれば新方式。混在時、旧問題の欠落項目はnullとなり、旧部分はcode中心の互換挙動を維持する。

新問題の内容hashは実行時にも再計算するので、宣言hashの更新漏れだけで本文変更を隠せない。ビルド前の検証では宣言hashの不一致をエラーにする。

解説のみの修正は版を据え置けばfingerprint不変。問題文・選択肢・正解・図表・source_id・code・科目・教材版が変わればfingerprintも変わる。版番号だけの変更もセットの変更を表すが、個々の問題のcontent_hashは変わらない。配列順・出典URLだけの変更は無関係。

新項目のない既存A-1/A-2は従来のcode一覧FNV-1a-32へフォールバックし、値を維持する。バックアップのフィールド・形式版は変更していない。fingerprintは差分検知であり、問題別の履歴移行・過去版並存・自動リセットは行わない。将来のSC教材差し替えや同期公開前には、別途問題identityを保存する設計が必要。

## 7. table仕様

headersは空でない見出し文字列の配列。rowsは空でない二次元文字列配列で、各行のセル数をheadersに揃える。空セルは`""`で表現可能。captionは任意。

ReactのHTML table / thead / tbody / th scope="col" / tdで描画し、HTML文字列は実行しない。横幅超過はキーボードでも操作できる局所横スクロール。結合セル、多段見出し、セル中画像には未対応。単純表で意味を保てない場合は画像化してaltで説明する。

## 8. code仕様

`type: "code"`と空でない`content`。`language`と`caption`は任意。コードとログで同じ型を使用する。pre/codeで改行・空白を保持して局所横スクロール。シンタックスハイライト依存は追加していない。ライト・ダーク共通の色トークンを使う。

## 9. image仕様

`type: "image"`、`src`、空でない`alt`、`asset_sha256`が必須、captionは任意。asset_sha256は実ファイルのbyte SHA-256のhex64桁（接頭辞なし）で、手入力しない。更新ツールが自動記入する。

IPA原本のスクリーンショットに限定せず、必要な内容を教材用に再構成した図を置ける。altとcaptionに、回答前の正解を明かす解説を入れない。図の矢印、配置、境界、IP等の解答条件を原本と照合する。

画像は画面幅へ縮小し縦横比を維持する。白地の教材図は暗色でも白背景で表示する。外部画像URL、data URL、経路遡及、クエリ文字列は受け付けない。読み込み失敗は日本語の再表示手順とaltを示す。現段階では図の拡大専用UIはないため、390pxでも必要情報を読める図を作る。

## 10. 教材画像配置場所

推奨は`public/questions/sc/a2/`。JSONには`questions/sc/a2/<名前>.svg`等を指定する。先頭`/`や`public/`を付けない。実行時はViteのBASE_URLを付けるのでサブパス公開でも同じJSONを使える。

PNG / SVG / JPG / JPEG / WebP / AVIF / GIF、小文字拡張子、1ファイル2MiB以下。ファイル名とサブディレクトリ名は半角英数字・ハイフン・アンダースコア。共通構造では`questions/(sc|nw)/(a1|a2)/`を認め、新SC A-2の厳格検証では`questions/sc/a2/`のみ。存在・public内実体・byte hashを検証し、外部へのシンボリックリンクを拒否する。

図の更新は新ファイル名を推奨する。旧結果が参照するassetを削除しない運用と問題別manifest保存は、教材の世代更新を公開する前に別途設計する。

## 11. PWAキャッシュ仕様

vite-plugin-pwa / WorkboxのincludeAssetsとglobPatternsへ上記画像形式を指定する。参照済みの画像だけでなく配置した教材画像全体をインストール時にrevision付きprecacheへ収録する。表・コード・教材JSONはHTML/JSとして既存precacheに含まれる。

postbuildの検査はpublic/questionsの全画像について、distへのbyte一致コピーとSWのrevision付きprecache（WorkboxのMD5 revision）を確認する。このrevisionはキャッシュ更新用で、問題のasset_sha256とは別物。ファイルが大きすぎてWorkboxが除外した場合も検査で失敗する。

SCのcacheId、公開baseとscope、更新のprompt方式を継続する。cleanupOutdatedCaches=falseを保持し、同一originのNWキャッシュを消さない。IPA公式PDF・外部URLはprecacheへ入れない。初回はオンラインでService Workerのインストール完了が必要。その後は図を初めて開く場合でもオフラインで使える。

E2Eでは本番教材を変更せず一時ビルドへテスト図表を注入し、実SW、全7形式のprecache、サブパス、オフライン画像、320/390px、ライト/ダーク、演習・模試・結果・履歴表示を確認する。

## 12. 新しいSC A-2問題を追加する手順

1. 隔離した`data/sc-a2-prototype-questions.json`等を作成する。本番のa2-questions.jsonへの接続は次フェーズで判断する。
2. metadata.dataset_versionを指定し、監査済みsource_idと公式出典を転記する。新問題のcode割当は次フェーズの方針に従い、既存codeを無断で再割当しない。
3. question/四択/正解/解説等の既存必須項目と必要なstimulusを記述する。画像はpublic/questions/sc/a2へ配置する。
4. 次のupdateを実行する。content_hashとasset_sha256を手入力しない。内容・図表が不正なら書込みは行わない。
5. checkを実行する。CIではcheckのみを実行し、失敗をupdateで隠さない。
6. 問題文・記号・四択・図表・正解・出典・必要な時点注記を公式原本と校閲する。既存カテゴリへ仮に紐付ける場合も明記し、SCカテゴリ正式適用は次フェーズで行う。
7. 隔離した表示確認環境で演習・模試・結果、実機iPhone、オフラインを確認する。本番接続時には既存全件・模試構成検査とpostbuildも通す。

```bash
node scripts/update-question-content-hashes.mjs data/sc-a2-prototype-questions.json --update --strict-sc-a2
node scripts/update-question-content-hashes.mjs data/sc-a2-prototype-questions.json --check --strict-sc-a2
# npm経由も利用可能
npm run questions:hashes -- data/sc-a2-prototype-questions.json --check --strict-sc-a2
```

### 説明用データ記述例（1問）

2099年のsource_idとURLは架空のプレースホルダー。公式過去問を再現した例ではない。カテゴリも説明用で、本番投入前には正式カテゴリと公式出典へ置き換える。この例は本番JSONに追加していない。hashは省略してあり、保存後にupdateで生成する。

```json
{
  "schema_version": 2,
  "metadata": { "dataset_version": "sc-a2-prototype-example" },
  "questions": [{
    "id": 1001,
    "code": "A2-001",
    "subject_id": "a2",
    "domain_id": "technology",
    "category_id": "example_category",
    "subcategory_id": "example_subcategory",
    "subcategory": "説明用",
    "difficulty": "基礎",
    "priority": "A",
    "question": "次の表示確認用の表で、端末からサーバへの接続数は幾つか。",
    "stimulus": [{
      "type": "table",
      "headers": ["送信元", "送信先", "接続数"],
      "rows": [["端末", "サーバ", "3"]],
      "caption": "表示確認用の接続表"
    }],
    "choices": [
      { "id": "A", "text": "1" },
      { "id": "B", "text": "2" },
      { "id": "C", "text": "3" },
      { "id": "D", "text": "4" }
    ],
    "correct_choice": "C",
    "explanation": "表示確認用です。表の接続数は3です。",
    "memory_point": "表の見出しと値を対応させる。",
    "question_set": { "id": "category_drill", "number": null, "sequence": null },
    "source": {
      "source_id": "SC-2099-SPRING-Q01",
      "exam": "SC", "year": 2099, "term": "spring", "question_number": 1,
      "official_question_url": "https://www.ipa.go.jp/example-question.pdf",
      "official_answer_url": "https://www.ipa.go.jp/example-answer.pdf",
      "basis": "架空の説明用データ。実教材では公式問題との対応を記録する。",
      "type": "official_past_question", "verbatim_past_question": false
    },
    "status": "active", "schema_version": 2
  }]
}
```

同じstimulus配列にはコードや画像も追加できる（画像ファイルは別途用意）。以下も説明用で、asset_sha256の空文字はupdate前の記述例。check時には生成済みhashが必要。

```json
[
  { "type": "code", "content": "connections = 3\n  print(connections)", "language": "log", "caption": "表示確認用ログ" },
  { "type": "image", "src": "questions/sc/a2/example-network.svg", "alt": "左の端末から右のサーバへ向かう接続を示す図", "caption": "表示確認用構成図", "asset_sha256": "" }
]
```

### 現段階の制約と次フェーズ

表示順は問題文→stimulus配列→四択。問題文途中への図表差込みには未対応。選択肢は選択肢本文→選択肢stimulus。複雑な表や画像拡大、問題別履歴移行、旧教材版の並存、同期へのidentity保存は未実装。

**隔離した30問の教材作成・検証へ進める。** 30問を本番へ接続する際は、その件数・カテゴリ・模試配分と原本転記校閲を別途実施する。今回の基盤を、既存codeの教材差し替え時に旧履歴を安全に自動移行できる保証として扱わない。

### 30問pilotで追加した教材補足（2026-10-07）

次のフィールドは後方互換の任意フィールド。pilot30問では全問に四択解説・見分け方を用意する。

| JSON | アプリのQuestion | 内容 |
| --- | --- | --- |
| `choice_explanations` | `choiceExplanations` | A/B/C/Dを全て持つ文字列オブジェクト。各選択肢の正誤理由 |
| `exam_tip` | `examTip` | 類題でも使える判断の手掛かり |
| `related_terms` | `relatedTerms` | 重複なしの関連用語0～5件 |
| `source.official_answer` | 同名 | 公式解答のア・イ・ウ・エ |
| `source.official_answer_choice_id` | 同名 | 公式解答をA/B/C/Dへ対応させた値 |

解説は正誤→解説→四択解説→見分け方→覚える一行→関連用語→出典の順。欠落した補足は表示しない。SC公式過去問の出典だけを追加表示し、従来問題の解説表示は維持する。補足5項目（explanation、choice_explanations、exam_tip、memory_point、related_terms）はcontent_hashへ含めない。問題文・四択・正解・stimulus・図のbytes/alt/captionがhashの対象。

試作用データは `data/sc-a2-pilot-30.json`、dataset_versionは `sc-a2-pilot-v1`。codeは `A2-PILOT-SC-年度-期-Q番号` とし、正式A2-001～A2-240は割り当てない。通常コードの検証を緩和せず、この教材版だけ試作コードを許す。

`npm run dev:pilot` で起動する（127.0.0.1:5175）。ホームでA-2を選ぶと試作30問を使う。`import.meta.env.DEV && VITE_SC_A2_PILOT === '1'` の両条件が必須で、production buildはフラグ値によらず既存240問を使用する。pilotのDB名は `sc-dojo-sc-a2-pilot-v1`、クラウド接続は無効。DBスキーマ・同期仕様・バックアップ形式は変更しない。試作記録を本番へ移行する機能は含めない。

検査は `npm run validate:a2-pilot`、hashは `npm run questions:hashes -- data/sc-a2-pilot-30.json --update` で生成し、`--check` で照合する。選定・原本二次校閲・画面確認の記録は [30問レビュー](sc-a2-pilot-30-review.md) を参照。
