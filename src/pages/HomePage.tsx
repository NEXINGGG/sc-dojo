import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';
import { categories, questions } from '../data/catalog';

export function HomePage() {
  return (
    <>
      <PageHeader description="短時間で繰り返し学ぶための学習ホームです。" title="ホーム" />
      <section className="hero-card">
        <p className="eyebrow hero-eyebrow">学習を始める準備ができました</p>
        <h2>まずは10問</h2>
        <p>通常演習は次のPhaseで利用できるようになります。</p>
        <button className="primary-button" disabled type="button">
          今日の10問を始める
        </button>
      </section>
      <section aria-label="問題データの読込み状況" className="metric-grid">
        <article className="metric-card">
          <span>読込み済み問題</span>
          <strong>{questions.length}問</strong>
        </article>
        <article className="metric-card">
          <span>カテゴリ</span>
          <strong>{categories.length}件</strong>
        </article>
      </section>
      <PlaceholderNotice
        description="回答履歴、継続日数、苦手カテゴリは後続Phaseで追加します。"
        feature="ホーム"
      />
    </>
  );
}
