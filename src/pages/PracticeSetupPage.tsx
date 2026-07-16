import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';
import { categories } from '../data/catalog';
import { difficulties } from '../types/question';

export function PracticeSetupPage() {
  return (
    <>
      <PageHeader description="出題条件を選び、学習したい範囲を絞り込みます。" title="演習条件" />
      <section className="surface-card">
        <h2>問題データ</h2>
        <p className="muted-text">
          カテゴリと難易度の表示基盤を用意しました。出題条件の保存はPhase 3で実装します。
        </p>
        <div className="chip-list" aria-label="カテゴリ一覧">
          {categories.map((category) => (
            <span className="chip" key={category.id}>
              {category.name}
            </span>
          ))}
        </div>
        <div className="chip-list" aria-label="難易度一覧">
          {difficulties.map((difficulty) => (
            <span className="chip chip-muted" key={difficulty}>
              {difficulty}
            </span>
          ))}
        </div>
      </section>
      <PlaceholderNotice
        description="絞込み、出題順のシャッフル、回答はまだ開始しません。"
        feature="通常演習"
      />
    </>
  );
}
