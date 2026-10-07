import type { IPoi } from '../interfaces';
import { makeNaturalKey } from '../utility/naturalKey.js';
import { findDuplicatePOI, isPOIConflict, type POIIdentity } from './poiUniqueness.js';

export async function seedMissingPOIs(pois: IPoi[], options: {
  list: () => Promise<POIIdentity[]>; create: (poi: IPoi) => Promise<POIIdentity>;
  log?: (message: string) => void;
}) {
  let rows = [...await options.list()];
  for (const row of rows) {
    if (findDuplicatePOI(rows, row, row.id)) throw new Error(`Resolve existing duplicate POIs for "${row.name}" in "${row.area}" before seeding.`);
  }
  const sourceKeys = pois.map(makeNaturalKey);
  if (new Set(sourceKeys).size !== sourceKeys.length) throw new Error('The seed source contains duplicate name + area entries.');
  let created = 0;
  let skipped = 0;
  for (const poi of pois) {
    if (findDuplicatePOI(rows, poi)) {
      skipped++;
      options.log?.(`Kept existing: ${poi.name}`);
      continue;
    }
    try {
      rows.push(await options.create(poi));
      created++;
      options.log?.(`Created: ${poi.name}`);
    } catch (error) {
      if (!isPOIConflict(error)) throw error;
      rows = [...await options.list()];
      if (!findDuplicatePOI(rows, poi)) throw error;
      skipped++;
      options.log?.(`Kept concurrently created: ${poi.name}`);
    }
  }
  rows = [...await options.list()];
  if (pois.some(poi => !findDuplicatePOI(rows, poi))) throw new Error('Seed verification failed: some source places are missing.');
  for (const row of rows) {
    if (findDuplicatePOI(rows, row, row.id)) throw new Error('Seed verification failed: duplicate name + area records found.');
  }
  return { created, skipped, total: rows.length, sourceCount: pois.length };
}
