import type { ChatMessage, ChatEvent } from '../src/types/trip';
import { runGuide } from '../src/lib/gemini';
import { loadPOIs, HttpError } from './appwrite';

export function parseMessages(body: unknown): Pick<ChatMessage, 'role' | 'text'>[] {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 20 || messages.some((m) =>
    !m || !['user', 'assistant'].includes(m.role) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 4000)
    || messages.at(-1).role !== 'user') throw new HttpError(400, 'Send 1–20 chat messages ending with a guest message.');
  return messages.map(({ role, text }) => ({ role, text }));
}
export async function handleChat(body: unknown, emit: (event: ChatEvent) => void, signal?: AbortSignal) {
  const messages = parseMessages(body);
  if (!process.env.GEMINI_API_KEY) throw new HttpError(503, 'Guide isn’t available yet. Please ask the hotel desk for help, or try again later.');
  emit({ type: 'status', message: 'Reading the hotel’s Jaipur catalogue…' });
  const pois = await loadPOIs(signal);
  if (!pois.length) throw new HttpError(503, 'The hotel is still adding its Jaipur favourites. Please check with the hotel desk.');
  await runGuide({ messages, pois, emit, signal });
}
