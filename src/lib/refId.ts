// Связь Payload при depth 0 — id, при depth ≥ 1 — объект документа
export function refId(ref: unknown): number | null {
  if (typeof ref === 'number') return ref
  if (typeof ref === 'object' && ref !== null && 'id' in ref && typeof ref.id === 'number') {
    return ref.id
  }
  return null
}
