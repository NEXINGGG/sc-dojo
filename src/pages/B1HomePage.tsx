import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import { B1Repository, type B1ProgressSummary } from '../features/b1/b1Repository';
import { SubjectSwitcher, useSubject } from '../features/subjects/SubjectContext';

const repository = new B1Repository(database);

export function B1HomePage() {
  const { error: subjectError } = useSubject();
  const [summary, setSummary] = useState<B1ProgressSummary>();

  useEffect(() => {
    void repository
      .getProgressSummary()
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  return (
    <>
      <PageHeader
        description="公式PDFを正本として、記述式の答案をこの端末に保存しながら練習します。"
        title="科目B ホーム"
      />
      <SubjectSwitcher />
      {subjectError !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <p>{subjectError}</p>
        </section>
      ) : null}
      <section className="hero-card b1-home-hero">
        <p className="eyebrow hero-eyebrow">科目B 記述式</p>
        <h2>公式PDFを見ながら答案を作る</h2>
        <p>問題文・図表はIPA公式PDFで確認します。アプリは問題文を転載しません。</p>
        <Link className="primary-button" to="/practice">
          科目B演習を始める
        </Link>
      </section>
      <section aria-label="科目Bの学習状況" className="study-summary-grid">
        <article className="metric-card">
          <span>完了した演習</span>
          <strong>{summary?.completedPracticeCount ?? 0}大問</strong>
        </article>
        <article className="metric-card">
          <span>確定した模試</span>
          <strong>{summary?.completedMockCount ?? 0}回</strong>
        </article>
        <article className="metric-card">
          <span>自己採点済み</span>
          <strong>
            {(summary?.correctSelfGrades ?? 0) +
              (summary?.partialSelfGrades ?? 0) +
              (summary?.reviewSelfGrades ?? 0)}
            件
          </strong>
        </article>
      </section>
      <section className="surface-card b1-official-notice" role="status">
        <h2>公式問題の扱い</h2>
        <p>
          オンラインではIPA公式PDFを開けます。オフラインで利用する場合は、利用者自身がダウンロードした年度別PDFを端末に登録してください。登録ファイルは外部送信しません。
        </p>
        <p>
          <strong>アプリの判定はIPAの正式採点ではありません。</strong>
        </p>
      </section>
      <section className="surface-card home-exam-card">
        <h2>科目B模試</h2>
        <p>同一年度の3大問から2大問を選択し、90分の締切時刻方式で取り組みます。</p>
        <Link className="primary-button" to="/exam">
          科目B模試を開始
        </Link>
      </section>
    </>
  );
}
