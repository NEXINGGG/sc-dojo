# SC A-2教材画像

SC A-2 v1の13画像を配置する。pilotから継承したSVG 5件と、IPA公式PDFから図だけを切り出したPNG 8件。
図のノード、矢印、通信方向、条件、軸、数値、ラベルを公式原本と照合済み。
全画像はService Workerのprecache対象。解答に必要な意味情報をaltにも記載する。
JSONのsrcは `questions/sc/a2/<ファイル名>.svg` など（public/や先頭/を付けない）。
対応形式: PNG / SVG / JPEG / WebP / AVIF / GIF。1ファイル2MiB以下。
ファイル名とディレクトリ名は半角英数字・ハイフン・アンダースコア。
図の内容を変える場合は別名を推奨し、hash更新ツールを実行する。
仕様と手順は `docs/sc-a2-question-data-spec.md` を参照。
