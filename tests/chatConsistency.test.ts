import test from 'node:test';
import assert from 'node:assert/strict';
import { GenerateContentResponse, type GenerateContentParameters } from '@google/genai';
import { POIS } from '../src/data/pois';
import { namedPlaces, resolveGuideIntent } from '../src/lib/guideIntent';
import { createToolExecutor, runGuide, type GeminiModels } from '../src/lib/gemini';
import { buildRoute, optimizeRoute, searchPOIs } from '../src/lib/planner';
import { prepareChatTurn, finishChatTurn, isActiveReply } from '../src/lib/chatTurns';
import type { ChatEvent, ChatMessage, PlanningContext } from '../src/types/trip';

const jal = POIS.find(poi => poi.name === 'Jal Mahal Viewpoint')!;
const kund = POIS.find(poi => poi.name === 'Panna Meena Ka Kund')!;
const hawa = POIS.find(poi => poi.name === 'Hawa Mahal')!;
const lmb = POIS.find(poi => poi.name.includes('(LMB)'))!;
const startISO = '2026-10-07T15:15:00+05:30';
const context: PlanningContext = { poiIds: [jal.id, kund.id], startISO, availableMinutes: 120 };
const user = (text: string) => ({ role: 'user' as const, text });
const assistant = (text: string) => ({ role: 'assistant' as const, text });

test('short names, spelling variants and LMB aliases resolve without substituting the rooftop cafe', () => {
  assert.deepEqual(new Set(namedPlaces('want to visit jal mahal and panna mina kund', POIS).map(p => p.id)), new Set([jal.id, kund.id]));
  assert.deepEqual(namedPlaces('Jal Mahal then Panna Mina Kund', POIS).map(p => p.id), [jal.id, kund.id]);
  assert.deepEqual(namedPlaces('also include hawa mahal', POIS).map(p => p.id), [hawa.id]);
  assert.equal(namedPlaces('dinner at LMB', POIS)[0].id, lmb.id);
  assert.equal(namedPlaces('Hawa Mahal Rooftop Cafe', POIS).length, 1);
});

test('guest constraints survive follow-ups while explicit removal overrides old limits and invented duration', () => {
  const history = [user('Pure veg dinner, budget ₹1,000'), assistant('Your 2 hour route'), user('also add jain food'), user('also include rajsthani food')];
  const foodIntent = resolveGuideIntent(history, POIS, context);
  assert.equal(foodIntent.preferences.maxPriceINR, 1000);
  assert.equal(foodIntent.preferences.pureVeg, true);
  assert.equal(foodIntent.preferences.jainFoodAvailable, true);
  assert.equal(foodIntent.foodQuery, 'rajasthani');
  assert.equal(foodIntent.availableMinutes, 720);
  const removed = resolveGuideIntent([...history, user('add hawa mahal there is not time and budget boundation')], POIS, context);
  assert.equal(removed.preferences.maxPriceINR, undefined);
  assert.equal(removed.budgetFlexible, true);
  assert.equal(removed.availableMinutes, 720);
  assert.equal(removed.fixedStartISO, context.startISO);
  assert.equal(resolveGuideIntent([user('Start tomorrow morning instead')], POIS, context).fixedStartISO, undefined);
  assert.deepEqual(new Set(removed.requiredIds), new Set([jal.id, kund.id, hawa.id]));
  assert.equal(resolveGuideIntent([user('Plan 2 hours'), user('add Hawa Mahal')], POIS, context).availableMinutes, 120);
  assert.deepEqual(resolveGuideIntent([user('skip Jal Mahal')], POIS, context).requiredIds, [kund.id]);
});

test('unknown-price Jain/Rajasthani dining stays available as a quote, never a confirmed budget match', async () => {
  const unknown = { ...lmb, priceINR: 0, entryFeeINR: 0 };
  const intent = resolveGuideIntent([user('Pure veg Jain Rajasthani dinner, budget ₹1,000')], [unknown]);
  assert.equal(searchPOIs([unknown], { ...intent.preferences, maxPriceINR: 1000 }).length, 0);
  const executor = createToolExecutor([unknown], intent);
  const result = await executor.execute('searchPOIs', { query: 'pure veg Jain Rajasthani dinner', maxPriceINR: 1000 }) as {places: {id: string; priceINR: number | null; priceStatus: string}[]; budgetNote: string; catalogueFoodCount: number};
  assert.equal(result.places[0].id, lmb.id);
  assert.equal(result.places[0].priceINR, null);
  assert.equal(result.places[0].priceStatus, 'quote_required');
  assert.equal(result.catalogueFoodCount, 1);
  assert.match(result.budgetNote, /not confirmed/);
  await executor.execute('buildRoute', {poiIds: [lmb.id], startISO: '2026-10-07T19:00:00+05:30', availableMinutes: 120});
  assert.match(executor.plan!.routeNote!, /quote.*₹1000 budget/);
  assert.equal(executor.plan!.stops[0].priceINR, -1);
});

test('adding Hawa Mahal keeps every stop, reorders for closing hours and gives measured travel savings', () => {
  const ids = [jal.id, kund.id, hawa.id];
  assert.throws(() => buildRoute(POIS, ids, Date.parse(startISO), 720), /Hawa Mahal is closed/);
  const plan = optimizeRoute(POIS, ids, Date.parse(startISO), 720);
  assert.deepEqual(new Set(plan.stops.map(stop => stop.poiId)), new Set(ids));
  assert.equal(plan.stops[0].poiId, hawa.id);
  assert.match(plan.routeNote!, /saves about \d+ minutes.*back and forth/);
  assert.match(plan.routeNote!, /Earlier-closing/);
  assert.throws(() => optimizeRoute(POIS, ids, Date.parse(startISO), 720, true), /Hawa Mahal is closed/);
  assert.throws(() => optimizeRoute(POIS, ids, Date.parse('2026-10-07T17:00:00+05:30'), 720), /Hawa Mahal.*earlier start or another day/);
});

