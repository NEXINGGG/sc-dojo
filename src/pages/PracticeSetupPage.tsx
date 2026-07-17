import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { categories, domains, questions } from '../data/catalog';
import { database } from '../database/database';
import {
  clonePracticeFilters,
  countQuestionsByCategory,
  countQuestionsByDifficulty,
  createPracticeSession,
  createPracticeSessionId,
  defaultPracticeFilters,
  practiceQuestionCounts,
  selectPracticeQuestions,
  type PracticeFilters,
} from '../domain/practice';
import {
  ActivePracticeSessionExistsError,
  PracticeSessionRepository,
} from '../features/practice/practiceSessionRepository';
import { difficulties, type Difficulty } from '../types/question';

const practiceSessions = new PracticeSessionRepository(database);

interface PracticeSetupLocationState {
  initialFilters?: PracticeFilters;
  notice?: string;
}

function readInitialFilters(state: unknown): PracticeFilters {
  if (typeof state !== 'object' || state === null || !('initialFilters' in state)) {
    return clonePracticeFilters(defaultPracticeFilters);
  }

  const candidate = (state as PracticeSetupLocationState).initialFilters;
  if (
    candidate === undefined ||
    !Array.isArray(candidate.categoryIds) ||
    !candidate.categoryIds.every((categoryId) => typeof categoryId === 'string')
  ) {
    return clonePracticeFilters(defaultPracticeFilters);
  }

  return clonePracticeFilters(candidate);
}

function readNotice(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) {
    return undefined;
  }

  const notice = (state as PracticeSetupLocationState).notice;
  return typeof notice === 'string' ? notice : undefined;
}

