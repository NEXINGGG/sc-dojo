import a1CategoriesPayload from '../../data/categories.json';
import a1QuestionsPayload from '../../data/questions.json';
import a2CategoriesPayload from '../../data/a2-categories.json';
import a2QuestionsPayload from '../../data/a2-questions.json';
import pilotQuestionsPayload from '../../data/sc-a2-pilot-30.json';
import pilotCategoriesPayload from '../../data/sc-a2-categories-draft.json';
import { isScA2Pilot } from './pilotMode';
import { calculateQuestionContentHash } from '../domain/questionContent.mjs';
import type { SubjectId } from '../domain/subject';
import type {
  Category,
  Choice,
  ChoiceId,
  Difficulty,
  Domain,
  Priority,
  Question,
  QuestionSet,
  QuestionSource,
  QuestionStimulus,
  Subcategory,
} from '../types/question';

interface RawChoice {
  id: ChoiceId;
  text: string;
  stimulus?: readonly QuestionStimulus[];
}

export interface RawQuestion {
  id: number;
  code: string;
  domain_id: string;
  category_id: string;
  subcategory_id: string;
  subcategory: string;
  difficulty: Difficulty;
  priority: Priority;
  question: string;
  choices: RawChoice[];
  correct_choice: ChoiceId;
  explanation: string;
  choice_explanations?: Readonly<Record<ChoiceId, string>>;
  exam_tip?: string;
  related_terms?: readonly string[];
  memory_point: string;
  question_set: QuestionSet;
  source: QuestionSource;
  status: string;
  schema_version: number;
  original_category_label?: string;
  content_hash?: string;
  stimulus?: readonly QuestionStimulus[];
}

export interface RawQuestionPayload {
  schema_version: number;
  metadata: Record<string, unknown> & { dataset_version?: string };
  questions: RawQuestion[];
}

interface RawCategory {
  id: string;
  name: string;
  order: number;
  default_domain: string;
  priority: Priority;
  description: string;
  subcategories: Subcategory[];
}

interface RawCategoriesPayload {
  schema_version: number;
  domains: Domain[];
  categories: RawCategory[];
}

export interface SubjectCatalog {
  subjectId: SubjectId;
  questionDataVersion: number;
  questionMetadata: Record<string, unknown>;
  datasetVersion?: string;
  categoryDataVersion: number;
  questions: readonly Question[];
  categories: readonly Category[];
  domains: readonly Domain[];
  getQuestionByCode: (code: string) => Question | undefined;
  getCategoryById: (categoryId: string) => Category | undefined;
  getDomainById: (domainId: string) => Domain | undefined;
  getQuestionsInSet: (questionSetId: string) => readonly Question[];
}

type ChoiceSubjectId = Exclude<SubjectId, 'b1'>;

function toChoice(choice: RawChoice): Choice {
  return {
    id: choice.id,
    text: choice.text,
    ...(choice.stimulus === undefined ? {} : { stimulus: choice.stimulus }),
  };
}

export function toQuestion(
  question: RawQuestion,
  subjectId: SubjectId,
  datasetVersion?: string,
): Question {
  return {
    subjectId,
    id: String(question.id),
    code: question.code,
    ...(subjectId === 'a1'
      ? {
          sourceId: question.source.source_id ?? `SC-A1-ORIGINAL-${question.code.slice(3)}`,
          contentHash: calculateQuestionContentHash(question),
          datasetVersion: datasetVersion ?? 'legacy-sc-a1-v0',
        }
      : {
          ...(question.source.source_id === undefined ? {} : { sourceId: question.source.source_id }),
          ...(question.content_hash === undefined ? {} : { contentHash: question.content_hash }),
          ...(datasetVersion === undefined ? {} : { datasetVersion }),
        }),
    ...(question.stimulus === undefined ? {} : { stimulus: question.stimulus }),
    domainId: question.domain_id,
    categoryId: question.category_id,
    subcategoryId: question.subcategory_id,
    subcategory: question.subcategory,
    difficulty: question.difficulty,
    priority: question.priority,
    question: question.question,
    choices: question.choices.map(toChoice),
    correctChoice: question.correct_choice,
    explanation: question.explanation,
    ...(question.choice_explanations === undefined
      ? {}
      : { choiceExplanations: question.choice_explanations }),
    ...(question.exam_tip === undefined ? {} : { examTip: question.exam_tip }),
    ...(question.related_terms === undefined ? {} : { relatedTerms: question.related_terms }),
    memoryPoint: question.memory_point,
    questionSet: question.question_set,
    source: question.source,
    status: question.status,
    schemaVersion: question.schema_version,
    originalCategoryLabel: question.original_category_label ?? '',
  };
}

