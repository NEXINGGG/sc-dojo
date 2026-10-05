export const subjectIds = ['a1', 'a2', 'b1'] as const;

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
    label: '科目A-1 基礎・共通知識',
    shortLabel: '科目A-1',
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
    label: '科目A-2 セキュリティ専門',
    shortLabel: '科目A-2',
    description: 'セキュリティ専門知識を学習します。',
    questionCount: 240,
    exam: {
      questionCount: 25,
      durationSeconds: 40 * 60,
      passingCorrectCount: 15,
      passingScorePercent: 60,
    },
  },
  b1: {
    id: 'b1',
    label: '科目B 記述式',
    shortLabel: '科目B',
    description: '公式PDFを参照して、記述式の答案を練習します。',
    questionCount: 83,
    exam: {
      questionCount: 2,
      durationSeconds: 90 * 60,
      passingCorrectCount: 0,
      passingScorePercent: 0,
    },
  },
};

export function getSubjectConfig(subjectId: SubjectId): SubjectConfig {
  return subjectConfigs[subjectId];
}

export function isSubjectId(value: unknown): value is SubjectId {
  return value === 'a1' || value === 'a2' || value === 'b1';
}
