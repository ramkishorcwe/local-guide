import type { ChatMessage, ChatEvent, PlanningContext } from '../src/types/trip';
import { runGuide, parseStartISO } from '../src/lib/gemini.js';
import { loadPOIs, HttpError } from './appwrite.js';

export function parseMessages(body: unknown): Pick<ChatMessage, 'role' | 'text'>[] {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 20 || messages.some((m) =>
    !m || !['user', 'assistant'].includes(m.role) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 4000)
    || messages.at(-1).role !== 'user') throw new HttpError(400, 'Send 1–20 chat messages ending with a guest message.');
  return messages.map(({ role, text }) => ({ role, text }));
}
export async function handleChat(body: unknown, emit: (event: ChatEvent) => void, signal?: AbortSignal) {
  const messages = parseMessages(body);
  const planContext = parsePlanContext(body);
  if (!process.env.GEMINI_API_KEY) throw new HttpError(503, 'Guide isn’t available yet. Please ask the hotel desk for help, or try again later.');
  emit({ type: 'status', message: 'Reading the hotel’s Jaipur catalogue…' });
  const pois = await loadPOIs(signal);
  if (!pois.length) throw new HttpError(503, 'The hotel is still adding its Jaipur favourites. Please check with the hotel desk.');
  if (planContext?.poiIds.some(id => !pois.some(poi => poi.id === id))) throw new HttpError(400, 'A place in this outing is no longer available. Please make a new plan.');
  await runGuide({ messages, pois, emit, signal, planContext });
}

export function parsePlanContext(body: unknown): PlanningContext | undefined {
  const value = (body as { planContext?: PlanningContext } | null)?.planContext;
  if (value === undefined) return;
  try {
    if (!value || !Array.isArray(value.poiIds) || !value.poiIds.length || value.poiIds.length > 6
      || value.poiIds.some(id => typeof id !== 'string' || !id || id.length > 36)
      || new Set(value.poiIds).size !== value.poiIds.length
      || !Number.isInteger(value.availableMinutes) || value.availableMinutes < 15 || value.availableMinutes > 720) throw new Error();
    parseStartISO(value.startISO);
    return { poiIds: value.poiIds, startISO: value.startISO, availableMinutes: value.availableMinutes };
  } catch { throw new HttpError(400, 'This outing needs a valid start time, time budget and 1–6 places.'); }
}
