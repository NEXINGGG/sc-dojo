import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';

export function ProgressPage() {
  return (
    <>
      <PageHeader description="学習の進捗と苦手分野を確認します。" title="成績" />
      <section className="metric-grid">
        <article className="metric-card">
          <span>全体正答率</span>
          <strong>--%</strong>
        </article>
        <article className="metric-card">
          <span>回答済み</span>
          <strong>-- / 240</strong>
        </article>
      </section>
      <PlaceholderNotice
        description="回答履歴からの集計と苦手カテゴリ表示はPhase 6で実装します。"
        feature="成績"
      />
    </>
  );
}
