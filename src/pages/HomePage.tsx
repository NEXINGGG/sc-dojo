import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import type { PracticeSessionRow } from '../database/types';
import { defaultPracticeFilters } from '../domain/practice';
import type { LearningDashboard } from '../domain/learning';
import { LearningRepository } from '../features/learning/learningRepository';
import { PracticeSessionRepository } from '../features/practice/practiceSessionRepository';

const practiceSessions = new PracticeSessionRepository(database);
const learning = new LearningRepository(database);

const emptyDashboard: LearningDashboard = {
  totalQuestions: 240,
  studiedQuestions: 0,
  unansweredQuestions: 240,
  currentlyIncorrectQuestions: 0,
  favoriteQuestions: 0,
  latestCorrectQuestions: 0,
  latestCorrectRate: 0,
  todayAnswerCount: 0,
  learningStreak: 0,
};

export function HomePage() {
  const [inProgressSession, setInProgressSession] = useState<PracticeSessionRow>();
  const [dashboard, setDashboard] = useState<LearningDashboard>(emptyDashboard);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadHomeData() {
      try {
        const [session, stats] = await Promise.all([
          practiceSessions.getInProgress(),
          learning.getDashboard(),
        ]);
        if (isCurrent) {
          setInProgressSession(session);
          setDashboard(stats);
        }
      } catch {
        if (isCurrent) {
          setLoadFailed(true);
        }
      }
    }

    void loadHomeData();
    return () => {
      isCurrent = false;
    };
  }, []);

  const currentQuestionNumber =
    inProgressSession === undefined ? undefined : inProgressSession.currentIndex + 1;

  return (
    <>
      <PageHeader
        description="短い時間でも、今の学習状況に合う問題から始められます。"
        title="ホーム"
      />
      <section className="hero-card">
        <p className="eyebrow hero-eyebrow">ネットワークスペシャリスト 科目A-1</p>
        <h2>{dashboard.studiedQuestions === 0 ? 'まずは10問から' : '今日も一歩ずつ'}</h2>
        <p>
          今日の回答 {dashboard.todayAnswerCount}問・連続学習 {dashboard.learningStreak}日
        </p>
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

      {loadFailed ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>学習実績を確認できませんでした</strong>
          <p>通常演習は利用できます。端末の保存領域を確認して、画面を再読み込みしてください。</p>
        </section>
      ) : null}

      <section aria-label="学習実績" className="study-summary-grid">
        <article className="metric-card">
          <span>学習済み問題</span>
          <strong>
            {dashboard.studiedQuestions} / {dashboard.totalQuestions}問
          </strong>
        </article>
        <article className="metric-card">
          <span>最新状態の正答率</span>
          <strong>
            {dashboard.studiedQuestions === 0 ? '未学習' : `${dashboard.latestCorrectRate}%`}
          </strong>
        </article>
        <article className="metric-card">
          <span>未回答問題</span>
          <strong>{dashboard.unansweredQuestions}問</strong>
        </article>
        <article className="metric-card">
          <span>現在間違えている問題</span>
          <strong>{dashboard.currentlyIncorrectQuestions}問</strong>
        </article>
        <article className="metric-card">
          <span>お気に入り</span>
          <strong>{dashboard.favoriteQuestions}問</strong>
        </article>
        <article className="metric-card">
          <span>連続学習日数</span>
          <strong>{dashboard.learningStreak}日</strong>
        </article>
      </section>

      <section aria-label="復習を始める" className="surface-card quick-start-card">
        <h2>今の状態から始める</h2>
        <p>回答状態を選ぶと、復習に合う問題だけを出題します。</p>
        <div className="quick-start-list">
          <QuickStartLink
            count={dashboard.unansweredQuestions}
            label="未回答を学習"
            status="unanswered"
          />
          <QuickStartLink
            count={dashboard.currentlyIncorrectQuestions}
            label="間違えた問題を復習"
            status="incorrect"
          />
          <QuickStartLink
            count={dashboard.favoriteQuestions}
            label="お気に入りを学習"
            status="favorite"
          />
        </div>
      </section>
    </>
  );
}

interface QuickStartLinkProps {
  status: 'unanswered' | 'incorrect' | 'favorite';
  label: string;
  count: number;
}

function QuickStartLink({ status, label, count }: QuickStartLinkProps) {
  if (count === 0) {
    return (
      <span aria-label={`${label}: 現在ありません`} className="quick-start-disabled">
        {label}（現在ありません）
      </span>
    );
  }

  return (
    <Link
      className="secondary-button quick-start-link"
      state={{ initialFilters: { ...defaultPracticeFilters, answerStatus: status } }}
      to="/practice"
    >
      {label}（{count}問）
    </Link>
  );
}
