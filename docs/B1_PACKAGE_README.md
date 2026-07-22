# B-1 2023～2025年度 公式PDF解析済みパッケージ

## 状態

**公式PDF参照方式で実装可能**

- 9大問
- 83解答単位
- 152答案フィールド
- 設問掲載ページ確定
- 字数制限確定
- 図表・下線参照確定
- 採点方式確定

## 使用ファイル

- `data/b1-cases-2023-2025-ready.json`
- `docs/b1-implementation-decisions.md`
- `reports/b1-pdf-analysis-report.md`
- `reports/b1-answer-field-index.csv`
- `scripts/validate-b1-ready.mjs`
- `prompts/CODEX_B1_PDF_MODE_INTEGRATION_PROMPT.md`

## 検証

```powershell
node scripts/validate-b1-ready.mjs
```

## 重要

公式問題文と図表は同梱していない。
オンラインではIPA公式PDFを参照し、オフラインでは利用者が公式PDFを端末へ登録する方式を採用する。
