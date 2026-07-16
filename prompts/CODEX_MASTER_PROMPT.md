# Codex用マスタープロンプト

以下をCodexへ貼り付けて使用する。最初は計画だけを依頼し、計画確認後にフェーズ単位で実装する。

---

このリポジトリに、ネットワークスペシャリスト科目A-1向けの過去問道場型PWA「A1道場」を実装してください。

## 最初に読むファイル

1. `AGENTS.md`
2. `docs/app-scope.md`
3. `docs/design-system.md`
4. `docs/screens.md`
5. `docs/data-schema.md`
6. `docs/acceptance-criteria.md`
7. `docs/implementation-plan.md`
8. `prototype/index.html`
9. `data/categories.json`
10. `data/questions.json`

## 重要条件

- 対象ユーザーはIT初学者です。ネットワークやインフラの実務経験を前提にしないでください。
- iPhoneを主対象としたモバイルファーストの日本語UIにしてください。
- `data/questions.json` の240問を正本とし、問題をコンポーネントへ直書きしないでください。
- デザインは `docs/design-system.md` と `prototype/index.html` を基準にしてください。
- 初期版の範囲外であるログイン、クラウド同期、外部AI API、ランキング、課金を追加しないでください。
- 学習履歴はIndexedDBへ保存し、オフラインでも通常演習、履歴閲覧、模試を利用可能にしてください。
- 受入基準は `docs/acceptance-criteria.md` を満たしてください。

## 技術構成

- React
- TypeScript strict
- Vite
- React Router
- Dexie
- vite-plugin-pwa
- Vitest + Testing Library
- Playwright
- ESLint + Prettier

## 進め方

この依頼への最初の応答では、まだコードを変更しないでください。

1. 既存ファイルを確認する
2. `python scripts/validate_questions.py` を実行する
3. 実装計画をPhaseごとに提示する
4. 不明点、競合、技術的リスク、受入基準上の不足を列挙する
5. 推奨ディレクトリ構成とデータ保存設計を提示する
6. 追加質問がなくても進められる事項と、判断を仰ぐ必要がある事項を分ける

計画確認後は、一度に全機能を作らず、`docs/implementation-plan.md` のPhase単位で実装してください。
各Phase終了時に、変更内容、変更ファイル、実行した検査、結果、残課題を報告してください。

## 完成時の必須検査

```bash
python scripts/validate_questions.py
npm run lint
npm run test
npm run build
npm run test:e2e
```

失敗した検査を残したまま完成と報告しないでください。
