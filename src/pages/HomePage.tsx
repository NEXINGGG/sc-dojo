import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import type { PracticeSessionRow } from '../database/types';
import type { ProgressAnalytics } from '../domain/progress';
import type { ExamOverview } from '../features/exam/examRepository';
import { ExamRepository } from '../features/exam/examRepository';
import { formatExamRemainingTime, getExamName, getExamTimerState } from '../domain/exam';
import { defaultPracticeFilters } from '../domain/practice';
import { ProgressRepository } from '../features/progress/progressRepository';
import { PracticeSessionRepository } from '../features/practice/practiceSessionRepository';

const practiceSessions = new PracticeSessionRepository(database);
const exams = new ExamRepository(database);
const progress = new ProgressRepository(database);

const emptyExamOverview: ExamOverview = { totalAttempts: 0 };

export function HomePage() {
  const [inProgressSession, setInProgressSession] = useState<PracticeSessionRow>();
  const [analytics, setAnalytics] = useState<ProgressAnalytics>();
  const [examOverview, setExamOverview] = useState<ExamOverview>(emptyExamOverview);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadHomeData() {
      try {
        await exams.submitExpiredInProgress();
        const [session, stats, overview] = await Promise.all([
          practiceSessions.getInProgress(),
          progress.getAnalytics('30d'),
          exams.getOverview(),
        ]);
        if (isCurrent) {
          setInProgressSession(session);
          setAnalytics(stats);
          setExamOverview(overview);
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
  const todayAnswerCount = analytics?.daily.at(-1)?.answerCount ?? 0;
  const overall = analytics?.overall;

  return (
    <>
      <PageHeader
        description="短い時間でも、今の学習状況に合う問題から始められます。"
        title="ホーム"
      />
      <section className="hero-card">
        <p className="eyebrow hero-eyebrow">ネットワークスペシャリスト 科目A-1</p>
        <h2>{(overall?.studiedQuestions ?? 0) === 0 ? 'まずは10問から' : '今日も一歩ずつ'}</h2>
        <p>
          今日の回答 {todayAnswerCount}問・連続学習 {overall?.learningStreak ?? 0}日
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
            {overall?.studiedQuestions ?? 0} / {overall?.totalQuestions ?? 240}問
          </strong>
        </article>
        <article className="metric-card">
          <span>最新状態の正答率</span>
          <strong>
            {overall?.latestCorrectRate === undefined ? '未学習' : `${overall.latestCorrectRate}%`}
          </strong>
        </article>
        <article className="metric-card">
          <span>未回答問題</span>
          <strong>{overall?.unansweredQuestions ?? 240}問</strong>
        </article>
        <article className="metric-card">
          <span>現在間違えている問題</span>
          <strong>{overall?.currentlyIncorrectQuestions ?? 0}問</strong>
        </article>
        <article className="metric-card">
          <span>お気に入り</span>
          <strong>{overall?.favoriteQuestions ?? 0}問</strong>
        </article>
        <article className="metric-card">
          <span>連続学習日数</span>
          <strong>{overall?.learningStreak ?? 0}日</strong>
        </article>
      </section>

      <section aria-label="復習を始める" className="surface-card quick-start-card">
        <h2>今の状態から始める</h2>
        <p>回答状態を選ぶと、復習に合う問題だけを出題します。</p>
        <div className="quick-start-list">
          <QuickStartLink
            count={overall?.unansweredQuestions ?? 240}
            label="未回答を学習"
            status="unanswered"
          />
          <QuickStartLink
            count={overall?.currentlyIncorrectQuestions ?? 0}
            label="間違えた問題を復習"
            status="incorrect"
          />
          <QuickStartLink
            count={overall?.favoriteQuestions ?? 0}
            label="お気に入りを学習"
            status="favorite"
          />
        </div>
      </section>

      <section aria-label="学習の進捗" className="surface-card home-progress-card">
        <h2>学習の進捗</h2>
        <p>
          現在の理解度は{' '}
          <strong>
            {overall?.latestCorrectRate === undefined ? '未学習' : `${overall.latestCorrectRate}%`}
          </strong>
          ・直近7日間の回答数は <strong>{overall?.recentSevenDayAnswerCount ?? 0}問</strong> です。
        </p>
        <Link className="secondary-button" to="/progress">
          詳しい成績を見る
        </Link>
      </section>

      <section aria-label="優先して復習する分野" className="surface-card home-weak-card">
        <h2>優先して復習する分野</h2>
        {analytics === undefined || analytics.weakCategories.length === 0 ? (
          <p>回答が3問以上になると、優先して復習する分野を案内します。</p>
        ) : (
          <ol className="home-weak-list">
            {analytics.weakCategories.map((category) => (
              <li key={category.id}>
                <strong>{category.name}</strong>
                <span>最新正答率 {category.latestCorrectRate}%</span>
                <Link
                  state={{
                    initialFilters: {
                      ...defaultPracticeFilters,
                      categoryIds: [category.id],
                      answerStatus:
                        category.currentlyIncorrectQuestions > 0 ? 'incorrect' : 'unanswered',
                    },
                  }}
                  to="/practice"
                >
                  {category.recommendation}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="模擬試験" className="surface-card home-exam-card">
        <h2>模擬試験</h2>
        {examOverview.inProgress !== undefined ? (
          <>
            <p>
              {getExamName(examOverview.inProgress.examType)}を保存しています。現在位置{' '}
              {examOverview.inProgress.currentIndex + 1} /{' '}
              {examOverview.inProgress.questionCodes.length}問・ 残り時間{' '}
              {formatExamRemainingTime(
                getExamTimerState(examOverview.inProgress.deadlineAt).remainingSeconds,
              )}
            </p>
            <Link className="primary-button" to={`/exam/${examOverview.inProgress.id}`}>
              模試の続き
            </Link>
          </>
        ) : (
          <>
            <p>30問・50分の本番形式で、実力を確認できます。</p>
            <Link className="primary-button" to="/exam">
              模擬試験を始める
            </Link>
          </>
        )}
        <p className="muted-text">
          模試受験回数 {examOverview.totalAttempts}回
          {examOverview.latestResult === undefined
            ? '・直近結果: 未受験'
            : `・直近結果: ${examOverview.latestResult.correct} / ${examOverview.latestResult.total}問（${examOverview.latestResult.passed ? '合格' : '不合格'}）`}
        </p>
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
