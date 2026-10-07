import test from 'node:test';
import assert from 'node:assert/strict';
import { POIS } from '../src/data/pois';
import { makeNaturalKeyFromInput } from '../src/utility/naturalKey';
import { poiToPayload } from '../src/lib/poiCodec';
import { DuplicatePOIError, saveUniquePOI, type POIIdentity } from '../src/lib/poiUniqueness';
import { seedMissingPOIs } from '../src/lib/poiSeed';

test('POI identity ignores case, Unicode and extra whitespace while preserving branch areas', () => {
  assert.equal(makeNaturalKeyFromInput('  ＬＭＢ\u00a0  Cafe ', 'JOHARI\n Bazaar'), makeNaturalKeyFromInput('lmb cafe', ' johari bazaar '));
  assert.notEqual(makeNaturalKeyFromInput('LMB', 'Johari Bazaar'), makeNaturalKeyFromInput('LMB', 'Amer'));
  assert.notEqual(makeNaturalKeyFromInput('A|B', 'C'), makeNaturalKeyFromInput('A', 'B|C'));
  assert.notEqual(makeNaturalKeyFromInput('A%7CB', 'C'), makeNaturalKeyFromInput('A|B', 'C'));
  const payload = poiToPayload({ ...POIS[0], name: '  LMB   Cafe ', area: 'JOHARI\u00a0 Bazaar ' });
  assert.equal(payload.name, 'LMB Cafe');
  assert.equal(payload.area, 'JOHARI Bazaar');
  assert.equal(payload.naturalKey, 'lmb cafe|johari bazaar');
  assert.throws(() => makeNaturalKeyFromInput('A'.repeat(256), 'Amer'), /too long/);
});

test('create blocks legacy duplicates before writing; edits exclude only their own ID', async () => {
  const rows = [{ id: 'original', name: ' LMB  Cafe ', area: 'Johari Bazaar' }, { id: 'other', name: 'Hawa Mahal', area: 'Pink City' }];
  let writes = 0;
  const options = { list: async () => rows, write: async () => { writes++; return 'saved'; } };
  await assert.rejects(saveUniquePOI({ name: 'lmb cafe', area: 'JOHARI BAZAAR' }, options), DuplicatePOIError);
  assert.equal(writes, 0);
  assert.equal(await saveUniquePOI(rows[0], { ...options, excludeId: 'original' }), 'saved');
  await assert.rejects(saveUniquePOI(rows[1], { ...options, excludeId: 'original' }), /Edit the existing place/);
  assert.equal(await saveUniquePOI({ name: 'LMB Cafe', area: 'Amer' }, options), 'saved');
  assert.equal(writes, 2);
});

test('database uniqueness conflicts from concurrent saves become friendly errors; other failures survive', async () => {
  const poi = POIS[0];
  await assert.rejects(saveUniquePOI(poi, { list: async () => [], write: async () => { throw { code: 409 }; } }), DuplicatePOIError);
  const unauthorized = Object.assign(new Error('Admin permission required'), { code: 401 });
  await assert.rejects(saveUniquePOI(poi, { list: async () => [], write: async () => { throw unauthorized; } }), error => error === unauthorized);
});

test('seed adds all missing places, preserves existing IDs and edits, and a second run writes nothing', async () => {
  const existing = { ...POIS[0], id: 'admin-existing', rating: 5, partner: true, commissionPct: 15 };
  const rows = [existing];
  let writes = 0;
  const options = { list: async () => rows, create: async (poi: typeof existing) => {
    writes++; const created = { ...poi, id: `created-${writes}` }; rows.push(created); return created;
  } };
  const first = await seedMissingPOIs(POIS, options);
  assert.deepEqual(first, { created: 19, skipped: 1, total: 20, sourceCount: 20 });
  assert.equal(rows[0].id, 'admin-existing');
  assert.equal(rows[0].rating, 5);
  assert.equal(rows[0].commissionPct, 15);
  const second = await seedMissingPOIs(POIS, options);
  assert.deepEqual(second, { created: 0, skipped: 20, total: 20, sourceCount: 20 });
  assert.equal(writes, 19);
});

test('seed refuses pre-existing duplicate rows before writes and handles a concurrent insertion', async () => {
  let writes = 0;
  const duplicateRows = [{ ...POIS[0], id: 'old' }, { ...POIS[0], id: 'duplicate' }];
  await assert.rejects(seedMissingPOIs(POIS, { list: async () => duplicateRows, create: async poi => { writes++; return poi; } }), /Resolve existing duplicate/);
  assert.equal(writes, 0);
  await assert.rejects(seedMissingPOIs([POIS[0], POIS[0]], { list: async () => [], create: async poi => { writes++; return poi; } }), /seed source contains duplicate/);
  assert.equal(writes, 0);
  const rows: POIIdentity[] = [];
  const result = await seedMissingPOIs([POIS[0]], { list: async () => [...rows], create: async poi => {
    rows.push({ ...poi, id: 'created-by-other-run' }); throw { code: 409 };
  } });
  assert.deepEqual(result, { created: 0, skipped: 1, total: 1, sourceCount: 1 });
});
