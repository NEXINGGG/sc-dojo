import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';

export function ExamPage() {
  return (
    <>
      <PageHeader
        description="模試中の問題画面です。試験機能はまだ開始しません。"
        title="模擬試験中"
      />
      <section className="surface-card exam-placeholder">
        <span className="timer-placeholder">残り時間 --:--</span>
        <p>問題一覧・見直し・回答はPhase 5で追加します。</p>
      </section>
      <PlaceholderNotice
        description="この画面では正解や解説を表示しない構造を採用します。"
        feature="模試"
      />
    </>
  );
}
