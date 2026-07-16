import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        description="指定されたページは見つかりませんでした。"
        title="ページが見つかりません"
      />
      <section className="surface-card not-found-card">
        <p>URLをご確認いただくか、ホームから操作を続けてください。</p>
        <Link className="primary-button link-button" to="/">
          ホームへ戻る
        </Link>
      </section>
    </>
  );
}