test('an add-stop request retains the current start time even if the model invents another', async () => {
  const intent = resolveGuideIntent([user('add Hawa Mahal no time or budget limit')], POIS, context);
  const executor = createToolExecutor(POIS, intent);
  await executor.execute('buildRoute', {poiIds: [jal.id,kund.id,hawa.id], startISO:'2026-10-07T10:00:00+05:30',availableMinutes:120});
  assert.equal(executor.plan!.startAt, Date.parse(context.startISO));
  assert.equal(executor.plan!.availableMinutes, 720);
});

function response(name?: string, args?: Record<string, unknown>) {
  const result = new GenerateContentResponse();
  result.candidates = [{ content: { role: 'model', parts: [name ? { functionCall: { name, args } } : {text: 'Ready'}] } }];
  return result;
}

function modelFixture(calls: [string, Record<string, unknown>][], verifyFinal: (input: GenerateContentParameters) => void): GeminiModels {
  let round = 0;
  return { generateContent: async () => { const call = calls[round++]; return call ? response(...call) : response(); },
    generateContentStream: async input => { verifyFinal(input); return (async function* () { yield response(undefined); })(); } };
}

test('a model returning the previous two-stop route is rejected and the exact three-stop revision is built', async () => {
  const events: ChatEvent[] = [];
  const models = modelFixture([
    ['searchPOIs', {}],
    ['buildRoute', { poiIds: [jal.id, kund.id], startISO, availableMinutes: 120 }],
  ], input => {
    const contents = input.contents as {parts:{text:string}[]}[];
    const final = contents.at(-1)!.parts[0].text;
    assert.match(final, /Missing: Hawa Mahal/);
    assert.match(final, /validatedItinerary/);
    assert.match(final, /Earlier-closing/);
    assert.match(final, /startLocal.*3:15 pm/i);
  });
  await runGuide({messages: [user('Pure veg dinner, budget ₹1,000'), user('add hawa mahal there is not time and budget boundation')], pois: POIS, planContext: context, models, emit: event => events.push(event)});
  const result = events.find(event => event.type === 'itinerary');
  assert.equal(result?.type === 'itinerary' && result.plan.stops.length, 3);
  assert.equal(events.at(-1)?.type, 'done');
});

test('adding Jain/Rajasthani food preserves monuments and adds matching unknown-price dining', async () => {
  const events: ChatEvent[] = [];
  const unknown = { ...lmb, priceINR: 0, entryFeeINR: 0 };
  const models = modelFixture([], input => {
    const contents = input.contents as {parts:{text:string}[]}[];
    assert.match(contents.at(-1)!.parts[0].text, /quote_required/);
  });
  await runGuide({ messages: [user('Pure veg dinner, budget ₹1,000'), user('also add Jain Rajasthani food')], pois: [jal, kund, unknown], planContext: context, models, emit: event => events.push(event) });
  const result = events.find(event => event.type === 'itinerary');
  assert.deepEqual(new Set(result?.type === 'itinerary' ? result.plan.stops.map(stop => stop.poiId) : []), new Set([jal.id, kund.id, lmb.id]));
});

test('a genuine closing-hours conflict emits no replacement cards and keeps the reason for the final reply', async () => {
  const events: ChatEvent[] = [];
  const models = modelFixture([], input => {
    const contents = input.contents as {parts:{text:string}[]}[];
    assert.match(contents.at(-1)!.parts[0].text, /previous cards remain unchanged/);
    assert.match(contents.at(-1)!.parts[0].text, /Hawa Mahal.*closed/);
  });
  await runGuide({messages:[user('add Hawa Mahal no time or budget limit')], pois: POIS, planContext: {...context, startISO: '2026-10-07T17:00:00+05:30'}, models, emit: event => events.push(event)});
  assert.equal(events.some(event => event.type === 'itinerary'), false);
});

test('missing/cancelled replies remain explicit, retries retain the user bubble and only the active reply has progress', () => {
  const previous: ChatMessage[] = [{id:'old-user',role:'user',text:'Previous request'}, {id:'old-failure',role:'assistant',text:'',outcome:'failed',error:'No reply'}];
  const first = prepareChatTurn(previous, 'Add Hawa Mahal');
  assert.equal(first.messages.filter(message => isActiveReply(message, first.assistantId, true)).length, 1);
  assert.equal(isActiveReply(previous[1], first.assistantId, true), false);
  assert.equal(first.history.some(message => message.id === 'old-failure'), false);
  const failed = finishChatTurn(first.messages, first.assistantId);
  assert.match(failed.at(-1)!.text, /couldn’t give you a reply/);
  assert.match(failed.at(-1)!.error!, /without a reply/);
  const retry = prepareChatTurn(failed, 'Add Hawa Mahal', true);
  assert.equal(retry.messages.at(-2)!.id, first.messages.at(-2)!.id);
  assert.equal(retry.messages.filter(message => message.text === 'Add Hawa Mahal').length, 1);
  const cancelled = finishChatTurn(retry.messages, retry.assistantId, 'Response stopped', true);
  assert.equal(cancelled.at(-1)!.outcome, 'cancelled');
  assert.match(cancelled.at(-1)!.text, /stopped/);
});
