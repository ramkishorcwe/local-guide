import type { ChatMessage } from '../types/trip';

export function prepareChatTurn(messages: ChatMessage[], text: string, retry = false) {
  const last = messages.at(-1);
  const reuseUser = retry && last?.role === 'assistant' && messages.at(-2)?.role === 'user';
  const history: ChatMessage[] = reuseUser ? messages.slice(0, -1) : [...messages, { id: crypto.randomUUID(), role: 'user', text }];
  const assistant: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: '', outcome: 'pending' };
  return { messages: [...history, assistant], assistantId: assistant.id,
    history: history.filter(message => message.text.trim() && (message.role === 'user' || !['pending', 'failed', 'cancelled'].includes(message.outcome || ''))) };
}

export function finishChatTurn(messages: ChatMessage[], id: string, error?: string, cancelled = false): ChatMessage[] {
  return messages.map(message => {
    if (message.id !== id) return message;
    const empty = !message.text.trim();
    const failure = error || (empty ? 'Guide finished without a reply. Please retry your request.' : undefined);
    return { ...message, text: empty ? cancelled ? 'This reply was stopped.' : 'I couldn’t give you a reply to this request.' : message.text,
      outcome: cancelled ? 'cancelled' : failure ? 'failed' : 'complete', error: failure };
  });
}

export function isActiveReply(message: ChatMessage, activeId: string | null, busy: boolean) {
  return busy && message.role === 'assistant' && message.id === activeId;
}
