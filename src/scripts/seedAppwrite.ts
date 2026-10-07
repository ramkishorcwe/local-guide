import { ID, Query } from 'appwrite';
import { config } from 'dotenv';
import { POIS } from '../data/pois';
import { poiToPayload } from '../lib/poiCodec';
import { seedMissingPOIs } from '../lib/poiSeed';
import type { POIIdentity } from '../lib/poiUniqueness';

// Explicit CLI only. Never imported by a guest route or run on page load.
config({ path: '.env.local' }); config({ path: '.env' });
async function seed() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const project = process.env.VITE_APPWRITE_PROJECT_ID;
  if (!project) throw new Error('Set VITE_APPWRITE_PROJECT_ID');
  const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'local-guide';
  const collectionId = process.env.VITE_APPWRITE_COLLECTION_ID || 'pois';
  // Prefer the designated admin's existing permissions over a server key.
  const useAdmin = !!(process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD);
  const serverKey = useAdmin ? undefined : process.env.APPWRITE_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Appwrite-Project': project };
  let sessionHeaders: Record<string, string> = {};
  if (useAdmin) {
    const response = await fetch(`${endpoint}/account/sessions/email`, { method: 'POST', headers,
      body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }),
      signal: AbortSignal.timeout(15_000) });
    const session = await response.json() as { secret?: string; message?: string };
    if (!response.ok) throw new Error(session.message || 'Appwrite admin sign-in failed');
    // Cloud's web endpoint may return only HttpOnly cookies, not a session secret.
    const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    sessionHeaders = session.secret ? { 'X-Appwrite-Session': session.secret } : cookie ? { Cookie: cookie } : {};
    if (!Object.keys(sessionHeaders).length) throw new Error('Appwrite did not return session credentials for seeding.');
  } else if (!serverKey) throw new Error('Set SEED_ADMIN_EMAIL/PASSWORD or server-only APPWRITE_API_KEY');
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/documents${path}`, {
      ...init, headers: { ...headers, ...sessionHeaders,
        // POIs are publicly readable; the seed key is needed only for writes.
        ...(serverKey && init?.method && init.method !== 'GET' ? { 'X-Appwrite-Key': serverKey } : {}) }, signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) throw Object.assign(new Error(result.message || 'Appwrite seed request failed'), { code: response.status });
    return result as T;
  }
  try {
    const result = await seedMissingPOIs(POIS, {
      list: async () => {
        const rows: POIIdentity[] = [];
        let cursor: string | undefined;
        do {
          const queries = [Query.limit(100), Query.orderAsc('name'), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
          const page = await request<{ documents: { $id: string; name: string; area: string }[] }>(`?${new URLSearchParams(queries.map((query): [string, string] => ['queries[]', query]))}`);
          rows.push(...page.documents.map(doc => ({ id: doc.$id, name: doc.name, area: doc.area })));
          cursor = page.documents.length === 100 ? page.documents.at(-1)!.$id : undefined;
        } while (cursor);
        return rows;
      },
      create: async (poi) => {
        const data = poiToPayload(poi);
        const doc = await request<{ $id: string }>('', {
          method: 'POST', body: JSON.stringify({ documentId: ID.unique(), data }),
        });
        return { id: doc.$id, name: data.name, area: data.area };
      },
      log: console.log,
    });
    console.log(`Verified ${result.sourceCount} source places. Created ${result.created}, kept ${result.skipped} existing, total ${result.total}.`);
  } finally {
    if (useAdmin) {
      const warnCleanup = () => {
        console.error('Could not close the temporary Appwrite seed session. Revoke it in the Appwrite Console.');
        process.exitCode = 1;
      };
      try {
        const response = await fetch(`${endpoint}/account/sessions/current`, { method: 'DELETE',
          headers: { ...headers, ...sessionHeaders }, signal: AbortSignal.timeout(15_000) });
        if (!response.ok) warnCleanup();
      } catch { warnCleanup(); }
    }
  }
}
seed().catch((error) => { console.error(error instanceof Error ? error.message : 'Seed failed'); process.exitCode = 1; });
