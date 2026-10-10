import { choiceIds, type Question } from '../types/question';

export function QuestionExplanation({ question }: { question: Question }) {
  const source = question.source;
  const isCommonMorning = source.exam === 'KOUDO-AM1';
  const hasOfficialSource =
    (source.exam === 'SC' || isCommonMorning) && source.type === 'official_past_question';
  return (
    <>
      <h3>解説</h3>
      <p>{question.explanation}</p>
      {question.choiceExplanations === undefined ? null : (
        <section className="choice-explanations" aria-label="選択肢ごとの解説">
          <h3>選択肢ごとの解説</h3>
          <dl>
            {choiceIds.map((id) => (
              <div key={id}>
                <dt>
                  {id}：{id === question.correctChoice ? '正しい' : '誤り'}
                </dt>
                <dd>{question.choiceExplanations?.[id]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {question.examTip === undefined ? null : (
        <>
          <h3>試験での見分け方</h3>
          <p>{question.examTip}</p>
        </>
      )}
      <h3>覚える一行</h3>
      <p>{question.memoryPoint}</p>
      {!question.relatedTerms?.length ? null : (
        <>
          <h3>関連用語</h3>
          <ul className="related-terms">
            {question.relatedTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </>
      )}
      {hasOfficialSource ? (
        <section className="question-source" aria-label="出典">
          <h3>出典</h3>
          <p>
            {isCommonMorning
              ? '高度試験・情報処理安全確保支援士試験 共通'
              : '情報処理安全確保支援士試験'}
            <br />
            {source.year}年度{' '}
            {source.term === 'spring' ? '春期' : source.term === 'fall' ? '秋期' : '10月試験'}{' '}
            {isCommonMorning ? '午前I' : '午前II'} 問{source.question_number}
            <br />
            出典：IPA
          </p>
          <div className="question-source-links">
            <a href={source.official_question_url} target="_blank" rel="noopener noreferrer">
              IPA公式問題
            </a>
            <a href={source.official_answer_url} target="_blank" rel="noopener noreferrer">
              IPA公式解答
            </a>
          </div>
        </section>
      ) : null}
    </>
  );
}
