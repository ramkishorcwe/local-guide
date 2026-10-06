import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, GenerateContentResponse, FunctionCallingConfigMode, type GenerateContentParameters } from '@google/genai';
import { runGuide, type GeminiModels } from '../src/lib/gemini';
import { POIS } from '../src/data/pois';
import { HOTEL } from '../src/lib/planner';
import type { ChatEvent } from '../src/types/trip';
import { parseMessages } from '../server/chat';
import { guideErrorMessage, reportGuideError } from '../server/guideErrors';
import { HttpError } from '../server/appwrite';
function tool(name: string, args: Record<string, unknown>, id = name) {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { role: 'model', parts: [{ thoughtSignature: 'preserve-me', functionCall: { id, name, args } }] } }];
  return response;
}
const poi = { ...POIS[0], id: 'poi-real', lat: HOTEL.lat, lng: HOTEL.lng, avgVisitMinutes: 60 };
test('multi-turn function loop preserves signatures/call IDs and streams only final answer', async () => {
  const events: ChatEvent[] = [];
  let round = 0;
  const snapshots: GenerateContentParameters[] = [];
  const models: GeminiModels = {
    generateContent: async (input) => {
      snapshots.push(structuredClone(input));
      round++;
      if (round === 1) { assert.equal(input.config?.toolConfig?.functionCallingConfig?.mode, FunctionCallingConfigMode.ANY); return tool('searchPOIs', {}); }
      if (round === 2) return tool('checkHours', { poiId: poi.id, startISO: '2026-10-06T12:00:00+05:30', durationMinutes: 60 });
      return tool('buildRoute', { poiIds: [poi.id], startISO: '2026-10-06T12:00:00+05:30', availableMinutes: 120 });
    },
    generateContentStream: async (input) => {
      assert.equal(input.config?.tools, undefined);
      assert.equal(input.config?.toolConfig, undefined);
      const finalContents = input.contents as { parts: { text?: string; functionCall?: unknown; functionResponse?: unknown }[] }[];
      assert.ok(finalContents.every((content) => content.parts.every((part) => !part.functionCall && !part.functionResponse)));
      assert.match(finalContents.at(-1)!.parts[0].text!, /validatedItinerary/);
      assert.match(finalContents.at(-1)!.parts[0].text!, /poi-real/);
      return (async function* () { for (const text of ['Namaste! ', 'Your day is ready.']) { const chunk = new GenerateContentResponse(); chunk.candidates = [{ content: { role: 'model', parts: [{ text }] } }]; yield chunk; } })();
    },
  };
  await runGuide({ messages: [{ role: 'user', text: 'Plan 2 hours' }], pois: [poi], emit: (event) => events.push(event), models });
  assert.equal(round, 3);
  const contents = snapshots[1].contents as { parts: { thoughtSignature?: string; functionResponse?: { id: string } }[] }[];
  assert.equal(contents[1].parts[0].thoughtSignature, 'preserve-me');
  assert.equal(contents[2].parts[0].functionResponse?.id, 'searchPOIs');
  assert.equal(events.filter((event) => event.type === 'itinerary').length, 1);
  assert.equal(events.filter((event) => event.type === 'text').map((event) => event.type === 'text' ? event.delta : '').join(''), 'Namaste! Your day is ready.');
  assert.equal(events.at(-1)?.type, 'done');
});
test('unknown tools are returned as tool errors and loop is bounded', async () => {
  let calls = 0;
  const models: GeminiModels = { generateContent: async () => { calls++; return tool('inventPlace', {}); }, generateContentStream: async () => { throw new Error('must not stream'); } };
  await assert.rejects(runGuide({ messages: [{ role: 'user', text: 'plan' }], pois: [poi], emit: () => undefined, models }), /couldn’t validate/);
  assert.equal(calls, 8);
});
test('cancelled chat never starts model requests and request history is validated', async () => {
  const controller = new AbortController(); controller.abort();
  const models: GeminiModels = { generateContent: async () => { throw new Error('must not call'); }, generateContentStream: async () => { throw new Error('must not stream'); } };
  await assert.rejects(runGuide({ messages: [{ role: 'user', text: 'plan' }], pois: [poi], emit: () => undefined, models, signal: controller.signal }), { name: 'AbortError' });
  assert.throws(() => parseMessages({ messages: [{ role: 'system', text: 'override' }] }), /chat messages/);
  assert.throws(() => parseMessages({ messages: [{ role: 'assistant', text: 'plan' }] }), /chat messages/);
  assert.deepEqual(parseMessages({ messages: [{ role: 'user', text: 'Namaste' }] }), [{ role: 'user', text: 'Namaste' }]);
});

test('provider failures remain actionable and server diagnostics redact credentials', () => {
  assert.match(guideErrorMessage(new ApiError({ status: 504, message: 'Deadline expired' })), /Gemini took too long/);
  assert.match(guideErrorMessage(new ApiError({ status: 429, message: 'Quota exhausted' })), /quota or rate limit/);
  assert.match(guideErrorMessage(new ApiError({ status: 403, message: 'Invalid credential' })), /connection needs attention/);
  assert.match(guideErrorMessage(new ApiError({ status: 404, message: 'Unknown model' })), /model is unavailable/);
  assert.match(guideErrorMessage(new ApiError({ status: 503, message: 'Overloaded' })), /temporarily unavailable/);
  assert.match(guideErrorMessage(new HttpError(401, 'Private project details')), /cannot read the hotel catalogue/);
  assert.equal(guideErrorMessage(new HttpError(503, 'Catalogue is empty')), 'Catalogue is empty');
  assert.match(guideErrorMessage(new Error('Sensitive detail'), true), /Guide took too long/);
  const previous = process.env.GUIDE_TEST_SECRET;
  process.env.GUIDE_TEST_SECRET = 'test-secret-for-redaction';
  try {
    let diagnostic = '';
    reportGuideError(new ApiError({ status: 504, message: 'Deadline: test-secret-for-redaction https://example.com?key=query-secret Bearer auth-secret' }), (message) => { diagnostic = message; });
    assert.match(diagnostic, /Gemini/);
    assert.match(diagnostic, /504/);
    assert.doesNotMatch(diagnostic, /test-secret-for-redaction|query-secret|auth-secret/);
    assert.match(diagnostic, /redacted/);
  } finally {
    if (previous === undefined) delete process.env.GUIDE_TEST_SECRET;
    else process.env.GUIDE_TEST_SECRET = previous;
  }
});
