/** Appwrite owns creation timestamps; UI models use milliseconds. */
export function documentCreatedAt(doc: Record<string, unknown>, legacyKey: string): number {
  const timestamp = typeof doc.$createdAt === 'string' ? Date.parse(doc.$createdAt) : doc[legacyKey];
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) throw new Error('Invalid document creation timestamp');
  return timestamp;
}
