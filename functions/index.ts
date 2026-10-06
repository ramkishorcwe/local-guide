// Deploy the repository as an Appwrite Function with build command npm run build:function.
// Appwrite's response helper buffers; use /api/chat on Vercel for actual SSE.
import { handleChat } from '../server/chat';
import { handleBooking } from '../server/booking';
import { HttpError } from '../server/appwrite';
import { guideErrorMessage, reportGuideError } from '../server/guideErrors';
import type { ChatEvent } from '../src/types/trip';
type Context = { req: { path: string; method: string; bodyJson: unknown };
  res: { json: (body: unknown, status?: number) => unknown }; error: (message: string) => void };
export default async function ({ req, res, error }: Context) {
  if (req.method !== 'POST') return res.json({ message: 'Use POST' }, 405);
  try {
    if (req.path === '/bookings') return res.json(await handleBooking(req.bodyJson));
    const events: ChatEvent[] = [];
    await handleChat(req.bodyJson, (event) => events.push(event));
    return res.json({ events });
  } catch (err) {
    reportGuideError(err, error);
    return res.json({ message: guideErrorMessage(err) }, err instanceof HttpError ? err.status : 503);
  }
}