function toCategory(category: RawCategory): Category {
  return {
    id: category.id,
    name: category.name,
    order: category.order,
    defaultDomain: category.default_domain,
    priority: category.priority,
    description: category.description,
    subcategories: category.subcategories,
  };
}

export function createCatalog(
  subjectId: SubjectId,
  rawQuestions: RawQuestionPayload,
  rawCategories: RawCategoriesPayload,
): SubjectCatalog {
  const datasetVersion = rawQuestions.metadata.dataset_version;
  const subjectQuestions = rawQuestions.questions.map((question) =>
    toQuestion(question, subjectId, datasetVersion),
  );
  const subjectCategories = rawCategories.categories.map(toCategory);
  const questionByCode = new Map(subjectQuestions.map((question) => [question.code, question]));
  const categoryById = new Map(subjectCategories.map((category) => [category.id, category]));
  const domainById = new Map(rawCategories.domains.map((domain) => [domain.id, domain]));

  return {
    subjectId,
    questionDataVersion: rawQuestions.schema_version,
    questionMetadata: rawQuestions.metadata,
    datasetVersion,
    categoryDataVersion: rawCategories.schema_version,
    questions: subjectQuestions,
    categories: subjectCategories,
    domains: rawCategories.domains,
    getQuestionByCode: (code) => questionByCode.get(code),
    getCategoryById: (categoryId) => categoryById.get(categoryId),
    getDomainById: (domainId) => domainById.get(domainId),
    getQuestionsInSet: (questionSetId) =>
      subjectQuestions
        .filter((question) => question.questionSet.id === questionSetId)
        .sort((a, b) => (a.questionSet.sequence ?? 0) - (b.questionSet.sequence ?? 0)),
  };
}

const catalogs: Readonly<Record<ChoiceSubjectId, SubjectCatalog>> = {
  a1: createCatalog(
    'a1',
    a1QuestionsPayload as RawQuestionPayload,
    a1CategoriesPayload as RawCategoriesPayload,
  ),
  a2: createCatalog(
    'a2',
    (isScA2Pilot ? pilotQuestionsPayload : a2QuestionsPayload) as RawQuestionPayload,
    (isScA2Pilot ? pilotCategoriesPayload : a2CategoriesPayload) as RawCategoriesPayload,
  ),
};

const allQuestionByCode = new Map(
  Object.values(catalogs).flatMap((catalog) =>
    catalog.questions.map((question) => [question.code, question] as const),
  ),
);

export function getSubjectCatalog(subjectId: SubjectId): SubjectCatalog {
  if (subjectId === 'b1') {
    throw new Error('科目Bは公式PDF参照方式のため、四肢択一の問題カタログを使用しません。');
  }
  return catalogs[subjectId];
}

// These A-1 aliases preserve the original module API for existing integrations.
export const questionDataVersion = catalogs.a1.questionDataVersion;
export const questionMetadata = catalogs.a1.questionMetadata;
export const categoryDataVersion = catalogs.a1.categoryDataVersion;
export const questions = catalogs.a1.questions;
export const categories = catalogs.a1.categories;
export const domains = catalogs.a1.domains;
export const allQuestions: readonly Question[] = [
  ...catalogs.a1.questions,
  ...catalogs.a2.questions,
];

export function getQuestionByCode(code: string, subjectId?: SubjectId): Question | undefined {
  if (subjectId === 'b1') {
    return undefined;
  }
  return subjectId === undefined
    ? allQuestionByCode.get(code)
    : catalogs[subjectId].getQuestionByCode(code);
}

export function getCategoryById(
  categoryId: string,
  subjectId: SubjectId = 'a1',
): Category | undefined {
  if (subjectId === 'b1') {
    return undefined;
  }
  return catalogs[subjectId].getCategoryById(categoryId);
}

export function getDomainById(domainId: string, subjectId: SubjectId = 'a1'): Domain | undefined {
  if (subjectId === 'b1') {
    return undefined;
  }
  return catalogs[subjectId].getDomainById(domainId);
}

export function getDomainForQuestion(question: Question): Domain | undefined {
  return getDomainById(question.domainId, question.subjectId);
}

export function getQuestionsInSet(
  questionSetId: string,
  subjectId: SubjectId = 'a1',
): readonly Question[] {
  if (subjectId === 'b1') {
    return [];
  }
  return catalogs[subjectId].getQuestionsInSet(questionSetId);
}
