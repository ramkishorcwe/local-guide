import { ApiError } from '@google/genai';
import { HttpError } from './appwrite';

export function guideErrorMessage(error: unknown, aborted = false): string {
  if (aborted) return 'Guide took too long. Please try a simpler request.';
  if (error instanceof ApiError) {
    switch (error.status) {
      case 429: return 'Guide’s Gemini quota or rate limit has been reached. Please try again later.';
      case 408:
      case 504: return 'Gemini took too long to respond. Please try again.';
      case 400:
      case 401:
      case 403: return 'Guide’s Gemini connection needs attention. Please contact the hotel desk.';
      case 404: return 'Guide’s configured Gemini model is unavailable. Please contact the hotel desk.';
      default: return 'Gemini is temporarily unavailable. Please try again shortly.';
    }
  }
  if (error instanceof HttpError) {
    if (error.status === 503 || error.status === 400) return error.message;
    if (error.status === 401 || error.status === 403) return 'Guide cannot read the hotel catalogue. Please contact the hotel desk.';
  }
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
    return 'Guide’s connection timed out. Please try again.';
  }
  return 'Guide could not finish this request. Please try again.';
}

// Keep provider diagnostics on the server; never log credentials or send raw errors to guests.
export function reportGuideError(error: unknown, log: (message: string) => void = console.error) {
  let detail = error instanceof Error ? error.message : 'Unknown error';
  for (const [key, value] of Object.entries(process.env)) {
    if (/KEY|SECRET|PASSWORD|TOKEN/i.test(key) && value && value.length > 5) detail = detail.replaceAll(value, '[redacted]');
  }
  detail = detail.replace(/([?&]key=)[^&\s"']+/gi, '$1[redacted]').replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]');
  log(`[Guide] ${JSON.stringify({ source: error instanceof ApiError ? 'Gemini' : error instanceof HttpError ? 'Appwrite/request' : 'guide',
    status: error instanceof ApiError || error instanceof HttpError ? error.status : undefined,
    name: error instanceof Error ? error.name : undefined, detail: detail.slice(0, 2000) })}`);
}
