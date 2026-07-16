# 問題データ仕様

## ファイル

- 問題：`data/questions.json`
- カテゴリ：`data/categories.json`
- Schema：`data/questions.schema.json`

## トップレベル

```json
{
  "schema_version": 1,
  "metadata": {},
  "questions": []
}
```

## 問題オブジェクト

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| id | integer | ○ | 1～240の連番 |
| code | string | ○ | 永続ID `A1-001`形式 |
| domain_id | string | ○ | 3系統のID |
| category_id | string | ○ | 15カテゴリのID |
| subcategory_id | string | ○ | 小分類ID |
| subcategory | string | ○ | 小分類表示名 |
| difficulty | string | ○ | 基礎・標準・応用 |
| priority | string | ○ | S・A・B |
| question | string | ○ | 問題文 |
| choices | array | ○ | A～Dの4件 |
| correct_choice | string | ○ | A～D |
| explanation | string | ○ | 初学者向け解説 |
| memory_point | string | ○ | 覚える一行 |
| question_set | object | ○ | 元教材内の所属 |
| source | object | ○ | 出典区分 |
| status | string | ○ | active等 |
| schema_version | integer | ○ | 問題単位の版 |

## 学習履歴のキー

問題の `code` を使用する。配列順や `id` の再計算に依存しない。
