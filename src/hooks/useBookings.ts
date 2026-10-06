import { useCallback, useEffect, useState } from 'react';
import { databases, DATABASE_ID, BOOKINGS_COLLECTION_ID, Query } from '../lib/appwrite';
import type { Booking } from '../interfaces';
import { docToBooking } from '../lib/bookingCodec';
export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const items: Booking[] = [];
      let cursor: string | undefined;
      do {
        const page = await databases.listDocuments({ databaseId: DATABASE_ID, collectionId: BOOKINGS_COLLECTION_ID,
          queries: [Query.limit(100), Query.orderDesc('$createdAt'), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
        items.push(...page.documents.map(docToBooking));
        cursor = page.documents.length === 100 ? page.documents.at(-1)!.$id : undefined;
      } while (cursor);
      setBookings(items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load bookings'); }
    finally { setLoading(false); }
  }, []);
  const refresh = () => { setLoading(true); setError(''); return load(); };
  useEffect(() => { void load(); }, [load]);
  return { bookings, loading, error, refresh };
}
