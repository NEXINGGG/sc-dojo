import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { database } from '../../database/database';
import { getSubjectConfig, type SubjectId } from '../../domain/subject';
import { SettingsRepository } from '../settings/settingsRepository';

interface SubjectContextValue {
  subjectId: SubjectId;
  isLoading: boolean;
  error?: string;
  selectSubject: (subjectId: SubjectId) => Promise<void>;
}

const SubjectContext = createContext<SubjectContextValue | undefined>(undefined);
const settings = new SettingsRepository(database);

export function SubjectProvider({ children }: PropsWithChildren) {
  const [subjectId, setSubjectId] = useState<SubjectId>('a1');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void settings
      .getSelectedSubject()
      .then((stored) => {
        if (active) {
          setSubjectId(stored);
        }
      })
      .catch(() => {
        if (active) {
          setError('科目設定を読み込めませんでした。科目A-1を表示しています。');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectSubject = useCallback(
    async (next: SubjectId) => {
      const previous = subjectId;
      setSubjectId(next);
      setError(undefined);
      try {
        await settings.saveSelectedSubject(next);
      } catch {
        setSubjectId(previous);
        setError('科目の切替えを保存できませんでした。もう一度お試しください。');
        throw new Error('科目設定の保存に失敗しました。');
      }
    },
    [subjectId],
  );

  const value = useMemo<SubjectContextValue>(
    () => ({ subjectId, isLoading, error, selectSubject }),
    [error, isLoading, selectSubject, subjectId],
  );

  return <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>;
}

// The hook intentionally shares this component module's provider state.
// eslint-disable-next-line react-refresh/only-export-components
export function useSubject(): SubjectContextValue {
  const context = useContext(SubjectContext);
  if (context === undefined) {
    throw new Error('SubjectProvider の配下で使用してください。');
  }
  return context;
}

export function SubjectSwitcher() {
  const { subjectId, isLoading, selectSubject } = useSubject();
  return (
    <section aria-label="学習する科目" className="subject-switcher surface-card">
      <p className="eyebrow">学習する科目</p>
      <div aria-label="科目を選択" className="subject-switcher-options" role="radiogroup">
        {(['a1', 'a2', 'b1'] as const).map((id) => {
          const config = getSubjectConfig(id);
          return (
            <button
              aria-checked={subjectId === id}
              className={`subject-switcher-option${subjectId === id ? ' is-selected' : ''}`}
              disabled={isLoading}
              key={id}
              onClick={() => void selectSubject(id)}
              role="radio"
              type="button"
            >
              <strong>{config.label}</strong>
              <span>{config.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
