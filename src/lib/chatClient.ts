import { consumeSSE } from './sse';
import type { ChatMessage, ChatEvent, PlanningContext } from '../types/trip';
export async function streamChat(messages: ChatMessage[], onEvent: (event: ChatEvent) => void, signal: AbortSignal, planContext?: PlanningContext) {
  const request = new AbortController();
  let timedOut = false;
  const cancel = () => request.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 125_000);
  try {
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.slice(-20).map(({ role, text }) => ({ role, text })), planContext }), signal: request.signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Guide is unavailable. Please try again.' }));
    throw new Error(error.message);
  }
  if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) throw new Error('Guide returned an invalid stream');
  await consumeSSE(response.body, onEvent);
  } catch (error) {
    if (timedOut) throw new Error('Guide took too long to reply. Your message is kept; please retry.');
    throw error;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
}
