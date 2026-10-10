/** Common material identity comparison for A-1, A-2 and written cases. */
export function sameSourceContent(
  before: { sourceId: string; contentHash: string } | undefined,
  after: { sourceId: string; contentHash: string } | undefined,
): boolean {
  return (
    !!before &&
    !!after &&
    before.sourceId === after.sourceId &&
    before.contentHash === after.contentHash
  );
}
