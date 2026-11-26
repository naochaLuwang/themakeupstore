// Read the complete candidate list before stock ordering and display limits.
// Callers must supply deterministic ordering for database ranges.
export async function readCatalogPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, size = 250) {
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const result = await read(from, from + size - 1)
    if (result.error || !result.data) throw new Error('Catalog unavailable')
    rows.push(...result.data)
    if (result.data.length < size) return rows
  }
}
