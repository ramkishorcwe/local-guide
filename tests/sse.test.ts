import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeSSE } from '../src/lib/sse';
import type { ChatEvent } from '../src/types/trip';
function fragmented(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({ start(controller) {
    // Byte-by-byte deliberately fragments UTF-8 and SSE delimiters.
    for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1));
    controller.close();
  } });
}
test('SSE handles CRLF, UTF-8, multiline data, heartbeat and multiple frames', async () => {
  const events: ChatEvent[] = [];
  await consumeSSE(fragmented(': heartbeat\r\n\r\ndata: {"type":"text",\r\ndata: "delta":"Namaste ₹ नमस्ते"}\r\n\r\ndata: {"type":"done"}\n\n'), (event) => events.push(event));
  assert.deepEqual(events, [{ type: 'text', delta: 'Namaste ₹ नमस्ते' }, { type: 'done' }]);
});
test('SSE surfaces server errors, rejects malformed JSON and truncated responses', async () => {
  await assert.rejects(consumeSSE(fragmented('data: {"type":"error","message":"Missing key"}\n\n'), () => undefined), /Missing key/);
  await assert.rejects(consumeSSE(fragmented('data: {"type":"text","delta":"partial"}\n\n'), () => undefined), /before Guide finished/);
  await assert.rejects(consumeSSE(fragmented('data: bad-json\n\n'), () => undefined), SyntaxError);
});
