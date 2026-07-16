import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';

export function PracticeQuestionPage() {
  return (
    <>
      <PageHeader
        description="通常演習の問題画面です。現在は画面構造のみ確認できます。"
        title="問題演習"
      />
      <section className="surface-card question-placeholder">
        <p className="chip chip-technology">テクノロジ系</p>
        <h2>問題と選択肢はPhase 3で表示します</h2>
        <div className="choice-placeholder">選択肢 A</div>
        <div className="choice-placeholder">選択肢 B</div>
        <div className="choice-placeholder">選択肢 C</div>
        <div className="choice-placeholder">選択肢 D</div>
      </section>
      <PlaceholderNotice
        description="正誤判定、解説、回答保存は実装していません。"
        feature="問題演習"
      />
    </>
  );
}