export function PracticeSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<PracticeFilters>(() => readInitialFilters(location.state));
  const [message, setMessage] = useState<string | undefined>(() => readNotice(location.state));
  const [pendingSession, setPendingSession] = useState<ReturnType<typeof createPracticeSession>>();
  const [isSaving, setIsSaving] = useState(false);

  const selectedQuestions = useMemo(() => selectPracticeQuestions(questions, filters), [filters]);
  const categoryCounts = useMemo(() => countQuestionsByCategory(questions, filters), [filters]);
  const difficultyCounts = useMemo(() => countQuestionsByDifficulty(questions, filters), [filters]);

  function updateFilters(update: Partial<PracticeFilters>) {
    setMessage(undefined);
    setFilters((current) => ({
      ...current,
      ...update,
      categoryIds: update.categoryIds === undefined ? current.categoryIds : [...update.categoryIds],
    }));
  }

  function toggleCategory(categoryId: string) {
    const nextCategoryIds = filters.categoryIds.includes(categoryId)
      ? filters.categoryIds.filter((id) => id !== categoryId)
      : [...filters.categoryIds, categoryId];
    updateFilters({ categoryIds: nextCategoryIds });
  }

  async function persistNewSession(
    session: ReturnType<typeof createPracticeSession>,
    replace: boolean,
  ) {
    setIsSaving(true);
    setMessage(undefined);

    try {
      if (replace) {
        await practiceSessions.replaceInProgress(session);
      } else {
        await practiceSessions.createInProgress(session);
      }
      navigate(`/practice/${session.id}`);
    } catch (error) {
      if (error instanceof ActivePracticeSessionExistsError) {
        const active = await practiceSessions.getInProgress();
        if (active !== undefined) {
          setPendingSession(session);
          return;
        }
      }
      setMessage(
        '途中の演習を保存できませんでした。端末の空き容量を確認して、もう一度お試しください。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function startPractice() {
    if (selectedQuestions.length === 0) {
      setMessage(
        'この条件に一致する問題はありません。カテゴリまたは難易度の条件を変更してください。',
      );
      return;
    }

    const now = new Date().toISOString();
    const session = createPracticeSession(
      selectedQuestions.map((question) => question.code),
      filters,
      { id: createPracticeSessionId(), now },
    );

    try {
      const active = await practiceSessions.getInProgress();
      if (active !== undefined) {
        setPendingSession(session);
        return;
      }
      await persistNewSession(session, false);
    } catch {
      setMessage(
        '途中の演習を確認できませんでした。端末の保存領域を確認して、もう一度お試しください。',
      );
    }
  }

  function resetFilters() {
    setFilters(clonePracticeFilters(defaultPracticeFilters));
    setMessage(undefined);
  }

  return (
    <>
      <PageHeader
        description="出題条件を選ぶと、登録順またはランダム順で演習できます。"
        title="通常演習"
      />

      {message !== undefined ? (
        <section aria-live="polite" className="inline-notice inline-notice-warning" role="status">
          <strong>確認してください</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <form
        aria-label="通常演習の条件"
        className="practice-setup"
        onSubmit={(event) => {
          event.preventDefault();
          void startPractice();
        }}
      >
        <fieldset className="surface-card filter-section">
          <legend>系統</legend>
          <p className="filter-help">問題ごとの系統で絞り込みます。</p>
          <div className="segmented-options">
            <label className="filter-option">
              <input
                checked={filters.domainId === 'all'}
                name="domain"
                onChange={() => updateFilters({ domainId: 'all' })}
                type="radio"
              />
              <span>すべて</span>
            </label>
            {domains.map((domain) => (
              <label className={`filter-option domain-${domain.id}`} key={domain.id}>
                <input
                  checked={filters.domainId === domain.id}
                  name="domain"
                  onChange={() => updateFilters({ domainId: domain.id })}
                  type="radio"
                />
                <span>{domain.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="surface-card filter-section">
          <legend>カテゴリ</legend>
          <p className="filter-help">
            複数選択できます。選ばない場合はすべてのカテゴリが対象です。
          </p>
          <label className="filter-option filter-option-all">
            <input
              checked={filters.categoryIds.length === 0}
              name="all-categories"
              onChange={() => updateFilters({ categoryIds: [] })}
              type="checkbox"
            />
            <span>すべて</span>
          </label>
          <div className="check-option-list">
            {categories.map((category) => {
              const count = categoryCounts.get(category.id) ?? 0;
              return (
                <label className="check-option" key={category.id}>
                  <input
                    checked={filters.categoryIds.includes(category.id)}
                    disabled={count === 0 && !filters.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    type="checkbox"
                  />
                  <span>{category.name}</span>
                  <small>{count}問</small>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="surface-card filter-section">
          <legend>難易度</legend>
          <div className="segmented-options">
            <label className="filter-option">
              <input
                checked={filters.difficulty === 'all'}
                name="difficulty"
                onChange={() => updateFilters({ difficulty: 'all' })}
                type="radio"
              />
              <span>すべて</span>
            </label>
            {difficulties.map((difficulty) => (
              <DifficultyOption
                count={difficultyCounts.get(difficulty) ?? 0}
                isSelected={filters.difficulty === difficulty}
                key={difficulty}
                onSelect={() => updateFilters({ difficulty })}
                value={difficulty}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="surface-card filter-section">
          <legend>出題数</legend>
          <div className="segmented-options">
            {practiceQuestionCounts.map((count) => (
              <label className="filter-option" key={count}>
                <input
                  checked={filters.questionCount === count}
                  name="question-count"
                  onChange={() => updateFilters({ questionCount: count })}
                  type="radio"
                />
                <span>{count === 'all' ? 'すべて' : `${count}問`}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="surface-card filter-section">
          <legend>出題順</legend>
          <div className="segmented-options">
            <label className="filter-option">
              <input
                checked={filters.order === 'registered'}
                name="order"
                onChange={() => updateFilters({ order: 'registered' })}
                type="radio"
              />
              <span>登録順</span>
            </label>
            <label className="filter-option">
              <input
                checked={filters.order === 'random'}
                name="order"
                onChange={() => updateFilters({ order: 'random' })}
                type="radio"
              />
              <span>ランダム</span>
            </label>
          </div>
        </fieldset>

        <section aria-live="polite" className="practice-count-summary">
          <strong>出題予定: {selectedQuestions.length}問</strong>
          <span>
            {filters.questionCount === 'all'
              ? '条件に合う全問を出題します。'
              : `最大${filters.questionCount}問を出題します。`}
          </span>
        </section>

        <div className="setup-actions">
          <button className="secondary-button" onClick={resetFilters} type="button">
            初期状態へ戻す
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? '保存中…' : 'この条件で始める'}
          </button>
        </div>
      </form>

      {pendingSession !== undefined ? (
        <ConfirmDialog
          description="途中の通常演習が保存されています。続きから再開するか、破棄して新しい条件で始めるかを選んでください。"
          title="前回の通常演習があります"
        >
          <button
            className="primary-button"
            onClick={async () => {
              const active = await practiceSessions.getInProgress();
              if (active === undefined) {
                setPendingSession(undefined);
                setMessage('途中の演習が見つかりませんでした。もう一度開始してください。');
                return;
              }
              navigate(`/practice/${active.id}`);
            }}
            type="button"
          >
            前回の続きから再開
          </button>
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={() => void persistNewSession(pendingSession, true)}
            type="button"
          >
            前回を破棄して新しく開始
          </button>
          <button
            className="text-button"
            onClick={() => setPendingSession(undefined)}
            type="button"
          >
            キャンセル
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

interface DifficultyOptionProps {
  value: Difficulty;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
}

function DifficultyOption({ value, count, isSelected, onSelect }: DifficultyOptionProps) {
  const disabled = count === 0 && !isSelected;

  return (
    <label className="filter-option">
      <input
        checked={isSelected}
        disabled={disabled}
        name="difficulty"
        onChange={onSelect}
        type="radio"
      />
      <span>{value}</span>
      <small>{count}問</small>
      {disabled ? <em>該当する問題がありません</em> : null}
    </label>
  );
}
