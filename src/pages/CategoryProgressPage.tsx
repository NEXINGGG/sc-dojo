import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { getCategoryById } from '../data/catalog';
import { database } from '../database/database';
import {
  filterAndSortCategoryQuestions,
  getCategorySubcategories,
  type CategoryQuestionFilter,
  type CategoryQuestionSort,
  type ProgressAnalytics,
} from '../domain/progress';
import { defaultPracticeFilters } from '../domain/practice';
import { formatRate } from '../features/progress/progressFormat';
import { ProgressRepository } from '../features/progress/progressRepository';

const progressRepository = new ProgressRepository(database);

const filters: readonly { value: CategoryQuestionFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'unanswered', label: '未回答' },
  { value: 'correct', label: '正解' },
  { value: 'incorrect', label: '誤答' },
  { value: 'favorite', label: 'お気に入り' },
];

const sorts: readonly { value: CategoryQuestionSort; label: string }[] = [
  { value: 'code', label: '問題番号順' },
  { value: 'incorrect', label: '誤答優先' },
  { value: 'unanswered', label: '未回答優先' },
  { value: 'oldest', label: '最終回答が古い順' },
];

export function CategoryProgressPage() {
  const { categoryId } = useParams();
  const category = categoryId === undefined ? undefined : getCategoryById(categoryId);
  const [analytics, setAnalytics] = useState<ProgressAnalytics>();
  const [filter, setFilter] = useState<CategoryQuestionFilter>('all');
  const [sort, setSort] = useState<CategoryQuestionSort>('code');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCurrent = true;
    if (category === undefined) {
      return undefined;
    }

    async function loadAnalytics() {
      try {
        const result = await progressRepository.getAnalytics('all');
        if (isCurrent) {
          setAnalytics(result);
        }
      } catch {
        if (isCurrent) {
          setError('カテゴリの成績を読み込めませんでした。画面を再読み込みしてください。');
        }
      }
    }

    void loadAnalytics();
    return () => {
      isCurrent = false;
    };
  }, [category]);

  const categoryStats = analytics?.categories.find((item) => item.id === category?.id);
  const categoryQuestions = useMemo(
    () => analytics?.questions.filter((question) => question.categoryId === category?.id) ?? [],
    [analytics, category?.id],
  );
  const displayedQuestions = useMemo(
    () => filterAndSortCategoryQuestions(categoryQuestions, filter, sort),
    [categoryQuestions, filter, sort],
  );
  const subcategories = useMemo(
    () =>
      analytics === undefined || category === undefined
        ? []
        : getCategorySubcategories(analytics, category.id),
    [analytics, category],
  );

  if (category === undefined) {
    return (
      <section className="surface-card recovery-card">
        <h1>カテゴリが見つかりません</h1>
        <p>指定されたカテゴリは、現在のカテゴリデータにありません。</p>
        <Link className="primary-button" to="/progress">
          成績へ戻る
        </Link>
      </section>
    );
  }

  return (
    <>
      <PageHeader description={category.description} title={`${category.name}の成績`} />
      {error !== undefined ? (
        <section className="inline-notice inline-notice-warning" role="status">
          <strong>カテゴリの成績を確認できませんでした</strong>
          <p>{error}</p>
        </section>
      ) : null}
      {analytics === undefined && error === undefined ? (
        <section aria-live="polite" className="surface-card loading-card">
          <p>カテゴリの成績を集計しています。</p>
        </section>
      ) : null}
      {categoryStats !== undefined ? (
        <>
          <section className="surface-card category-detail-summary">
            <div className="category-stat-heading">
              <div>
                <h2>現在の理解度</h2>
                <p>各問題の最新回答で集計しています。</p>
              </div>
              <span className={`status-label status-${statusClass(categoryStats.status)}`}>
                {categoryStats.status}
              </span>
            </div>
            <dl className="category-stat-metrics">
              <Metric
                label="対象 / 回答済み"
                value={`${categoryStats.totalQuestions}問 / ${categoryStats.studiedQuestions}問`}
              />
              <Metric
                label="未回答 / 正解状態"
                value={`${categoryStats.unansweredQuestions}問 / ${categoryStats.latestCorrectQuestions}問`}
              />
              <Metric label="現在の誤答" value={`${categoryStats.currentlyIncorrectQuestions}問`} />
              <Metric label="最新状態正答率" value={formatRate(categoryStats.latestCorrectRate)} />
              <Metric label="学習進捗" value={`${categoryStats.progressRate}%`} />
              <Metric label="お気に入り" value={`${categoryStats.favoriteQuestions}問`} />
              <Metric
                label="全回答実績"
                value={`${categoryStats.totalAnswerCount}回・${formatRate(categoryStats.totalCorrectRate)}`}
              />
            </dl>
            <div className="card-action-row">
              <PracticeLink
                categoryId={category.id}
                label="未回答を演習"
                status="unanswered"
                disabled={categoryStats.unansweredQuestions === 0}
              />
              <PracticeLink
                categoryId={category.id}
                label="誤答を復習"
                status="incorrect"
                disabled={categoryStats.currentlyIncorrectQuestions === 0}
              />
              <PracticeLink
                categoryId={category.id}
                disabled={categoryStats.totalQuestions === 0}
                label="全問題を演習"
                status="all"
              />
            </div>
          </section>

          <section aria-labelledby="subcategory-heading" className="progress-section">
            <div className="section-heading-row">
              <div>
                <h2 id="subcategory-heading">小分類別成績</h2>
                <p>小分類ごとの現在の理解度です。</p>
              </div>
            </div>
            <div className="subcategory-stat-list">
              {subcategories.map((subcategory) => (
                <article className="surface-card subcategory-stat-card" key={subcategory.id}>
                  <h3>{subcategory.name}</h3>
                  <dl className="compact-metrics">
                    <Metric label="問題数" value={`${subcategory.totalQuestions}問`} />
                    <Metric label="回答済み" value={`${subcategory.studiedQuestions}問`} />
                    <Metric
                      label="現在の誤答"
                      value={`${subcategory.currentlyIncorrectQuestions}問`}
                    />
                    <Metric
                      label="最新状態正答率"
                      value={formatRate(subcategory.latestCorrectRate)}
                    />
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="category-question-list-heading" className="progress-section">
            <div className="section-heading-row">
              <div>
                <h2 id="category-question-list-heading">問題一覧</h2>
                <p>未回答の問題では、正解や解説をこの一覧に表示しません。</p>
              </div>
            </div>
            <div className="category-question-controls">
              <label>
                状態
                <select
                  aria-label="問題の状態で絞り込む"
                  onChange={(event) => setFilter(event.target.value as CategoryQuestionFilter)}
                  value={filter}
                >
                  {filters.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                並び替え
                <select
                  aria-label="問題の並び替え"
                  onChange={(event) => setSort(event.target.value as CategoryQuestionSort)}
                  value={sort}
                >
                  {sorts.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {displayedQuestions.length === 0 ? (
              <div className="surface-card empty-progress-card">
                <p>この条件に一致する問題はありません。</p>
              </div>
            ) : (
              <ol className="category-question-list">
                {displayedQuestions.map((question) => (
                  <li key={question.code}>
                    <Link
                      className="surface-card category-question-row"
                      to={`/history/${question.code}`}
                    >
                      <strong>{question.code}</strong>
                      <span>
                        {question.subcategory.trim() === '' ? 'その他' : question.subcategory}
                      </span>
                      <span>難易度: {question.difficulty}</span>
                      <span
                        className={`question-status question-status-${statusClass(question.status)}`}
                      >
                        {question.status}
                      </span>
                      <span>回答 {question.attemptCount}回</span>
                      <span>
                        最終回答:{' '}
                        {question.lastAnsweredAt === undefined
                          ? 'まだありません'
                          : formatDateTime(question.lastAnsweredAt)}
                      </span>
                      <span>{question.favorite ? '★ お気に入り' : '☆ 未登録'}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
      <Link className="text-link" to="/progress">
        成績一覧へ戻る
      </Link>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PracticeLink({
  categoryId,
  status,
  label,
  disabled = false,
}: {
  categoryId: string;
  status: 'all' | 'unanswered' | 'incorrect';
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span className="quick-start-disabled">{label}（現在ありません）</span>;
  }
  return (
    <Link
      className="secondary-button compact-action"
      state={{
        initialFilters: {
          ...defaultPracticeFilters,
          categoryIds: [categoryId],
          answerStatus: status,
        },
      }}
      to="/practice"
    >
      {label}
    </Link>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '日時を確認できません';
  }
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function statusClass(
  status: '判定中' | '得意' | '合格圏' | '要復習' | '未回答' | '正解' | '誤答',
): string {
  switch (status) {
    case '得意':
    case '正解':
      return 'strong';
    case '合格圏':
      return 'pass';
    case '要復習':
    case '誤答':
      return 'review';
    default:
      return 'pending';
  }
}
