import categoriesPayload from '../../data/categories.json';
import questionsPayload from '../../data/questions.json';
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
  Subcategory,
} from '../types/question';

interface RawChoice {
  id: ChoiceId;
  text: string;
}

interface RawQuestion {
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
  memory_point: string;
  question_set: QuestionSet;
  source: QuestionSource;
  status: string;
  schema_version: number;
  original_category_label: string;
}

interface RawQuestionPayload {
  schema_version: number;
  metadata: Record<string, unknown>;
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

const rawQuestions = questionsPayload as RawQuestionPayload;
const rawCategories = categoriesPayload as RawCategoriesPayload;

function toChoice(choice: RawChoice): Choice {
  return {
    id: choice.id,
    text: choice.text,
  };
}

function toQuestion(question: RawQuestion): Question {
  return {
    id: String(question.id),
    code: question.code,
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
    memoryPoint: question.memory_point,
    questionSet: question.question_set,
    source: question.source,
    status: question.status,
    schemaVersion: question.schema_version,
    originalCategoryLabel: question.original_category_label,
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

export const questionDataVersion = rawQuestions.schema_version;
export const questionMetadata = rawQuestions.metadata;
export const categoryDataVersion = rawCategories.schema_version;
export const questions: readonly Question[] = rawQuestions.questions.map(toQuestion);
export const categories: readonly Category[] = rawCategories.categories.map(toCategory);
export const domains: readonly Domain[] = rawCategories.domains;

const questionByCode = new Map(questions.map((question) => [question.code, question]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const domainById = new Map(domains.map((domain) => [domain.id, domain]));

export function getQuestionByCode(code: string): Question | undefined {
  return questionByCode.get(code);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categoryById.get(categoryId);
}

export function getDomainById(domainId: string): Domain | undefined {
  return domainById.get(domainId);
}

export function getDomainForQuestion(question: Question): Domain | undefined {
  return getDomainById(question.domainId);
}

export function getQuestionsInSet(questionSetId: string): readonly Question[] {
  return questions.filter((question) => question.questionSet.id === questionSetId);
}
