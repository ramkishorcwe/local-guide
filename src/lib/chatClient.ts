import { consumeSSE } from './sse';
import type { ChatMessage, ChatEvent, PlanningContext } from '../types/trip';
export async function streamChat(messages: ChatMessage[], onEvent: (event: ChatEvent) => void, signal: AbortSignal, planContext?: PlanningContext) {
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.slice(-20).map(({ role, text }) => ({ role, text })), planContext }), signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Guide is unavailable. Please try again.' }));
    throw new Error(error.message);
  }
  if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) throw new Error('Guide returned an invalid stream');
  await consumeSSE(response.body, onEvent);
}
