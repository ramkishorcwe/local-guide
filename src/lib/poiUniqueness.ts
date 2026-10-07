import type { IPoi } from '../interfaces';
import { makeNaturalKey, normalizePOIText } from '../utility/naturalKey.js';

export type POIIdentity = Pick<IPoi, 'id' | 'name' | 'area'>;
export class DuplicatePOIError extends Error {
  readonly code = 409;
  constructor(poi: Pick<IPoi, 'name' | 'area'>) {
    super(`A place named "${normalizePOIText(poi.name)}" already exists in "${normalizePOIText(poi.area)}". Edit the existing place instead.`);
    this.name = 'DuplicatePOIError';
  }
}
export function findDuplicatePOI(rows: POIIdentity[], poi: Pick<IPoi, 'name' | 'area'>, excludeId?: string) {
  const key = makeNaturalKey(poi);
  // Recompute from names so older rows with missing or stale naturalKey values are covered.
  return rows.find(row => row.id !== excludeId && makeNaturalKey(row) === key);
}
export function isPOIConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return ('code' in error && error.code === 409) || ('status' in error && error.status === 409);
}
export async function saveUniquePOI<T>(poi: Pick<IPoi, 'name' | 'area'>, options: {
  list: () => Promise<POIIdentity[]>; write: () => Promise<T>; excludeId?: string;
}): Promise<T> {
  if (findDuplicatePOI(await options.list(), poi, options.excludeId)) throw new DuplicatePOIError(poi);
  try { return await options.write(); }
  catch (error) {
    // A database unique index closes the gap between this check and the write.
    if (isPOIConflict(error)) throw new DuplicatePOIError(poi);
    throw error;
  }
}
