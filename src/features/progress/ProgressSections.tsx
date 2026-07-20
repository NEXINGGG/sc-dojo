import { Link } from 'react-router-dom';
import {
  type AnalyticsPeriod,
  type CategoryStatistics,
  type DailyLearningStatistics,
  type DifficultyStatistics,
  type DomainStatistics,
  type ExamTrendPoint,
  type LearningHistoryFilter,
  type LearningHistoryItem,
  type SegmentStatistics,
  type WeakCategory,
} from '../../domain/progress';
import type { SubjectConfig } from '../../domain/subject';
import { defaultPracticeFilters } from '../../domain/practice';
import { formatDate, formatDateTime, formatElapsed, formatRate } from './progressFormat';

interface Metric {
  label: string;
  value: string | number;
  description?: string;
}

export function MetricGrid({ label, metrics }: { label: string; metrics: readonly Metric[] }) {
  return (
    <section aria-label={label} className="study-summary-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.description !== undefined ? <small>{metric.description}</small> : null}
        </article>
      ))}
    </section>
  );
}

export function DomainStatisticsSection({ domains }: { domains: readonly DomainStatistics[] }) {
  return (
    <section aria-labelledby="domain-statistics-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="domain-statistics-heading">系統別成績</h2>
          <p>問題ごとの系統で集計しています。</p>
        </div>
        <span className="section-caption">現在の理解度・全回答実績</span>
      </div>
      <div className="segment-stat-grid">
        {domains.map((domain) => (
          <SegmentCard
            key={domain.id}
            label={domain.name}
            statistics={domain}
            tone={`domain-${domain.id}`}
          />
        ))}
      </div>
    </section>
  );
}

export function DifficultyStatisticsSection({
  difficulties,
}: {
  difficulties: readonly DifficultyStatistics[];
}) {
  return (
    <section aria-labelledby="difficulty-statistics-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="difficulty-statistics-heading">難易度別成績</h2>
          <p>少ない件数も省かずに表示しています。</p>
        </div>
      </div>
      <div className="segment-stat-grid">
        {difficulties.map((difficulty) => (
          <SegmentCard
            key={difficulty.difficulty}
            label={difficulty.difficulty}
            statistics={difficulty}
            tone="difficulty"
          />
        ))}
      </div>
    </section>
  );
}

