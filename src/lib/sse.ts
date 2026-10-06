import type { ChatEvent } from '../types/trip';

// POST uses fetch rather than EventSource so history and an AbortSignal can be sent.
export async function consumeSSE(stream: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  function consume(frame: string) {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    const event = JSON.parse(data) as ChatEvent;
    if (!['status', 'text', 'itinerary', 'error', 'done'].includes(event.type)) throw new Error('Invalid stream event');
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') done = true;
    onEvent(event);
  }
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let match: RegExpMatchArray | null;
      while ((match = buffer.match(/\r?\n\r?\n/))) {
        const index = match.index!;
        consume(buffer.slice(0, index));
        buffer = buffer.slice(index + match[0].length);
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!done) throw new Error('Connection ended before Guide finished. Please retry.');
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
