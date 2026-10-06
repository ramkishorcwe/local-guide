import { Client, Account, Databases, ID, Query } from 'appwrite';
import { config } from 'dotenv';
import { POIS } from '../data/pois';
import { poiToPayload } from '../lib/poiCodec';

// Explicit CLI only. Never imported by a guest route or run on page load.
config({ path: '.env.local' }); config({ path: '.env' });
async function seed() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const project = process.env.VITE_APPWRITE_PROJECT_ID;
  if (!project) throw new Error('Set VITE_APPWRITE_PROJECT_ID');
  const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'local-guide';
  const collectionId = process.env.VITE_APPWRITE_COLLECTION_ID || 'pois';
  const client = new Client().setEndpoint(endpoint).setProject(project);
  const databases = new Databases(client);
  const account = new Account(client);
  const serverKey = process.env.APPWRITE_API_KEY;
  if (!serverKey) {
    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_EMAIL/PASSWORD or server-only APPWRITE_API_KEY');
    const session = await account.createEmailPasswordSession({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
    // The web SDK has no browser cookie jar in Node. Carry the returned session secret explicitly.
    if (!session.secret) throw new Error('Node seeding needs a server API key; this Appwrite deployment did not return a session secret.');
    client.setSession(session.secret);
  }
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/documents${path}`, {
      ...init, headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': project!,
        // POIs are publicly readable; the seed key is needed only for writes.
        ...(init?.method && init.method !== 'GET' ? { 'X-Appwrite-Key': serverKey! } : {}) }, signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json() as { message?: string };
    if (!response.ok) throw new Error(result.message);
    return result as T;
  }
  try {
    for (const poi of POIS) {
      const data = poiToPayload(poi);
      const queries = [Query.equal('naturalKey', data.naturalKey), Query.limit(1)];
      const result = serverKey ? await request<{ documents: { $id: string }[] }>(`?${new URLSearchParams(queries.map((query): [string, string] => ['queries[]', query]))}`)
        : await databases.listDocuments({ databaseId, collectionId, queries });
      const previous = result.documents[0];
      if (serverKey) await request(previous ? `/${previous.$id}` : '', {
        method: previous ? 'PATCH' : 'POST', body: JSON.stringify(previous ? { data } : { documentId: ID.unique(), data }),
      });
      else if (previous) await databases.updateDocument({ databaseId, collectionId, documentId: previous.$id, data });
      else await databases.createDocument({ databaseId, collectionId, documentId: ID.unique(), data });
      console.log(`${previous ? 'Updated' : 'Created'}: ${poi.name}`);
    }
    console.log(`Seeded ${POIS.length} places.`);
  } finally { if (!serverKey) await account.deleteSession({ sessionId: 'current' }); }
}
seed().catch((error) => { console.error(error instanceof Error ? error.message : 'Seed failed'); process.exitCode = 1; });
