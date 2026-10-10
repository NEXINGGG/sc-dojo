import type { B1Case } from '../data/b1';
import { calculateB1ContentHash } from './b1Identity';

export function validateScBDataset(
  cases: readonly B1Case[],
  a2Codes: ReadonlySet<string>,
  categoryIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const units = new Set<string>();
  const sources = new Set<string>();
  for (const item of cases) {
    if (
      !/^sc-b-(?:pilot-(?:\d{4}-(?:spring|fall)-)?)?v\d+$/.test(item.dataset_version ?? '') ||
      item.examCode !== 'SC'
    )
      errors.push(`${item.caseId}: SC dataset識別が不正`);
    const expectedSource = `SC-${item.year}-${item.term?.toUpperCase()}-${item.originalSection?.toUpperCase()}-Q${String(item.questionNumber).padStart(2, '0')}`;
    if (item.source_id !== expectedSource || ids.has(item.caseId) || sources.has(item.source_id))
      errors.push(`${item.caseId}: 出典IDが不正又は重複`);
    ids.add(item.caseId);
    sources.add(item.source_id ?? '');
    if (item.content_hash && item.content_hash !== calculateB1ContentHash(item))
      errors.push(`${item.caseId}: content_hash不一致`);
    if (!item.body.fullTextIncluded && !item.source.questionDocumentHash)
      errors.push(`${item.caseId}: 本文又は問題PDFの内容hashが必要`);
    if (item.categoryIds.some((id) => !categoryIds.has(id)))
      errors.push(`${item.caseId}: 未定義カテゴリ`);
    const locations = [
      ...(item.body.sections?.flatMap((section) => [
        section.id,
        ...section.paragraphs.map((p) => p.id),
      ]) ?? []),
      ...(item.body.materials?.map((material) => material.id) ?? []),
    ];
    if (
      new Set(locations).size !== locations.length ||
      item.body.materials?.some((m) => m.assetUrl && !m.assetHash)
    )
      errors.push(`${item.caseId}: 本文位置又は図表hashが不正`);
    for (const unit of item.questionUnits) {
      if (
        units.has(unit.questionId) ||
        !unit.answerFields.length ||
        new Set(unit.answerFields.map((f) => f.fieldId)).size !== unit.answerFields.length
      )
        errors.push(`${unit.questionId}: 設問又は欄が重複・不足`);
      units.add(unit.questionId);
      if (unit.relatedA2QuestionIds?.some((code) => !a2Codes.has(code)))
        errors.push(`${unit.questionId}: 正式A-2 codeが存在しない`);
      if (
        [
          ...(unit.sourcePromptLocator.paragraphIds ?? []),
          ...(unit.sourcePromptLocator.sectionIds ?? []),
          ...(unit.sourcePromptLocator.materialIds ?? []),
          ...(unit.evidenceRefs ?? []),
        ].some((id) => !locations.includes(id))
      )
        errors.push(`${unit.questionId}: 本文の参照位置が存在しない`);
    }
  }
  return errors;
}
