import { Query } from 'appwrite';
import { docToPOI, type POIDocument } from '../src/lib/poiCodec';
import type { IPoi } from '../src/interfaces';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function collectionId(kind: 'pois' | 'trips' | 'bookings') {
  const variable = { pois: 'VITE_APPWRITE_COLLECTION_ID', trips: 'VITE_APPWRITE_TRIPS_COLLECTION_ID', bookings: 'VITE_APPWRITE_BOOKING_COLLECTION_ID' }[kind];
  return process.env[`APPWRITE_${kind.toUpperCase()}_COLLECTION_ID`] || process.env[variable] || kind;
}
export async function appwriteRequest<T>(collection: string, path = '', init?: RequestInit): Promise<T> {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const project = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
  if (!project) throw new HttpError(503, 'The hotel’s local recommendations aren’t available yet. Please check with the hotel desk.');
  const database = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'local-guide';
  const headers: Record<string, string> = { 'X-Appwrite-Project': project, 'Content-Type': 'application/json' };
  // These guest operations use the spec's public collection permissions.
  // A seed/admin key must not change the authorization of guest requests.
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/databases/${encodeURIComponent(database)}/collections/${encodeURIComponent(collection)}/documents${path}`, {
    ...init, headers, signal: init?.signal || AbortSignal.timeout(15_000),
  });
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new HttpError(response.status, body.message || 'Appwrite request failed');
  return body;
}
export async function loadPOIs(signal?: AbortSignal): Promise<IPoi[]> {
  const pois: IPoi[] = [];
  let cursor: string | undefined;
  do {
    const queries = [Query.limit(100), Query.orderAsc('name'), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const search = new URLSearchParams(queries.map((query): [string, string] => ['queries[]', query]));
    const page = await appwriteRequest<{ documents: POIDocument[] }>(collectionId('pois'), `?${search}`, { signal });
    pois.push(...page.documents.map(docToPOI));
    cursor = page.documents.length === 100 ? page.documents.at(-1)!.$id : undefined;
  } while (cursor);
  return pois;
}
