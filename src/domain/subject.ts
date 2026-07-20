export const subjectIds = ['a1', 'a2'] as const;

export type SubjectId = (typeof subjectIds)[number];

export interface SubjectConfig {
  id: SubjectId;
  label: string;
  shortLabel: string;
  description: string;
  questionCount: number;
  exam: {
    questionCount: number;
    durationSeconds: number;
    passingCorrectCount: number;
    passingScorePercent: number;
  };
}

export const subjectConfigs: Readonly<Record<SubjectId, SubjectConfig>> = {
  a1: {
    id: 'a1',
    label: 'A-1 基礎・共通知識',
    shortLabel: 'A-1',
    description: '基礎・共通知識を学習します。',
    questionCount: 240,
    exam: {
      questionCount: 30,
      durationSeconds: 50 * 60,
      passingCorrectCount: 18,
      passingScorePercent: 60,
    },
  },
  a2: {
    id: 'a2',
    label: 'A-2 ネットワーク専門',
    shortLabel: 'A-2',
    description: 'ネットワーク専門知識を学習します。',
    questionCount: 240,
    exam: {
      questionCount: 25,
      durationSeconds: 40 * 60,
      passingCorrectCount: 15,
      passingScorePercent: 60,
    },
  },
};

export function getSubjectConfig(subjectId: SubjectId): SubjectConfig {
  return subjectConfigs[subjectId];
}

export function isSubjectId(value: unknown): value is SubjectId {
  return value === 'a1' || value === 'a2';
}
