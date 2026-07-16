import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';

export function ExamSelectionPage() {
  return (
    <>
      <PageHeader description="30問・50分の模擬試験を選択します。" title="模擬試験" />
      <section className="surface-card">
        <h2>用意する模試</h2>
        <ul className="option-list">
          <li>固定模試1：30問</li>
          <li>固定模試2：30問</li>
          <li>ランダム模試：activeな問題から30問</li>
        </ul>
      </section>
      <PlaceholderNotice
        description="模試の開始、時間計測、採点はPhase 5で実装します。"
        feature="模擬試験"
      />
    </>
  );
}
