import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './appwrite.js';
import { handleChat } from './chat.js';
import { handleBooking } from './booking.js';
import { guideErrorMessage, reportGuideError } from './guideErrors.js';
import type { ChatEvent } from '../src/types/trip';

export async function readBody(req: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 100_000) throw new HttpError(413, 'Request too large');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new HttpError(400, 'Invalid JSON request'); }
}
export function sendError(res: ServerResponse, error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : 'Something went wrong. Please try again.';
  if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message }));
}
export async function chatHTTP(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.writeHead(405); res.end(); return; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  res.on('close', () => controller.abort());
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    const body = req.body ?? await readBody(req);
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const emit = (event: ChatEvent) => { if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`); };
    heartbeat = setInterval(() => { if (!res.destroyed) res.write(': heartbeat\n\n'); }, 10_000);
    try { await handleChat(body, emit, controller.signal); }
    catch (error) {
      if (!res.destroyed) {
        reportGuideError(error);
        emit({ type: 'error', message: guideErrorMessage(error, controller.signal.aborted) });
      }
    }
    res.end();
  } catch (error) { if (!res.destroyed) sendError(res, error); }
  finally { clearTimeout(timeout); if (heartbeat) clearInterval(heartbeat); }
}
export async function bookingHTTP(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.writeHead(405); res.end(); return; }
  try {
    const booking = await handleBooking(req.body ?? await readBody(req));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(booking));
  } catch (error) { sendError(res, error); }
}
