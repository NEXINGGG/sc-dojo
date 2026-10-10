import a2Payload from '../../data/a2-questions.json';
import type { RawQuestionPayload } from '../data/catalog';

// Synthetic data used only in tests; never added to production JSON.
export function createQuestionMaterialFixture(): RawQuestionPayload {
  return {
    schema_version: 2,
    metadata: { dataset_version: 'sc-a2-test-v1' },
    questions: [
      {
        ...structuredClone(a2Payload.questions[0]),
        schema_version: 2,
        question: 'テスト用の表とログを確認してください。',
        source: {
          source_id: 'SC-2099-SPRING-Q01',
          exam: 'SC',
          year: 2099,
          term: 'spring',
          question_number: 1,
          official_question_url: 'https://www.ipa.go.jp/example-question.pdf',
          official_answer_url: 'https://www.ipa.go.jp/example-answer.pdf',
          type: 'official_past_question',
          basis: '架空の検証用データ',
          verbatim_past_question: false,
        },
        stimulus: [
          {
            type: 'table',
            headers: ['項目', '値'],
            rows: [['接続数', '3']],
            caption: '検証用の表',
          },
          {
            type: 'code',
            content: 'value = 3;\n  print(value);',
            language: 'log',
            caption: '検証用のログ',
          },
        ],
      },
    ],
  };
}
