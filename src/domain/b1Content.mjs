import { normalizeContentText, sha256 } from './questionContent.mjs';

/** Learning aids and grading examples deliberately do not identify the question. */
export function calculateB1ContentHash(item) {
  const content = [
    'b1-content-v1',
    item.title,
    item.purposeSummary,
    item.body.sections?.map((section) => [
      section.id,
      section.heading,
      section.paragraphs.map((p) => [p.id, p.text]),
    ]) ?? [],
    item.body.materials?.map((material) => [
      material.id,
      material.kind,
      material.caption,
      material.text,
      material.assetHash ?? null,
    ]) ?? [],
    item.source.questionDocumentHash ?? item.source.questionPdfUrl,
    item.source.questionPdfPagesZeroBased,
    item.questionUnits.map((unit) => [
      unit.questionId,
      unit.label,
      unit.promptSummary,
      unit.promptText ?? null,
      [
        unit.sourcePromptLocator.pdfPageZeroBased,
        unit.sourcePromptLocator.printedPage,
        unit.sourcePromptLocator.underlineRefs,
        unit.sourcePromptLocator.figureRefs,
        unit.sourcePromptLocator.tableRefs,
        unit.sourcePromptLocator.paragraphIds ?? [],
        unit.sourcePromptLocator.sectionIds ?? [],
        unit.sourcePromptLocator.materialIds ?? [],
      ],
      unit.answerFields.map((field) => [
        field.fieldId,
        field.label,
        field.inputKind,
        field.maxLength,
        field.orderMatters,
        field.expectedCount,
      ]),
    ]),
  ];
  // Preserve existing NW/foundation identities; include newly structured original content.
  if (item.body.readingOrder)
    content.push([
      item.body.readingOrder,
      item.body.sections?.map((s) => s.paragraphs.map((p) => [p.printedPage, p.underlines])),
      item.body.materials?.map((m) => [m.printedPage, m.renderText, m.headers, m.rows]),
      item.body.originalPages?.map((p) => [p.printedPage, p.assetHash]),
      item.questionUnits.map((u) => u.answerFields.map((f) => f.choices ?? [])),
    ]);
  if (item.body.materials?.some((m) => m.tableNotes || m.cellSpans))
    content.push(item.body.materials.map((m) => [m.id, m.tableNotes, m.cellSpans]));
  if (item.body.materials?.some((m) => m.underlines))
    content.push(item.body.materials.map((m) => [m.id, m.underlines]));
  const canonical = JSON.stringify(content, (_key, value) =>
    typeof value === 'string' ? normalizeContentText(value) : value,
  );
  return `sha256:v1:${sha256(canonical)}`;
}
