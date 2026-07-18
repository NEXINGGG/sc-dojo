import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { database } from '../database/database';
import {
  analyticsPeriods,
  filterLearningHistory,
  getAnalyticsPeriodLabel,
  type AnalyticsPeriod,
  type LearningHistoryFilter,
  type ProgressAnalytics,
} from '../domain/progress';
import {
  CategoryStatisticsSection,
  DailyLearningSection,
  DifficultyStatisticsSection,
  DomainStatisticsSection,
  ExamTrendSection,
  LearningHistorySection,
  MetricGrid,
  WeakCategoriesSection,
} from '../features/progress/ProgressSections';
import { formatRate } from '../features/progress/progressFormat';
import { ProgressRepository } from '../features/progress/progressRepository';

const progressRepository = new ProgressRepository(database);

export function ProgressPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [analytics, setAnalytics] = useState<ProgressAnalytics>();
  const [historyFilter, setHistoryFilter] = useState<LearningHistoryFilter>('all');
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCurrent = true;
    setAnalytics(undefined);
    setError(undefined);

    async function loadAnalytics() {
      try {
        const result = await progressRepository.getAnalytics(period);
        if (isCurrent) {
          setAnalytics(result);
        }
      } catch {
        if (isCurrent) {
          setError(
            '成績を読み込めませんでした。端末の保存領域を確認して、画面を再読み込みしてください。',
          );
        }
      }
    }

    void loadAnalytics();
    return () => {
      isCurrent = false;
    };
  }, [period]);

  const filteredHistory = useMemo(
    () => (analytics === undefined ? [] : filterLearningHistory(analytics.history, historyFilter)),
    [analytics, historyFilter],
  );

  function updatePeriod(nextPeriod: AnalyticsPeriod) {
    setPeriod(nextPeriod);
    setHistoryFilter('all');
    setVisibleHistoryCount(20);
  }

  function updateHistoryFilter(nextFilter: LearningHistoryFilter) {
    setHistoryFilter(nextFilter);
    setVisibleHistoryCount(20);
  }

  return (
    <>
      <PageHeader
        description="現在の理解度と、これまでの全回答実績を分けて確認できます。次に復習する分野も案内します。"
        title="成績"
      />

      <section aria-label="成績の期間" className="surface-card period-filter-card">
        <h2>表示する期間</h2>
        <p>
          全回答実績、日別推移、模試・学習履歴に反映します。現在の理解度は全期間の最新回答です。
        </p>
        <div className="segmented-options period-options">
          {analyticsPeriods.map((option) => (
            <label className="filter-option" key={option}>
              <input
                checked={period === option}
                name="analytics-period"
                onChange={() => updatePeriod(option)}
                type="radio"
              />
              <span>{getAnalyticsPeriodLabel(option)}</span>
            </label>
          ))}
        </div>
      </section>

      {error !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>成績を確認できませんでした</strong>
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            再読み込み
          </button>
        </section>
      ) : null}

      {analytics === undefined && error === undefined ? (
        <section aria-live="polite" className="surface-card loading-card">
          <p>成績を集計しています。</p>
        </section>
      ) : null}

      {analytics !== undefined ? (
        <>
          <MetricGrid
            label="全体の学習進捗"
            metrics={[
              {
                label: '学習済み問題',
                value: `${analytics.overall.studiedQuestions} / ${analytics.overall.totalQuestions}問`,
                description: `未回答 ${analytics.overall.unansweredQuestions}問`,
              },
              {
                label: '現在の理解度',
                value: formatRate(analytics.overall.latestCorrectRate),
                description: `最新回答で正解 ${analytics.overall.latestCorrectQuestions}問`,
              },
              {
                label: '現在間違えている問題',
                value: `${analytics.overall.currentlyIncorrectQuestions}問`,
                description: '各問題の最新回答で集計',
              },
              {
                label: '全回答実績（全期間）',
                value: `${analytics.overall.totalAnswerCount}回・${formatRate(analytics.overall.totalCorrectRate)}`,
                description: 'これまでのすべての確定回答',
              },
              {
                label: `${analytics.period.label}の全回答実績`,
                value: formatRate(analytics.period.correctRate),
                description: `${analytics.period.answerCount}回の確定回答`,
              },
              {
                label: '学習日数 / 連続学習',
                value: `${analytics.overall.learningDayCount}日 / ${analytics.overall.learningStreak}日`,
                description: '日本時間で集計',
              },
              {
                label: '模試受験回数',
                value: `${analytics.overall.examAttemptCount}回`,
                description:
                  analytics.overall.examHighestScore === undefined
                    ? 'まだ模試結果はありません'
                    : `最高 ${analytics.overall.examHighestScore}点`,
              },
              {
                label: '直近模試',
                value:
                  analytics.overall.latestExam === undefined
                    ? '未受験'
                    : `${analytics.overall.latestExam.correct} / ${analytics.overall.latestExam.total}問`,
                description:
                  analytics.overall.latestExam === undefined
                    ? '30問・50分の模試で確認できます'
                    : `${analytics.overall.latestExam.score}点・${analytics.overall.latestExam.passed ? '合格圏' : '要復習'}`,
              },
            ]}
          />

          <section aria-label="最近の学習" className="surface-card recent-progress-card">
            <h2>最近の学習</h2>
            <p>
              直近7日間の回答数は <strong>{analytics.overall.recentSevenDayAnswerCount}問</strong>{' '}
              です。
              {analytics.overall.previousSevenDayAnswerCount === undefined
                ? ' 比較する前の7日間の回答はありません。'
                : ` その前の7日間は${analytics.overall.previousSevenDayAnswerCount}問でした。`}
            </p>
            <p>直近30日間の学習日は {analytics.overall.recentThirtyDayLearningDays}日です。</p>
          </section>

          <WeakCategoriesSection categories={analytics.weakCategories} />
          <DomainStatisticsSection domains={analytics.domains} />
          <DifficultyStatisticsSection difficulties={analytics.difficulties} />
          <CategoryStatisticsSection categories={analytics.categories} />
          <DailyLearningSection daily={analytics.daily} period={period} />
          <ExamTrendSection exams={analytics.examTrend} />
          <LearningHistorySection
            filter={historyFilter}
            history={filteredHistory}
            onFilterChange={updateHistoryFilter}
            onShowMore={() => setVisibleHistoryCount((count) => count + 20)}
            visibleCount={visibleHistoryCount}
          />
          <section className="progress-home-link">
            <Link className="text-link" to="/">
              ホームで今日の学習を続ける
            </Link>
          </section>
        </>
      ) : null}
    </>
  );
}
