import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlaceholderNotice } from '../components/PlaceholderNotice';
import { PageHeader } from '../components/PageHeader';
import { categories, questions } from '../data/catalog';
import { database } from '../database/database';
import type { PracticeSessionRow } from '../database/types';
import { PracticeSessionRepository } from '../features/practice/practiceSessionRepository';

const practiceSessions = new PracticeSessionRepository(database);

export function HomePage() {
  const [inProgressSession, setInProgressSession] = useState<PracticeSessionRow>();
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadInProgressSession() {
      try {
        const session = await practiceSessions.getInProgress();
        if (isCurrent) {
          setInProgressSession(session);
        }
      } catch {
        if (isCurrent) {
          setSessionLoadFailed(true);
        }
      }
    }

    void loadInProgressSession();
    return () => {
      isCurrent = false;
    };
  }, []);

  const currentQuestionNumber =
    inProgressSession === undefined ? undefined : inProgressSession.currentIndex + 1;

  return (
    <>
      <PageHeader description="短い時間で、迷わず始められるネットワーク学習です。" title="ホーム" />
      <section className="hero-card">
        <p className="eyebrow hero-eyebrow">ネットワークスペシャリスト 科目A-1</p>
        <h2>まずは10問から</h2>
        <p>通常演習では条件を選んで、すぐに問題へ進めます。</p>
        {inProgressSession === undefined ? (
          <Link className="primary-button" to="/practice">
            通常演習を始める
          </Link>
        ) : (
          <Link className="primary-button" to={`/practice/${inProgressSession.id}`}>
            前回の続きから再開（{currentQuestionNumber} / {inProgressSession.questionCodes.length}
            問）
          </Link>
        )}
      </section>
      {sessionLoadFailed ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>途中の演習を確認できませんでした</strong>
          <p>
            通常演習の開始はできます。続きが表示されない場合は、端末の保存領域を確認してください。
          </p>
        </section>
      ) : null}
      <section aria-label="問題データの概要" className="metric-grid">
        <article className="metric-card">
          <span>収録問題</span>
          <strong>{questions.length}問</strong>
        </article>
        <article className="metric-card">
          <span>カテゴリ</span>
          <strong>{categories.length}件</strong>
        </article>
      </section>
      <PlaceholderNotice
        description="学習日数、成績、弱点カテゴリは後続フェーズで追加します。"
        feature="学習の記録"
      />
    </>
  );
}
