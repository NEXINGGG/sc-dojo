# NW A1 Dojo 開発準備一式

ネットワークスペシャリスト科目A-1の、過去問道場型PWAをCodexで開発するための準備パッケージです。

## 主要ファイル

- `AGENTS.md`：Codexが常に守る開発ルール
- `prompts/CODEX_MASTER_PROMPT.md`：最初に渡すプロンプト
- `prompts/PHASE_PROMPTS.md`：段階的な実装プロンプト
- `prototype/index.html`：色付きUIプロトタイプ
- `docs/design-system.md`：配色、文字、余白、コンポーネント
- `docs/screens.md`：主要10画面の仕様
- `docs/app-scope.md`：初期版の範囲
- `docs/acceptance-criteria.md`：完成条件
- `docs/implementation-plan.md`：推奨実装順
- `data/questions.json`：検証対象の240問
- `data/categories.json`：3系統・15カテゴリ・小分類
- `data/questions.schema.json`：問題データSchema
- `scripts/validate_questions.py`：構造検査
- `reports/validation_report.md`：検査結果
- `reports/editorial_review.md`：内容確認・修正履歴

## 問題データ検査

リポジトリのルートで実行します。

```bash
python scripts/validate_questions.py
```

## UIプロトタイプ

`prototype/index.html`をブラウザで開いてください。
画面切替とライト・ダークモードを確認できます。

## Codexへ渡す順序

1. フォルダ全体をGitリポジトリにする
2. `prompts/CODEX_MASTER_PROMPT.md`をCodexへ渡す
3. Codexが提示した計画を確認する
4. `prompts/PHASE_PROMPTS.md`を上から順に使用する