export function WeakCategoriesSection({ categories }: { categories: readonly WeakCategory[] }) {
  return (
    <section aria-labelledby="weak-categories-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="weak-categories-heading">優先して復習する分野</h2>
          <p>回答済みが3問以上のカテゴリを、現在の正答率が低い順に表示します。</p>
        </div>
      </div>
      {categories.length === 0 ? (
        <div className="surface-card empty-progress-card">
          <strong>現在、強い苦手分野はありません</strong>
          <p>回答が3問以上になると、優先して復習する分野を案内します。</p>
        </div>
      ) : (
        <div className="weak-category-list">
          {categories.map((category) => (
            <article className="surface-card weak-category-card" key={category.id}>
              <div>
                <h3>{category.name}</h3>
                <p>{category.recommendation}</p>
              </div>
              <dl className="compact-metrics">
                <div>
                  <dt>最新正答率</dt>
                  <dd>{formatRate(category.latestCorrectRate)}</dd>
                </div>
                <div>
                  <dt>誤答</dt>
                  <dd>{category.currentlyIncorrectQuestions}問</dd>
                </div>
                <div>
                  <dt>未回答</dt>
                  <dd>{category.unansweredQuestions}問</dd>
                </div>
              </dl>
              <div className="card-action-row">
                {category.currentlyIncorrectQuestions > 0 ? (
                  <PracticeLink
                    answerStatus="incorrect"
                    categoryId={category.id}
                    label="誤答を復習"
                  />
                ) : category.unansweredQuestions > 0 ? (
                  <PracticeLink
                    answerStatus="unanswered"
                    categoryId={category.id}
                    label="未回答を演習"
                  />
                ) : null}
                <Link className="text-link" to={`/progress/category/${category.id}`}>
                  詳細を見る
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function CategoryStatisticsSection({
  categories,
}: {
  categories: readonly CategoryStatistics[];
}) {
  return (
    <section aria-labelledby="category-statistics-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="category-statistics-heading">カテゴリ別成績</h2>
          <p>現在の理解度は各問題の最新回答、全回答実績はすべての確定回答で集計します。</p>
        </div>
      </div>
      <div className="category-stat-list">
        {categories.map((category) => (
          <article className="surface-card category-stat-card" key={category.id}>
            <div className="category-stat-heading">
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              <span className={`status-label status-${statusClass(category.status)}`}>
                {category.status}
              </span>
            </div>
            <dl className="category-stat-metrics">
              <MetricRow
                label="対象 / 回答済み"
                value={`${category.totalQuestions}問 / ${category.studiedQuestions}問`}
              />
              <MetricRow
                label="未回答 / 現在の誤答"
                value={`${category.unansweredQuestions}問 / ${category.currentlyIncorrectQuestions}問`}
              />
              <MetricRow label="最新状態正答率" value={formatRate(category.latestCorrectRate)} />
              <MetricRow label="学習進捗" value={`${category.progressRate}%`} />
              <MetricRow
                label="全回答実績"
                value={`${category.totalAnswerCount}回・${formatRate(category.totalCorrectRate)}`}
              />
              <MetricRow label="お気に入り" value={`${category.favoriteQuestions}問`} />
            </dl>
            <div className="card-action-row">
              <PracticeLink
                answerStatus="unanswered"
                categoryId={category.id}
                disabled={category.unansweredQuestions === 0}
                label="未回答"
              />
              <PracticeLink
                answerStatus="incorrect"
                categoryId={category.id}
                disabled={category.currentlyIncorrectQuestions === 0}
                label="誤答を復習"
              />
              <PracticeLink
                answerStatus="all"
                categoryId={category.id}
                disabled={category.totalQuestions === 0}
                label="全問を演習"
              />
              <Link className="text-link" to={`/progress/category/${category.id}`}>
                詳細
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DailyLearningSection({
  daily,
  period,
}: {
  daily: readonly DailyLearningStatistics[];
  period: AnalyticsPeriod;
}) {
  const maximum = Math.max(1, ...daily.map((day) => day.answerCount));
  const description = daily
    .map((day) => `${formatDate(day.date)}: ${day.answerCount}問、正解${day.correctCount}問`)
    .join('。');

  return (
    <section aria-labelledby="daily-learning-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="daily-learning-heading">日別学習推移</h2>
          <p>{period === 'all' ? '全期間' : '選択期間'}の全回答実績です。日付は日本時間です。</p>
        </div>
      </div>
      <div
        aria-label={`日別の回答数。${description || '回答履歴はありません。'}`}
        className="daily-chart"
        role="img"
      >
        {daily.map((day) => (
          <div className="daily-chart-column" key={day.date}>
            <span aria-hidden="true" className="daily-chart-value">
              {day.answerCount}
            </span>
            <span
              aria-hidden="true"
              className="daily-chart-bar"
              style={{ height: `${Math.max(2, (day.answerCount / maximum) * 100)}%` }}
            />
            <span aria-hidden="true" className="daily-chart-label">
              {day.date.slice(5).replace('-', '/')}
            </span>
          </div>
        ))}
      </div>
      <details className="progress-data-table">
        <summary>日別の数値を表示する</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">日付</th>
              <th scope="col">回答</th>
              <th scope="col">正解</th>
              <th scope="col">不正解</th>
              <th scope="col">正答率</th>
              <th scope="col">通常演習</th>
              <th scope="col">模試</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((day) => (
              <tr key={day.date}>
                <td>{formatDate(day.date)}</td>
                <td>{day.answerCount}</td>
                <td>{day.correctCount}</td>
                <td>{day.incorrectCount}</td>
                <td>{formatRate(day.correctRate)}</td>
                <td>{day.completedPracticeCount}</td>
                <td>{day.examCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export function ExamTrendSection({
  exams,
  exam,
}: {
  exams: readonly ExamTrendPoint[];
  exam: SubjectConfig['exam'];
}) {
  return (
    <section aria-labelledby="exam-trend-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="exam-trend-heading">模試得点推移</h2>
          <p>
            合格の目安は{exam.passingCorrectCount} / {exam.questionCount}
            問です（公式判定ではありません）。
          </p>
        </div>
      </div>
      {exams.length === 0 ? (
        <div className="surface-card empty-progress-card">
          <strong>まだ模試を受験していません</strong>
          <p>
            {exam.questionCount}問・{exam.durationSeconds / 60}
            分の模試で、今の理解度を確かめましょう。
          </p>
          <Link className="secondary-button" to="/exam">
            模擬試験へ
          </Link>
        </div>
      ) : (
        <ol className="exam-trend-list">
          {exams.map((exam) => (
            <li key={exam.id}>
              <Link className="surface-card exam-trend-card" to={`/exam/${exam.id}/result`}>
                <span>{formatDateTime(exam.submittedAt)}</span>
                <strong>{exam.name}</strong>
                <span>
                  {exam.correct} / {exam.total}問
                </span>
                <span>{exam.score}点</span>
                <span>{exam.passed ? '合格圏' : '要復習'}</span>
                <span>経過 {formatElapsed(exam.elapsedSeconds)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LearningHistorySection({
  history,
  filter,
  onFilterChange,
  visibleCount,
  onShowMore,
}: {
  history: readonly LearningHistoryItem[];
  filter: LearningHistoryFilter;
  onFilterChange: (filter: LearningHistoryFilter) => void;
  visibleCount: number;
  onShowMore: () => void;
}) {
  const visible = history.slice(0, visibleCount);
  return (
    <section aria-labelledby="learning-history-heading" className="progress-section">
      <div className="section-heading-row">
        <div>
          <h2 id="learning-history-heading">学習履歴</h2>
          <p>通常演習と模試を新しい順に表示します。</p>
        </div>
      </div>
      <label className="history-filter-label">
        種別で絞り込む
        <select
          aria-label="学習履歴の種別"
          onChange={(event) => onFilterChange(event.target.value as LearningHistoryFilter)}
          value={filter}
        >
          <option value="all">すべて</option>
          <option value="normal_practice">通常演習</option>
          <option value="review_unanswered">未回答演習</option>
          <option value="review_incorrect">誤答演習</option>
          <option value="review_favorite">お気に入り演習</option>
          <option value="mock_exam_fixed_1">固定模試1</option>
          <option value="mock_exam_fixed_2">固定模試2</option>
          <option value="mock_exam_random">ランダム模試</option>
        </select>
      </label>
      {history.length === 0 ? (
        <div className="surface-card empty-progress-card">
          <strong>この期間の学習履歴はありません</strong>
          <p>通常演習または模試を完了すると、ここに記録されます。</p>
        </div>
      ) : (
        <>
          <ol className="learning-history-list">
            {visible.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link className="surface-card learning-history-card" to={item.detailPath}>
                  <span>{formatDateTime(item.happenedAt)}</span>
                  <strong>{item.typeLabel}</strong>
                  <span>
                    {item.total}問・正解{item.correct}問・不正解{item.incorrect}問・未回答
                    {item.unanswered}問
                  </span>
                  <span>
                    正答率 {formatRate(item.correctRate)}・経過 {formatElapsed(item.elapsedSeconds)}
                  </span>
                  <small>{item.conditions}</small>
                </Link>
              </li>
            ))}
          </ol>
          {history.length > visible.length ? (
            <button className="secondary-button" onClick={onShowMore} type="button">
              さらに20件表示する
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function SegmentCard({
  label,
  statistics,
  tone,
}: {
  label: string;
  statistics: SegmentStatistics;
  tone: string;
}) {
  return (
    <article className={`surface-card segment-stat-card ${tone}`}>
      <h3>{label}</h3>
      <dl className="segment-stat-metrics">
        <MetricRow
          label="対象 / 回答済み"
          value={`${statistics.totalQuestions}問 / ${statistics.studiedQuestions}問`}
        />
        <MetricRow label="最新状態正答率" value={formatRate(statistics.latestCorrectRate)} />
        <MetricRow
          label="現在の誤答 / 未回答"
          value={`${statistics.currentlyIncorrectQuestions}問 / ${statistics.unansweredQuestions}問`}
        />
        <MetricRow label="学習進捗" value={`${statistics.progressRate}%`} />
        <MetricRow
          label="全回答実績"
          value={`${statistics.totalAnswerCount}回・${formatRate(statistics.totalCorrectRate)}`}
        />
      </dl>
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PracticeLink({
  categoryId,
  answerStatus,
  label,
  disabled = false,
}: {
  categoryId: string;
  answerStatus: 'all' | 'unanswered' | 'incorrect';
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
          answerStatus,
        },
      }}
      to="/practice"
    >
      {label}
    </Link>
  );
}

function statusClass(status: CategoryStatistics['status']): string {
  switch (status) {
    case '得意':
      return 'strong';
    case '合格圏':
      return 'pass';
    case '要復習':
      return 'review';
    default:
      return 'pending';
  }
}
